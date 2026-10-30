/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/canonical-mobile-robot.js
 * FILE PURPOSE: Canonical mobile robot scenario. A functional wheeled robot for replay and telemetry.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Canonical Mobile Robot Reference Project – Iteration 01
 * Turns the existing wheeled robot simulation into a real canonical project
 * with System, Components, Ports, Connections, Requirements, Simulation, Evidence.
 */

import { createKernel } from "../core/canonical-kernel.js";
import { port } from "../core/contracts.js";
import { createMobileRobotScenario } from "../simulation/scenario.js";

/** createCanonicalMobileRobotProject: Canonical mobile robot scenario. A functional wheeled robot for replay and telemetry. */
export function createCanonicalMobileRobotProject() {
  const kernel = createKernel();
  const proj = kernel.createProject({
    id: "proj-mobile-robot-demo",
    name: "Wheeled Inspection Robot – Reference",
    description: "First end-to-end canonical project demonstrating Project → System → Components → Ports → Connections → Requirement → Simulation → Evidence",
    creator: "iteration-01"
  });

  // Mission
  const mission = kernel.upsert({
    id: "mission-inspect",
    type: "Mission",
    name: "Autonomous Inspection",
    status: "ACTIVE"
  });
  kernel.link(proj.id, "CONTAINS", mission.id);

  // System
  const system = kernel.upsert({
    id: "sys-wheeled-robot",
    type: "System",
    name: "Wheeled Inspection Robot",
    domain: "TERRESTRIAL",
    embodiment: "WHEELED",
    status: "ACTIVE"
  });
  kernel.link(proj.id, "CONTAINS", system.id);
  kernel.link(system.id, "PART_OF", proj.id);

  // Components with ports
  const battery = kernel.upsert({
    id: "comp-battery",
    type: "Component",
    name: "Battery Pack",
    version: "1.0.0",
    ports: {
      power_out: port("power_out", { direction: "out", type: "power", unit: "W" })
    },
    capabilities: ["ENERGY_STORAGE"]
  });
  const motor = kernel.upsert({
    id: "comp-motor",
    type: "Component",
    name: "Drive Motor",
    version: "1.0.0",
    ports: {
      command_in: port("command_in", { direction: "in", type: "command" }),
      speed_out: port("speed_out", { direction: "out", type: "data", unit: "m/s" })
    },
    capabilities: ["MOTION"]
  });
  const controller = kernel.upsert({
    id: "comp-controller",
    type: "Component",
    name: "Motion Controller",
    version: "1.0.0",
    ports: {
      command_out: port("command_out", { direction: "out", type: "command" })
    },
    capabilities: ["CONTROL"]
  });
  const estop = kernel.upsert({
    id: "comp-estop",
    type: "Component",
    name: "Emergency Stop",
    version: "1.0.0",
    ports: {
      safety_out: port("safety_out", { direction: "out", type: "safety" })
    },
    capabilities: ["SAFETY"]
  });

  kernel.link(system.id, "HAS_COMPONENT", battery.id);
  kernel.link(system.id, "HAS_COMPONENT", motor.id);
  kernel.link(system.id, "HAS_COMPONENT", controller.id);
  kernel.link(system.id, "HAS_COMPONENT", estop.id);

  // Valid connection (first-class, validated)
  try {
    kernel.createConnection({
      sourceComponentId: controller.id,
      sourcePortId: "command_out",
      targetComponentId: motor.id,
      targetPortId: "command_in",
      metadata: { name: "Controller to Motor command" }
    });
  } catch (e) {
    // fallback to relation for compatibility
    kernel.link(controller.id, "CONNECTS_TO", motor.id, { fromPort: "command_out", toPort: "command_in" });
  }

  // Requirement
  const req = kernel.upsert({
    id: "req-motion-safe",
    type: "Requirement",
    name: "Safe motion under emergency stop",
    text: "Emergency stop shall force motion command to zero within one timestep.",
    status: "ALLOCATED"
  });
  kernel.link(proj.id, "CONTAINS", req.id);
  kernel.allocateRequirement(req.id, controller.id);

  // Test
  const test = kernel.upsert({
    id: "test-estop-sim",
    type: "Test",
    name: "Emergency Stop Simulation Test",
    method: "SIMULATION",
    status: "PLANNED"
  });
  kernel.addVerification(req.id, test.id);

  // Intent / Policy / Authority examples
  const intent = kernel.upsert({ id: "intent-inspect", type: "Intent", name: "Perform inspection", status: "VALID" });
  const policy = kernel.upsert({ id: "policy-safe", type: "Policy", name: "Safety policy", status: "VALID" });
  kernel.link(intent.id, "GOVERNED_BY", policy.id);

  
  // --- Iteration 03: Lifecycle, Configuration, Hazard, Assurance, Compliance ---
  const stage = kernel.upsert({ id: "stage-architect", type: "LifecycleStage", name: "Architect", status: "CURRENT" });
  kernel.link(proj.id, "CONTAINS", stage.id);
  const gate = kernel.upsert({ id: "G3", type: "Gate", name: "Architecture", status: "CURRENT", applicable: true });
  kernel.link(proj.id, "CONTAINS", gate.id);
  kernel.link(gate.id, "REQUIRES", req.id);

  const cfg = kernel.upsert({
    id: "cfg-mobile-v1",
    type: "Configuration",
    name: "Mobile Robot Design Configuration",
    projectId: proj.id,
    items: [
      { id: system.id, type: "System", version: "1.0.0", name: system.name },
      { id: "comp-battery", type: "Component", version: "1.0.0", name: "Battery Pack" },
      { id: "comp-motor", type: "Component", version: "1.0.0", name: "Drive Motor" },
      { id: "comp-controller", type: "Component", version: "1.0.0", name: "Motion Controller" },
      { id: "comp-estop", type: "Component", version: "1.0.0", name: "Emergency Stop" }
    ],
    status: "DRAFT",
    kind: "Design"
  });
  kernel.link(proj.id, "CONTAINS", cfg.id);

  const hazard = kernel.upsert({
    id: "haz-estop-fail",
    type: "Hazard",
    name: "Emergency stop fails to zero command",
    hazardType: "Actuator",
    status: "CONTROLLED",
    severity: "HIGH"
  });
  kernel.link(proj.id, "CONTAINS", hazard.id);

  
  // --- Iteration 05: cross-vertical demonstrator objects ---
  const bl = kernel.upsert({
    id: "bl-design-v1",
    type: "Baseline",
    name: "Design Baseline",
    kind: "Design",
    configurationId: "cfg-mobile-v1",
    status: "FROZEN",
    provenance: { origin: "baseline", derivedFrom: "cfg-mobile-v1" }
  });
  kernel.link(proj.id, "CONTAINS", bl.id);

  const dep = kernel.upsert({
    id: "dep-unit-1",
    type: "Deployment",
    name: "Unit-1",
    configurationId: "cfg-mobile-v1",
    status: "PLANNED",
    provenance: { origin: "operations", derivedFrom: "cfg-mobile-v1" }
  });
  kernel.link(proj.id, "CONTAINS", dep.id);

  const telem = kernel.upsert({
    id: "telem-unit-1",
    type: "Telemetry",
    name: "Unit-1 telemetry",
    deploymentId: dep.id,
    provenance: { origin: "operations", derivedFrom: dep.id }
  });
  kernel.link(dep.id, "PRODUCES", telem.id);

  kernel.currentProjectId = proj.id;


  return { kernel, project: proj, system, components: { battery, motor, controller, estop }, requirement: req, test };
}

/** runCanonicalSimulation: Canonical mobile robot scenario. A functional wheeled robot for replay and telemetry. */
export async function runCanonicalSimulation(kernel, projectId) {
  const { sim } = createMobileRobotScenario();
  // Run a few steps
  sim.startReplay({ model: "wheeled-robot-v1", configuration: "nominal", seed: 42 });
  const result = sim.run(10);
  const faultResult = sim.run(5); // continue
  sim.injectFault({ id: "estop-fault", type: "EMERGENCY_STOP" });
  const stopped = sim.run(5);

  const runId = `simrun_${Date.now().toString(36)}`;
  const artifact = kernel.upsert({
    id: runId,
    type: "Artifact",
    name: "Simulation Run",
    kind: "simulation-run",
    modelVersion: "1.0.0",
    parameters: { dt: 0.02, seed: 42 },
    initialConditions: {},
    events: sim.events,
    outputs: stopped,
    result: "completed",
    provenance: { origin: "simulator", derivedFrom: "scenario.js" }
  });

  const evidence = kernel.upsert({
    id: `evd_${runId}`,
    type: "Evidence",
    name: "Simulation Evidence – Emergency Stop",
    state: "EXECUTED", // not yet VERIFIED/VALIDATED
    method: "SIMULATION",
    artifact: artifact.id,
    provenance: { origin: "simulation", artifact: artifact.id }
  });

  kernel.link(evidence.id, "DERIVED_FROM", "test-estop-sim");
  kernel.link(projectId, "CONTAINS", artifact.id);
  kernel.link(projectId, "CONTAINS", evidence.id);

  return { artifact, evidence, snapshot: stopped, manifest: sim.replayManifest() };
}
