/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Platform-neutral execution-provider registry.
 * This module owns no project graph, ontology, solver, network client, or evidence store.
 * Adapters are injected by the host. Results remain unverified until an independent gate acts.
 * SPDX-License-Identifier: GPL-3.0-only
 */

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const hold = (code, reason, details = {}) => ({ outcome: "HOLD", code, reason, ...details });

const ALLOWED_EXECUTION_MODES = new Set(["BROWSER", "COLAB", "REMOTE_SERVICE", "LOCAL_AGENT"]);
const ALLOWED_TRUST_STATES = new Set(["UNVERIFIED", "VERIFIED", "VALIDATED"]);

/** Validate a backend manifest without importing or executing third-party code. */
export function validateBackendManifest(m) {
  if (!isObject(m)) return hold("MANIFEST_INVALID", "Backend manifest must be an object.");
  const required = ["id", "name", "version", "provider", "executionModes", "capabilities", "license"];
  const missing = required.filter((k) => !(k in m));
  if (missing.length) return hold("MANIFEST_FIELDS_MISSING", "Backend manifest is incomplete.", { missing });
  if (![m.id, m.name, m.version, m.provider, m.license].every(nonEmpty))
    return hold("MANIFEST_TEXT_INVALID", "Manifest identity, version, provider and license must be non-empty strings.");
  if (!Array.isArray(m.executionModes) || !m.executionModes.length || m.executionModes.some((x) => !ALLOWED_EXECUTION_MODES.has(x)))
    return hold("EXECUTION_MODE_INVALID", "executionModes must contain supported execution modes.");
  if (!Array.isArray(m.capabilities) || !m.capabilities.length || m.capabilities.some((x) => !isObject(x) || !nonEmpty(x.domain) || !Number.isInteger(x.dimensions) || x.dimensions < 1))
    return hold("CAPABILITY_INVALID", "Each capability requires a domain and positive integer dimensions.");
  if (m.license === "UNKNOWN") return hold("LICENSE_UNKNOWN", "A backend with unknown licensing cannot be approved for execution or redistribution.");
  return { outcome: "OK", manifest: structuredClone(m) };
}

/**
 * Create an in-memory registry. Registration requires an injected adapter; no network or
 * dynamic module loading is performed. The host remains responsible for policy and auth.
 */
export function createBackendRegistry() {
  const entries = new Map();
  return Object.freeze({
    register(manifest, adapter) {
      const checked = validateBackendManifest(manifest);
      if (checked.outcome !== "OK") return checked;
      if (!isObject(adapter) || typeof adapter.probe !== "function" || typeof adapter.execute !== "function")
        return hold("ADAPTER_INTERFACE_INVALID", "Adapter must provide probe() and execute().");
      if (entries.has(manifest.id)) return hold("BACKEND_DUPLICATE", "Backend id is already registered.", { backendId: manifest.id });
      entries.set(manifest.id, { manifest: checked.manifest, adapter });
      return { outcome: "OK", backendId: manifest.id, registered: true };
    },
    list() {
      return [...entries.values()].map(({ manifest }) => structuredClone(manifest));
    },
    async discover(request = {}) {
      if (!isObject(request) || !nonEmpty(request.domain) || !Number.isInteger(request.dimensions) || request.dimensions < 1)
        return hold("DISCOVERY_REQUEST_INVALID", "Discovery requires domain and positive integer dimensions.");
      const found = [];
      for (const [id, entry] of entries) {
        const cap = entry.manifest.capabilities.find((c) => c.domain === request.domain && c.dimensions >= request.dimensions);
        if (!cap) continue;
        let probe;
        try { probe = await entry.adapter.probe({ request: structuredClone(request), manifest: structuredClone(entry.manifest) }); }
        catch (e) { found.push({ backendId: id, available: false, reason: "PROBE_FAILED", diagnostic: String(e?.message ?? e) }); continue; }
        found.push({ backendId: id, available: probe?.available === true, reason: probe?.available === true ? null : (probe?.reason ?? "BACKEND_UNAVAILABLE"), capability: structuredClone(cap) });
      }
      return { outcome: "OK", candidates: found };
    },
    async execute(job, options = {}) {
      if (!isObject(job) || !nonEmpty(job.id) || !nonEmpty(job.domain) || !Number.isInteger(job.dimensions) || job.dimensions < 1)
        return hold("JOB_INVALID", "Job requires id, domain and positive integer dimensions.");
      if (!Array.isArray(job.subjectRefs) || !job.subjectRefs.length || job.subjectRefs.some((x) => !nonEmpty(x)))
        return hold("SUBJECT_BINDING_MISSING", "A simulation job must bind to canonical subject references.");
      if (!nonEmpty(job.configurationRef)) return hold("CONFIGURATION_BINDING_MISSING", "A configuration reference is required.");
      if (!nonEmpty(options.backendId)) return hold("BACKEND_NOT_SELECTED", "Select an explicitly discovered backend.");
      const entry = entries.get(options.backendId);
      if (!entry) return hold("BACKEND_NOT_REGISTERED", "The requested backend is not registered.", { backendId: options.backendId });
      const cap = entry.manifest.capabilities.find((c) => c.domain === job.domain && c.dimensions >= job.dimensions);
      if (!cap) return hold("CAPABILITY_MISMATCH", "Backend does not declare the requested physics domain and dimensionality.", { backendId: options.backendId });
      if (!ALLOWED_EXECUTION_MODES.has(options.executionMode) || !entry.manifest.executionModes.includes(options.executionMode))
        return hold("EXECUTION_MODE_UNSUPPORTED", "The selected execution mode is not declared by this backend.");
      // Always probe immediately before execution. Discovery is advisory and may be stale.
      let availability;
      try {
        availability = await entry.adapter.probe({
          request: { domain: job.domain, dimensions: job.dimensions, executionMode: options.executionMode },
          manifest: structuredClone(entry.manifest)
        });
      } catch (e) {
        return hold("BACKEND_PROBE_FAILED", "Backend preflight probe threw an exception.", { backendId: options.backendId, diagnostic: String(e?.message ?? e) });
      }
      if (availability?.available !== true)
        return hold("BACKEND_UNAVAILABLE", "Backend preflight did not confirm availability for this execution.", { backendId: options.backendId, reason: availability?.reason ?? "NOT_AVAILABLE" });
      let result;
      try { result = await entry.adapter.execute({ job: structuredClone(job), executionMode: options.executionMode, manifest: structuredClone(entry.manifest) }); }
      catch (e) { return hold("BACKEND_EXECUTION_FAILED", "Backend adapter threw an exception.", { backendId: options.backendId, diagnostic: String(e?.message ?? e) }); }
      if (!isObject(result) || result.outcome !== "OK") return hold("BACKEND_RESULT_INVALID", "Backend did not return a successful structured result.", { backendId: options.backendId });
      // The registry never promotes trust. It returns a proposed simulation record only.
      return {
        outcome: "OK", executionState: "EXECUTED_UNVERIFIED", validationState: "UNVERIFIED",
        trustState: "UNVERIFIED", backend: { id: entry.manifest.id, version: entry.manifest.version, license: entry.manifest.license },
        job: { id: job.id, domain: job.domain, dimensions: job.dimensions, subjectRefs: [...job.subjectRefs], configurationRef: job.configurationRef },
        result: structuredClone(result), evidenceProposal: {
          method: "SIMULATION", state: "EXECUTED", verificationState: "UNVERIFIED",
          backendId: entry.manifest.id, jobId: job.id, subjectRefs: [...job.subjectRefs], configurationRef: job.configurationRef
        },
        promotionAllowed: false
      };
    }
  });
}

export const BACKEND_ORCHESTRATION_CONTRACT = Object.freeze({
  id: "scientific-backend-orchestration", version: "1.0.0",
  ownsCanonicalGraph: false, performsNetworkIO: false, dynamicallyLoadsCode: false,
  defaultTrustState: "UNVERIFIED", autoPromotesEvidence: false,
  executionModes: [...ALLOWED_EXECUTION_MODES], trustStates: [...ALLOWED_TRUST_STATES]
});
