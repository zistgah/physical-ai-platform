/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test for WP-INSPECTOR.
 *
 * This test uses the canonical kernel as the only semantic graph and verifies
 * that inspection reports relation direction from the edge itself rather than
 * inferring ownership from the inspected entity's type.
 */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { inspect } from "../site/components/core/inspector.js";

function entity(id, type, name) {
  return {
    id,
    type,
    name,
    provenance: {
      origin: "package",
      derivedFrom: null,
      timestamp: new Date().toISOString()
    }
  };
}

function run() {
  const kernel = createKernel();

  const project = kernel.upsert({
    ...entity("proj-1", "Project", "Slice"),
    status: "ACTIVE"
  });

  const system = kernel.upsert(entity("sys-1", "System", "System"));
  const component = kernel.upsert(entity("cmp-1", "Component", "Component"));
  const requirement = kernel.upsert(entity("req-1", "Requirement", "Requirement"));
  const port = kernel.upsert(entity("port-1", "Port", "Port"));

  kernel.link(project.id, "CONTAINS", system.id);
  kernel.link(system.id, "HAS_COMPONENT", component.id);
  kernel.link(requirement.id, "ALLOCATED_TO", component.id);
  kernel.link(component.id, "HAS_PORT", port.id);

  const graph = kernel.getProjectGraph(project.id);

  assert.equal(graph.entities.length, 5, "project graph contains project and linked package objects");
  assert.equal(graph.relations.length, 4, "project graph contains all linked relations");

  const result = inspect(kernel, project.id, component.id);

  assert.equal(result.found, true, "component is found");
  assert.equal(result.entity.id, component.id, "inspected entity is returned");

  const inboundRelations = result.inbound.map(x => x.relation.relation);
  const outboundRelations = result.outbound.map(x => x.relation.relation);

  assert(inboundRelations.includes("HAS_COMPONENT"), "HAS_COMPONENT is reported inbound to Component");
  assert(inboundRelations.includes("ALLOCATED_TO"), "ALLOCATED_TO is reported inbound to Component");
  assert(outboundRelations.includes("HAS_PORT"), "HAS_PORT is reported outbound from Component");

  const allocation = result.inbound.find(x => x.relation.relation === "ALLOCATED_TO");
  assert.equal(allocation.relation.source, requirement.id, "ALLOCATED_TO source remains Requirement");
  assert.equal(allocation.relation.target, component.id, "ALLOCATED_TO target remains Component");
  assert.equal(allocation.neighbor.id, requirement.id, "inbound neighbor is the edge owner");

  const contains = result.inbound.find(x => x.relation.relation === "HAS_COMPONENT");
  assert.equal(contains.relation.source, system.id, "HAS_COMPONENT source remains System");
  assert.equal(contains.relation.target, component.id, "HAS_COMPONENT target remains Component");

  const missing = inspect(kernel, project.id, "missing-id");
  assert.equal(missing.found, false, "unknown id returns found:false");
  assert.equal(missing.projectId, project.id, "unknown entity does not discard project context");
  assert.equal(typeof missing.gap, "string", "missing input reports an explicit gap");

  // Explicit HOLD/gap demonstration for a required but absent entity.
  console.log("HOLD/GAP: required entity missing-id is not present in project graph");

  console.log("PASS: WP-INSPECTOR");
}

run();
