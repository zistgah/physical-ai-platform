/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/handoff.js
 * FILE PURPOSE: Packages one component for iterative improvement by another AI. Names the file, the gap, the constraints, and the expected zip. A request without a component holds.
 * License: GPL-3.0-only.
 */
const COPYRIGHT = "Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.";

export function pack({ component, gap, depth }) {
  if (!component) return { outcome: "HOLD", reason: "Component is UNSPECIFIED" };
  if (!gap) return { outcome: "HOLD", reason: "Gap is UNSPECIFIED" };
  const rules = [
    "Do not flatten the canonical kernel.",
    "Do not exclude a requirement.",
    "A HOLD is a HOLD. Do not return OK for a missing input.",
    "Add a test that fails when the change is removed.",
    "Carry the copyright line on every file.",
    "Name no other organization.",
    "Return a zip named with the component id. Include the changed file, a test, and a note of what you did not change."
  ];
  const prompt = [
    `Improve ${component}.`,
    `Gap: ${gap}.`,
    `Current depth: ${depth || "UNSPECIFIED"}.`,
    `Copyright: ${COPYRIGHT}`,
    "License: GPL-3.0-only.",
    "Constraints:",
    ...rules.map(r => "- " + r)
  ].join("\n");
  return { outcome: "OK", component, prompt, zipName: component.replace(/\//g, "-") + ".zip" };
}

export function accept(kernel, componentId, note) {
  if (!componentId) return { outcome: "HOLD", reason: "Component is UNSPECIFIED" };
  if (!note) return { outcome: "HOLD", reason: "Note is UNSPECIFIED" };
  const id = `handoff_${componentId.replace(/\//g, "_")}`;
  const entity = kernel.upsert({
    id, type: "Artifact", name: componentId, note, status: "RECEIVED",
    provenance: { origin: "handoff", derivedFrom: componentId }
  });
  return { outcome: "OK", id: entity.id };
}
