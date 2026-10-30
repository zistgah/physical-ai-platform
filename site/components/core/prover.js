/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/prover.js
 * FILE PURPOSE: Prover. Sound. Does not prove a strict inequality from a weak one. Holds what it cannot prove.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Bound prover – Iteration 27
 * Sound on the inequalities it handles. Unproved is HOLD.
 */
export function prove(assumptions, claim) {
  const same = assumptions.find(a => a.left === claim.left && a.op === claim.op && a.right === claim.right);
  if (same) return { outcome: "PROVED", claim };
  if (claim.op === ">" && assumptions.some(a => a.left === claim.left && (a.op === ">=" || a.op === ">") && a.right === claim.right)) {
    return { outcome: "HOLD", reason: "A lower bound does not prove a strict inequality" };
  }
  if (claim.op === ">=" && typeof claim.right === "number") {
    const ok = assumptions.some(a => a.left === claim.left && a.op === ">=" && typeof a.right === "number" && a.right >= claim.right);
    if (ok) return { outcome: "PROVED", claim, by: "weaker bound" };
  }
  return { outcome: "HOLD", reason: `Cannot prove ${claim.left} ${claim.op} ${claim.right}` };
}
