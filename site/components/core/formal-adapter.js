/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/formal-adapter.js
 * FILE PURPOSE: Formal proof adapter. No prover is bundled. Without an injected prover the result is UNAVAILABLE. Analysis is recorded, never promoted to verified.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Formal verification adapter contract - Iteration 10
 *
 * Adapter boundary only. This package does not contain or implement a prover.
 * The canonical semantic graph remains the sole store.
 *
 * Default behavior is explicitly unavailable. A caller may inject a prover
 * function for a claim-scoped analysis. Injected results are recorded as
 * Evidence(method=ANALYSIS, state=EXECUTED). Recording analysis does not
 * promote the claim, verify the system, or imply physical verification.
 */

const HOLD = (reason) => ({
  status: "HOLD",
  reason: reason || "UNSPECIFIED"
});

export class FormalAdapter {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel, { prover = null } = {}) {
    if (!kernel) throw new Error("FormalAdapter requires canonical kernel");
    if (prover !== null && typeof prover !== "function") {
      throw new TypeError("prover must be a function when supplied");
    }
    this.kernel = kernel;
    this.prover = prover;
  }

  /**
   * Submit one claim/property to the adapter boundary.
   *
   * No prover is bundled. Without an injected prover the result is explicitly
   * unavailable. Missing claim/property is a HOLD with UNSPECIFIED input.
   *
   * An injected prover is invoked only for the supplied claim. Its result is
   * recorded as ANALYSIS evidence in the canonical graph. The adapter never
   * promotes that evidence to VERIFIED/VALIDATED/RELEASED and never claims
   * verification of the whole system.
   */
  submitClaim(claimId, property) {
    const claim = this.kernel.store.get(claimId);
    if (!claim || claim.type !== "Claim") {
      return HOLD("UNSPECIFIED: claimId does not resolve to a canonical Claim");
    }
    if (property === undefined || property === null || property === "") {
      return HOLD("UNSPECIFIED: property is required");
    }

    if (!this.prover) {
      return {
        status: "UNAVAILABLE",
        reason: "no prover bound"
      };
    }

    const analysis = this.prover({
      claimId,
      property,
      claim,
      kernel: this.kernel
    });

    const evidenceId = `formal-analysis-${claimId}-${Date.now().toString(36)}`;
    const evidence = this.kernel.upsert({
      id: evidenceId,
      type: "Evidence",
      name: `Formal analysis for ${claimId}`,
      state: "EXECUTED",
      method: "ANALYSIS",
      subject: claimId,
      property,
      result: analysis,
      provenance: {
        origin: "formal-adapter",
        derivedFrom: claimId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link("proj-1", "CONTAINS", evidence.id);

    return {
      status: "ANALYSIS_RECORDED",
      claimId,
      evidenceId: evidence.id,
      evidenceState: evidence.state,
      method: evidence.method,
      result: analysis
    };
  }
}

export default FormalAdapter;
