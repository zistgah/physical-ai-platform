/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-RESEARCH-PROTOCOL
 */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { ResearchProtocol } from "../site/components/research/research-protocol.js";

const kernel = createKernel();
const project = kernel.createProject({
  id: "proj-research-protocol",
  name: "Research Protocol Slice"
});

const protocol = new ResearchProtocol(kernel);

const experiment = protocol.createExperiment(project.id, {
  id: "exp-research-001",
  name: "Motor-response research",
  hypothesis: "Motor response varies with the selected control condition.",
  method: "ANALYSIS",
  datasetIds: ["dataset-001"]
});

const evidence = protocol.produceEvidence(experiment.id, {
  id: "evidence-research-001",
  name: "Research findings"
});

// Explicitly exercise the canonical graph query.
const graph = kernel.getProjectGraph(project.id);

assert(graph.entities.some((e) => e.id === experiment.id && e.type === "Experiment"),
  "project graph contains Experiment");
assert(graph.entities.some((e) => e.id === evidence.id && e.type === "Evidence"),
  "project graph contains Evidence");
assert(graph.relations.some((r) =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === experiment.id
), "project contains Experiment");
assert(graph.relations.some((r) =>
  r.source === experiment.id && r.relation === "PRODUCES" && r.target === evidence.id
), "Experiment produces Evidence");

assert.equal(evidence.method, "RESEARCH", "Evidence method is RESEARCH");
assert.equal(protocol.validate(experiment).valid, true, "complete protocol validates");
assert.equal(experiment.provenance.origin, "research-protocol", "Experiment has provenance");
assert.equal(evidence.provenance.origin, "research-protocol", "Evidence has provenance");

// Required-input gap: no hypothesis. Missing data remains UNSPECIFIED and
// validation places the protocol on HOLD rather than guessing a value.
const incomplete = protocol.createExperiment(project.id, {
  id: "exp-research-incomplete",
  name: "Incomplete research"
});
const incompleteResult = protocol.validate(incomplete);

assert.equal(incomplete.hypothesis, "UNSPECIFIED",
  "missing hypothesis is represented as UNSPECIFIED");
assert.equal(incompleteResult.state, "HOLD",
  "missing required protocol input places experiment on HOLD");
assert(incompleteResult.gaps.includes("hypothesis"),
  "missing hypothesis is explicitly reported as a gap");

// No second store: all package objects are in the canonical kernel.
assert.equal(kernel.store.get(experiment.id), experiment,
  "Experiment is stored in canonical kernel");
assert.equal(kernel.store.get(evidence.id), evidence,
  "Evidence is stored in canonical kernel");

console.log("PASS: WP-RESEARCH-PROTOCOL");
