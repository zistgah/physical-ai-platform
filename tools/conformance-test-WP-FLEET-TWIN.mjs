/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { FleetTwin } from "../site/components/core/fleet-twin.js";

const kernel = createKernel();

const project = kernel.upsert({
  id: "proj-fleet-twin",
  type: "Project",
  name: "Fleet Twin Slice",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const twin = new FleetTwin(kernel);

const fleet = twin.createFleet(project.id, {
  id: "fleet-1",
  name: "Test Fleet"
});

const configuration = kernel.upsert({
  id: "cfg-1",
  type: "Configuration",
  name: "Robot Configuration",
  fingerprint: "cfgfp_test_001",
  status: "FROZEN",
  provenance: {
    origin: "package",
    derivedFrom: project.id,
    timestamp: kernel._now()
  }
});
kernel.link(project.id, "CONTAINS", configuration.id);

const deployment = twin.addDeployment(fleet.id, {
  id: "deployment-1",
  name: "Robot Deployment 1",
  configurationId: configuration.id,
  robotId: "robot-1",
  status: "DEPLOYED"
});

// No telemetry is created initially. This must be an explicit HOLD, never a
// fabricated position or other inferred value.
const missingTelemetryTwin = twin.twin(deployment.id);
assert.equal(missingTelemetryTwin.configurationFingerprint, "cfgfp_test_001");
assert.equal(missingTelemetryTwin.telemetryStatus, "HOLD");
assert.equal(missingTelemetryTwin.lastTelemetry, null);
assert.ok(missingTelemetryTwin.gaps.includes("Telemetry missing"));
assert.equal(missingTelemetryTwin.deployment.robotId, "robot-1");

// Add a canonical Telemetry entity and associate it by its semantic field.
// There is deliberately no new relation invented for telemetry association.
const telemetry = kernel.upsert({
  id: "telemetry-1",
  type: "Telemetry",
  name: "Robot 1 Telemetry",
  deploymentId: deployment.id,
  timestamp: "2026-10-24T07:00:00.000Z",
  position: { x: 10, y: 20, z: 0 },
  provenance: {
    origin: "package",
    derivedFrom: deployment.id,
    timestamp: kernel._now()
  }
});

// Package objects are linked by FleetTwin using canonical CONTAINS.
// Telemetry remains associated through its deploymentId field rather than
// inventing a new relation.
const graph = kernel.getProjectGraph(project.id);
assert.ok(graph.entities.some(e => e.id === fleet.id));
assert.ok(graph.entities.some(e => e.id === configuration.id));
assert.ok(graph.entities.some(e => e.id === deployment.id));
// Telemetry has no resolved architectural containment relation in Iteration 10.
// It is therefore not forced into the project graph merely to make the twin work.
assert.ok(graph.relations.some(r =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === fleet.id
));
assert.ok(graph.relations.some(r =>
  r.source === fleet.id && r.relation === "CONTAINS" && r.target === deployment.id
));

const loaded = twin.twin(deployment.id);
assert.equal(loaded.configurationFingerprint, "cfgfp_test_001");
assert.equal(loaded.lastTelemetry.id, telemetry.id);
assert.equal(loaded.telemetryStatus, "AVAILABLE");
assert.deepEqual(loaded.lastTelemetry.position, { x: 10, y: 20, z: 0 });

const fleetResult = twin.fleetTwin(fleet.id);
assert.equal(fleetResult.deployments.length, 1);
assert.equal(fleetResult.deployments[0].deployment.id, deployment.id);

// Explicit gap behavior for missing configuration: no invented fingerprint.
const noConfig = twin.addDeployment(fleet.id, {
  id: "deployment-no-config",
  name: "Incomplete Deployment",
  robotId: "robot-2",
  status: "PLANNED"
});
const held = twin.twin(noConfig.id);
assert.equal(held.configurationFingerprint, null);
assert.equal(held.configurationStatus, "HOLD");
assert.ok(held.gaps.includes("Configuration missing"));
assert.ok(held.gaps.includes("Telemetry missing"));
assert.equal(held.lastTelemetry, null);

console.log("WP-FLEET-TWIN: PASS");
console.log(JSON.stringify({
  project: project.id,
  fleet: fleet.id,
  deployment: deployment.id,
  graphEntities: graph.entities.length,
  graphRelations: graph.relations.length,
  missingTelemetry: missingTelemetryTwin.telemetryStatus,
  missingInput: held.gaps
}, null, 2));
