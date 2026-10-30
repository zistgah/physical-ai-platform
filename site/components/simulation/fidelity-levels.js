/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fidelity-levels.js
 * FILE PURPOSE: Fidelity level definitions and the evidence required to claim each level.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fidelity L0–L7 – Iteration 20
 * A level cannot be claimed without the previous level's evidence.
 */
export const LEVELS = ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"];

export class FidelityLevels {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; this.rank = new Map(); }

  /** claim: Performs claim for this module. */
  claim(projectId, subjectId, level) {
    const idx = LEVELS.indexOf(level);
    if (idx < 0) return { outcome: "HOLD", reason: "Level is UNSPECIFIED" };
    const have = this.rank.get(subjectId) ?? -1;
    if (idx > have + 1) return { outcome: "HOLD", reason: `${level} requires ${LEVELS[have + 1]} first` };
    this.rank.set(subjectId, Math.max(have, idx));
    const ev = this.kernel.upsert({
      id: `fid_${subjectId}_${level}`,
      type: "Evidence",
      name: `${level} ${subjectId}`,
      state: "EXECUTED",
      method: level === "L6" || level === "L7" ? "PHYSICAL_TEST" : level === "L5" ? "HIL" : "SIMULATION",
      subject: subjectId,
      level,
      provenance: { origin: "fidelity", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", ev.id);
    return { outcome: "OK", level, evidenceId: ev.id };
  }
}
