/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/graph/projections.js
 * FILE PURPOSE: One model, many views. A projection is a filter over the same graph. It does not copy. A view of an empty graph is empty.
 * MRD 1.
 */
export function project(graph, view) {
  if (!graph?.entities) return { outcome: "HOLD", reason: "No graph" };
  const filters = {
    architecture: e => ["System", "Subsystem", "Component"].includes(e.type),
    physical: e => ["Component", "Solid", "Geometry", "Sketch"].includes(e.type),
    electrical: e => ["Port", "Interface", "Connection"].includes(e.type),
    manufacturing: e => ["WorkOrder", "Process", "Material", "Component"].includes(e.type),
    commercial: e => ["Cost", "Order", "Funding", "Customer"].includes(e.type),
    regulatory: e => ["Standard", "ComplianceCase", "Evidence", "Hazard"].includes(e.type)
  };
  const f = filters[view];
  if (!f) return { outcome: "HOLD", reason: "View is not known" };
  const entities = graph.entities.filter(f);
  const ids = new Set(entities.map(e => e.id));
  const relations = (graph.relations || []).filter(r => ids.has(r.source) && ids.has(r.target));
  return { outcome: "OK", view, entities, relations, sameModel: true };
}
