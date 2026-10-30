/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 27 – gates that must bite.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { ComplianceAutomation } from "../site/components/compliance/compliance-automation.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { CockpitMachine } from "../site/components/safety/cockpit-machine.js";
import { validateSolid } from "../site/components/cad/cad-contracts.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

const kernel = createKernel();
const project = kernel.upsert({ id: "p27", type: "Project", name: "Gates", provenance: { origin: "iter27" } });
const adopted = new StandardsCorpusEngine(kernel).adopt(project.id, "std-iso-15288");
const needs = adopted.requiredEvidence;
const auto = new ComplianceAutomation(kernel);

needs.forEach((need, i) => {
  const ev = kernel.upsert({ id: "ok" + i, type: "Evidence", name: need, state: "VERIFIED", method: "REVIEW", provenance: { origin: "iter27" } });
  kernel.link(project.id, "CONTAINS", ev.id);
  auto.bind(adopted.id, ev.id, need);
});
const bad = kernel.store.get("ok0");
bad.state = "REJECTED";
kernel.upsert(bad);
assert(auto.run(project.id).outcome === "HOLD", "Invalid evidence state HOLDs");

const kernel2 = createKernel();
const project2 = kernel2.upsert({ id: "p27b", type: "Project", name: "Scope", provenance: { origin: "iter27" } });
const adopted2 = new StandardsCorpusEngine(kernel2).adopt(project2.id, "std-iso-15288");
const auto2 = new ComplianceAutomation(kernel2);
adopted2.requiredEvidence.forEach((need, i) => {
  const ev = kernel2.upsert({ id: "sc" + i, type: "Evidence", name: need, state: "VERIFIED", method: "REVIEW", provenance: { origin: "iter27" } });
  if (i !== 0) kernel2.link(project2.id, "CONTAINS", ev.id);
  auto2.bind(adopted2.id, ev.id, need);
});
assert(auto2.run(project2.id).outcome === "HOLD", "Evidence outside the project HOLDs");

const cfg = kernel.upsert({ id: "cfg-ready", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter27" } });
kernel.link(project.id, "CONTAINS", cfg.id);
const hazard = kernel.upsert({ id: "hz", type: "Hazard", name: "pinch", status: "OPEN", provenance: { origin: "iter27" } });
kernel.link(project.id, "CONTAINS", hazard.id);
assert(new SafetyEngine(kernel).evaluateReadiness(project.id).decision === "NO-GO", "Unresolved hazard is NO-GO");

const open = validateSolid({ type: "Solid", volume: 0, mesh: { vertices: [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}], faces: [[0,1,2]] } });
assert(open.outcome === "HOLD", "Open mesh is not a solid");

const config = kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter27" } });
kernel.link(project.id, "CONTAINS", config.id);
const machine = new CockpitMachine(kernel, project.id, { configurationId: config.id });
machine.start();
machine.advance("S1_CONFIGURATION_VERIFIED");
machine.advance("S2_POWER_ISOLATED_CHECK");
assert(machine.advance("S3_SYSTEM_POWER_UP").status === "HOLD", "Power-up without isolation HOLDs");

console.log("\n=== ALL ITERATION 27 TESTS PASSED ===");
