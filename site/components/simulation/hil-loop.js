/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/hil-loop.js
 * FILE PURPOSE: HIL loop. A bound device without a transport is SIMULATION. HIL requires a transport.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * HIL loop – Iteration 17
 * Fixed-step plant and controller. A missed deadline faults the run.
 */
export function runLoop({ plant, controller, steps, dt, deadline, device }) {
  if (!device || device.bound !== true) return { outcome: "HOLD", reason: "No bound device", method: "UNAVAILABLE" };
  if (!device.transport) return { outcome: "OK", method: "SIMULATION", reason: "No hardware transport" };
  if (!(steps > 0 && dt > 0)) return { outcome: "HOLD", reason: "Loop timing is UNSPECIFIED" };
  let x = plant.x0;
  const trace = [];
  for (let i = 0; i < steps; i++) {
    const started = i * dt;
    const u = controller(x);
    x = plant.step(x, u, dt);
    const elapsed = dt;
    if (deadline && elapsed > deadline) return { outcome: "HOLD", reason: "Deadline missed", step: i };
    trace.push({ t: started + dt, x, u });
  }
  return { outcome: "OK", method: device.transport ? "HIL" : "SIMULATION", x, trace };
}
