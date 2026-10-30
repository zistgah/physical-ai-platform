/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { buildWorkbenchModel } from "../site/components/workbench/build-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function entity(kernel, id, type, name, extra = {}) {
  return kernel.upsert({
    id,
    type,
    name,
    ...extra,
    provenance: {
      origin: "package-test",
      derivedFrom: null,
      timestamp: kernel._now()
    }
  });
}

function run() {
  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Workbench Wire Slice",
    provenance: { origin: "package-test" }
  });

  const emptyModel = buildWorkbenchModel(kernel, project.id);
  assert(emptyModel.systems.length === 0, "Empty project returns no systems");
  assert(
    emptyModel.upgradeNotes.some(note => note.status === "HOLD" && note.code === "SYSTEM_MISSING"),
    "Missing required System is reported as HOLD"
  );

  const system = entity(kernel, "sys-1", "System", "Drive System", {
    architectureVersion: "1.0.0"
  });
  const motor = entity(kernel, "cmp-motor", "Component", "Drive Motor");
  const motorPort = entity(kernel, "port-motor-command", "Port", "Motor Command", {
    direction: "out",
    portType: "command",
    unit: null,
    domain: "drive"
  });

  kernel.link(project.id, "CONTAINS", system.id);
  kernel.link(system.id, "HAS_COMPONENT", motor.id);
  kernel.link(motor.id, "HAS_PORT", motorPort.id);

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(entity => entity.id === system.id), "Project graph contains System");
  assert(graph.entities.some(entity => entity.id === motorPort.id), "Project graph contains motor Port");
  assert(
    graph.relations.some(relation =>
      relation.source === system.id && relation.relation === "HAS_COMPONENT" && relation.target === motor.id
    ),
    "Project graph contains HAS_COMPONENT link"
  );
  assert(
    graph.relations.some(relation =>
      relation.source === motor.id && relation.relation === "HAS_PORT" && relation.target === motorPort.id
    ),
    "Project graph contains HAS_PORT link"
  );

  const model = buildWorkbenchModel(kernel, project.id);
  assert(model.systems.length >= 1, "Adapter returns at least one system");
  assert(model.systems.some(systemModel => systemModel.id === system.id), "Returned system is canonical System");
  assert(model.ports.some(portModel => portModel.id === motorPort.id), "Adapter returns motor port");
  assert(model.ports.find(portModel => portModel.id === motorPort.id).componentId === motor.id, "Motor port retains canonical owner");
  assert(!model.upgradeNotes.some(note => note.code === "PORTS_MISSING"), "Reachable motor port clears the port gap");

  const allIds = kernel.store.all().map(entity => entity.id);
  assert(allIds.includes(project.id) && allIds.includes(system.id) && allIds.includes(motorPort.id), "One canonical store contains all package objects");
  assert(kernel.store.all("System").length === 1 && kernel.store.all("Port").length === 1, "No second workbench store is created");

  console.log("\n=== WP-WORKBENCH-WIRE CONFORMANCE PASSED ===");
}

run();
