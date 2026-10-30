/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-exercise.js
 * FILE PURPOSE: Exercises the standards corpus against sample projects. Profiles and adopts. Records the result. A missing project or standard holds.
 * License: GPL-3.0-only.
 */
import { STANDARDS_CORPUS } from "./standards-corpus.js";
import { StandardsAcceptance } from "./standards-acceptance.js";

export function exerciseStandards(kernel, projectId, standardIds) {
  if (!projectId) return { outcome: "HOLD", reason: "Project is UNSPECIFIED" };
  if (!standardIds || !standardIds.length) return { outcome: "HOLD", reason: "Standards are UNSPECIFIED" };
  const acceptance = new StandardsAcceptance(kernel);
  const results = [];
  for (const id of standardIds) {
    const std = STANDARDS_CORPUS.find(s => s.id === id);
    if (!std) { results.push({ id, outcome: "HOLD", reason: "Not in corpus" }); continue; }
    const existing = kernel.store.get(`profile_${id}_${projectId}`);
    if (existing && existing.status === "PROJECT_ADOPTED") {
      results.push({ id, outcome: "OK", status: existing.status });
      continue;
    }
    const profile = existing || acceptance.profile(projectId, id);
    const adopted = acceptance.adopt(projectId, profile.id);
    results.push({ id, outcome: "OK", status: adopted.status });
  }
  return { outcome: "OK", exercised: results.length, results };
}

export function corpusSize() { return STANDARDS_CORPUS.length; }
