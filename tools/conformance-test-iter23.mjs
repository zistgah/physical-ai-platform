/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 23 – workbench views, quarantine, consistent export, modes, faults, extended physics.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GraphEditor } from "../site/components/graph/graph-editor.js";
import { ImportQuarantine } from "../site/components/simulation/import-quarantine.js";
import { ConsistentExport } from "../site/components/simulation/consistent-export.js";
import { WorkbenchModes } from "../site/components/simulation/workbench-modes.js";
import { FaultInjection } from "../site/components/simulation/fault-injection.js";
import { solveExtended } from "../site/components/simulation/multiphysics-extended.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 23 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p23", type: "Project", name: "Bench", provenance: { origin: "iter23" } });
  kernel.upsert({ id: "sw", type: "Software", name: "Controller", provenance: { origin: "iter23" } });
  kernel.upsert({ id: "ev", type: "Event", name: "E-stop", provenance: { origin: "iter23" } });
  kernel.upsert({ id: "cost", type: "Cost", name: "Frame", amount: 120, provenance: { origin: "iter23" } });
  kernel.upsert({ id: "std", type: "Standard", name: "ISO 15288", provenance: { origin: "iter23" } });
  kernel.upsert({ id: "solid", type: "Solid", name: "Base", volume: 1000, bounds: [10, 10, 10], position: [0, 0, 0], provenance: { origin: "iter23" } });
  for (const id of ["sw", "ev", "cost", "std", "solid"]) kernel.link(project.id, "CONTAINS", id);

  const editor = new GraphEditor(kernel);
  for (const view of ["software", "event", "commercial", "regulatory", "physical3d"]) {
    const result = editor.view(project.id, view);
    assert(result.outcome === "OK" && result.entities.length > 0, `${view} view returns its entities`);
  }
  const bare = kernel.upsert({ id: "nobounds", type: "Solid", name: "Bare", provenance: { origin: "iter23" } });
  kernel.link(project.id, "CONTAINS", bare.id);
  assert(editor.view(project.id, "physical3d").outcome === "HOLD", "Physical 3D HOLDs without bounds");

  const q = new ImportQuarantine(kernel);
  assert(q.admit(project.id, { id: "x", name: "X", schema: "component-v1", license: "UNKNOWN", ports: ["a"] }).outcome === "HOLD", "Unknown license stays in quarantine");
  const admitted = q.admit(project.id, { id: "motor", name: "Motor", schema: "component-v1", license: "MIT", ports: [{ name: "shaft", unit: "N.m" }] });
  assert(admitted.outcome === "ADMITTED" && admitted.stages.length === 8, "Clean import passes all stages");

  const exp = new ConsistentExport(kernel);
  const research = exp.export(project.id, "research");
  const dossier = exp.export(project.id, "dossier");
  assert(research.numbers.material === 120 && research.numbers.volume === 1000, "Research export uses graph numbers");
  assert(research.numbers.material === dossier.numbers.material && research.numbers.volume === dossier.numbers.volume, "Research and dossier share the same numbers");
  assert(exp.export(project.id, "demo").numbers.evidence === 0, "Demo does not invent evidence");

  const modes = new WorkbenchModes();
  assert(modes.set(project, "Novice").views.length === 2, "Novice sees two views");
  assert(modes.set(project, "Thought Leader").views.includes("regulatory"), "Thought Leader sees regulatory");
  assert(modes.set(project, "Wizard").outcome === "HOLD", "Unknown mode HOLDs");

  const faults = new FaultInjection(kernel);
  for (const domain of ["sensor", "actuator", "power", "communications", "ai", "environment"]) {
    assert(faults.inject(project.id, { domain, magnitude: 1 }).outcome === "INJECTED", `${domain} fault injects`);
  }
  assert(faults.apply(project.id, 10).value === 16, "Injected faults change the reading");
  assert(faults.inject(project.id, { domain: "magic" }).outcome === "HOLD", "Unknown fault domain HOLDs");

  const solved = solveExtended({ steps: 4, dt: 0.1, mass: 1, kSpring: 1, resistance: 2, current: 1, kThermal: 0.1, temp0: 20, tempAmb: 20, sensorNoise: 0.01, envForce: 0.2 });
  assert(solved.outcome === "OK" && solved.steps === 4 && solved.history[0].control !== undefined, "Extended solver couples sensor, control, and environment");
  assert(solveExtended({ steps: 1, dt: 0.1, mass: 1, kSpring: 1, resistance: 2, current: 1, kThermal: 0.1, temp0: 20, tempAmb: 20 }).outcome === "HOLD", "One step is not the extended solver");

  console.log("\n=== ALL ITERATION 23 TESTS PASSED ===");
}
run();
