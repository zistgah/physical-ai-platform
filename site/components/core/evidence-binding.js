/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/evidence-binding.js
 * FILE PURPOSE: Evidence binding. Attaches an Evidence entity to a subject with method and state.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Evidence–configuration binding – Iteration 08
 * Evidence from simulation, HIL, inspection, or physical test must name a configuration.
 * A configuration change marks dependent evidence stale. It does not delete it.
 */

const BOUND_METHODS = new Set(["SIMULATION", "SIL", "HIL", "PHIL", "RIL", "INSPECTION", "PHYSICAL_TEST"]);

export class EvidenceBinding {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** bind: Binds evidence to a requirement. Rejected or unbound evidence does not clear. */
  bind(evidenceId, configurationId) {
    const ev = this.kernel.store.get(evidenceId);
    const cfg = this.kernel.store.get(configurationId);
    if (!ev || ev.type !== "Evidence") throw new Error("Not evidence");
    if (!cfg || cfg.type !== "Configuration") throw new Error("Not a configuration");
    this.kernel.link(ev.id, "CONFIGURED_BY", cfg.id);
    return this.kernel.upsert({
      ...ev,
      configurationId: cfg.id,
      configurationFingerprint: cfg.fingerprint || null,
      stale: false
    });
  }

  /** requireBinding: Performs require binding for this module. */
  requireBinding(evidence) {
    if (BOUND_METHODS.has(evidence.method) && !evidence.configurationId) {
      return { ok: false, reason: `${evidence.method} evidence requires configurationId` };
    }
    return { ok: true };
  }

  /** markStaleForConfiguration: Performs mark stale for configuration for this module. */
  markStaleForConfiguration(configurationId, reason = "configuration changed") {
    const affected = [];
    for (const ev of this.kernel.store.all("Evidence")) {
      if (ev.configurationId === configurationId && !ev.stale) {
        const updated = this.kernel.upsert({
          ...ev,
          stale: true,
          staleReason: reason,
          staleAt: this.kernel._now()
        });
        affected.push(updated.id);
      }
    }
    return affected.sort();
  }
}
