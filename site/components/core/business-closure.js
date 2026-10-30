/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/business-closure.js
 * FILE PURPOSE: Business closure. Projects commercial state from the canonical graph without creating a second store.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Business closure – Iteration 06
 * Cost rollup, customer order, service event. Substrate, not an ERP.
 */

export class BusinessClosure {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** rollup: Performs rollup for this module. */
  rollup(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const components = graph.entities.filter(e => e.type === "Component");
    const lines = components.map(c => ({
      id: c.id,
      material: Number(c.costMaterial || 0),
      process: Number(c.costProcess || 0),
      labor: Number(c.costLabor || 0)
    })).sort((a, b) => a.id.localeCompare(b.id));
    const total = lines.reduce((s, l) => s + l.material + l.process + l.labor, 0);
    return {
      projectId,
      lines,
      total,
      provenance: { origin: "business-rollup", derivedFrom: projectId, note: "Declared-cost rollup; not an invoice" }
    };
  }

  /** createOrder: Performs create order for this module. */
  createOrder(projectId, customerId, meta = {}) {
    const id = meta.id || `order_${Date.now().toString(36)}`;
    const order = this.kernel.upsert({
      id,
      type: "ServiceEvent",
      name: meta.name || "Customer order",
      customerId,
      status: "OPEN",
      provenance: { origin: "business", derivedFrom: customerId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return order;
  }
}
