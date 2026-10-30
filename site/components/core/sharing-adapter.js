/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/sharing-adapter.js
 * FILE PURPOSE: Sharing adapter. Projects a shareable view from the graph. Never auto-publishes.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
function assertKernel(kernel) {
  if (!kernel || typeof kernel.getProjectGraph !== "function" || !kernel.store) throw new Error("A canonical kernel is required");
}
/** exportPackage: Sharing adapter. Projects a shareable view from the graph. Never auto-publishes. */
export function exportPackage(kernel, projectId) {
  assertKernel(kernel);
  const graph = kernel.getProjectGraph(projectId);
  return {
    projectId: graph.projectId,
    entities: graph.entities,
    relations: graph.relations,
    trust: { status: "EXPORTED", validationStatus: "NOT_ESTABLISHED", verified: false, entityCount: graph.entities.length, relationCount: graph.relations.length }
  };
}
function importEntity(kernel, entity) {
  const now = kernel._now();
  return kernel.upsert({ ...entity,
    trust: { ...(entity.trust || {}), status: "IMPORTED", validationStatus: "UNVERIFIED", verified: false, importedAt: now },
    provenance: { ...(entity.provenance || {}), origin: "import", derivedFrom: entity.id, timestamp: now, note: "Imported by sharing adapter; not automatically verified" }
  }, "sharing-adapter");
}
/** importPackage: Sharing adapter. Projects a shareable view from the graph. Never auto-publishes. */
export function importPackage(kernel, payload) {
  assertKernel(kernel);
  if (!payload || !Array.isArray(payload.entities) || !Array.isArray(payload.relations)) throw new Error("Invalid sharing package: entities and relations are required");
  const entities = payload.entities.map(e => {
    if (!e || !e.id || !e.type) throw new Error("Invalid imported entity: stable id and type are required");
    return importEntity(kernel, e);
  });
  for (const r of payload.relations) {
    if (!r || !r.source || !r.relation || !r.target) throw new Error("Invalid imported relation");
    const exists = kernel.store.relations.some(x => x.source === r.source && x.relation === r.relation && x.target === r.target);
    if (!exists) kernel.link(r.source, r.relation, r.target, r.metadata || {});
  }
  return { projectId: payload.projectId, entities, relations: payload.relations.map(r => ({ ...r })), trust: { status: "IMPORTED", validationStatus: "UNVERIFIED", verified: false, entityCount: entities.length, relationCount: payload.relations.length } };
}
