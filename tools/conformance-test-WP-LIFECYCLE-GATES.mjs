/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test for WP-LIFECYCLE-GATES.
 *
 * Run from the Physical AI Platform root:
 *   node tools/conformance-test-WP-LIFECYCLE-GATES.mjs
 *
 * If the host does not default .js files to ESM, use:
 *   node --experimental-default-type=module tools/conformance-test-WP-LIFECYCLE-GATES.mjs
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GATES } from "../site/components/core/lifecycle-engine.js";
import { GATE_SCHEMAS, GateSchemaEngine } from "../site/components/core/gate-schemas.js";

function assert(condition, message) {
  if (!condition) throw new Error("FAIL: " + message);
  console.log("PASS: " + message);
}

function entity(kernel, value) {
  return kernel.upsert({
    ...value,
    version: value.version || "1.0.0",
    provenance: value.provenance || {
      origin: "package",
      derivedFrom: "WP-LIFECYCLE-GATES",
      timestamp: kernel._now()
    }
  });
}

function run() {
  const kernel = createKernel();

  // Create the project first, as required by the canonical kernel contract.
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Lifecycle Gate Schema Slice",
    version: "1.0.0",
    provenance: {
      origin: "package",
      derivedFrom: "WP-LIFECYCLE-GATES",
      timestamp: kernel._now()
    }
  });

  const gate = entity(kernel, {
    id: "G3",
    type: "Gate",
    name: "Architecture",
    stage: "Architect",
    status: "OPEN"
  });
  const req = entity(kernel, {
    id: "req-architecture",
    type: "Requirement",
    name: "Architecture requirement",
    status: "OPEN"
  });
  const config = entity(kernel, {
    id: "cfg-g3-v1",
    type: "Configuration",
    name: "Architecture configuration v1",
    status: "READY"
  });
  const hazard = entity(kernel, {
    id: "haz-g3-1",
    type: "Hazard",
    name: "Architecture hazard",
    status: "ASSESSED"
  });
  const test = entity(kernel, {
    id: "test-g3-1",
    type: "Test",
    name: "Architecture evidence test",
    status: "PASSED"
  });
  const evidence = entity(kernel, {
    id: "ev-g3-1",
    type: "Evidence",
    name: "Architecture evidence",
    state: "VERIFIED",
    configurationId: config.id
  });

  kernel.link(project.id, "CONTAINS", gate.id);
  kernel.link(project.id, "CONTAINS", req.id);
  kernel.link(project.id, "CONTAINS", config.id);
  kernel.link(project.id, "CONTAINS", hazard.id);
  kernel.link(project.id, "CONTAINS", test.id);
  kernel.link(project.id, "CONTAINS", evidence.id);

  kernel.link(gate.id, "REQUIRES", req.id);
  kernel.link(test.id, "VERIFIES", req.id);
  kernel.link(evidence.id, "DERIVED_FROM", test.id);
  kernel.link(evidence.id, "CONFIGURED_BY", config.id);

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.id === gate.id), "Project graph returns G3");
  assert(graph.entities.some(e => e.id === evidence.id), "Project graph returns evidence");
  assert(graph.relations.some(r =>
    r.source === evidence.id &&
    r.relation === "CONFIGURED_BY" &&
    r.target === config.id
  ), "Project graph returns configuration binding");

  assert(Object.keys(GATE_SCHEMAS).length === 13, "G0-G12 schemas are declared");
  assert(GATES.every(g => GATE_SCHEMAS[g.id]), "Every canonical lifecycle gate has a schema");
  assert(
    GATE_SCHEMAS.G3.requiredEvidence.configurationId &&
    GATE_SCHEMAS.G3.requiredEvidence.requirementCoverage &&
    GATE_SCHEMAS.G3.requiredEvidence.hazardStatus &&
    GATE_SCHEMAS.G3.requiredEvidence.authority,
    "G3 declares all four required evidence dimensions"
  );

  const engine = new GateSchemaEngine(kernel);

  // Missing configuration and authority must not PASS.
  const missing = engine.evaluateGate(project.id, "G3");
  assert(missing.outcome === "HOLD", "G3 without configuration HOLDs");
  assert(missing.missingEvidence.includes("configurationId"), "Missing configuration is explicit");
  assert(missing.missingEvidence.includes("authority"), "Missing authority is explicit");
  assert(missing.configurationId === null, "HOLD result includes configurationId");
  assert(missing.authority === null, "HOLD result includes authority");

  // Configuration supplied but evidence must be bound to that named configuration.
  const wrongConfig = entity(kernel, {
    id: "cfg-g3-wrong",
    type: "Configuration",
    name: "Wrong configuration",
    status: "READY"
  });
  kernel.link(project.id, "CONTAINS", wrongConfig.id);
  const wrongBinding = engine.evaluateGate(project.id, "G3", {
    configurationId: wrongConfig.id,
    authority: "architecture-board"
  });
  assert(wrongBinding.outcome === "HOLD", "Unbound evidence HOLDs");
  assert(
    wrongBinding.missingEvidence.includes("requirementEvidence:req-architecture"),
    "Unbound requirement evidence is explicit"
  );

  // Correct configuration + authority + bound evidence can PASS.
  const passing = engine.evaluateGate(project.id, "G3", {
    configurationId: config.id,
    authority: "architecture-board"
  });
  assert(passing.outcome === "PASS", "G3 passes with configuration, authority, hazard status, and bound evidence");
  assert(passing.configurationId === config.id, "PASS result carries configurationId");
  assert(passing.authority === "architecture-board", "PASS result carries authority");
  assert(passing.missingEvidence.length === 0, "PASS has no missing evidence");
  assert(passing.evidence.some(e => e.id === evidence.id && e.configurationId === config.id), "PASS exposes configuration-bound evidence");

  // Explicit failure must be FAIL, not HOLD.
  evidence.status = "FAIL";
  kernel.upsert(evidence);
  const failed = engine.evaluateGate(project.id, "G3", {
    configurationId: config.id,
    authority: "architecture-board"
  });
  assert(failed.outcome === "FAIL", "Explicit evidence failure returns FAIL");

  // Unknown hazard must be HOLD, never PASS.
  kernel.upsert({
    ...hazard,
    status: "UNKNOWN",
    provenance: {
      origin: "package",
      derivedFrom: "WP-LIFECYCLE-GATES",
      timestamp: kernel._now()
    }
  });
  kernel.upsert({
    ...evidence,
    status: "VERIFIED",
    provenance: {
      origin: "package",
      derivedFrom: "WP-LIFECYCLE-GATES",
      timestamp: kernel._now()
    }
  });
  const unknownHazard = engine.evaluateGate(project.id, "G3", {
    configurationId: config.id,
    authority: "architecture-board"
  });
  assert(unknownHazard.outcome === "HOLD", "Unknown hazard status is HOLD, not PASS");
  assert(unknownHazard.missingEvidence.includes("hazardStatus:haz-g3-1"), "Unknown hazard status is explicit");

  console.log("\n=== WP-LIFECYCLE-GATES CONFORMANCE PASSED ===");
}

run();
