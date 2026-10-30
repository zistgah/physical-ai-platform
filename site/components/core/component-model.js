/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/component-model.js
 * FILE PURPOSE: Component model contract. Every component carries units, safety class, substitution candidates, and port schemas.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Component model – Iteration 20
 * A Component without the model fields HOLDs.
 */
export const MODEL_FIELDS = ["version", "interfaceVersion", "units", "safetyClass", "ports", "substitution"];

/** assertComponentModel: Component model contract. Every component carries units, safety class, substitution candidates, and port schemas. */
export function assertComponentModel(component) {
  if (!component || component.type !== "Component") return { outcome: "HOLD", reason: "Not a component" };
  const missing = MODEL_FIELDS.filter(f => component[f] == null || (Array.isArray(component[f]) && component[f].length === 0 && f === "ports"));
  if (missing.length) return { outcome: "HOLD", reason: `Component missing ${missing.join(", ")}` };
  return { outcome: "OK", component };
}

/** completeComponent: Component model contract. Every component carries units, safety class, substitution candidates, and port schemas. */
export function completeComponent(kernel, projectId, fields) {
  const checked = assertComponentModel({ type: "Component", ...fields });
  if (checked.outcome === "HOLD") return checked;
  const entity = kernel.upsert({
    ...fields,
    type: "Component",
    provenance: { origin: "component-model", derivedFrom: projectId }
  });
  kernel.link(projectId, "CONTAINS", entity.id);
  return { outcome: "OK", component: entity };
}
