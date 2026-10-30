/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/fleet-engine.js
 * FILE PURPOSE: Fleet engine. Records deployments and their status over the graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fleet Engine – Iteration 04
 * Multiple Deployments under a Fleet, consuming canonical configurations.
 */

export class FleetEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createFleet: Performs create fleet for this module. */
  createFleet(projectId, meta = {}) {
    const id = meta.id || `fleet_${Date.now().toString(36)}`;
    const fleet = this.kernel.upsert({
      id,
      type: "Fleet",
      name: meta.name || "Fleet",
      status: "ACTIVE",
      provenance: { origin: "fleet", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return fleet;
  }

  /** addDeployment: Performs add deployment for this module. */
  addDeployment(fleetId, configId, meta = {}) {
    const id = meta.id || `dep_${Date.now().toString(36)}`;
    const dep = this.kernel.upsert({
      id,
      type: "Deployment",
      name: meta.name || "Deployment",
      fleetId,
      configurationId: configId,
      status: meta.status || "PLANNED",
      location: meta.location || "UNSPECIFIED",
      provenance: { origin: "fleet", derivedFrom: configId }
    });
    this.kernel.link(fleetId, "CONTAINS", id);
    return dep;
  }

  /** status: Performs status for this module. */
  status(fleetId) {
    const deps = this.kernel.store.relations
      .filter(r => r.source === fleetId && r.relation === "CONTAINS")
      .map(r => this.kernel.store.get(r.target))
      .filter(e => e && e.type === "Deployment");
    return {
      fleetId,
      deployments: deps.length,
      byStatus: deps.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {})
    };
  }
}
