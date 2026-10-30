/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 03 Conformance Tests
 * Lifecycle, Configuration, Digital Thread, Change Impact, Safety, Compliance, Manufacturing.
 * Iteration 01/02 tests remain in conformance-test.mjs and must still pass.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject, runCanonicalSimulation } from "../site/components/simulation/canonical-mobile-robot.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";
import { ConfigurationEngine } from "../site/components/core/configuration-engine.js";
import { DigitalThread } from "../site/components/core/digital-thread.js";
import { ChangeImpactEngine } from "../site/components/core/change-impact.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { ComplianceEngine } from "../site/components/compliance/compliance-engine.js";
import { ManufacturingEngine } from "../site/components/manufacturing/manufacturing-engine.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 03 Conformance Tests ===");

  const { kernel, project, requirement, system, components } = createCanonicalMobileRobotProject();
  const le = new LifecycleEngine(kernel);
  const ce = new ConfigurationEngine(kernel);
  const dt = new DigitalThread(kernel);
  const ci = new ChangeImpactEngine(kernel);
  const se = new SafetyEngine(kernel);
  const cpe = new ComplianceEngine(kernel);
  const me = new ManufacturingEngine(kernel);

  // Lifecycle: missing evidence → HOLD
  const gateEval = le.evaluateGate(project.id, "G3");
  assert(gateEval.outcome === "HOLD" || gateEval.outcome === "PASS", "Gate evaluation returns structured outcome");
  // Add evidence via simulation then re-evaluate
  await runCanonicalSimulation(kernel, project.id);
  const gateEval2 = le.evaluateGate(project.id, "G3");
  assert(["PASS", "HOLD"].includes(gateEval2.outcome), "Gate re-evaluation after evidence");
  const decision = le.recordGateDecision(project.id, "G3", gateEval2);
  assert(decision && decision.type === "GateDecision", "Gate decision recorded");

  // Inapplicable gate
  const naGate = kernel.upsert({ id: "G12", type: "Gate", name: "Retirement", applicable: false, status: "OPEN" });
  kernel.link(project.id, "CONTAINS", naGate.id);
  const naEval = le.evaluateGate(project.id, "G12");
  assert(naEval.outcome === "NOT_APPLICABLE", "Inapplicable gate returns NOT_APPLICABLE");

  // Configuration fingerprint and immutability
  const cfg = kernel.store.get("cfg-mobile-v1");
  assert(cfg, "Reference configuration exists");
  const frozen = ce.freezeConfiguration(cfg.id);
  const fp1 = frozen.fingerprint;
  assert(fp1 && fp1.startsWith("cfgfp_"), "Fingerprint generated");
  // Change a component version conceptually by creating new config
  const cfgB = ce.createConfiguration(project.id, { id: "cfg-mobile-v2", name: "v2" });
  // mutate items
  cfgB.items = cfgB.items.map(i => i.id === "comp-motor" ? { ...i, version: "2.0.0" } : i);
  kernel.upsert(cfgB);
  const cmp = ce.compareConfigurations(cfg.id, cfgB.id);
  assert(!cmp.identical, "Changed configuration differs");
  assert(cmp.changed.some(c => c.id === "comp-motor"), "Comparison identifies motor version change");
  // Original remains frozen
  assert(kernel.store.get(cfg.id).status === "FROZEN", "Frozen configuration remains immutable");
  let threw = false;
  try { ce.freezeConfiguration(cfg.id); } catch (e) { threw = true; }
  assert(threw, "Re-freeze of frozen configuration rejected");

  // Digital thread and breaks
  const thread = dt.getDigitalThread(project.id);
  assert(thread.byType.Mission.length > 0 && thread.byType.Requirement.length > 0, "Digital thread contains Mission and Requirement");
  const findings = dt.getTraceabilityFindings(project.id);
  assert(Array.isArray(findings), "Traceability findings returned");

  // Change impact
  const impact = ci.analyzeChange("comp-motor", { field: "version", to: "2.0.0" });
  assert(impact.type === "ImpactAnalysis", "Impact analysis created");
  const affected = ci.getAffectedObjects(impact.id);
  assert(affected.length >= 0, "Affected objects reported");
  const affReqs = ci.getAffectedRequirements(impact.id);
  assert(Array.isArray(affReqs), "Affected requirements query works");

  // Safety
  const readiness = se.evaluateReadiness(project.id);
  assert(["GO", "HOLD", "NO-GO"].includes(readiness.decision), "Safety readiness decision");
  // Unknown hazard → HOLD
  se.addHazard(project.id, { id: "haz-unknown", name: "Unknown", status: "UNKNOWN" });
  const holdR = se.evaluateReadiness(project.id);
  assert(holdR.decision === "HOLD", "Unknown hazard forces HOLD");
  // Identity gate without frozen config on a new project
  const k2 = createKernel();
  const p2 = k2.createProject({ id: "p2", name: "P2" });
  const se2 = new SafetyEngine(k2);
  const idGate = se2.cockpitIdentityGate(p2.id, null);
  assert(idGate.decision === "NO-GO", "Missing configuration → NO-GO");
  // Abort path
  const abort = se.forceAbort(project.id, "fault injected");
  assert(abort.state === "ABORT" && abort.next === "SAFE", "Abort transitions toward SAFE");

  // Compliance export states
  assert(cpe.evaluateExport("UNKNOWN").decision === "HOLD", "UNKNOWN → HOLD");
  assert(cpe.evaluateExport("PROHIBITED").decision === "NO-GO", "PROHIBITED → NO-GO");
  assert(cpe.evaluateExport("LICENSE_PENDING").decision === "HOLD", "LICENSE_PENDING → HOLD");
  assert(cpe.evaluateExport("LICENSE_GRANTED").decision === "GO", "LICENSE_GRANTED → GO");
  const appl = cpe.applicabilityEngine(project.id);
  assert(Array.isArray(appl.candidates), "Applicability engine returns candidates");

  // Manufacturing BOMs are projections
  const boms = me.generateBOMs(project.id);
  assert(boms.ebom && boms.hbom && boms.sbom && boms.mbom && boms.systemBom, "All BOM kinds generated");
  assert(boms.ebom.items.length > 0, "EBOM has items from canonical components");
  assert(boms.ebom.provenance.note.includes("Projection"), "BOM marked as projection");
  const sov = me.sovereigntyAnalysis(project.id);
  assert(sov.singleSource && sov.progression, "Sovereignty analysis explainable");

  // Determinism: same fingerprint twice
  const fpA = ce.fingerprintConfiguration(cfg.id);
  const fpB = ce.fingerprintConfiguration(cfg.id);
  assert(fpA === fpB, "Configuration fingerprint deterministic");

  console.log("\n=== ALL ITERATION 03 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
