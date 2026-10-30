/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/improve.js
 * FILE PURPOSE: Packages a component improvement for another AI. Names the file, the change, the constraints, and the repository. Emits a self-contained prompt. A request without a component holds.
 * MRD 13.
 */
export function packageImprovement({ component, change, constraints, repository }) {
  if (!component) return { outcome: "HOLD", reason: "Component is UNSPECIFIED" };
  if (!change) return { outcome: "HOLD", reason: "Change is UNSPECIFIED" };
  const repo = repository || "the repository root";
  const rules = constraints || [
    "Do not flatten the canonical kernel.",
    "Do not exclude a requirement.",
    "A HOLD is a HOLD. Do not return OK for a missing input.",
    "Add a test that fails when the change is removed.",
    "Keep the graph as the semantics."
  ];
  const prompt = [
    `Improve ${component}.`,
    `Change: ${change}.`,
    `Repository: ${repo}.`,
    "Constraints:",
    ...rules.map(r => "- " + r),
    "Return a zip named with the component id. Include the changed file, a test, and a note of what you did not change."
  ].join("\n");
  return { outcome: "OK", component, prompt, rules };
}
