/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { SubstitutionAnalysis } from "../site/components/manufacturing/substitution.js";

const kernel = createKernel();
const now = () => kernel._now();
const provenance = (origin = "package-test") => ({
  origin,
  derivedFrom: "WP-SOVEREIGNTY",
  timestamp: now()
});

const project = kernel.upsert({
  id: "proj-1",
  type: "Project",
  name: "Substitution Slice",
  provenance: provenance()
});

const single = kernel.upsert({
  id: "component-single",
  type: "Component",
  name: "Single-source component",
  provenance: provenance()
});
const supplierA = kernel.upsert({
  id: "supplier-a",
  type: "Supplier",
  name: "Supplier A",
  provenance: provenance()
});

const unresolved = kernel.upsert({
  id: "component-unresolved",
  type: "Component",
  name: "Unresolved component",
  provenance: provenance()
});

const multi = kernel.upsert({
  id: "component-multi",
  type: "Component",
  name: "Multi-source component",
  provenance: provenance()
});
const supplierB = kernel.upsert({
  id: "supplier-b",
  type: "Supplier",
  name: "Supplier B",
  provenance: provenance()
});

const dependencyOnly = kernel.upsert({
  id: "component-dependency-only",
  type: "Component",
  name: "Dependency-only component",
  provenance: provenance()
});
const dependencyTarget = kernel.upsert({
  id: "dependency-target",
  type: "Component",
  name: "Dependency target",
  provenance: provenance()
});

kernel.link(project.id, "CONTAINS", single.id);
kernel.link(project.id, "CONTAINS", unresolved.id);
kernel.link(project.id, "CONTAINS", multi.id);
kernel.link(project.id, "CONTAINS", dependencyOnly.id);
kernel.link(single.id, "SUPPLIED_BY", supplierA.id);
kernel.link(multi.id, "SUPPLIED_BY", supplierA.id);
kernel.link(multi.id, "SUPPLIED_BY", supplierB.id);
kernel.link(dependencyOnly.id, "DEPENDS_ON", dependencyTarget.id);

const graph = kernel.getProjectGraph(project.id);
assert.ok(graph.entities.some(e => e.id === single.id));
assert.ok(graph.relations.some(r => r.source === single.id && r.relation === "SUPPLIED_BY" && r.target === supplierA.id));
assert.ok(graph.relations.some(r => r.source === dependencyOnly.id && r.relation === "DEPENDS_ON" && r.target === dependencyTarget.id));

const analysis = new SubstitutionAnalysis(kernel);

const one = analysis.analyze(single.id);
assert.equal(one.outcome, "SINGLE_SOURCE");
assert.equal(one.supplierCount, 1);
assert.equal(one.suppliers[0].id, supplierA.id);

const none = analysis.analyze(unresolved.id);
assert.equal(none.outcome, "HOLD");
assert.equal(none.status, "UNSPECIFIED");
assert.equal(none.supplierCount, 0);

const two = analysis.analyze(multi.id);
assert.equal(two.outcome, "NOT_SINGLE_SOURCE");
assert.equal(two.supplierCount, 2);

const dependency = analysis.analyze(dependencyOnly.id);
assert.equal(dependency.outcome, "HOLD");
assert.equal(dependency.status, "UNSPECIFIED");
assert.equal(dependency.supplierCount, 0);
assert.equal(analysis.dependenciesFor(dependencyOnly.id).length, 1);
assert.equal(analysis.dependenciesFor(dependencyOnly.id)[0].id, dependencyTarget.id);

// Explicitly exercise the validator's missing-target path. This is not a
// hardcoded HOLD fixture: the package validator receives an absent target.
const validation = analysis.validateRelationInput({
  source: unresolved,
  target: undefined,
  relation: "SUPPLIED_BY"
});
assert.equal(validation.outcome, "HOLD");
assert.equal(validation.status, "UNSPECIFIED");

// No supplier relation may be synthesized from DEPENDS_ON.
assert.equal(
  kernel.store.relations.filter(r => r.source === dependencyOnly.id && r.relation === "SUPPLIED_BY").length,
  0
);

console.log("WP-SOVEREIGNTY conformance: PASS");
console.log(JSON.stringify({ one, none, two, dependency, validation }, null, 2));
