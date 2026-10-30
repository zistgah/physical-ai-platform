/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/evidence-promotion.js
 * FILE PURPOSE: Evidence promotion. Moves evidence only along EXECUTED, TESTED, VERIFIED, VALIDATED, RELEASED. Simulation stays simulation.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Evidence promotion – Iteration 06
 * Simulation is never automatically physical verification.
 * Promotion is an explicit process that records method, configuration, and authority.
 */

export const EVIDENCE_METHODS = [
  "SIMULATION", "SIL", "HIL", "PHIL", "RIL",
  "INSPECTION", "ANALYSIS", "PHYSICAL_TEST", "FIELD",
  "COMPLIANCE", "EDUCATIONAL_ASSESSMENT", "RESEARCH"
];

const PROMOTION = {
  EXECUTED: ["TESTED"],
  TESTED: ["VERIFIED"],
  VERIFIED: ["VALIDATED"],
  VALIDATED: ["RELEASED"]
};

export class EvidencePromotion {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /**
   * Explicit promotion. Does not infer a stronger method.
   * Physical verification requires method PHYSICAL_TEST or FIELD and an explicit authority.
   */
  promote(evidenceId, toState, { configurationId, authority, note } = {}) {
    const ev = this.kernel.store.get(evidenceId);
    if (!ev || ev.type !== "Evidence") throw new Error("Not evidence");
    const allowed = PROMOTION[ev.state] || [];
    if (!allowed.includes(toState)) {
      throw new Error(`Cannot promote ${ev.state} → ${toState}`);
    }
    if ((toState === "VERIFIED" || toState === "VALIDATED") && !authority) {
      throw new Error("Promotion to VERIFIED/VALIDATED requires explicit authority");
    }
    if ((ev.method === "SIMULATION" || ev.method === "SIL") && toState === "VALIDATED" && !note) {
      throw new Error("Simulation/SIL cannot be validated without an explicit bridging note");
    }
    return this.kernel.upsert({
      ...ev,
      state: toState,
      configurationId: configurationId || ev.configurationId || null,
      promotion: {
        from: ev.state,
        to: toState,
        authority: authority || null,
        configurationId: configurationId || null,
        timestamp: this.kernel._now(),
        note: note || null
      },
      provenance: {
        ...ev.provenance,
        promotedBy: authority || "unspecified",
        promotedAt: this.kernel._now()
      }
    });
  }

  /** recordPhysicalTest: Performs record physical test for this module. */
  recordPhysicalTest(projectId, { subjectId, configurationId, outcome, authority }) {
    if (!authority) throw new Error("Physical test requires authority");
    if (!configurationId) throw new Error("Physical test requires configuration");
    const id = `phys_${Date.now().toString(36)}`;
    const ev = this.kernel.upsert({
      id,
      type: "Evidence",
      name: "Physical test",
      state: "EXECUTED",
      method: "PHYSICAL_TEST",
      subject: subjectId,
      configurationId,
      outcome,
      provenance: {
        origin: "physical-test",
        derivedFrom: subjectId,
        configuration: configurationId,
        authority,
        timestamp: this.kernel._now(),
        note: "Physical test evidence; distinct from simulation"
      }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    if (subjectId && this.kernel.store.get(subjectId)) {
      this.kernel.link(id, "DERIVED_FROM", subjectId);
    }
    return ev;
  }
}
