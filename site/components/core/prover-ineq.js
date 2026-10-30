/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/prover-ineq.js
 * FILE PURPOSE: String-form inequality prover. Sits beside prover.js. Does not replace it. Proves what follows. Holds what does not.
 * MRD 5.
 */
export function proveIneq(given, claim) {
  if (!given || !claim) return { outcome: "HOLD", reason: "Given or claim is UNSPECIFIED" };
  const g = parse(given), c = parse(claim);
  if (!g || !c) return { outcome: "HOLD", reason: "Not an inequality" };
  if (g.v !== c.v) return { outcome: "HOLD", reason: "Different variables" };
  if (g.op === c.op && g.n === c.n) return { outcome: "PROVED" };
  if (g.op === "<" && c.op === "<=" && g.n <= c.n) return { outcome: "PROVED" };
  if (g.op === ">=" && c.op === ">") return { outcome: "HOLD", reason: "Does not follow" };
  return { outcome: "HOLD", reason: "Does not follow" };
}
function parse(s) {
  const m = String(s).match(/^([a-z])\s*(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);
  return m ? { v: m[1], op: m[2], n: Number(m[3]) } : null;
}
