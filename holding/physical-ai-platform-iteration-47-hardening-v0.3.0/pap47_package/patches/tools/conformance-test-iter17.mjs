/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 17 – the domains outside CAD.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { runProgram } from "../site/components/sir/sir-runtime.js";
import { MES } from "../site/components/manufacturing/mes.js";
import { ERP } from "../site/components/core/erp.js";
import { LMS } from "../site/components/education/lms.js";
import { prove } from "../site/components/core/prover.js";
import { solve } from "../site/components/simulation/multiphysics.js";
import { DistributedRuntime } from "../site/components/core/distributed.js";
import { runLoop } from "../site/components/simulation/hil-loop.js";
import { FleetOps } from "../site/components/core/fleet-ops.js";
import { RemoteStack } from "../site/components/teleoperation/remote-stack.js";
import { CockpitExec } from "../site/components/core/cockpit-exec.js";
import { StandardsBinding } from "../site/components/compliance/standards-binding.js";
import { relationStatus } from "../site/components/core/relation-registry.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 17 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p17", type: "Project", name: "Ops", provenance: { origin: "iter17" } });

  const sir = runProgram(kernel, project.id, `
    sir 0.2 "line";
    fn area(w, h) { return w TIMES h; }
    let n = area(3, 4);
    if (n GT 10) { entity Component plate { name: "Plate"; } }
    for (i in 1 DOTDOT 2) { entity Component bolt { name: "Bolt"; } }
  `);
  assert(sir.outcome === "OK" && sir.env.n === 12 && sir.created.length === 3, "SIR program creates entities from control flow");
  let unbound = false;
  try { runProgram(kernel, project.id, `sir 0.2 "bad"; let x = missing;`); }
  catch (e) { unbound = String(e.message).includes("Unbound"); }
  assert(unbound, "SIR rejects an unbound name");

  const manufactured = relationStatus("MANUFACTURED_BY");
  assert(manufactured.unresolved === false && manufactured.def.source.includes("Component"), "MANUFACTURED_BY is Component manufactured by Process");

  const mes = new MES(kernel);
  const machine = mes.machine(project.id, { id: "mill-1", name: "Mill" });
  const part = kernel.upsert({ id: "housing", type: "Component", name: "Housing", provenance: { origin: "iter17" } });
  kernel.link(project.id, "CONTAINS", part.id);
  const wo = mes.release(project.id, { id: "wo-1", componentId: part.id, processId: machine.id, steps: [{ name: "cut" }, { name: "inspect", inspection: true }] });
  assert(wo.status === "RELEASED", "MES releases a work order onto a machine");
  mes.advance(wo.id);
  const held = mes.advance(wo.id);
  assert(held.outcome === "HOLD", "MES holds a step that needs inspection");
  const done = mes.advance(wo.id, { inspectionPass: true });
  assert(done.status === "COMPLETE", "MES completes only after the inspection passes");

  const erp = new ERP(kernel);
  erp.stock(project.id, { id: "mat-1", sku: "Al-6061", qty: 5, cost: 10 });
  const order = erp.order(project.id, { id: "ord-1", customerId: "c1", lines: [{ materialId: "mat-1", qty: 8 }] });
  assert(erp.issue(order.id).outcome === "HOLD", "ERP holds an issue that exceeds stock");
  order.lines[0].qty = 2;
  const issued = erp.issue(order.id);
  assert(issued.status === "ISSUED" && issued.cost === 20 && kernel.store.get("mat-1").qty === 3, "ERP issues stock and rolls cost");

  const lms = new LMS(kernel);
  const course = lms.course(project.id, { id: "course-1", name: "Safety", lessons: [{ id: "l1" }, { id: "l2" }] });
  assert(lms.completeLesson(course.id, "l1", "ada").outcome === "HOLD", "LMS holds a lesson for someone not enrolled");
  lms.enroll(course.id, "ada");
  lms.completeLesson(course.id, "l1", "ada");
  assert(course.status === "OPEN", "LMS keeps the course open with a lesson left");
  lms.completeLesson(course.id, "l2", "ada");
  assert(course.status === "COMPLETE", "LMS completes the course when every lesson is done");

  assert(prove([{ left: "x", op: ">=", right: 5 }], { left: "x", op: ">=", right: 3 }).outcome === "PROVED", "Prover proves a weaker bound");
  assert(prove([{ left: "x", op: ">=", right: 1 }], { left: "x", op: ">=", right: 9 }).outcome === "HOLD", "Prover holds an unproved claim");

  const physics = solve({ length: 1, alpha: 1e-5, k: 0.2, area: 0.01, temp0: 20, tempBoundary: 80, steps: 20, dt: 0.5, force: 100 });
  assert(physics.outcome === "OK" && physics.temp > 20 && physics.temp < 80, "Solver integrates temperature toward the boundary");
  assert(physics.history.length === 20, "Solver records every step");

  const rt = new DistributedRuntime();
  rt.node("n1", { up: true });
  rt.node("n2", { up: false });
  assert(rt.submit("n2", { id: "j0", fn: () => 1 }).outcome === "HOLD", "Runtime holds a job for a down node");
  rt.submit("n1", { id: "j1", fn: () => 41 });
  assert(rt.tick()[0].value === 41, "Runtime runs a queued job");

  const hil = runLoop({
    device: { bound: true, id: "hil-bench", transport: "bench" },
    plant: { x0: 0, step: (x, u, dt) => x + dt * (-x + u) },
    controller: (x) => 1 - x,
    steps: 10, dt: 0.1, deadline: 1
  });
  assert(hil.outcome === "HOLD" && hil.method === "UNAVAILABLE", "A transport label without hardware I/O and authority is not HIL");
  assert(runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 1, dt: 2, deadline: 1 }).outcome === "HOLD", "HIL holds a missed deadline");

  const fleet = kernel.upsert({ id: "fleet-1", type: "Fleet", name: "Line", provenance: { origin: "iter17" } });
  kernel.link(project.id, "CONTAINS", fleet.id);
  const dep = kernel.upsert({ id: "dep-1", type: "Deployment", name: "Cell", status: "ACTIVE", provenance: { origin: "iter17" } });
  kernel.link(fleet.id, "CONTAINS", dep.id);
  const ops = new FleetOps(kernel);
  assert(ops.health(fleet.id).active === 1, "Fleet ops rolls up health");
  assert(ops.dispatch(fleet.id, { deploymentId: dep.id, command: "HOLD" }).outcome === "HOLD", "Fleet ops holds a command without authority");
  assert(ops.dispatch(fleet.id, { deploymentId: dep.id, command: "START", authority: "supervisor" }).outcome === "DISPATCHED", "Fleet ops dispatches with authority");

  const tele = new RemoteStack();
  tele.open({ id: "s1", operator: "ada" });
  assert(tele.command("s1", "jog").outcome === "HOLD", "Teleop holds a command with the link down");
  tele.connect("s1", 40);
  assert(tele.command("s1", "jog").outcome === "SENT", "Teleop sends on an up link");
  tele.estop("s1");
  assert(tele.command("s1", "jog").outcome === "HOLD", "Teleop holds after local e-stop");

  const cockpit = new CockpitExec(kernel);
  const session = cockpit.open(project.id, { id: "ck-1", items: [{ id: "i1", authority: "APPROVE" }] });
  assert(cockpit.complete(session.id, "i1", { role: "viewer", authorities: ["OBSERVE"] }).outcome === "HOLD", "Cockpit holds a checklist item the role cannot approve");
  const closed = cockpit.complete(session.id, "i1", { role: "lead", authorities: ["APPROVE"] });
  assert(closed.state === "S10", "Cockpit reaches S10 when the checklist is done");

  const standard = kernel.upsert({ id: "std-1", type: "Standard", name: "ISO 10218", provenance: { origin: "iter17" } });
  kernel.link(project.id, "CONTAINS", standard.id);
  const binding = new StandardsBinding(kernel);
  const accepted = binding.accept(project.id, standard.id, { role: "compliance-lead" });
  assert(accepted.regulatoryDetermination === false, "Acceptance is not a regulatory determination");
  assert(binding.gate(accepted.id).outcome === "HOLD", "Binding without evidence holds");
  const ev = kernel.upsert({ id: "ev-1", type: "Evidence", name: "Test", state: "EXECUTED", method: "PHYSICAL_TEST", provenance: { origin: "iter17" } });
  binding.attachEvidence(accepted.id, ev.id);
  assert(binding.gate(accepted.id).outcome === "PASS", "Binding with evidence passes");

  console.log("\n=== ALL ITERATION 17 TESTS PASSED ===");
}
run();
