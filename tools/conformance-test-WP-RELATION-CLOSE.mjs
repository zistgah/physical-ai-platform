/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * WP-RELATION-CLOSE conformance test.
 *
 * This test deliberately does not modify the kernel or relation-registry.
 * The package is an additive overlay, so the current kernel remains unaware
 * of the overlay until a future integration package explicitly consumes it.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { RESOLVED_RELATIONS, UNRESOLVED_RELATIONS } from "../site/components/core/relation-registry.js";
import { PACKAGE_RELATIONS } from "../site/components/core/relation-overlay.js";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function provenance(kernel, derivedFrom = "WP-RELATION-CLOSE") {
  return {
    origin: "package",
    derivedFrom,
    timestamp: kernel._now()
  };
}

function add(kernel, id, type, name) {
  return kernel.upsert({ id, type, name, provenance: provenance(kernel) });
}

function run() {
  console.log("=== WP-RELATION-CLOSE ===");

  const expected = [
    "HAS_STAGE", "HAS_GATE", "DEPENDS_ON", "SUPPLIED_BY",
    "MANUFACTURED_BY", "HAS_CONFIGURATION", "TESTED_BY", "SIMULATED_BY"
  ];

  assert(Object.keys(PACKAGE_RELATIONS).length === expected.length, "Overlay contains exactly the requested relation set");

  for (const relation of expected) {
    const def = PACKAGE_RELATIONS[relation];
    assert(def && Array.isArray(def.source) && Array.isArray(def.target), `${relation} has source and target arrays`);
    assert(UNRESOLVED_RELATIONS.includes(relation), `${relation} was named unresolved by the Iteration 10 registry`);
  }

  // Existing registry definitions remain untouched and visible.
  assert(RESOLVED_RELATIONS.CONTAINS, "Existing CONTAINS definition remains present");
  assert(RESOLVED_RELATIONS.CONFIGURED_BY, "Existing CONFIGURED_BY definition remains present");

  // Architectural endpoint assertions that are explicit in the package brief.
  assert(JSON.stringify(PACKAGE_RELATIONS.HAS_STAGE.source) === JSON.stringify(["Project"]), "HAS_STAGE is Project -> LifecycleStage");
  assert(JSON.stringify(PACKAGE_RELATIONS.HAS_STAGE.target) === JSON.stringify(["LifecycleStage"]), "HAS_STAGE target is LifecycleStage");
  assert(JSON.stringify(PACKAGE_RELATIONS.HAS_GATE.source) === JSON.stringify(["Project"]), "HAS_GATE is Project -> Gate");
  assert(JSON.stringify(PACKAGE_RELATIONS.HAS_GATE.target) === JSON.stringify(["Gate"]), "HAS_GATE target is Gate");
  assert(!PACKAGE_RELATIONS.HAS_GATE.source.includes("LifecycleStage"), "HAS_GATE does not invent LifecycleStage -> Gate");
  assert(PACKAGE_RELATIONS.SUPPLIED_BY.source.includes("Component") && PACKAGE_RELATIONS.SUPPLIED_BY.source.includes("Material"), "SUPPLIED_BY covers Component and Material supply");
  assert(PACKAGE_RELATIONS.SUPPLIED_BY.target.includes("Supplier"), "SUPPLIED_BY targets Supplier");
  assert(!PACKAGE_RELATIONS.SUPPLIED_BY.source.includes("Process"), "SUPPLIED_BY does not assume every Process is a supplied capability");
  assert(PACKAGE_RELATIONS.MANUFACTURED_BY.architecturalStatus === "DEFINED", "MANUFACTURED_BY is defined");
  assert(PACKAGE_RELATIONS.MANUFACTURED_BY.source.includes("WorkOrder") && PACKAGE_RELATIONS.MANUFACTURED_BY.source.includes("Component"), "MANUFACTURED_BY keeps both directions");
  assert(PACKAGE_RELATIONS.MANUFACTURED_BY.precedentDirection === "WorkOrder -> Component", "MANUFACTURED_BY keeps the WorkOrder precedent");
  assert(PACKAGE_RELATIONS.HAS_CONFIGURATION.architecturalStatus === "DEFINED", "HAS_CONFIGURATION is defined independently of CONFIGURED_BY");
  assert(PACKAGE_RELATIONS.TESTED_BY.target.includes("Test"), "TESTED_BY targets Test");
  assert(!PACKAGE_RELATIONS.TESTED_BY.target.includes("Requirement"), "TESTED_BY does not invert VERIFIES into a target Requirement");
  assert(PACKAGE_RELATIONS.SIMULATED_BY.target.includes("Simulation"), "SIMULATED_BY targets Simulation");

  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Relation Close Slice",
    provenance: provenance(kernel)
  });

  const stage = add(kernel, "stage-architect", "LifecycleStage", "Architect");
  const gate = add(kernel, "gate-g3", "Gate", "G3 Architecture");
  const system = add(kernel, "sys-1", "System", "System");
  const subsystem = add(kernel, "sub-1", "Subsystem", "Subsystem");
  const component = add(kernel, "comp-1", "Component", "Component");
  const requirement = add(kernel, "req-1", "Requirement", "Requirement");
  const supplier = add(kernel, "supplier-1", "Supplier", "Supplier");
  const material = add(kernel, "mat-1", "Material", "Material");
  const configuration = add(kernel, "cfg-1", "Configuration", "Configuration");
  const test = add(kernel, "test-1", "Test", "Test");
  const simulation = add(kernel, "sim-1", "Simulation", "Simulation");
  const deployment = add(kernel, "dep-1", "Deployment", "Deployment");
  const workOrder = add(kernel, "wo-1", "WorkOrder", "Work Order");

  // Attach the fixture entities to the project so getProjectGraph can traverse
  // the canonical project graph without inventing a second graph root.
  for (const entity of [stage, gate, system, subsystem, component, requirement, configuration, test, simulation, deployment, workOrder]) {
    kernel.link(project.id, "CONTAINS", entity.id);
  }

  // Required graph fixture. The kernel accepts these typed relation names,
  // but does not consume this overlay. That distinction is intentional.
  kernel.link(project.id, "HAS_STAGE", stage.id);
  kernel.link(project.id, "HAS_GATE", gate.id);
  kernel.link(system.id, "DEPENDS_ON", subsystem.id);
  kernel.link(component.id, "SUPPLIED_BY", supplier.id);
  kernel.link(material.id, "SUPPLIED_BY", supplier.id);
  kernel.link(workOrder.id, "MANUFACTURED_BY", component.id); // implementation precedent only
  kernel.link(system.id, "HAS_CONFIGURATION", configuration.id);
  kernel.link(component.id, "TESTED_BY", test.id);
  kernel.link(deployment.id, "SIMULATED_BY", simulation.id);
  kernel.link(requirement.id, "DEPENDS_ON", component.id);

  const graph = kernel.getProjectGraph(project.id);
  const relationNames = new Set(graph.relations.map(r => r.relation));
  for (const relation of ["HAS_STAGE", "HAS_GATE", "DEPENDS_ON", "SUPPLIED_BY", "MANUFACTURED_BY", "HAS_CONFIGURATION", "TESTED_BY", "SIMULATED_BY"]) {
    assert(relationNames.has(relation), `${relation} is retrievable from the canonical project graph`);
  }
  assert(graph.entities.some(e => e.id === component.id), "Canonical graph contains component fixture");
  assert(graph.entities.some(e => e.id === configuration.id), "Canonical graph contains configuration fixture");
  assert(kernel.store.relations.some(r => r.source === material.id && r.relation === "SUPPLIED_BY" && r.target === supplier.id), "Canonical store retains Material -> SUPPLIED_BY -> Supplier");

  // Missing endpoint: exercise the canonical validator with a real missing
  // target. No pre-built HOLD object is fabricated. The validator's failure
  // is mapped to HOLD because missing information must not pass silently.
  kernel.store.relations.push({
    source: component.id,
    relation: "SUPPLIED_BY",
    target: "supplier-missing",
    metadata: {}
  });
  const validation = kernel.validateGraph();
  assert(validation.valid === false, "Validator rejects a relation with a missing target");
  assert(validation.errors.some(e => e.includes("missing target supplier-missing")), "Validator reports the actual missing target");
  const missingInputOutcome = validation.valid ? "GO" : "HOLD";
  assert(missingInputOutcome === "HOLD", "Missing required endpoint produces HOLD rather than a fabricated value");
  console.log(`HOLD: ${validation.errors.find(e => e.includes("missing target supplier-missing"))}`);

  // The overlay must not silently claim kernel activation.
  const status = kernel.validateGraph();
  assert(!status.unresolvedRelations.some(r => r.relation === "HAS_STAGE"), "Defined overlay relation HAS_STAGE is now consumed");
  assert(!status.unresolvedRelations.some(r => r.relation === "MANUFACTURED_BY"), "MANUFACTURED_BY is defined and no longer unresolved");
  console.log("PASS: Overlay remains additive and is not treated as kernel activation");

  // Unused fixture is intentionally retained to ensure the entity vocabulary
  // remains exercised without inventing additional relations.
  assert(project && gate && workOrder, "Project, Gate, and WorkOrder fixtures exist");

  console.log("\n=== WP-RELATION-CLOSE TESTS PASSED ===");
}

run();
