/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/hil-realtime.js
 * FILE PURPOSE: Real-time HIL adapter. Fixed-step loop with a deadline. Missed deadline is a fault.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Real-time HIL – Iteration 20
 * A loop with a deadline. No bound device means HOLD.
 * A bound adapter must step. A missed deadline faults.
 * This does not claim a physical bench that is not bound.
 */
export class HilRealtime {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor() { this.device = null; }

  /** bind: Binds evidence to a requirement. Rejected or unbound evidence does not clear. */
  bind(device) {
    if (!device || typeof device.step !== "function") return { outcome: "HOLD", reason: "Hardware adapter is UNSPECIFIED" };
    this.device = device;
    return { outcome: "BOUND", id: device.id };
  }

  /** run: Performs run for this module. */
  run({ steps, dt, deadlineMs, controller }) {
    if (!this.device) return { outcome: "HOLD", reason: "No hardware bound" };
    if (!(steps > 0 && dt > 0 && deadlineMs > 0)) return { outcome: "HOLD", reason: "Loop timing is UNSPECIFIED" };
    let x = this.device.x0 ?? 0;
    const trace = [];
    for (let i = 0; i < steps; i++) {
      const started = Date.now();
      const u = controller(x);
      x = this.device.step(x, u, dt);
      const elapsed = Date.now() - started;
      if (elapsed > deadlineMs) {
        return { outcome: "FAULT", reason: "Deadline missed", step: i, elapsed };
      }
      trace.push({ t: (i + 1) * dt, x, u });
    }
    return { outcome: "OK", method: this.device.transport ? "HIL" : "SIMULATION", bound: this.device.id, x, trace };
  }
}
