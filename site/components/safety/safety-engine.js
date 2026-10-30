/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/safety/safety-engine.js
 * FILE PURPOSE: Safety readiness. No hazard log, no configuration, an unfrozen configuration, or an unresolved hazard is not GO.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { CockpitMachine } from "./cockpit-machine.js";
/**
 * Safety / Assurance Engine – Iteration 03
 * Canonical adapter. Common Claim → Argument → Evidence structure.
 * Hazard ontology and cockpit readiness operate on the kernel graph.
 */

export const HAZARD_TYPES = [
  "Component", "Interface", "Timing", "Power", "Thermal", "Communication",
  "Sensor", "Actuator", "Software", "Model", "Human", "Environmental",
  "SupplyChain", "Manufacturing", "Cyber"
];

export const COCKPIT_STATES = [
  "S0_STORED_SAFE", "S1_CONFIGURATION_VERIFIED", "S2_POWER_ISOLATED_CHECK",
  "S3_SYSTEM_POWER_UP", "S4_SELF_TEST", "S5_CONTROL_AUTHORITY_VERIFIED",
  "S6_LOW_ENERGY_COMMISSIONING", "S7_CONTROLLED_OPERATION", "S8_FULL_OPERATION",
  "S9_SHUTDOWN", "S10_SAFE_ISOLATED", "ABORT", "SAFE", "DIAGNOSIS"
];

export class SafetyEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** cockpit: Returns a cockpit machine for the project. */
  cockpit(projectId, options = {}) {
    return new CockpitMachine(this.kernel, projectId, options);
  }

  /** addHazard: Records a hazard on the project. */
  addHazard(projectId, hazard) {
    const id = hazard.id || `haz_${Date.now().toString(36)}`;
    const h = this.kernel.upsert({
      id,
      type: "Hazard",
      name: hazard.name || "Hazard",
      hazardType: hazard.hazardType || "Component",
      status: hazard.status || "UNKNOWN",
      severity: hazard.severity || "UNKNOWN",
      ...hazard
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return h;
  }

  /** createAssuranceCase: Performs create assurance case for this module. */
  createAssuranceCase(projectId, { kind = "Safety", claim, argument, evidenceIds = [] }) {
    const caseId = `ac_${kind.toLowerCase()}_${Date.now().toString(36)}`;
    const claimId = `claim_${caseId}`;
    const argId = `arg_${caseId}`;
    this.kernel.upsert({ id: claimId, type: "Claim", name: claim || `${kind} Claim`, kind, status: "OPEN" });
    this.kernel.upsert({ id: argId, type: "Argument", name: argument || `${kind} Argument`, status: "OPEN" });
    const ac = this.kernel.upsert({
      id: caseId,
      type: "AssuranceCase",
      name: `${kind} Case`,
      kind,
      claimId,
      argumentId: argId,
      evidenceIds,
      status: "OPEN",
      provenance: { origin: "assurance", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", caseId);
    this.kernel.link(caseId, "CONTAINS", claimId);
    this.kernel.link(claimId, "SUPPORTED_BY", argId);
    for (const eid of evidenceIds) {
      if (this.kernel.store.get(eid)) this.kernel.link(argId, "EVIDENCED_BY", eid);
    }
    return ac;
  }

  /** evaluateReadiness: Decides GO, HOLD, or NO-GO. No hazard log, no configuration, an unfrozen configuration, or an unresolved hazard is not GO. */
  evaluateReadiness(projectId) {
    const hazards = this.kernel.store.all("Hazard").filter(h =>
      this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === h.id)
    );
    const unknown = hazards.filter(h => h.status === "UNKNOWN" || !h.status);
    const unresolved = hazards.filter(h => h.status !== "CONTROLLED" && h.status !== "ACCEPTED" && h.status !== "CLOSED");
    if (!hazards.length) return { decision: "HOLD", reason: "No hazard log" };
    const configs = this.kernel.store.all("Configuration").filter(c =>
      this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === c.id)
    );
    if (!configs.length) return { decision: "HOLD", reason: "No configuration" };
    if (configs.some(c => c.status !== "FROZEN")) return { decision: "HOLD", reason: "Configuration is not frozen" };
    if (unknown.length) return { decision: "HOLD", reason: "Unknown hazards present", unknown: unknown.map(h => h.id) };
    if (unresolved.length) return { decision: "NO-GO", reason: "Unresolved safety conditions", unresolved: unresolved.map(h => h.id) };
    return { decision: "GO", reason: "No blocking hazards", hazards: hazards.length };
  }

  /** cockpitIdentityGate: Performs cockpit identity gate for this module. */
  cockpitIdentityGate(projectId, configId) {
    const cfg = configId ? this.kernel.store.get(configId) : null;
    const required = ["System", "Component"];
    const missing = [];
    if (!cfg) missing.push("Configuration ID");
    else if (cfg.status !== "FROZEN") missing.push("Configuration not frozen");
    const project = this.kernel.store.get(projectId);
    if (!project) missing.push("System ID");
    if (missing.length) return { decision: "NO-GO", reason: "Configuration unknown or incomplete", missing };
    return { decision: "GO", reason: "Identity and configuration verified", configurationId: cfg.id, fingerprint: cfg.fingerprint };
  }

  /** forceAbort: Performs force abort for this module. */
  forceAbort(projectId, reason) {
    const id = `cockpit_${Date.now().toString(36)}`;
    return this.kernel.upsert({
      id,
      type: "CockpitState",
      name: "ABORT",
      state: "ABORT",
      previous: "OPERATION",
      reason,
      next: "SAFE",
      projectId,
      provenance: { origin: "cockpit", timestamp: this.kernel._now() }
    });
  }
}
