/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/billing.js
 * FILE PURPOSE: Billing end to end. A meter records usage. An invoice is issued from the meter. A payment settles the invoice. Nothing is estimated. An invoice without a meter holds.
 * MRD 8: billing, NRE, tooling.
 */
export class Billing {
  constructor(kernel) { this.kernel = kernel; }

  meter(projectId, { id, unit, rate }) {
    if (!unit) return { outcome: "HOLD", reason: "Unit is UNSPECIFIED" };
    if (!(rate > 0)) return { outcome: "HOLD", reason: "Rate must be positive" };
    const m = this.kernel.upsert({
      id, type: "Cost", name: id, unit, rate, usage: 0, status: "OPEN",
      provenance: { origin: "billing", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", m.id);
    return { outcome: "OK", meter: m };
  }

  record(meterId, quantity) {
    const m = this.kernel.store.get(meterId);
    if (!m || m.type !== "Cost") return { outcome: "HOLD", reason: "Meter is UNSPECIFIED" };
    if (!(quantity > 0)) return { outcome: "HOLD", reason: "Quantity must be positive" };
    m.usage = (m.usage || 0) + quantity;
    this.kernel.upsert(m);
    return { outcome: "OK", usage: m.usage, amount: m.usage * m.rate };
  }

  invoice(projectId, meterId, { id }) {
    const m = this.kernel.store.get(meterId);
    if (!m || !(m.usage > 0)) return { outcome: "HOLD", reason: "Nothing to invoice" };
    const amount = m.usage * m.rate;
    const inv = this.kernel.upsert({
      id, type: "Order", name: id, meterId, amount, status: "ISSUED",
      provenance: { origin: "billing", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", inv.id);
    return { outcome: "OK", invoice: inv };
  }

  pay(invoiceId, amount) {
    const inv = this.kernel.store.get(invoiceId);
    if (!inv || inv.type !== "Order") return { outcome: "HOLD", reason: "Invoice is UNSPECIFIED" };
    if (amount !== inv.amount) return { outcome: "HOLD", reason: "Payment does not match" };
    inv.status = "PAID";
    inv.paid = amount;
    this.kernel.upsert(inv);
    return { outcome: "OK", status: "PAID" };
  }
}
