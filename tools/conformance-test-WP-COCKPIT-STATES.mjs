/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { CockpitMachine, COCKPIT_STATES, COCKPIT_TRANSITIONS } from "../site/components/safety/cockpit-machine.js";

const kernel = createKernel();

const project = kernel.upsert({
  id: "proj-1",
  type: "Project",
  name: "Cockpit State Slice",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const config = kernel.upsert({
  id: "cfg-1",
  type: "Configuration",
  name: "Test Configuration",
  projectId: project.id,
  status: "DRAFT",
  provenance: { origin: "package", derivedFrom: project.id, timestamp: kernel._now() }
});
kernel.link(project.id, "CONTAINS", config.id);

const machine = new CockpitMachine(kernel, project.id, {
  configurationId: config.id
});

const initial = machine.start();
assert.equal(initial.state, "S0_STORED_SAFE");
assert.equal(machine.current(), "S0_STORED_SAFE");

const blocked = machine.advance("S1_CONFIGURATION_VERIFIED");
assert.equal(blocked.status, "HOLD");
assert.match(blocked.reason, /not frozen/i);
assert.equal(blocked.configurationStatus, "DRAFT");
assert.equal(machine.current(), "S0_STORED_SAFE");

config.status = "FROZEN";
config.fingerprint = "cfgfp_test";
kernel.upsert(config);

const s1 = machine.advance("S1_CONFIGURATION_VERIFIED");
assert.equal(s1.state, "S1_CONFIGURATION_VERIFIED");

assert.throws(
  () => machine.advance("S3_SYSTEM_POWER_UP"),
  /Illegal cockpit transition/
);

const s2 = machine.advance("S2_POWER_ISOLATED_CHECK");
assert.equal(s2.state, "S2_POWER_ISOLATED_CHECK");

const abort = machine.abort("test emergency condition");
assert.equal(abort.state, "ABORT");
assert.equal(abort.nextState, "SAFE");
assert.equal(abort.safeState, "S10_SAFE_ISOLATED");
assert.equal(machine.current(), "S10_SAFE_ISOLATED");

const diagnosis = machine.diagnose();
assert.equal(diagnosis.state, "DIAGNOSIS");
assert.equal(machine.current(), "DIAGNOSIS");

const graph = kernel.getProjectGraph(project.id);
assert.ok(graph.entities.some(e => e.type === "CockpitState" && e.state === "S0_STORED_SAFE"));
assert.ok(graph.entities.some(e => e.type === "CockpitState" && e.state === "S1_CONFIGURATION_VERIFIED"));
assert.ok(graph.entities.some(e => e.type === "CockpitState" && e.state === "ABORT"));
assert.ok(graph.entities.some(e => e.type === "CockpitState" && e.state === "DIAGNOSIS"));
assert.ok(graph.relations.some(r =>
  r.source === project.id &&
  r.relation === "CONTAINS" &&
  graph.entities.some(e => e.id === r.target && e.type === "CockpitState")
));

assert.deepEqual(COCKPIT_STATES, [
  "S0_STORED_SAFE",
  "S1_CONFIGURATION_VERIFIED",
  "S2_POWER_ISOLATED_CHECK",
  "S3_SYSTEM_POWER_UP",
  "S4_SELF_TEST",
  "S5_CONTROL_AUTHORITY_VERIFIED",
  "S6_LOW_ENERGY_COMMISSIONING",
  "S7_CONTROLLED_OPERATION",
  "S8_FULL_OPERATION",
  "S9_SHUTDOWN",
  "S10_SAFE_ISOLATED",
  "ABORT",
  "DIAGNOSIS"
]);

assert.deepEqual(COCKPIT_TRANSITIONS, [
  ["S0_STORED_SAFE", "S1_CONFIGURATION_VERIFIED"],
  ["S1_CONFIGURATION_VERIFIED", "S2_POWER_ISOLATED_CHECK"],
  ["S2_POWER_ISOLATED_CHECK", "S3_SYSTEM_POWER_UP"],
  ["S3_SYSTEM_POWER_UP", "S4_SELF_TEST"],
  ["S4_SELF_TEST", "S5_CONTROL_AUTHORITY_VERIFIED"],
  ["S5_CONTROL_AUTHORITY_VERIFIED", "S6_LOW_ENERGY_COMMISSIONING"],
  ["S6_LOW_ENERGY_COMMISSIONING", "S7_CONTROLLED_OPERATION"],
  ["S7_CONTROLLED_OPERATION", "S8_FULL_OPERATION"],
  ["S7_CONTROLLED_OPERATION", "S9_SHUTDOWN"],
  ["S8_FULL_OPERATION", "S9_SHUTDOWN"],
  ["S9_SHUTDOWN", "S10_SAFE_ISOLATED"],
  ["S10_SAFE_ISOLATED", "DIAGNOSIS"]
]);

console.log("WP-COCKPIT-STATES conformance: PASS");
console.log(JSON.stringify({
  holdWhenConfigurationUnfrozen: blocked,
  illegalTransitionRejected: true,
  abort: { state: abort.state, nextState: abort.nextState, safeState: abort.safeState },
  graphCockpitStateRecords: graph.entities.filter(e => e.type === "CockpitState").map(e => e.state)
}, null, 2));
