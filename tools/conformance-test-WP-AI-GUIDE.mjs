/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-AI-GUIDE
 */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { buildContext } from "../site/components/core/ai-guide.js";

function add(kernel, entity) {
  return kernel.upsert({
    ...entity,
    provenance: {
      origin: "package-test",
      derivedFrom: entity.derivedFrom ?? null,
      timestamp: kernel._now()
    }
  });
}

function linkToProject(kernel, projectId, entityId) {
  kernel.link(projectId, "CONTAINS", entityId);
}

function run() {
  console.log("=== WP-AI-GUIDE ===");

  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "AI Guide Slice",
    provenance: { origin: "package-test", derivedFrom: null, timestamp: kernel._now() }
  });

  // Empty project: no invented context.
  const empty = buildContext(kernel, project.id, "engineer", "What is ready?");
  assert.deepEqual(empty.requirementIds, []);
  assert.deepEqual(empty.standardIds, []);
  assert.deepEqual(empty.evidenceIds, []);
  assert.equal(empty.stage, null);
  assert.equal(empty.projectId, "proj-1");
  assert.equal(empty.question, "What is ready?");
  assert.equal(empty.status, "HOLD");
  assert.match(empty.gaps.join("; "), /current lifecycle stage is unspecified/);
  console.log("PASS: empty project returns empty arrays and explicit HOLD gap");

  const stage = add(kernel, {
    id: "stage-design",
    type: "LifecycleStage",
    name: "Design",
    status: "CURRENT"
  });
  const req = add(kernel, {
    id: "req-1",
    type: "Requirement",
    name: "Safety requirement"
  });
  const std = add(kernel, {
    id: "std-project-1",
    type: "Standard",
    name: "Project Standard"
  });
  const evidence = add(kernel, {
    id: "ev-1",
    type: "Evidence",
    name: "Test evidence"
  });

  for (const entity of [stage, req, std, evidence]) {
    linkToProject(kernel, project.id, entity.id);
  }

  const graph = kernel.getProjectGraph(project.id);
  assert.deepEqual(
    new Set(graph.entities.map(e => e.id)),
    new Set(["proj-1", "stage-design", "req-1", "std-project-1", "ev-1"])
  );

  const context = buildContext(kernel, project.id, "systems-engineer", "What remains before release?");
  assert.equal(context.role, "systems-engineer");
  assert.equal(context.projectId, project.id);
  assert.equal(context.stage, stage.id);
  assert.deepEqual(context.requirementIds, [req.id]);
  assert.deepEqual(context.standardIds, [std.id]);
  assert.deepEqual(context.evidenceIds, [evidence.id]);
  assert.equal(context.question, "What remains before release?");
  assert.equal(context.status, undefined);

  // IDs outside the project graph must never leak into context.
  add(kernel, { id: "req-outside", type: "Requirement", name: "Outside requirement" });
  const bounded = buildContext(kernel, project.id, "systems-engineer", "Check bounded context");
  assert(!bounded.requirementIds.includes("req-outside"));
  console.log("PASS: context contains only ids present in project graph");

  // Missing required input is explicit HOLD, never guessed.
  const missingQuestion = buildContext(kernel, project.id, "systems-engineer", "");
  assert.equal(missingQuestion.status, "HOLD");
  assert(missingQuestion.gaps.includes("question is missing"));
  assert.equal(missingQuestion.question, null);
  console.log("PASS: missing question yields HOLD, not invented content");

  // No standards applicability inference is performed.
  assert.deepEqual(context.standardIds, [std.id]);
  console.log("PASS: standards are returned only as graph ids; applicability is not inferred");

  console.log("\n=== ALL WP-AI-GUIDE TESTS PASSED ===");
}

run();
