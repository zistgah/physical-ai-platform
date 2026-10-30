/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/workflow-gate.js
 * FILE PURPOSE: A workflow that opens a gate. A step advances only when its gate passes. A step with no gate holds.
 * MRD 3.
 */
export class WorkflowGate {
  constructor(kernel) { this.kernel = kernel; this.steps = []; }
  add(name, gate) {
    if (!name) return { outcome: "HOLD", reason: "Step is unnamed" };
    if (typeof gate !== "function") return { outcome: "HOLD", reason: "Step has no gate" };
    this.steps.push({ name, gate, done: false });
    return { outcome: "OK", index: this.steps.length - 1 };
  }
  advance() {
    const next = this.steps.find(s => !s.done);
    if (!next) return { outcome: "OK", status: "COMPLETE" };
    const result = next.gate();
    if (result !== true) return { outcome: "HOLD", reason: "Gate did not pass", step: next.name };
    next.done = true;
    return { outcome: "OK", step: next.name };
  }
}
