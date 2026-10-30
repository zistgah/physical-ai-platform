/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 28 – adversarial gate tests.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { CockpitMachine } from "../site/components/safety/cockpit-machine.js";
import { runLoop } from "../site/components/simulation/hil-loop.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

const kernel = createKernel();
const project = kernel.upsert({ id: "p28", type: "Project", name: "Adv", provenance: { origin: "iter28" } });
kernel.upsert({ id: "hz", type: "Hazard", name: "pinch", status: "CONTROLLED", provenance: { origin: "iter28" } });
kernel.link(project.id, "CONTAINS", "hz");
assert(new SafetyEngine(kernel).evaluateReadiness(project.id).decision === "HOLD", "No configuration is not GO");

const config = kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter28" } });
kernel.link(project.id, "CONTAINS", config.id);
const machine = new CockpitMachine(kernel, project.id, { configurationId: config.id });
machine.start();
machine.advance("S1_CONFIGURATION_VERIFIED");
machine.advance("S2_POWER_ISOLATED_CHECK");

function blocked(id, fields, role = "safety-authority") {
  kernel.upsert({ id, type: "Evidence", name: id, state: "VERIFIED", method: "REVIEW", configurationId: config.id, provenance: { origin: "iter28" }, ...fields });
  kernel.link(project.id, "CONTAINS", id);
  machine.isolationRole = role;
  machine.isolationEvidenceId = id;
  const result = machine.advance("S3_SYSTEM_POWER_UP");
  assert(result.status === "HOLD" && machine.current() === "S2_POWER_ISOLATED_CHECK", id + " cannot authorize");
}
blocked("rejected", { state: "REJECTED" });
blocked("sim", { method: "SIMULATION" });
blocked("role", {}, "anyone");

const other = kernel.upsert({ id: "other", type: "Project", name: "Other", provenance: { origin: "iter28" } });
kernel.upsert({ id: "cross", type: "Evidence", name: "cross", state: "VERIFIED", method: "REVIEW", provenance: { origin: "iter28" } });
kernel.link(other.id, "CONTAINS", "cross");
machine.isolationRole = "safety-authority";
machine.isolationEvidenceId = "cross";
assert(machine.advance("S3_SYSTEM_POWER_UP").status === "HOLD", "Cross-project evidence cannot authorize");

assert(runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 2, dt: 0.1, device: { bound: true } }).method === "SIMULATION", "No transport is SIMULATION");
assert(runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 2, dt: 0.1, device: { bound: true, transport: "bench" } }).method === "HIL", "A transport is HIL");

console.log("\n=== ALL ITERATION 28 TESTS PASSED ===");
