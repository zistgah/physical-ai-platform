/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/sir-compiler.js
 * FILE PURPOSE: SIR compiler entry. Compiles a SIR document to the interchange form.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * SIR compiler – Iteration 06
 * Validates, normalizes, and emits a deterministic SIR document.
 * Fails explicitly on loss. Not a general-purpose programming language.
 */

export class SIRCompiler {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** compile: Compiles a tree to the interchange form. */
  compile(projectId) {
    const sir = this.kernel.serializeToSIR(projectId);
    const errors = this.validate(sir);
    if (errors.length) {
      const err = new Error("SIR compile failed: " + errors.join("; "));
      err.errors = errors;
      throw err;
    }
    return this.normalize(sir);
  }

  /** validate: Checks the contract. A failure holds. */
  validate(sir) {
    const errors = [];
    if (!sir || sir.magic !== "PAI-SIR") errors.push("missing magic");
    if (!sir.version) errors.push("missing version");
    if (!sir.header?.projectId) errors.push("missing header.projectId");
    if (!sir.graph?.entities || !sir.graph?.relations) errors.push("missing graph");
    const ids = new Set();
    for (const e of sir.graph?.entities || []) {
      if (!e.id || !e.type) errors.push("entity missing id/type");
      if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
      ids.add(e.id);
      if (!e.provenance) errors.push(`missing provenance on ${e.id}`);
    }
    for (const r of sir.graph?.relations || []) {
      if (!ids.has(r.source)) errors.push(`dangling source ${r.source}`);
      if (!ids.has(r.target)) errors.push(`dangling target ${r.target}`);
    }
    // Fail on silent loss: every entity must appear in graph
    const structuredIds = new Set();
    const collect = (node) => {
      if (!node) return;
      if (Array.isArray(node)) node.forEach(collect);
      else if (node.id) structuredIds.add(node.id);
      else if (typeof node === "object") Object.values(node).forEach(collect);
    };
    collect(sir.lifecycle);
    collect(sir.assurance);
    collect(sir.manufacturing);
    collect(sir.configuration);
    collect(sir.research);
    collect(sir.education);
    collect(sir.operations);
    collect(sir.business);
    for (const id of structuredIds) {
      if (!ids.has(id)) errors.push(`structured section references missing entity ${id}`);
    }
    return errors;
  }

  /** normalize: Performs normalize for this module. */
  normalize(sir) {
    const entities = [...sir.graph.entities].sort((a, b) => a.id.localeCompare(b.id));
    const relations = [...sir.graph.relations].sort((a, b) =>
      `${a.source}|${a.relation}|${a.target}`.localeCompare(`${b.source}|${b.relation}|${b.target}`)
    );
    return {
      ...sir,
      graph: { entities, relations },
      compiledAt: this.kernel._now(),
      compiler: "SIRCompiler/0.1.0-iter06"
    };
  }
}
