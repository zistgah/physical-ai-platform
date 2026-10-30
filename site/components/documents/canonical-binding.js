/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/canonical-binding.js
 * FILE PURPOSE: canonical binding. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Canonical project binding adapter.
 * Reads from the existing kernel; never creates a second project ontology.
 */
const isMissing = value => value === undefined || value === null || value === "UNSPECIFIED";

export class CanonicalProjectAdapter {
  constructor(kernel) {
    if (!kernel || typeof kernel.getProjectGraph !== "function") {
      throw new Error("CanonicalProjectAdapter requires kernel.getProjectGraph(projectId)");
    }
    this.kernel = kernel;
  }

  graph(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    if (!graph || !Array.isArray(graph.entities)) throw new Error(`Project graph unavailable: ${projectId}`);
    return graph;
  }

  entities(projectId, type) {
    const entities = this.graph(projectId).entities;
    return type ? entities.filter(e => e.type === type) : entities.slice();
  }

  byId(projectId, id) {
    return this.entities(projectId).find(e => e.id === id) || null;
  }

  /**
   * Explicit binding DSL. No eval, dynamic property paths or arbitrary functions.
   * Supported selectors: project, entities, entity, count, sum.
   */
  resolve(projectId, binding = {}) {
    const graph = this.graph(projectId);
    const kind = binding.kind;
    if (kind === "project") return { value: graph.project || graph.root || { id: projectId }, source: "CANONICAL_GRAPH" };
    if (kind === "entities") {
      return { value: this.entities(projectId, binding.entity_type), source: "CANONICAL_GRAPH" };
    }
    if (kind === "entity") {
      const entity = this.byId(projectId, binding.entity_id);
      return { value: entity, source: "CANONICAL_GRAPH", missing: !entity };
    }
    if (kind === "count") {
      return { value: this.entities(projectId, binding.entity_type).length, source: "DERIVED_GRAPH_QUERY" };
    }
    if (kind === "sum") {
      const entities = this.entities(projectId, binding.entity_type);
      const field = binding.field;
      const missing = entities.filter(e => isMissing(e[field]));
      if (missing.length) return { value: null, source: "DERIVED_GRAPH_QUERY", missing: true,
        reason: `Missing ${field} on ${missing.map(e => e.id).join(", ")}` };
      return { value: entities.reduce((n, e) => n + Number(e[field]), 0), source: "DERIVED_GRAPH_QUERY",
        inputs: entities.map(e => e.id), formula: `sum(${binding.entity_type}.${field})` };
    }
    throw new Error(`Unsupported binding kind: ${kind}`);
  }
}

export function valueEnvelope(value, sourceKind, sourceRef, extra = {}) {
  const missing = value === undefined || value === null || value === "UNSPECIFIED";
  return {
    value: missing ? null : value,
    value_state: missing ? "UNSPECIFIED" : (sourceKind === "DERIVED_GRAPH_QUERY" ? "DERIVED" : "PROVIDED"),
    source: { kind: sourceKind, ref: sourceRef || null, ...extra },
    review: { state: "UNREVIEWED", reviewer: null, reviewed_at: null }
  };
}
