/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/compliance-engine.js
 * FILE PURPOSE: Compliance applicability engine. Walks standards from APPLICABLE through ACCEPTED. Unknown or missing evidence yields HOLD, never ALLOW.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Compliance / Standards Applicability Engine – Iteration 03
 * Graph-backed. Separate from export/dual-use states.
 * Profiles are INFORMATIONAL / PROFILED / PROJECT_ADOPTED; no invented legal authority.
 */

export const COMPLIANCE_WORKFLOW_STATES = [
  "APPLICABLE", "TAILORED", "ALLOCATED", "IMPLEMENTED", "VERIFIED",
  "EVIDENCED", "REVIEWED", "ACCEPTED", "WAIVED", "DEVIATION", "NOT_APPLICABLE"
];

export const EXPORT_STATES = [
  "UNKNOWN", "UNDER_REVIEW", "NOT_CONTROLLED", "CONTROLLED", "LICENSE_REQUIRED",
  "LICENSE_PENDING", "LICENSE_GRANTED", "EXEMPTION_CONFIRMED", "RESTRICTED",
  "PROHIBITED", "EXPIRED", "SUPERSEDED"
];

// Small provenance-labelled profile dataset (not a world standards library)
export const PROFILE_DATASET = [
  {
    id: "sp-iso-15288",
    name: "ISO/IEC/IEEE 15288 Systems Engineering",
    layer: "Global",
    domains: ["TERRESTRIAL", "AERIAL", "INDUSTRIAL"],
    embodiments: ["WHEELED", "LEGGED", "FIXED"],
    status: "INFORMATIONAL",
    provenance: { source: "public standard reference", confidence: "PROFILED" },
    requiredEvidence: ["Requirements traceability", "Verification records"]
  },
  {
    id: "sp-iec-61508",
    name: "IEC 61508 Functional Safety",
    layer: "Global",
    domains: ["INDUSTRIAL", "TERRESTRIAL"],
    riskClass: ["HIGH", "MEDIUM"],
    status: "INFORMATIONAL",
    provenance: { source: "public standard reference", confidence: "PROFILED" },
    requiredEvidence: ["Safety case", "Hazard analysis"]
  }
];

export class ComplianceEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel = null) { this.kernel = kernel; this.cases = []; }
  // Backward-compatible with Iteration 01/02 tests
  evaluate(c) {
    const state = c?.state;
    return this.evaluateExport(state);
  }
  /** add: Performs add for this module. */
  add(c) { this.cases.push(c); return c; }

  /** evaluateExport: Performs evaluate export for this module. */
  evaluateExport(state) {
    if (!state || state === "UNKNOWN") return { decision: "HOLD", reason: "UNKNOWN" };
    if (state === "PROHIBITED") return { decision: "NO-GO", reason: "PROHIBITED" };
    if (state === "LICENSE_PENDING" || state === "UNDER_REVIEW" || state === "LICENSE_REQUIRED") return { decision: "HOLD", reason: state };
    if (state === "LICENSE_GRANTED" || state === "EXEMPTION_CONFIRMED" || state === "NOT_CONTROLLED") return { decision: "GO", reason: state };
    return { decision: "HOLD", reason: state };
  }

  /** applicabilityEngine: Performs applicability engine for this module. */
  applicabilityEngine(projectId) {
    const project = this.kernel.store.get(projectId);
    const systems = this.kernel.store.all("System").filter(s =>
      this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === s.id)
    );
    const domain = systems[0]?.domain || "UNKNOWN";
    const embodiment = systems[0]?.embodiment || "UNKNOWN";
    const candidates = PROFILE_DATASET.filter(p =>
      (!p.domains || p.domains.includes(domain)) &&
      (!p.embodiments || p.embodiments.includes(embodiment))
    );
    return {
      projectId,
      inputs: { domain, embodiment, riskClass: "UNKNOWN", jurisdiction: "UNKNOWN" },
      candidates: candidates.map(c => ({
        ...c,
        applicabilityReason: `Domain ${domain} / embodiment ${embodiment} matches profile`,
        status: c.status,
        confidence: c.provenance.confidence
      })),
      note: "Profiles are informational; not a legal determination"
    };
  }

  /** createComplianceCase: Performs create compliance case for this module. */
  createComplianceCase(projectId, profileId) {
    const id = `cc_${profileId}_${Date.now().toString(36)}`;
    const cc = this.kernel.upsert({
      id,
      type: "ComplianceCase",
      name: `Compliance case for ${profileId}`,
      profileId,
      state: "APPLICABLE",
      status: "OPEN",
      provenance: { origin: "compliance", derivedFrom: profileId, note: "Generated recommendation, not accepted determination" }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return cc;
  }
}
