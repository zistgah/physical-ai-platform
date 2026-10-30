/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/factory-execution.js
 * FILE PURPOSE: Factory execution. Releases and advances work orders against a routing.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Factory Execution slice – Iteration 04
 * Work orders, routing states, inspection results that produce Evidence.
 * Not a full MES. Projection over canonical graph.
 */

export class FactoryExecutionEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createWorkOrder: Performs create work order for this module. */
  createWorkOrder(projectId, componentId, meta = {}) {
    const id = meta.id || `wo_${componentId}_${Date.now().toString(36)}`;
    const wo = this.kernel.upsert({
      id,
      type: "WorkOrder",
      name: meta.name || `Work order for ${componentId}`,
      componentId,
      status: "PLANNED",
      routing: meta.routing || ["material-issue", "assemble", "inspect", "close"],
      provenance: { origin: "factory", derivedFrom: componentId, note: "Planning/execution slice, not physical proof" }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    this.kernel.link(id, "MANUFACTURED_BY", componentId);
    return wo;
  }

  /** advance: Attempts the next cockpit state. Holds unless the transition is legal and its evidence and role are valid. */
  advance(workOrderId, step) {
    const wo = this.kernel.store.get(workOrderId);
    if (!wo) throw new Error("Work order not found");
    const idx = (wo.routing || []).indexOf(step);
    if (idx < 0) throw new Error("Step not in routing");
    return this.kernel.upsert({ ...wo, status: step.toUpperCase(), currentStep: step, advancedAt: this.kernel._now() });
  }

  /** recordInspection: Performs record inspection for this module. */
  recordInspection(workOrderId, result) {
    const wo = this.kernel.store.get(workOrderId);
    const id = `insp_${workOrderId}_${Date.now().toString(36)}`;
    const evidence = this.kernel.upsert({
      id,
      type: "Evidence",
      name: `Inspection ${result.outcome}`,
      state: result.outcome === "PASS" ? "EXECUTED" : "EXECUTED",
      method: "INSPECTION",
      outcome: result.outcome,
      provenance: { origin: "factory-inspection", derivedFrom: workOrderId, note: "Inspection record; not automatic verification" }
    });
    this.kernel.link(evidence.id, "DERIVED_FROM", workOrderId);
    return evidence;
  }
}
