/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/safety/assurance-path.js
 * FILE PURPOSE: Assurance path. Walks the claim-argument-evidence chain.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Assurance path – Iteration 08
 * Hazard → Cause → Control → Requirement → Claim → Argument → Evidence
 * Walkable on the canonical graph. Not a full safety-case tool.
 */

export class AssurancePath {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** linkHazardToControl: Performs link hazard to control for this module. */
  linkHazardToControl(hazardId, controlId) {
    return this.kernel.link(hazardId, "CONTROLLED_BY", controlId);
  }

  /** linkHazardCause: Performs link hazard cause for this module. */
  linkHazardCause(hazardId, causeId) {
    return this.kernel.link(hazardId, "CAUSED_BY", causeId);
  }

  /**
   * Build the walkable chain for a hazard.
   * Returns every hop that exists. Missing hops are listed, not invented.
   */
  walk(hazardId) {
    const hazard = this.kernel.store.get(hazardId);
    if (!hazard || hazard.type !== "Hazard") throw new Error("Not a hazard");
    const controls = this.kernel.store.relations
      .filter(r => r.source === hazardId && r.relation === "CONTROLLED_BY")
      .map(r => this.kernel.store.get(r.target)).filter(Boolean);
    const causes = this.kernel.store.relations
      .filter(r => r.source === hazardId && r.relation === "CAUSED_BY")
      .map(r => this.kernel.store.get(r.target)).filter(Boolean);
    const requirements = controls.filter(c => c.type === "Requirement");
    const claims = this.kernel.store.all("Claim").filter(c =>
      this.kernel.store.relations.some(r => r.source === c.id && r.relation === "SUPPORTED_BY")
    );
    const missing = [];
    if (!causes.length) missing.push("cause");
    if (!controls.length) missing.push("control");
    if (!requirements.length) missing.push("requirement-control");
    return {
      hazard,
      causes,
      controls,
      requirements,
      claims,
      missing,
      complete: missing.length === 0
    };
  }
}
