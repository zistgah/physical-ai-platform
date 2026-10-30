/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 08 – close quality-review gaps.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject } from "../site/components/simulation/canonical-mobile-robot.js";
import { relationStatus, UNRESOLVED_RELATIONS } from "../site/components/core/relation-registry.js";
import { EvidenceBinding } from "../site/components/core/evidence-binding.js";
import { EvidencePromotion } from "../site/components/core/evidence-promotion.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";
import { AssurancePath } from "../site/components/safety/assurance-path.js";
import { ConfigurationEngine } from "../site/components/core/configuration-engine.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 08 Gap Closure Tests ===");
  const { kernel, project, requirement, components } = createCanonicalMobileRobotProject();

  // Relation honesty
  assert(relationStatus("ALLOCATED_TO").defined && !relationStatus("ALLOCATED_TO").unresolved, "ALLOCATED_TO is defined");
  assert(relationStatus("INSTANCE_OF").unresolved, "INSTANCE_OF is explicitly unresolved");
  assert(UNRESOLVED_RELATIONS.length > 0, "Unresolved set is non-empty");
  const val = kernel.validateGraph();
  assert(Array.isArray(val.unresolvedRelations), "Validation reports unresolved relations");

  // Execution gate fails closed
  const gate = kernel.evaluateExecution({ intentId: "intent-inspect", projectId: project.id });
  assert(gate.outcome === "HOLD" || gate.outcome === "REJECT", "Unresolved authority/state does not EXECUTE");
  assert(gate.reasons.some(r => /Authority|State|Timing|Resources/.test(r)), "Reasons name the unresolved gates");
  assert(gate.authority.valid === false, "Authority is not assumed from intent");

  // Evidence binding
  const ep = new EvidencePromotion(kernel);
  const ev = ep.recordPhysicalTest(project.id, {
    subjectId: components.motor.id,
    configurationId: "cfg-mobile-v1",
    outcome: "PASS",
    authority: "test-lead"
  });
  const bind = new EvidenceBinding(kernel);
  assert(bind.requireBinding({ method: "SIMULATION" }).ok === false, "Simulation without configuration is rejected by policy");
  const bound = bind.bind(ev.id, "cfg-mobile-v1");
  assert(bound.configurationId === "cfg-mobile-v1" && bound.stale === false, "Evidence bound to configuration");

  // Config change stales evidence
  const ce = new ConfigurationEngine(kernel);
  // freeze first so fingerprint exists
  try { ce.freezeConfiguration("cfg-mobile-v1"); } catch (e) { /* may already be frozen in other tests; ignore */ }
  const staled = bind.markStaleForConfiguration("cfg-mobile-v1", "component version changed");
  assert(staled.includes(ev.id), "Bound evidence marked stale");
  assert(kernel.store.get(ev.id).stale === true, "Stale flag persisted");

  // Lifecycle decision carries configuration and authority; unknown ≠ pass
  const le = new LifecycleEngine(kernel);
  const gev = le.evaluateGate(project.id, "G3", { configurationId: "cfg-mobile-v1", authority: "gate-chair" });
  assert(gev.configurationId === "cfg-mobile-v1", "Gate evaluation records configuration");
  assert(gev.authority === "gate-chair", "Gate evaluation records authority");
  assert(gev.outcome !== "PASS" || gev.reasons.length === 0, "PASS only with no reasons");
  const dec = le.recordGateDecision(project.id, "G3", gev);
  assert(dec.configurationId === "cfg-mobile-v1" && dec.authority === "gate-chair", "Decision stores configuration and authority");

  // Assurance path is walkable and honest about missing hops
  const haz = kernel.store.get("haz-estop-fail");
  const ap = new AssurancePath(kernel);
  ap.linkHazardToControl(haz.id, requirement.id);
  const walked = ap.walk(haz.id);
  assert(walked.controls.some(c => c.id === requirement.id), "Hazard controlled by requirement");
  assert(walked.missing.includes("cause"), "Missing cause is reported, not invented");
  assert(walked.complete === false, "Incomplete path is not reported complete");

  console.log("\n=== ALL ITERATION 08 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
