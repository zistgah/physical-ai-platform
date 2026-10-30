/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/factory-resolution.js
 * FILE PURPOSE: Factory resolution. Resolves MANUFACTURED_BY in both directions.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Manufacturing resolution – Iteration 18
 * Records the process and settles MANUFACTURED_BY.
 * WorkOrder still PRODUCES the component.
 */
export class FactoryResolution {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** record: Performs record for this module. */
  record(projectId, { componentId, processName, orderName } = {}) {
    if (!componentId || !this.kernel.store.get(componentId)) {
      return { outcome: "HOLD", reason: "Component is UNSPECIFIED", manufacturedBy: "UNRESOLVED" };
    }
    const process = this.kernel.upsert({
      id: `proc_${componentId}`,
      type: "Process",
      name: processName || "UNSPECIFIED",
      provenance: { origin: "factory-resolution", derivedFrom: projectId, timestamp: this.kernel._now() }
    });
    const order = this.kernel.upsert({
      id: `wo_${componentId}`,
      type: "WorkOrder",
      name: orderName || "UNSPECIFIED",
      provenance: { origin: "factory-resolution", derivedFrom: projectId, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", order.id);
    this.kernel.link(projectId, "CONTAINS", process.id);
    this.kernel.link(order.id, "PRODUCES", componentId);
    this.kernel.link(order.id, "MANUFACTURED_BY", componentId);
    this.kernel.link(componentId, "MANUFACTURED_BY", process.id);
    return {
      outcome: "RECORDED",
      processId: process.id,
      workOrderId: order.id,
      manufacturedBy: process.id,
      note: "Component MANUFACTURED_BY Process. WorkOrder PRODUCES Component and keeps the factory precedent."
    };
  }
}
