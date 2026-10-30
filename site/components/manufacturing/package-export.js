/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/package-export.js
 * FILE PURPOSE: Manufacturing package export. Projects the same numbers used elsewhere.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Manufacturing package and commerce export – Iteration 20
 * Spec, funding pack, and manufacturing package share one cost.
 */
export class PackageExport {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** exportAll: Performs export all for this module. */
  exportAll(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const materials = graph.entities.filter(e => e.type === "Material");
    const orders = graph.entities.filter(e => e.type === "WorkOrder");
    if (!materials.length || !orders.length) return { outcome: "HOLD", reason: "BOM or work order is UNSPECIFIED" };
    const cost = materials.reduce((s, m) => s + (m.qty || 0) * (m.cost || 0), 0);
    const pack = {
      spec: { projectId, cost, items: materials.map(m => m.sku || m.name) },
      funding: { projectId, ask: cost, basis: "material rollup" },
      manufacturing: { projectId, cost, orders: orders.map(o => o.id) }
    };
    if (pack.spec.cost !== pack.funding.ask || pack.spec.cost !== pack.manufacturing.cost) {
      return { outcome: "HOLD", reason: "Export numbers diverged" };
    }
    return { outcome: "OK", pack };
  }
}
