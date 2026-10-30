/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/operating-mode.js
 * FILE PURPOSE: Normal and resilience modes. Normal uses the best available. Resilience uses only locally reproducible substitutes.
 * MRD 9: normal mode and resilience mode.
 */
export class OperatingMode {
  constructor(kernel) { this.kernel = kernel; this.mode = "NORMAL"; }

  set(mode) {
    if (mode !== "NORMAL" && mode !== "RESILIENCE") return { outcome: "HOLD", reason: "Mode is UNSPECIFIED" };
    this.mode = mode;
    return { outcome: "OK", mode };
  }

  select(component, substitutes = []) {
    if (this.mode === "NORMAL") return { outcome: "OK", choice: component, mode: this.mode };
    const local = substitutes.find(s => s.local === true);
    if (!local) return { outcome: "HOLD", reason: "No locally reproducible substitute", mode: this.mode };
    return { outcome: "OK", choice: local, mode: this.mode };
  }
}
