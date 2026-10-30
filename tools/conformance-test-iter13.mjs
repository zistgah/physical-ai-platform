/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 13 – integration. Overlays consumed. Domains are in scope.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { relationStatus } from "../site/components/core/relation-registry.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { FactoryResolution } from "../site/components/manufacturing/factory-resolution.js";
import { boundary, allBoundaries } from "../site/components/core/industrial-boundary.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { evaluateConstraints } from "../site/components/sir/sir-check.js";
import { buildWorkbenchModel } from "../site/components/workbench/build-adapter.js";
import { inspect } from "../site/components/core/inspector.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 13 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p13", type: "Project", name: "Iter13", provenance: { origin: "iter13" } });

  const stage = relationStatus("HAS_STAGE");
  assert(stage.defined && stage.source === "overlay", "HAS_STAGE consumed from overlay");
  const made = relationStatus("MANUFACTURED_BY");
  assert(made.defined === true && made.def.source.includes("WorkOrder") && made.def.source.includes("Component"), "MANUFACTURED_BY keeps both directions");

  const factory = new FactoryResolution(kernel);
  const missing = factory.record(project.id, {});
  assert(missing.outcome === "HOLD", "Factory without component HOLDs");
  const comp = kernel.upsert({ id: "c13", type: "Component", name: "Frame", provenance: { origin: "iter13" } });
  kernel.link(project.id, "CONTAINS", comp.id);
  const recorded = factory.record(project.id, { componentId: comp.id, processName: "Cut" });
  assert(recorded.manufacturedBy === "proc_c13", "Factory record settles MANUFACTURED_BY to the process");

  const safety = new SafetyEngine(kernel);
  const cockpit = safety.cockpit(project.id);
  cockpit.start();
  const blocked = cockpit.advance("S1_CONFIGURATION_VERIFIED");
  assert(blocked.status === "HOLD", "Operational cockpit blocks unfrozen configuration");

  const standards = new StandardsCorpusEngine(kernel).query({ topic: "life cycle" });
  assert(standards.every(s => s.legalStatus === "NOT_A_DETERMINATION"), "Standards are not applicable law");
  assert(standards.every(s => s.status === "INFORMATIONAL"), "Corpus status unchanged");

  const sir = evaluateConstraints(kernel, project.id);
  assert(sir.complete === false, "SIR language is not claimed complete");

  const bounds = allBoundaries();
  assert(bounds.length === 12 && bounds.every(b => b.status !== "NON_GOAL"), "No domain is marked a non-goal");
  assert(boundary("GEOMETRY_CAD").status === "IMPLEMENTED", "Geometry CAD is in scope and implemented");

  const model = buildWorkbenchModel(kernel, project.id);
  assert(model && !model.store, "Workbench reads the canonical graph");
  const view = inspect(kernel, project.id, comp.id);
  assert(view.found !== false, "Inspector returns the component");

  console.log("\n=== ALL ITERATION 13 TESTS PASSED ===");
}
run();
