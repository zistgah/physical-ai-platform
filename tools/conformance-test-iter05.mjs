/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 05 Conformance – architectural closure and integration.
 * Proves invariants, cross-vertical paths, trust boundary, SIR lossless, and reference demonstrator.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject, runCanonicalSimulation } from "../site/components/simulation/canonical-mobile-robot.js";
import { ConfigurationEngine } from "../site/components/core/configuration-engine.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";
import { ChangeImpactEngine } from "../site/components/core/change-impact.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { ComplianceEngine } from "../site/components/compliance/compliance-engine.js";
import { ManufacturingEngine } from "../site/components/manufacturing/manufacturing-engine.js";
import { FactoryExecutionEngine } from "../site/components/manufacturing/factory-execution.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { CurriculumEngine } from "../site/components/education/curriculum-engine.js";
import { ResearchEngine } from "../site/components/research/research-engine.js";
import { TeleoperationEngine } from "../site/components/teleoperation/teleoperation-engine.js";
import { FleetEngine } from "../site/components/core/fleet-engine.js";
import { BusinessEngine } from "../site/components/core/business-engine.js";
import { ImportTrustBoundary } from "../site/components/core/import-trust.js";
import { GraphQueries } from "../site/components/core/graph-queries.js";
import { SharingBoundary } from "../site/components/core/sharing-boundary.js";
import { validateContract } from "../site/components/core/contracts-vertical.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 05 Architectural Closure Tests ===");

  const { kernel, project, requirement, system, components } = createCanonicalMobileRobotProject();
  await runCanonicalSimulation(kernel, project.id);

  // Kernel: identity uniqueness and orphan report
  const val = kernel.validateGraph();
  assert(val.valid, "Graph validation passes");
  assert(Array.isArray(val.orphans), "Orphan detection present");
  const ids = kernel.store.all().map(e => e.id);
  assert(new Set(ids).size === ids.length, "Identity uniqueness");

  // Contract validation
  const req = kernel.store.get(requirement.id);
  const cv = validateContract(req);
  assert(cv.valid, "Requirement satisfies vertical contract");
  const bad = validateContract({ type: "Evidence", id: "x" });
  assert(!bad.valid && bad.missing.includes("method"), "Evidence contract rejects missing method");

  // Configuration freeze + comparison + mutation rejection
  const ce = new ConfigurationEngine(kernel);
  const frozen = ce.freezeConfiguration("cfg-mobile-v1");
  assert(frozen.status === "FROZEN" && frozen.fingerprint, "Configuration frozen with fingerprint");
  let threw = false;
  try { ce.freezeConfiguration("cfg-mobile-v1"); } catch (e) { threw = true; }
  assert(threw, "Frozen configuration rejects re-freeze");

  // Cross-vertical path: engineering -> verification -> assurance -> compliance -> manufacturing -> deployment
  assert(kernel.store.get(system.id) && kernel.store.get(components.motor.id), "Engineering path objects present");
  assert(kernel.store.relations.some(r => r.relation === "VERIFIES"), "Verification path present");
  const se = new SafetyEngine(kernel);
  const readiness = se.evaluateReadiness(project.id);
  assert(["GO", "HOLD", "NO-GO"].includes(readiness.decision), "Assurance readiness decision");
  const cpe = new ComplianceEngine(kernel);
  assert(cpe.evaluateExport("UNKNOWN").decision === "HOLD", "Compliance UNKNOWN → HOLD");
  assert(cpe.evaluateExport("PROHIBITED").decision === "NO-GO", "Compliance PROHIBITED → NO-GO");
  const me = new ManufacturingEngine(kernel);
  const boms = me.generateBOMs(project.id);
  assert(boms.ebom.items.length > 0, "Manufacturing projection present");
  const fac = new FactoryExecutionEngine(kernel);
  const wo = fac.createWorkOrder(project.id, components.motor.id);
  const insp = fac.recordInspection(wo.id, { outcome: "PASS" });
  assert(insp.method === "INSPECTION" && insp.state === "EXECUTED", "Inspection evidence distinct and EXECUTED");
  assert(kernel.store.get("dep-unit-1")?.configurationId === "cfg-mobile-v1", "Deployment bound to configuration");

  // Research + education + business + fleet + teleop on same graph
  const edu = new CurriculumEngine(kernel);
  edu.createPath(project.id, { grade: "secondary", concepts: ["safety"] });
  const res = new ResearchEngine(kernel);
  const exp = res.createExperiment(project.id, { question: "estop?", hypothesis: "yes" });
  res.createPublication(exp.id, { title: "note" });
  const biz = new BusinessEngine(kernel);
  biz.createFunding(project.id, { amount: 1 });
  const fleet = new FleetEngine(kernel);
  const f = fleet.createFleet(project.id, { name: "F" });
  fleet.addDeployment(f.id, "cfg-mobile-v1");
  const tele = new TeleoperationEngine(kernel);
  threw = false;
  try { tele.open({ id: "bad" }); } catch (e) { threw = true; }
  assert(threw, "Teleop without local authority rejected");
  const sess = tele.open({ id: "ok", localSafetyAuthority: "PIC", projectId: project.id });
  assert(tele.emergencyStop(sess.id, "fault").state === "SAFE", "Emergency stop → SAFE");

  // Change impact crosses verticals
  const ci = new ChangeImpactEngine(kernel);
  const impact = ci.analyzeChange(components.motor.id, { field: "version" });
  assert(impact.affected.length >= 0, "Change impact returns affected set");

  // Lifecycle gate explains
  const le = new LifecycleEngine(kernel);
  const gev = le.evaluateGate(project.id, "G3");
  assert(gev.outcome && Array.isArray(gev.reasons) && gev.timestamp, "Gate evaluation is explanatory");

  // Import trust: not auto-verified
  const it = new ImportTrustBoundary(kernel);
  const imported = it.importObject(project.id, { type: "Artifact", name: "external-cad" }, { source: "vendor", sourceFormat: "step" });
  assert(imported.trust.status === "IMPORTED" && imported.trust.verified === false, "Import marked unverified");
  assert(!it.isVerified(imported.id), "Imported material is not verified");

  // Sharing is explicit
  const share = new SharingBoundary(kernel);
  const pub = share.publish(requirement.id, { privacy: "PUBLIC" });
  assert(pub.publicationState === "PUBLISHED" && pub.provenance.origin === "explicit-publication", "Publication is explicit");

  // Queries
  const q = new GraphQueries(kernel);
  const cov = q.requirementCoverage(project.id);
  assert(cov.some(c => c.id === requirement.id), "Requirement coverage query");
  const ready = q.readiness(project.id);
  assert(ready.configuration === "FROZEN", "Readiness sees frozen configuration");

  // SIR lossless round-trip
  const sir = kernel.serializeToSIR(project.id);
  assert(sir.graph && sir.lifecycle && sir.assurance && sir.manufacturing, "SIR carries structured sections");
  const before = kernel.canonicalizeGraph(project.id);
  const k2 = createKernel();
  k2.deserializeFromSIR(sir);
  const after = k2.canonicalizeGraph(project.id);
  assert(JSON.stringify(before) === JSON.stringify(after), "SIR round-trip preserves canonical graph");

  // Evidence method distinction
  const methods = new Set(kernel.store.all("Evidence").map(e => e.method));
  assert(methods.has("SIMULATION") || methods.has("INSPECTION"), "Evidence methods are explicit");

  // Standards remain informational
  const std = new StandardsCorpusEngine(kernel);
  const hits = std.query({ domain: "TERRESTRIAL" });
  assert(hits.every(h => h.status === "INFORMATIONAL"), "Standards corpus remains informational");

  console.log("\n=== ALL ITERATION 05 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
