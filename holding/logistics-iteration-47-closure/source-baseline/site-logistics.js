/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/logistics.js
 * FILE PURPOSE: Logistics graph. Batteries, hazmat, pressure vessels, and reverse logistics. Unknown classification is HOLD.
 * MRD 8: logistics, hazmat, reverse logistics.
 */
export const CLASSES = ["GENERAL", "BATTERY", "HAZMAT", "PRESSURE", "REVERSE"];

export class Logistics {
  constructor(kernel) { this.kernel = kernel; }

  classify(projectId, { id, name, klass, unNumber = null }) {
    if (!CLASSES.includes(klass)) return { outcome: "HOLD", reason: "Classification is UNSPECIFIED" };
    if (klass === "HAZMAT" && !unNumber) return { outcome: "HOLD", reason: "Hazmat needs a UN number" };
    const item = this.kernel.upsert({
      id, type: "Artifact", name, logisticsClass: klass, unNumber,
      provenance: { origin: "logistics", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", item.id);
    return { outcome: "OK", item };
  }

  reverse(projectId, itemId, reason) {
    const item = this.kernel.store.get(itemId);
    if (!item) return { outcome: "HOLD", reason: "Item is UNSPECIFIED" };
    if (!reason) return { outcome: "HOLD", reason: "Reverse reason is UNSPECIFIED" };
    item.reverse = { reason, at: this.kernel._now() };
    this.kernel.upsert(item);
    return { outcome: "OK", item };
  }
}
