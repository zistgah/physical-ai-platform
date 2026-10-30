/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/factory.js
 * FILE PURPOSE: A factory. Machines have capacity. A work order advances only along its routing. A full machine holds. Completion needs every step done.
 * MRD 8: manufacturing as a factory.
 */
export class Factory {
  constructor(kernel) { this.kernel = kernel; this.machines = new Map(); }

  machine(projectId, { id, name, capacity = 1 }) {
    if (!(capacity >= 1)) return { outcome: "HOLD", reason: "Capacity must be at least 1" };
    const m = { id, name, capacity, queue: [], busy: 0 };
    this.machines.set(id, m);
    this.kernel.upsert({ id, type: "Process", name, capacity, status: "IDLE", provenance: { origin: "factory", derivedFrom: projectId } });
    this.kernel.link(projectId, "CONTAINS", id);
    return { outcome: "OK", machine: m };
  }

  release(projectId, { id, steps }) {
    if (!steps?.length) return { outcome: "HOLD", reason: "Routing is UNSPECIFIED" };
    for (const step of steps) if (!this.machines.has(step)) return { outcome: "HOLD", reason: "Step has no machine" };
    const wo = this.kernel.upsert({
      id, type: "WorkOrder", name: id, steps, stepIndex: 0, status: "RELEASED",
      provenance: { origin: "factory", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", wo.id);
    return this.advance(id);
  }

  advance(workOrderId) {
    const wo = this.kernel.store.get(workOrderId);
    if (!wo || wo.type !== "WorkOrder") return { outcome: "HOLD", reason: "Work order is UNSPECIFIED" };
    if (wo.stepIndex >= wo.steps.length) return { outcome: "OK", status: "COMPLETE", wo };
    const machine = this.machines.get(wo.steps[wo.stepIndex]);
    if (!machine) return { outcome: "HOLD", reason: "Machine is UNSPECIFIED" };
    if (machine.busy >= machine.capacity) return { outcome: "HOLD", reason: "Machine is full" };
    machine.busy += 1;
    machine.queue.push(wo.id);
    wo.status = "IN_PROCESS";
    wo.currentStep = wo.steps[wo.stepIndex];
    this.kernel.upsert(wo);
    return { outcome: "OK", status: "IN_PROCESS", step: wo.currentStep };
  }

  complete(workOrderId) {
    const wo = this.kernel.store.get(workOrderId);
    if (!wo || wo.status !== "IN_PROCESS") return { outcome: "HOLD", reason: "Nothing in process" };
    const machine = this.machines.get(wo.currentStep);
    machine.busy -= 1;
    machine.queue = machine.queue.filter(id => id !== wo.id);
    wo.stepIndex += 1;
    if (wo.stepIndex >= wo.steps.length) {
      wo.status = "COMPLETE";
      this.kernel.upsert(wo);
      return { outcome: "OK", status: "COMPLETE" };
    }
    this.kernel.upsert(wo);
    return this.advance(wo.id);
  }
}
