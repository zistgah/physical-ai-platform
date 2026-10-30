/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 06 – close the four remaining limitations.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject, runCanonicalSimulation } from "../site/components/simulation/canonical-mobile-robot.js";
import { EvidencePromotion } from "../site/components/core/evidence-promotion.js";
import { StandardsWorkflow } from "../site/components/compliance/standards-workflow.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { SIRCompiler } from "../site/components/core/sir-compiler.js";
import { FidelityLadder } from "../site/components/simulation/fidelity-ladder.js";
import { FactoryClosure } from "../site/components/manufacturing/factory-closure.js";
import { FactoryExecutionEngine } from "../site/components/manufacturing/factory-execution.js";
import { BusinessClosure } from "../site/components/core/business-closure.js";
import { BusinessEngine } from "../site/components/core/business-engine.js";
import { EducationClosure } from "../site/components/education/education-closure.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 06 Closure Tests ===");
  const { kernel, project, components } = createCanonicalMobileRobotProject();
  const sim = await runCanonicalSimulation(kernel, project.id);

  // 1. Evidence: simulation stays EXECUTED; explicit promotion; physical is distinct
  assert(sim.evidence.method === "SIMULATION" && sim.evidence.state === "EXECUTED", "Simulation evidence is SIMULATION/EXECUTED");
  const ep = new EvidencePromotion(kernel);
  let threw = false;
  try { ep.promote(sim.evidence.id, "VALIDATED"); } catch (e) { threw = true; }
  assert(threw, "Cannot jump simulation to VALIDATED");
  const tested = ep.promote(sim.evidence.id, "TESTED", { configurationId: "cfg-mobile-v1" });
  assert(tested.state === "TESTED", "Explicit promotion EXECUTED → TESTED");
  threw = false;
  try { ep.promote(tested.id, "VERIFIED"); } catch (e) { threw = true; }
  assert(threw, "VERIFIED requires authority");
  const verified = ep.promote(tested.id, "VERIFIED", { authority: "test-lead", configurationId: "cfg-mobile-v1" });
  assert(verified.state === "VERIFIED" && verified.promotion.authority === "test-lead", "Authorized promotion to VERIFIED");
  const phys = ep.recordPhysicalTest(project.id, {
    subjectId: components.motor.id,
    configurationId: "cfg-mobile-v1",
    outcome: "PASS",
    authority: "test-lead"
  });
  assert(phys.method === "PHYSICAL_TEST" && phys.state === "EXECUTED", "Physical test is a distinct method");
  assert(phys.method !== "SIMULATION", "Physical test is not simulation");

  // 2. Standards workflow
  const sw = new StandardsWorkflow(kernel);
  const se = new StandardsCorpusEngine(kernel);
  const hits = se.query({ domain: "TERRESTRIAL" });
  assert(hits.length > 0 && hits[0].status === "INFORMATIONAL", "Corpus remains informational");
  const tailored = sw.tailor(project.id, hits[0].id, { omitted: ["optional-annex"] });
  assert(tailored.status === "TAILORED", "Standard can be tailored for a project");
  const bound = sw.bindEvidence(tailored.id, phys.id);
  assert(bound.status === "EVIDENCED", "Tailored standard can be evidenced");
  assert(sw.corpusSize() >= 10, "Corpus has substantive coverage");

  // 3. CAD/HIL fidelity ladder
  const fl = new FidelityLadder(kernel);
  const sil = fl.run(project.id, { method: "SIL", configurationId: "cfg-mobile-v1" });
  const hil = fl.run(project.id, { method: "HIL", configurationId: "cfg-mobile-v1" });
  assert(sil.evidence.method === "SIL" && hil.evidence.method === "HIL", "SIL and HIL are distinct methods");
  assert(sil.evidence.state === "EXECUTED" && hil.evidence.state === "EXECUTED", "Fidelity runs stay EXECUTED");
  const geo = fl.importGeometryManifest(project.id, {
    id: "cad-geo",
    components: [{ id: "cad-frame", name: "Frame", geometry: { type: "mesh-ref" }, material: "Al6061" }]
  });
  assert(geo.imported === 1 && kernel.store.get("cad-frame").geometry, "CAD geometry manifest imported");

  // 4. Factory closure
  const fc = new FactoryClosure(kernel);
  const plan = fc.plan(components.motor.id);
  assert(plan.process && plan.inspection.length === 2, "Process plan includes inspection");
  const fac = new FactoryExecutionEngine(kernel);
  const wo = fac.createWorkOrder(project.id, components.motor.id);
  const qr = fc.qualityRecord(wo.id, { outcome: "PASS", inspector: "qa-1" });
  assert(qr.method === "INSPECTION" && qr.state === "EXECUTED", "Quality record is inspection evidence");

  // 5. Business closure
  const be = new BusinessEngine(kernel);
  be.createCustomer(project.id, { id: "cust-1", name: "Lab" });
  const bc = new BusinessClosure(kernel);
  kernel.upsert({ ...kernel.store.get(components.motor.id), costMaterial: 50, costLabor: 10 });
  const roll = bc.rollup(project.id);
  assert(roll.total >= 60 && roll.lines.length > 0, "Cost rollup is deterministic and sourced");
  const order = bc.createOrder(project.id, "cust-1", { name: "Order-1" });
  assert(order.type === "ServiceEvent", "Customer order recorded");

  // 6. Education closure
  const ed = new EducationClosure(kernel);
  const course = ed.createCourse(project.id, { name: "Robot safety", grade: "secondary" });
  const lesson = ed.addLesson(course.id, { name: "E-stop", concept: "safety" });
  const assess = ed.recordCompetency(lesson.id, { learner: "student-1", outcome: "PASS", configurationId: "cfg-mobile-v1" });
  assert(assess.method === "EDUCATIONAL_ASSESSMENT", "Assessment evidence is distinct from engineering evidence");

  // 7. SIR compiler
  const compiler = new SIRCompiler(kernel);
  const compiled = compiler.compile(project.id);
  assert(compiled.compiler && compiled.graph.entities.length > 0, "SIR compiler emits normalized document");
  const errors = compiler.validate(compiled);
  assert(errors.length === 0, "Compiled SIR validates clean");
  const bad = { magic: "PAI-SIR", version: "1", header: { projectId: "x" }, graph: { entities: [{ id: "a" }], relations: [] } };
  const badErrors = compiler.validate(bad);
  assert(badErrors.length > 0, "Compiler rejects incomplete SIR");

  console.log("\n=== ALL ITERATION 06 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
