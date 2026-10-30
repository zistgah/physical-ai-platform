/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/inspector.js
 * FILE PURPOSE: Graph inspector. Lists entities and relations for a view.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Graph inspector - Iteration 10
 *
 * Reads the canonical kernel graph only. This component owns no store,
 * ontology, relation registry, or semantic model.
 *
 * The inspected entity is not assumed to own every adjacent edge:
 * inbound relations are reported where the inspected entity is the target,
 * outbound relations where it is the source.
 */

export function inspect(kernel, projectId, entityId) {
  const graph = kernel.getProjectGraph(projectId);
  const entity = graph.entities.find(e => e.id === entityId);

  if (!entity) {
    return {
      found: false,
      projectId,
      entityId,
      gap: "Entity is not present in the requested project graph"
    };
  }

  const entitiesById = new Map(graph.entities.map(e => [e.id, e]));

  const inbound = [];
  const outbound = [];

  for (const relation of graph.relations) {
    if (relation.target === entityId) {
      const neighbor = entitiesById.get(relation.source);
      if (neighbor) {
        inbound.push({
          relation: structuredClone(relation),
          neighbor: structuredClone(neighbor)
        });
      }
    }

    if (relation.source === entityId) {
      const neighbor = entitiesById.get(relation.target);
      if (neighbor) {
        outbound.push({
          relation: structuredClone(relation),
          neighbor: structuredClone(neighbor)
        });
      }
    }
  }

  const edgeOrder = (a, b) => {
    const ar = a.relation;
    const br = b.relation;
    const ak = `${ar.relation}|${ar.source}|${ar.target}`;
    const bk = `${br.relation}|${br.source}|${br.target}`;
    return ak.localeCompare(bk);
  };

  inbound.sort(edgeOrder);
  outbound.sort(edgeOrder);

  return {
    found: true,
    projectId,
    entity: structuredClone(entity),
    inbound,
    outbound
  };
}
