/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fault-injection.js
 * FILE PURPOSE: Fault injection. Sensor, actuator, power, communication, AI, environment. A fault is recorded, not hidden.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fault injection – Iteration 23
 * Sensor, actuator, power, communications, AI, environment.
 * An injected fault is recorded and changes the run.
 */
const DOMAINS = ["sensor", "actuator", "power", "communications", "ai", "environment"];

export class FaultInjection {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; this.faults = []; }

  /** inject: Performs inject for this module. */
  inject(projectId, { domain, kind, magnitude } = {}) {
    if (!DOMAINS.includes(domain)) return { outcome: "HOLD", reason: `Unknown domain ${domain}` };
    if (magnitude == null) return { outcome: "HOLD", reason: "Magnitude is UNSPECIFIED" };
    const fault = { id: `fault_${this.faults.length}`, projectId, domain, kind: kind || "bias", magnitude };
    this.faults.push(fault);
    return { outcome: "INJECTED", fault };
  }

  /** apply: Performs apply for this module. */
  apply(projectId, reading) {
    const active = this.faults.filter(f => f.projectId === projectId);
    let value = reading;
    for (const f of active) value += f.magnitude;
    return { value, faults: active.map(f => f.id) };
  }
}
