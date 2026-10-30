/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/multiphysics-extended.js
 * FILE PURPOSE: Extended multi-physics. Mechanical, thermal, electrical, control, sensor, and environment in one integrator.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Extended multi-physics – Iteration 23
 * Mechanical, electrical, thermal, sensor, control, environment.
 * More than one coupled step. Numbers come from the integration.
 */
export function solveExtended({ steps, dt, mass, kSpring, resistance, current, kThermal, temp0, tempAmb, sensorNoise, envForce }) {
  if (!(steps > 1 && dt > 0 && mass > 0 && resistance > 0)) return { outcome: "HOLD", reason: "Extended solver needs more than one step and specified inputs" };
  let x = 0, v = 0, temp = temp0, control = 0;
  const history = [];
  for (let i = 0; i < steps; i++) {
    const voltage = current * resistance;
    const heat = current * current * resistance;
    temp += dt * (heat * kThermal - kThermal * (temp - tempAmb));
    const measured = x + (sensorNoise || 0) * Math.sin(i);
    control = -0.5 * measured;
    const force = -kSpring * x + 0.01 * (temp - temp0) + control + (envForce || 0);
    v += dt * force / mass;
    x += dt * v;
    history.push({ t: (i + 1) * dt, x, v, temp, voltage, measured, control });
  }
  return { outcome: "OK", x, temp, control, steps: history.length, history };
}
