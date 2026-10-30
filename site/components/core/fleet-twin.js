/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/fleet-twin.js
 * FILE PURPOSE: Fleet digital twin. Projects fleet state from deployment records.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fleet Twin - Iteration 10
 *
 * Fleet records only. This component exposes a read/query surface over the
 * canonical semantic graph. It does not create an operations-center model,
 * telemetry store, or parallel ontology.
 */

export class FleetTwin {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel) throw new Error("FleetTwin requires a canonical kernel");
    this.kernel = kernel;
  }

  /** createFleet: Performs create fleet for this module. */
  createFleet(projectId, meta = {}) {
    const project = this.kernel.store.get(projectId);
    if (!project || project.type !== "Project") {
      throw new Error(`Project not found: ${projectId}`);
    }

    const id = meta.id || `fleet_${Date.now().toString(36)}`;
    const fleet = this.kernel.upsert({
      id,
      type: "Fleet",
      name: meta.name || "Fleet",
      status: meta.status || "ACTIVE",
      projectId,
      provenance: {
        origin: "fleet-twin",
        derivedFrom: projectId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link(projectId, "CONTAINS", id);
    return fleet;
  }

  /** addDeployment: Performs add deployment for this module. */
  addDeployment(fleetId, meta = {}) {
    const fleet = this.kernel.store.get(fleetId);
    if (!fleet || fleet.type !== "Fleet") {
      throw new Error(`Fleet not found: ${fleetId}`);
    }

    const id = meta.id || `dep_${Date.now().toString(36)}`;
    const deployment = this.kernel.upsert({
      id,
      type: "Deployment",
      name: meta.name || "Deployment",
      fleetId,
      configurationId: meta.configurationId ?? "UNSPECIFIED",
      robotId: meta.robotId ?? "UNSPECIFIED",
      status: meta.status || "PLANNED",
      provenance: {
        origin: "fleet-twin",
        derivedFrom: meta.configurationId ?? fleetId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link(fleetId, "CONTAINS", id);
    return deployment;
  }

  /**
   * Return the twin record for one deployment.
   *
   * Telemetry is looked up from the canonical Telemetry entities by their
   * deploymentId field. No position or other telemetry value is inferred.
   */
  twin(deploymentId) {
    const deployment = this.kernel.store.get(deploymentId);
    if (!deployment || deployment.type !== "Deployment") {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const configurationId = deployment.configurationId;
    const configuration = configurationId && configurationId !== "UNSPECIFIED"
      ? this.kernel.store.get(configurationId)
      : null;

    let configurationFingerprint = null;
    let configurationStatus = "HOLD";
    const gaps = [];

    if (configuration && configuration.type === "Configuration") {
      configurationFingerprint = configuration.fingerprint ?? null;
      if (configurationFingerprint) {
        configurationStatus = "OK";
      } else {
        gaps.push("Configuration fingerprint missing");
      }
    } else {
      gaps.push("Configuration missing");
    }

    const telemetry = this.kernel.store
      .all("Telemetry")
      .filter(t => t.deploymentId === deploymentId)
      .sort((a, b) => {
        const at = Date.parse(a.timestamp || a.time || a.created || "");
        const bt = Date.parse(b.timestamp || b.time || b.created || "");
        return bt - at || String(b.id).localeCompare(String(a.id));
      });

    const lastTelemetry = telemetry[0] || null;

    return {
      deployment: structuredClone(deployment),
      configurationFingerprint,
      configurationStatus,
      lastTelemetry: lastTelemetry ? structuredClone(lastTelemetry) : null,
      telemetryStatus: lastTelemetry ? "AVAILABLE" : "HOLD",
      gaps: [
        ...gaps,
        ...(lastTelemetry ? [] : ["Telemetry missing"])
      ]
    };
  }

  /**
   * Query all deployments contained by a Fleet.
   */
  fleetTwin(fleetId) {
    const fleet = this.kernel.store.get(fleetId);
    if (!fleet || fleet.type !== "Fleet") {
      throw new Error(`Fleet not found: ${fleetId}`);
    }

    const deploymentIds = this.kernel.store.relations
      .filter(r => r.source === fleetId && r.relation === "CONTAINS")
      .map(r => r.target)
      .filter(id => {
        const e = this.kernel.store.get(id);
        return e && e.type === "Deployment";
      });

    return {
      fleet: structuredClone(fleet),
      deployments: deploymentIds.map(id => this.twin(id))
    };
  }
}
