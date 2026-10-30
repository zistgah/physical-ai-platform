/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/coupled-iterate.js
 * FILE PURPOSE: Coupled iteration beside the existing solver. Temperature drives strain. Iterates to a tolerance. Does not replace multiphysics-coupled.js.
 * MRD 5.
 */
export function couple({ temperature, alpha, length, load, stiffness, tolerance = 1e-6, maxIter = 50 }) {
  if (!(tolerance > 0)) return { outcome: "HOLD", reason: "Tolerance must be positive" };
  if (!(stiffness > 0)) return { outcome: "HOLD", reason: "Stiffness must be positive" };
  let strain = 0, prev = Infinity, iters = 0;
  for (let i = 0; i < maxIter; i++) {
    const next = alpha * temperature * length + load / stiffness + strain * 0.01;
    if (Math.abs(next - prev) < tolerance) { strain = next; iters = i + 1; break; }
    prev = strain = next;
    iters = i + 1;
  }
  return { outcome: "OK", strain, iters, converged: iters < maxIter };
}
