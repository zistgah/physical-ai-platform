/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/substitution.js
 * FILE PURPOSE: Substitution analysis. Criticality, irreplaceability, and external control over the supply graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-SOVEREIGNTY - substitution and single-source analysis.
 *
 * This package is an analysis layer over the canonical semantic graph.
 * It does not create a second graph, store, ontology, or relation vocabulary.
 *
 * Architectural boundary:
 * - SUPPLIED_BY identifies supply relationships to Supplier entities.
 * - DEPENDS_ON is a distinct dependency relation and is never counted as supply.
 * - No country, percentage, sovereignty score, or substitution claim is invented.
 * - Missing supplier information remains UNSPECIFIED/HOLD.
 */

const SUPPLIED_BY = "SUPPLIED_BY";
const DEPENDS_ON = "DEPENDS_ON";
const SUPPLIER = "Supplier";

function hold(reason, details = {}) {
  return {
    outcome: "HOLD",
    reason,
    status: "UNSPECIFIED",
    ...details
  };
}

export class SubstitutionAnalysis {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel || !kernel.store || typeof kernel.store.get !== "function") {
      throw new Error("SubstitutionAnalysis requires a canonical kernel");
    }
    this.kernel = kernel;
  }

  /**
   * Validate a relation endpoint without inventing a missing entity.
   * The missing-target path deliberately produces HOLD/UNSPECIFIED.
   */
  validateRelationInput({ source, target, relation = SUPPLIED_BY } = {}) {
    if (!source) {
      return hold(`Missing source for ${relation}`);
    }
    if (!target) {
      return hold(`Missing target for ${relation}`, {
        sourceId: source.id ?? null,
        relation
      });
    }
    return { outcome: "READY", status: "SPECIFIED", source, target, relation };
  }

  /**
   * Return only canonical-graph SUPPLIED_BY edges from the component to
   * Supplier entities. DEPENDS_ON edges are deliberately ignored for the
   * supplier count.
   */
  suppliersFor(componentId) {
    const component = this.kernel.store.get(componentId);
    if (!component) return { componentId, suppliers: [], status: "UNSPECIFIED" };

    const suppliers = this.kernel.store.relations
      .filter(r => r.source === componentId && r.relation === SUPPLIED_BY)
      .map(r => this.kernel.store.get(r.target))
      .filter(entity => entity?.type === SUPPLIER);

    return {
      componentId,
      suppliers,
      status: suppliers.length ? "SPECIFIED" : "UNSPECIFIED"
    };
  }

  /**
   * Analyze single-source status from SUPPLIED_BY -> Supplier only.
   *
   * 1 supplier  => single-source
   * 0 suppliers => unresolved/HOLD
   * 2+ suppliers => not single-source
   * DEPENDS_ON  => never changes the supplier count
   */
  analyze(componentId) {
    const component = this.kernel.store.get(componentId);
    if (!component) {
      return hold("Component is missing", { componentId, supplierCount: null, suppliers: [] });
    }

    const supplierResult = this.suppliersFor(componentId);
    const suppliers = supplierResult.suppliers;

    if (suppliers.length === 0) {
      // Exercise the validator with the actual missing target rather than
      // manufacturing a pre-computed HOLD result.
      const validation = this.validateRelationInput({
        source: component,
        target: undefined,
        relation: SUPPLIED_BY
      });
      return {
        ...validation,
        componentId,
        supplierCount: 0,
        suppliers: []
      };
    }

    if (suppliers.length === 1) {
      return {
        outcome: "SINGLE_SOURCE",
        status: "SPECIFIED",
        componentId,
        supplierCount: 1,
        suppliers
      };
    }

    return {
      outcome: "NOT_SINGLE_SOURCE",
      status: "SPECIFIED",
      componentId,
      supplierCount: suppliers.length,
      suppliers
    };
  }

  /**
   * Analyze several components without introducing any aggregate sovereignty
   * score or percentage.
   */
  analyzeMany(componentIds = []) {
    return componentIds.map(id => this.analyze(id));
  }

  /**
   * Expose dependency edges for inspection only. They are not supplier edges
   * and therefore do not affect analyze().
   */
  dependenciesFor(componentId) {
    return this.kernel.store.relations
      .filter(r => r.source === componentId && r.relation === DEPENDS_ON)
      .map(r => this.kernel.store.get(r.target))
      .filter(Boolean);
  }
}

export default SubstitutionAnalysis;
