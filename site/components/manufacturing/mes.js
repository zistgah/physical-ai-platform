/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/mes.js
 * FILE PURPOSE: MES adapter. Machines, queues, and gated routing. Not a shop-floor system.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * MES – Iteration 17
 * Shop floor: machines, queues, work orders, gated routing.
 */
export class MES {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** machine: Registers a machine on the project. */
  machine(projectId, { id, name }) {
    const m = this.kernel.upsert({ id, type: "Process", name, status: "IDLE", queue: [], provenance: { origin: "mes", derivedFrom: projectId } });
    this.kernel.link(projectId, "CONTAINS", m.id);
    return m;
  }

  /** release: Releases a work order. Holds if the routing is unspecified. */
  release(projectId, { id, componentId, processId, steps }) {
    if (!steps?.length) return { outcome: "HOLD", reason: "Routing is UNSPECIFIED" };
    const wo = this.kernel.upsert({
      id, type: "WorkOrder", name: id, componentId, processId,
      status: "RELEASED", stepIndex: 0, steps,
      provenance: { origin: "mes", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", wo.id);
    if (componentId && processId) this.kernel.link(componentId, "MANUFACTURED_BY", processId);
    const machine = this.kernel.store.get(processId);
    if (machine) machine.queue = [...(machine.queue || []), wo.id];
    return wo;
  }

  /** advance: Attempts the next cockpit state. Holds unless the transition is legal and its evidence and role are valid. */
  advance(workOrderId, { inspectionPass = false } = {}) {
    const wo = this.kernel.store.get(workOrderId);
    if (!wo || wo.type !== "WorkOrder") return { outcome: "HOLD", reason: "Work order is UNSPECIFIED" };
    const step = wo.steps[wo.stepIndex];
    if (!step) return { outcome: "HOLD", reason: "No remaining step" };
    if (step.inspection && !inspectionPass) return { outcome: "HOLD", reason: `Step ${step.name} requires a passing inspection` };
    wo.stepIndex += 1;
    wo.status = wo.stepIndex >= wo.steps.length ? "COMPLETE" : "IN_PROCESS";
    if (wo.status === "COMPLETE" && wo.componentId) {
      this.kernel.link(wo.id, "PRODUCES", wo.componentId);
    }
    return wo;
  }
}
