/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-TELEOP-SESSION
 */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { TeleopSession } from "../site/components/teleoperation/session.js";

const kernel = createKernel();
const project = kernel.upsert({
  id: "proj-teleop-1",
  type: "Project",
  name: "Teleoperation Slice",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const operator = kernel.upsert({
  id: "person-operator-1",
  type: "Person",
  name: "Operator",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const robot = kernel.upsert({
  id: "deploy-robot-1",
  type: "Deployment",
  name: "Robot Deployment",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const safetyPolicy = kernel.upsert({
  id: "policy-local-safety-1",
  type: "Policy",
  name: "Local Safety Policy",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const teleop = new TeleopSession(kernel);
const session = teleop.createSession({
  id: "exec-teleop-1",
  projectId: project.id,
  operatorId: operator.id,
  robotDeploymentId: robot.id,
  role: "TELEOPERATOR"
});

assert.equal(session.type, "Execution");
assert.equal(session.executionKind, "TELEOP_SESSION");
assert.equal(session.operatorId, operator.id);
assert.equal(session.robotDeploymentId, robot.id);
assert.equal(session.state, "HOLD");
assert(session.provenance?.origin, "Session has provenance");

for (const entity of [operator, robot, safetyPolicy, session]) {
  assert(entity.provenance?.origin, `Provenance present on ${entity.id}`);
  assert("timestamp" in entity.provenance, `Timestamp present on ${entity.id}`);
}

// Link only through relations whose architecture is already resolved.
// Role and local safety authority are not represented as AUTHORIZED_BY.
kernel.link(project.id, "CONTAINS", robot.id);
kernel.link(project.id, "CONTAINS", safetyPolicy.id);
kernel.link(session.id, "GOVERNED_BY", safetyPolicy.id);

const graph = kernel.getProjectGraph(project.id);
assert(graph.entities.some(e => e.id === robot.id), "Project graph contains robot deployment");
assert(graph.entities.some(e => e.id === safetyPolicy.id), "Project graph contains safety policy");
assert(graph.entities.some(e => e.id === session.id), "Project graph contains teleoperation execution");
assert(graph.relations.some(r =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === robot.id
), "Project contains robot deployment");
assert(graph.relations.some(r =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === safetyPolicy.id
), "Project contains safety policy");
assert(graph.relations.some(r =>
  r.source === session.id && r.relation === "GOVERNED_BY" && r.target === safetyPolicy.id
), "Session is governed by safety policy");

// Missing authority is a HOLD, not an inferred authorization.
const rejected = teleop.start(session.id, null);
assert.equal(rejected.accepted, false, "Start without local safety authority is rejected");
assert.equal(rejected.status, "HOLD");
assert.match(rejected.reason, /local safety authority/i);
assert.equal(kernel.store.get(session.id).state, "HOLD");

// Role assignment alone must not authorize a start.
teleop.setRole(session.id, "TELEOPERATOR");
const roleOnly = teleop.start(session.id, { decision: "HOLD" });
assert.equal(roleOnly.accepted, false, "Role assignment alone does not authorize session");
assert.equal(kernel.store.get(session.id).state, "HOLD");

// Explicit local safety decision permits start.
const started = teleop.start(session.id, {
  decision: "ALLOW",
  basis: "local-safety-controller",
  timestamp: kernel._now()
});
assert.equal(started.accepted, true, "Explicit local safety authority permits start");
assert.equal(started.status, "ACTIVE");
assert.equal(kernel.store.get(session.id).state, "ACTIVE");

// Emergency stop always records SAFE and the reason.
const stopped = teleop.emergencyStop(session.id, "Operator emergency stop");
assert.equal(stopped.state, "SAFE");
assert.equal(stopped.emergencyStop.state, "SAFE");
assert.equal(stopped.emergencyStop.reason, "Operator emergency stop");
assert(stopped.emergencyStop.timestamp, "Emergency stop timestamp recorded");

// Re-query the canonical graph after state transitions.
const graphAfter = kernel.getProjectGraph(project.id);
const sessionFromGraph = graphAfter.entities.find(e => e.id === session.id);
assert.equal(sessionFromGraph.state, "SAFE");
assert.equal(sessionFromGraph.emergencyStop.reason, "Operator emergency stop");

// No AUTHORIZED_BY edge was fabricated by role or local safety authority.
assert.equal(
  kernel.store.relations.some(r => r.source === session.id && r.relation === "AUTHORIZED_BY"),
  false,
  "Session does not gain AUTHORIZED_BY from role or local safety decision"
);

console.log("PASS: WP-TELEOP-SESSION conformance");
