/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/factory-closure.js
 * FILE PURPOSE: Factory closure. Projects factory state and closes a work order when its steps are done.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Factory closure – Iteration 06
 * Process plan, routing execution, quality record, scrap/yield.
 * Planning/execution slice. Not a production MES.
 */

export class FactoryClosure {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** plan: Returns a draft plan. AI is not the authority. */
  plan(componentId) {
    const c = this.kernel.store.get(componentId);
    if (!c) throw new Error("Component not found");
    return {
      componentId,
      material: c.material || "UNSPECIFIED",
      process: c.process || "assemble",
      machine: c.machine || "UNSPECIFIED",
      tool: c.tool || "UNSPECIFIED",
      fixture: c.fixture || "UNSPECIFIED",
      tolerance: c.tolerance || null,
      inspection: ["visual", "functional"],
      operatorSkill: c.operatorSkill || "UNSPECIFIED",
      cycleTime: c.cycleTime || null,
      yield: c.yield || null,
      scrap: c.scrap || null,
      provenance: { derivedFrom: componentId, note: "Process plan slice; not factory execution proof" }
    };
  }

  /** qualityRecord: Performs quality record for this module. */
  qualityRecord(workOrderId, { outcome, inspector }) {
    const id = `qr_${workOrderId}_${Date.now().toString(36)}`;
    const ev = this.kernel.upsert({
      id,
      type: "Evidence",
      name: `Quality record ${outcome}`,
      state: "EXECUTED",
      method: "INSPECTION",
      outcome,
      inspector: inspector || "UNSPECIFIED",
      provenance: { origin: "factory-quality", derivedFrom: workOrderId, note: "Quality record; not physical verification of the system" }
    });
    this.kernel.link(ev.id, "DERIVED_FROM", workOrderId);
    return ev;
  }
}
