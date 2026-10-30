/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { AssuranceCaseBuilder } from "../site/components/safety/assurance-case.js";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function entity(kernel, id, type, name, fields = {}) {
  return kernel.upsert({
    id,
    type,
    name,
    ...fields,
    provenance: {
      origin: "WP-ASSURANCE-CASE-test",
      derivedFrom: "proj-assurance-case",
      timestamp: kernel._now()
    }
  });
}

const kernel = createKernel();
const project = kernel.upsert({
  id: "proj-assurance-case",
  type: "Project",
  name: "Assurance Case Slice",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const hazard = entity(kernel, "haz-1", "Hazard", "Unexpected motion", { status: "CONTROLLED" });
const cause = entity(kernel, "cause-1", "Event", "Control command fault");
const requirement = entity(kernel, "req-1", "Requirement", "Prevent unsafe motion", { status: "VERIFIED" });
const claim = entity(kernel, "claim-1", "Claim", "Unsafe motion is controlled");
const argument = entity(kernel, "arg-1", "Argument", "Control requirement is satisfied");
const configuration = entity(kernel, "cfg-1", "Configuration", "Robot configuration v1", {
  status: "FROZEN",
  fingerprint: "cfg-fp-1"
});
const evidence = entity(kernel, "ev-1", "Evidence", "Physical test result", {
  state: "VERIFIED",
  method: "PHYSICAL_TEST",
  configurationId: configuration.id,
  configurationFingerprint: configuration.fingerprint,
  stale: false
});

for (const e of [hazard, requirement, claim, argument, configuration, evidence]) {
  kernel.link(project.id, "CONTAINS", e.id);
}

// Intentionally incomplete first: only the objects exist, not the assurance hops.
let graph = kernel.getProjectGraph(project.id);
assert(graph.entities.some(e => e.id === hazard.id), "Project graph returns hazard");
assert(graph.entities.some(e => e.id === evidence.id), "Project graph returns evidence");

const builder = new AssuranceCaseBuilder(kernel);
let result = builder.walk(hazard.id, {
  claimId: claim.id,
  configurationId: configuration.id
});
assert(result.complete === false, "Incomplete path is not complete");
assert(result.missingHops.includes("hazard-CAUSED_BY-cause"), "Missing cause hop is explicit");
assert(result.missingHops.includes("hazard-CONTROLLED_BY-requirement"), "Missing control hop is explicit");
assert(result.missingHops.includes("claim-SUPPORTED_BY-argument"), "Missing claim-to-argument hop is explicit");

// Add every required hop to the same canonical graph.
kernel.link(hazard.id, "CAUSED_BY", cause.id);
kernel.link(hazard.id, "CONTROLLED_BY", requirement.id);
kernel.link(claim.id, "SUPPORTED_BY", argument.id);
kernel.link(argument.id, "EVIDENCED_BY", evidence.id);

graph = kernel.getProjectGraph(project.id);
assert(graph.relations.some(r => r.source === hazard.id && r.relation === "CAUSED_BY" && r.target === cause.id), "Graph returns cause relation");
assert(graph.relations.some(r => r.source === hazard.id && r.relation === "CONTROLLED_BY" && r.target === requirement.id), "Graph returns control relation");
assert(graph.relations.some(r => r.source === claim.id && r.relation === "SUPPORTED_BY" && r.target === argument.id), "Graph returns support relation");
assert(graph.relations.some(r => r.source === argument.id && r.relation === "EVIDENCED_BY" && r.target === evidence.id), "Graph returns evidence relation");

result = builder.walk(hazard.id, {
  claimId: claim.id,
  configurationId: configuration.id
});
assert(result.complete === true, "Complete path returns complete:true");
assert(result.usableEvidence[0].configurationId === configuration.id, "Evidence is bound to named configuration");
assert(result.usableEvidence[0].method === "PHYSICAL_TEST", "Evidence carries method");
assert(result.missing.length === 0, "Complete case has no missing inputs");

// Stale evidence must make the case incomplete without deleting or replacing it.
kernel.upsert({
  ...kernel.store.get(evidence.id),
  stale: true,
  staleReason: "configuration changed",
  staleAt: kernel._now()
});
result = builder.walk(hazard.id, {
  claimId: claim.id,
  configurationId: configuration.id
});
assert(result.complete === false, "Stale evidence makes the case incomplete");
assert(result.staleEvidence.some(e => e.id === evidence.id), "Stale evidence is reported");
assert(result.missing.includes("fresh evidence"), "Fresh-evidence gap is explicit");

console.log("\\n=== WP-ASSURANCE-CASE CONFORMANCE PASSED ===");
