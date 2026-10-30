/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/hil-transport.js
 * FILE PURPOSE: HIL transport. A loop ticks only a bound device. No device holds. A missed deadline is a fault.
 * MRD 4.
 */
export class HilTransport {
  constructor() { this.device = null; }
  bind(device) {
    if (!device || typeof device.tick !== "function") return { outcome: "HOLD", reason: "Device has no tick" };
    this.device = device;
    return { outcome: "OK" };
  }
  step(dt, deadline) {
    if (!this.device) return { outcome: "HOLD", reason: "No device bound", method: "SIMULATION" };
    const start = Date.now();
    const out = this.device.tick(dt);
    const elapsed = Date.now() - start;
    if (deadline != null && elapsed > deadline) return { outcome: "FAULT", reason: "Deadline missed", elapsed, method: "HIL" };
    return { outcome: "OK", out, elapsed, method: "HIL" };
  }
}
