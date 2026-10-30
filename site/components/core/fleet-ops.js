/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/fleet-ops.js
 * FILE PURPOSE: Fleet operations. Health and dispatch. Dispatch needs authority and an active deployment.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fleet operations center – Iteration 17
 */
export class FleetOps {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; this.commands = []; }

  /** health: Counts active and degraded deployments in a fleet. */
  health(fleetId) {
    const deps = this.kernel.store.relations.filter(r => r.source === fleetId && r.relation === "CONTAINS")
      .map(r => this.kernel.store.get(r.target)).filter(Boolean);
    const up = deps.filter(d => d.status === "ACTIVE").length;
    return { fleetId, deployments: deps.length, active: up, degraded: deps.length - up };
  }

  /** dispatch: Sends a command. Holds without authority or an active deployment. */
  dispatch(fleetId, { deploymentId, command, authority }) {
    if (!authority) return { outcome: "HOLD", reason: "Authority is UNSPECIFIED" };
    const dep = this.kernel.store.get(deploymentId);
    if (!dep) return { outcome: "HOLD", reason: "Deployment is UNSPECIFIED" };
    if (dep.status !== "ACTIVE") return { outcome: "HOLD", reason: "Deployment is not active" };
    const record = { fleetId, deploymentId, command, authority, at: new Date().toISOString() };
    this.commands.push(record);
    dep.lastCommand = command;
    return { outcome: "DISPATCHED", record };
  }
}
