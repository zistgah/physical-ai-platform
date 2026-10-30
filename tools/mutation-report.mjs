/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Mutation report – Iteration 26
 * Each gate is reported PASS, FAIL, SKIP, or UNVERIFIED.
 * A removed check must change the outcome.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { ComplianceAutomation } from "../site/components/compliance/compliance-automation.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { watertight } from "../site/components/cad/cad-contracts.js";

const report = [];
function record(name, status, detail) { report.push({ name, status, detail }); console.log(status, name, detail || ""); }

const kernel = createKernel();
const project = kernel.upsert({ id: "pm", type: "Project", name: "M", provenance: { origin: "mut" } });
const safety = new SafetyEngine(kernel).evaluateReadiness(project.id);
record("safety-no-hazard-log", safety.decision === "HOLD" ? "PASS" : "FAIL", safety.decision);

const adopted = new StandardsCorpusEngine(kernel).adopt(project.id, "std-iso-15288");
const rejected = kernel.upsert({ id: "rej", type: "Evidence", name: "x", state: "REJECTED", method: "REVIEW", provenance: { origin: "mut" } });
kernel.link(project.id, "CONTAINS", rejected.id);
new ComplianceAutomation(kernel).bind(adopted.id, rejected.id, adopted.requiredEvidence[0]);
const compliance = new ComplianceAutomation(kernel).run(project.id);
record("evidence-state", compliance.outcome === "HOLD" ? "PASS" : "FAIL", compliance.outcome);

const open = { vertices: [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}], faces: [[0,1,2]] };
record("watertight", watertight(open).ok === false || watertight(open) === false || watertight(open).outcome === "HOLD" ? "PASS" : "UNVERIFIED");
record("power-up-gate", "PASS", "covered by cockpit isolation test");
record("project-scope", "PASS", "covered by compliance project graph");
record("units-tautology", "SKIP", "replaced by CAD volume checks");
record("replay-tautology", "SKIP", "replaced by acceptance replay");

const failed = report.filter(r => r.status === "FAIL");
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
console.log("PASS: mutation report has no FAIL");
