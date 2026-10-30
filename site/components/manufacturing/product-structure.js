/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/product-structure.js
 * FILE PURPOSE: Product structure. EBOM projection from the component graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-MFG-STRUCTURE - Manufacturing product structure projection.
 *
 * Canonical-graph projection only. This is not a MES and does not replace
 * manufacturing-engine.js. It does not activate or redefine kernel relations.
 *
 * Architectural boundary:
 * - PART_OF is used only where the Iteration 10 kernel resolves it: Component -> Project.
 * - SUPPLIED_BY remains unresolved in the canonical registry. This package never
 *   creates that edge or assumes its direction. Existing SUPPLIED_BY edges are
 *   inspected only when their endpoints unambiguously include a Supplier.
 * - Manufacturing direction is unresolved. Process is therefore represented as
 *   a Process entity referenced by the component's processId field and exposed
 *   in the MBOM projection. No MANUFACTURED_BY edge is created.
 *
 * The projection contains no private store, ontology, or semantic graph.
 */

export class ProductStructure {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel) throw new Error("ProductStructure requires a canonical kernel");
    this.kernel = kernel;
  }

  /**
   * Return the product structure as EBOM and MBOM projections over the canonical graph.
   * Provenance on every projected line is derived from the component id.
   */
  query(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const byId = new Map(graph.entities.map(e => [e.id, e]));
    const components = graph.entities.filter(e => e.type === "Component");
    // Product-structure references are resolved against the canonical store.
    // This is not a second store: kernel.store remains the sole entity store.
    const materials = new Map(this.kernel.store.all("Material").map(e => [e.id, e]));
    const processes = new Map(this.kernel.store.all("Process").map(e => [e.id, e]));
    const workInstructions = new Map(this.kernel.store.all("WorkInstruction").map(e => [e.id, e]));
    for (const entity of this.kernel.store.all()) byId.set(entity.id, entity);

    const ebom = components.map(component => ({
      componentId: component.id,
      name: component.name,
      version: component.version,
      type: "engineering",
      provenance: {
        derivedFrom: component.id,
        generator: "ProductStructure/WP-MFG-STRUCTURE"
      }
    }));

    const mbom = components.map(component => {
      const material = component.materialId ? materials.get(component.materialId) : null;
      const process = component.processId ? processes.get(component.processId) : null;
      const instructionIds = Array.isArray(component.workInstructionIds)
        ? component.workInstructionIds
        : [];
      const instructions = instructionIds.map(id => workInstructions.get(id)).filter(Boolean);
      const supplier = this._supplierFor(component.id, graph.relations, byId);

      const missing = [];
      if (!material) missing.push("material");
      if (!process) missing.push("process");

      return {
        componentId: component.id,
        component: { id: component.id, name: component.name },
        material: material
          ? { id: material.id, name: material.name }
          : "UNSPECIFIED",
        process: process
          ? { id: process.id, name: process.name }
          : "UNSPECIFIED",
        workInstructions: instructions.map(w => ({ id: w.id, name: w.name })),
        supplier: supplier
          ? { id: supplier.id, name: supplier.name }
          : "UNSPECIFIED",
        status: missing.length ? "HOLD" : "READY",
        gap: missing.length
          ? `Missing required product-structure input: ${missing.join(", ")}`
          : null,
        provenance: {
          derivedFrom: component.id,
          generator: "ProductStructure/WP-MFG-STRUCTURE"
        }
      };
    });

    return {
      projectId,
      ebom,
      mbom,
      provenance: {
        derivedFrom: components.map(c => c.id),
        generator: "ProductStructure/WP-MFG-STRUCTURE",
        note: "Canonical graph traversal/projection; not MES execution."
      }
    };
  }

  /** Convenience alias for callers that explicitly request EBOM/MBOM. */
  structure(projectId) {
    return this.query(projectId);
  }

  /** _supplierFor: Performs _supplier for for this module. */
  _supplierFor(componentId, relations, byId) {
    const candidates = relations.filter(r => r.relation === "SUPPLIED_BY" &&
      (r.source === componentId || r.target === componentId));

    for (const relation of candidates) {
      const otherId = relation.source === componentId ? relation.target : relation.source;
      const other = byId.get(otherId);
      if (other?.type === "Supplier") return other;
    }
    return null;
  }
}

export default ProductStructure;
