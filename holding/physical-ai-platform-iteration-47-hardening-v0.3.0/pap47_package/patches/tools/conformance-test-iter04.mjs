/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 04 Conformance Tests
 * Standards corpus, factory execution, CAD/HIL, SIR expansion,
 * education, research, teleoperation, fleet, business.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject } from "../site/components/simulation/canonical-mobile-robot.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { FactoryExecutionEngine } from "../site/components/manufacturing/factory-execution.js";
import { CadHilAdapter } from "../site/components/simulation/cad-hil-adapter.js";
import { CurriculumEngine } from "../site/components/education/curriculum-engine.js";
import { ResearchEngine } from "../site/components/research/research-engine.js";
import { TeleoperationEngine } from "../site/components/teleoperation/teleoperation-engine.js";
import { FleetEngine } from "../site/components/core/fleet-engine.js";
import { BusinessEngine } from "../site/components/core/business-engine.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 04 Conformance Tests ===");
  const { kernel, project } = createCanonicalMobileRobotProject();

  // Standards corpus
  const std = new StandardsCorpusEngine(kernel);
  const hits = std.query({ domain: "TERRESTRIAL", embodiment: "WHEELED" });
  assert(hits.length > 0, "Standards corpus returns matches for wheeled terrestrial");
  assert(hits.every(h => h.provenance && h.status === "INFORMATIONAL"), "Corpus entries are provenance-labelled and informational");
  const adopted = std.adopt(project.id, hits[0].id);
  assert(adopted.type === "Standard" && adopted.status === "PROJECT_ADOPTED", "Standard can be project-adopted");

  // Factory execution
  const fac = new FactoryExecutionEngine(kernel);
  const wo = fac.createWorkOrder(project.id, "comp-motor");
  assert(wo.type === "WorkOrder" && wo.status === "PLANNED", "Work order created");
  fac.advance(wo.id, "assemble");
  assert(kernel.store.get(wo.id).status === "ASSEMBLE", "Work order advanced");
  const insp = fac.recordInspection(wo.id, { outcome: "PASS" });
  assert(insp.type === "Evidence" && insp.method === "INSPECTION" && insp.state === "EXECUTED", "Inspection produces EXECUTED evidence");

  // CAD / HIL
  const cad = new CadHilAdapter(kernel);
  const imp = cad.importCadManifest(project.id, { id: "cad-1", components: [{ id: "cad-sensor", name: "Lidar", version: "1.0.0" }] });
  assert(imp.imported === 1 && kernel.store.get("cad-sensor"), "CAD manifest imported as Component");
  const noRun = cad.runHil(project.id, "cfg-mobile-v1", { scenario: "nominal" });
  assert(noRun.outcome === "HOLD", "HIL adapter does not fabricate evidence without external execution record");
  const hil = cad.runHil(project.id, "cfg-mobile-v1", { scenario: "nominal" }, { completed: true, runId: "bench-run-1", configurationId: "cfg-mobile-v1", deviceId: "motor-1", bus: "CAN", hardwareAttested: true, source: "bench-adapter", subjectId: "comp-motor" });
  assert(hil.outcome === "RECORDED" && hil.evidence.method === "HIL" && hil.evidence.state === "EXECUTED", "HIL records an external hardware-attested execution record");

  // SIR expansion
  const sir = kernel.serializeToSIR(project.id);
  assert(sir.magic === "PAI-SIR", "SIR magic preserved");
  assert(sir.lifecycle && sir.assurance && sir.manufacturing && sir.configuration, "SIR contains structured lifecycle/assurance/manufacturing/configuration");
  assert(sir.graph && sir.graph.entities.length > 0, "SIR retains embedded graph for round-trip");

  // Education
  const edu = new CurriculumEngine(kernel);
  const path = edu.createPath(project.id, { grade: "secondary", concepts: ["ports", "safety"] });
  assert(path.type === "Curriculum" && path.concepts.length === 2, "Curriculum path created on graph");

  // Research
  const res = new ResearchEngine(kernel);
  const exp = res.createExperiment(project.id, { question: "Does estop zero command?", hypothesis: "Yes within one step" });
  assert(exp.type === "Experiment", "Experiment created");
  const ds = res.attachDataset(exp.id, { name: "estop-runs" });
  const pub = res.createPublication(exp.id, { title: "E-stop timing" });
  assert(ds.type === "Dataset" && pub.type === "Publication", "Dataset and publication linked");

  // Teleoperation
  const tele = new TeleoperationEngine(kernel);
  let threw = false;
  try { tele.open({ id: "t1" }); } catch (e) { threw = true; }
  assert(threw, "Teleop without local safety authority rejected");
  const sess = tele.open({ id: "t2", localSafetyAuthority: "PIC", projectId: project.id, operator: "op1" });
  assert(sess.state === "OPEN", "Teleop session opens with local authority");
  const stopped = tele.emergencyStop(sess.id, "fault");
  assert(stopped.state === "SAFE", "Emergency stop forces SAFE");

  // Fleet
  const fleetEng = new FleetEngine(kernel);
  const fleet = fleetEng.createFleet(project.id, { name: "Inspection fleet" });
  fleetEng.addDeployment(fleet.id, "cfg-mobile-v1", { name: "Unit-1", status: "PLANNED" });
  const st = fleetEng.status(fleet.id);
  assert(st.deployments === 1, "Fleet tracks deployments");

  // Business
  const biz = new BusinessEngine(kernel);
  kernel.upsert({ ...kernel.store.get("comp-motor"), costMaterial: 100, costProcess: 20, costLabor: 10 });
  const cost = biz.aggregateCost(project.id);
  assert(cost.total === null && cost.complete === false && cost.declaredSubtotal >= 130, "Business engine withholds incomplete total while reporting declared subtotal");
  const fund = biz.createFunding(project.id, { name: "Seed", amount: 10000 });
  assert(fund.type === "Funding", "Funding object on graph");

  console.log("\n=== ALL ITERATION 04 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
