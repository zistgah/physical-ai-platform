/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/workbench-modes.js
 * FILE PURPOSE: Workbench modes. Novice, Expert, Thought Leader are real modes over the same project.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Workbench modes – Iteration 23
 * Novice, Expert, Thought Leader are disclosure modes over the same graph.
 */
const MODES = {
  Novice: ["architecture", "physical"],
  Expert: ["architecture", "physical", "electrical", "software", "event", "manufacturing"],
  "Thought Leader": ["architecture", "physical", "electrical", "software", "event", "manufacturing", "commercial", "regulatory", "physical3d"]
};

export class WorkbenchModes {
  /** set: Performs set for this module. */
  set(project, mode) {
    if (!MODES[mode]) return { outcome: "HOLD", reason: `Unknown mode ${mode}` };
    project.mode = mode;
    return { outcome: "OK", mode, views: MODES[mode] };
  }

  /** views: Performs views for this module. */
  views(project) {
    return MODES[project?.mode] || MODES.Novice;
  }
}
