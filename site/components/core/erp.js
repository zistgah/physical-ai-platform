/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/erp.js
 * FILE PURPOSE: ERP adapter. Issues an order once. An order is not a Customer. Stock moves only on a real issue.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * ERP – Iteration 17
 * Inventory, issue, customer order. Stock cannot go negative.
 */
export class ERP {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** stock: Performs stock for this module. */
  stock(projectId, { id, sku, qty, cost }) {
    const item = this.kernel.upsert({ id, type: "Material", name: sku, sku, qty, cost, provenance: { origin: "erp", derivedFrom: projectId } });
    this.kernel.link(projectId, "CONTAINS", item.id);
    return item;
  }

  /** order: Performs order for this module. */
  order(projectId, { id, customerId, lines }) {
    const o = this.kernel.upsert({ id, type: "Order", name: id, customerId, lines, status: "OPEN", provenance: { origin: "erp", derivedFrom: projectId } });
    this.kernel.link(projectId, "CONTAINS", o.id);
    return o;
  }

  /** issue: Issues an order once. A second issue does not move stock again. */
  issue(orderId) {
    const order = this.kernel.store.get(orderId);
    if (!order) return { outcome: "HOLD", reason: "Order is UNSPECIFIED" };
    if (order.status === "ISSUED") return { outcome: "HOLD", reason: "Order already issued" };
    let total = 0;
    for (const line of order.lines) {
      const item = this.kernel.store.get(line.materialId);
      if (!item || item.qty < line.qty) return { outcome: "HOLD", reason: `Insufficient stock for ${line.materialId}` };
    }
    for (const line of order.lines) {
      const item = this.kernel.store.get(line.materialId);
      item.qty -= line.qty;
      total += line.qty * item.cost;
    }
    order.status = "ISSUED";
    order.cost = total;
    return order;
  }
}
