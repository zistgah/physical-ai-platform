/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/business-engine.js
 * FILE PURPOSE: Business engine. Records commercial entities and projections over the system model.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Business Engine – Iteration 04
 * Cost aggregation and funding/customer objects on the canonical graph.
 * Not a full ERP. Substrate for later economic analysis.
 */

export class BusinessEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** aggregateCost: Performs aggregate cost for this module. */
  aggregateCost(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const components = graph.entities.filter(e => e.type === "Component");
    let material = 0, process = 0, labor = 0;
    for (const c of components) {
      material += Number(c.costMaterial || 0);
      process += Number(c.costProcess || 0);
      labor += Number(c.costLabor || 0);
    }
    return {
      projectId,
      material, process, labor,
      total: material + process + labor,
      provenance: { origin: "business", derivedFrom: projectId, note: "Aggregation of declared costs; not an invoice" }
    };
  }

  /** createFunding: Performs create funding for this module. */
  createFunding(projectId, meta = {}) {
    const id = meta.id || `fund_${Date.now().toString(36)}`;
    const f = this.kernel.upsert({
      id,
      type: "Funding",
      name: meta.name || "Funding",
      amount: meta.amount || 0,
      status: meta.status || "PROPOSED",
      provenance: { origin: "business", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return f;
  }

  /** createCustomer: Performs create customer for this module. */
  createCustomer(projectId, meta = {}) {
    const id = meta.id || `cust_${Date.now().toString(36)}`;
    const c = this.kernel.upsert({
      id,
      type: "Customer",
      name: meta.name || "Customer",
      status: "ACTIVE",
      provenance: { origin: "business", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return c;
  }
}
