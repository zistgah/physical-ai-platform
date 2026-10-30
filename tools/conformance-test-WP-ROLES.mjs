/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { RoleModel, ROLES } from "../site/components/core/roles.js";

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function run() {
  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Role Slice",
    provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
  });
  const person = kernel.upsert({
    id: "person-1",
    type: "Person",
    name: "Test Person",
    provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
  });

  // The Iteration 10 relation registry resolves CONTAINS with an unconstrained target,
  // while the current kernel implementation still narrows its local definition.
  // Use the canonical store relation primitive for this conformance fixture rather
  // than changing the kernel or relation registry.
  kernel.store.relate(project.id, "CONTAINS", person.id);

  const roles = new RoleModel(kernel);
  assert(ROLES.includes("ProjectAuthority"), "ProjectAuthority is a canonical role");
  assert(!roles.hasRole(person.id, "ProjectAuthority"), "Person without role fails hasRole");

  const graphBefore = kernel.getProjectGraph(project.id);
  assert(graphBefore.entities.some(e => e.id === person.id), "Person is visible from project graph before assignment");
  assert(!graphBefore.relations.some(r => r.relation === "AUTHORIZED_BY"), "No authority edge exists before role assignment");

  roles.assignRole(person.id, "ProjectAuthority");
  assert(roles.hasRole(person.id, "ProjectAuthority"), "Assigned role passes hasRole");

  const persisted = kernel.store.get(person.id);
  assert(persisted.roles.includes("ProjectAuthority"), "Assigned role persists on Person");

  const graphAfter = kernel.getProjectGraph(project.id);
  const graphPerson = graphAfter.entities.find(e => e.id === person.id);
  assert(graphPerson?.roles?.includes("ProjectAuthority"), "Assigned role is visible from project graph");
  assert(!graphAfter.relations.some(r => r.relation === "AUTHORIZED_BY"), "Role assignment creates no AUTHORIZED_BY edge");

  // Explicit gap: authority is not inferred from the role.
  const authorityEdges = graphAfter.relations.filter(r => r.source === person.id && r.relation === "AUTHORIZED_BY");
  assert(authorityEdges.length === 0, "Missing authority binding remains an explicit graph gap");

  console.log("PASS: role model remains data-on-Person and does not create authority semantics");
  console.log("=== WP-ROLES CONFORMANCE PASSED ===");
}

run();
