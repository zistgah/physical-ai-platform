/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-check.js
 * FILE PURPOSE: SIR type check and kernel load. A program that fails the check is not loaded.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * SIR language type checking and kernel load - Iteration 10
 *
 * This is an overlay package. It does not modify sir-lang.js or the
 * canonical kernel. SIR remains compiled by the existing compiler and
 * this module validates the compiled graph before loading it.
 */

import { compileSource } from "./sir-lang.js";
import { CANONICAL_ENTITY_TYPES, TYPED_RELATIONS } from "../core/canonical-kernel.js";

function asSet(value, fallback, label) {
  const set = value == null ? fallback : new Set(value);
  if (!(set instanceof Set) || set.size === 0) {
    throw new TypeError(`${label} allow-list must be a non-empty iterable`);
  }
  return set;
}

function provenanceFor(entity, projectId, kernel) {
  const p = entity.provenance || {};
  return {
    ...p,
    origin: p.origin || "sir-lang",
    derivedFrom: p.derivedFrom ?? (entity.id === projectId ? null : projectId),
    timestamp: p.timestamp || kernel._now()
  };
}

/**
 * Compile, validate, and load a SIR source into the supplied canonical kernel.
 *
 * options.entityTypes and options.relations may be supplied as the explicit
 * allow-lists for this overlay. By default the Iteration 10 canonical sets
 * are used. No new entity type or relation vocabulary is introduced here.
 */
export function checkAndLoad(source, kernel, options = {}) {
  if (!kernel || typeof kernel.upsert !== "function" || typeof kernel.link !== "function") {
    throw new TypeError("checkAndLoad requires a canonical kernel");
  }

  const entityTypes = asSet(options.entityTypes, CANONICAL_ENTITY_TYPES, "Entity type");
  const relations = asSet(options.relations, TYPED_RELATIONS, "Relation");

  const compiled = compileSource(source);
  const entities = compiled.graph?.entities || [];
  const graphRelations = compiled.graph?.relations || [];

  const unknownTypes = [];
  for (const entity of entities) {
    if (!entityTypes.has(entity.type)) unknownTypes.push(`${entity.id}:${entity.type}`);
  }
  if (unknownTypes.length) {
    throw new Error(`Unknown SIR entity type(s): ${unknownTypes.join(", ")}`);
  }

  const unknownRelations = [];
  for (const edge of graphRelations) {
    if (!relations.has(edge.relation)) {
      unknownRelations.push(edge.relation);
    }
  }
  if (unknownRelations.length) {
    throw new Error(`Unknown SIR relation(s): ${[...new Set(unknownRelations)].join(", ")}`);
  }

  // Validate all references before mutating the kernel.
  const ids = new Set(entities.map(e => e.id));
  for (const edge of graphRelations) {
    if (!ids.has(edge.source)) throw new Error(`Dangling source ${edge.source}`);
    if (!ids.has(edge.target)) throw new Error(`Dangling target ${edge.target}`);
  }

  // Upsert the complete compiled graph. Evidence requirements remain
  // constraints and are deliberately not materialized as Evidence entities.
  for (const entity of entities) {
    kernel.upsert({
      ...entity,
      provenance: provenanceFor(entity, compiled.identity.id, kernel)
    });
  }

  const loadedRelations = [];
  for (const edge of graphRelations) {
    loadedRelations.push(kernel.link(edge.source, edge.relation, edge.target));
  }

  return {
    compiled,
    projectId: compiled.identity.id,
    entities: entities.map(e => kernel.store.get(e.id)),
    relations: loadedRelations,
    constraints: compiled.constraints || []
  };
}

export { CANONICAL_ENTITY_TYPES, TYPED_RELATIONS };


/** evaluateConstraints: Performs evaluate constraints for this module. */
export function evaluateConstraints(kernel, projectId) {
  const graph = kernel.getProjectGraph(projectId);
  const constraints = graph.entities
    .filter(e => e.type === "Constraint" || e.constraint)
    .map(e => ({ id: e.id, status: e.status || "UNSPECIFIED" }));
  return {
    language: "sir-lang/0.1",
    complete: false,
    note: "Domain interchange language. Not a general-purpose programming language.",
    constraints
  };
}
