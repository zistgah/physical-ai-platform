/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/sovereignty-view.js
 * FILE PURPOSE: Sovereignty as a graph view. Lists components with external control. An empty graph is empty. Not a percentage.
 * MRD 8, 9.
 */
export function exposure(graph) {
  if (!graph?.entities) return { outcome: "HOLD", reason: "No graph" };
  const external = graph.entities.filter(e => e.type === "Component" && e.externalControl === true);
  return { outcome: "OK", count: external.length, ids: external.map(e => e.id), note: "A list, not a percentage." };
}
