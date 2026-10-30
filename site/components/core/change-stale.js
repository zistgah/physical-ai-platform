/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/change-stale.js
 * FILE PURPOSE: Marks dependent entities stale when an upstream entity changes.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Change -> evidence staleness overlay - Iteration 10.
 *
 * Uses the canonical semantic graph only. A change-impact caller supplies the
 * already-resolved affected entity IDs. Evidence is retained and marked stale
 * when either its bound configurationId or its subject is affected.
 *
 * This overlay does not infer impact, create relations, delete evidence, or
 * promote/demote evidence state.
 */

const HOLD = "HOLD";

export function applyStale(kernel, affectedIds, reason = "change affected evidence basis") {
  if (!kernel || !kernel.store || typeof kernel._now !== "function") {
    throw new Error("applyStale requires a canonical kernel");
  }

  // Missing impact input is not equivalent to "nothing affected".
  if (affectedIds === undefined || affectedIds === null) {
    return {
      status: HOLD,
      reason: "affectedIds is required to determine evidence staleness",
      staleEvidenceIds: []
    };
  }

  if (!Array.isArray(affectedIds)) {
    return {
      status: HOLD,
      reason: "affectedIds must be an array of canonical entity IDs",
      staleEvidenceIds: []
    };
  }

  const affected = new Set(
    affectedIds.filter(id => typeof id === "string" && id.length > 0)
  );
  const staleEvidenceIds = [];

  for (const evidence of kernel.store.all("Evidence")) {
    const configurationAffected =
      typeof evidence.configurationId === "string" &&
      affected.has(evidence.configurationId);

    const subjectAffected =
      typeof evidence.subject === "string" &&
      affected.has(evidence.subject);

    if (!configurationAffected && !subjectAffected) continue;

    const updated = kernel.upsert({
      ...evidence,
      stale: true,
      staleReason: reason,
      staleAt: evidence.staleAt || kernel._now()
    });

    staleEvidenceIds.push(updated.id);
  }

  staleEvidenceIds.sort();

  return {
    status: "APPLIED",
    reason,
    staleEvidenceIds
  };
}
