/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/multiphysics-coupled.js
 * FILE PURPOSE: Coupled multi-physics step. One mechanical-thermal step. Not a full solver.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Coupled mechanical-electrical-thermal solver – Iteration 20
 * Numbers come from the step, not a constant.
 */
export function solveCoupled({ steps, dt, mass, kSpring, resistance, current, kThermal, temp0, tempAmb }) {
  if (!(steps > 0 && dt > 0 && mass > 0 && resistance > 0)) return { outcome: "HOLD", reason: "Solver inputs are UNSPECIFIED" };
  let x = 0, v = 0, temp = temp0;
  const history = [];
  for (let i = 0; i < steps; i++) {
    const voltage = current * resistance;
    const heat = current * current * resistance;
    temp += dt * (heat * kThermal - kThermal * (temp - tempAmb));
    const force = -kSpring * x + 0.01 * (temp - temp0);
    v += dt * force / mass;
    x += dt * v;
    history.push({ t: (i + 1) * dt, x, v, temp, voltage });
  }
  return { outcome: "OK", x, temp, voltage: history.at(-1).voltage, history };
}
