/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { FormalAdapter } from "../site/components/core/formal-adapter.js";

const kernel = createKernel();
const project = kernel.upsert({
  id: "proj-1",
  type: "Project",
  name: "Formal Adapter Slice",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});

const claim = kernel.upsert({
  id: "claim-1",
  type: "Claim",
  name: "Bounded claim",
  property: "x >= 0",
  provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
});
kernel.link(project.id, "CONTAINS", claim.id);

const unavailable = new FormalAdapter(kernel);
const defaultResult = unavailable.submitClaim("claim-1", "x >= 0");
assert.deepEqual(defaultResult, {
  status: "UNAVAILABLE",
  reason: "no prover bound"
});

// Missing required input must produce HOLD/UNSPECIFIED through the adapter,
// not a hard-coded test object.
const missing = unavailable.submitClaim("missing-claim", "x >= 0");
assert.equal(missing.status, "HOLD");
assert.match(missing.reason, /UNSPECIFIED/);

// Inject a fake prover. This is an adapter test double, not a prover supplied
// by the platform.
const adapter = new FormalAdapter(kernel, {
  prover: ({ claimId, property }) => ({
    engine: "fake-prover",
    claimId,
    property,
    result: "counterexample-free-for-test-double"
  })
});

const recorded = adapter.submitClaim("claim-1", "x >= 0");
assert.equal(recorded.status, "ANALYSIS_RECORDED");
assert.equal(recorded.evidenceState, "EXECUTED");
assert.equal(recorded.method, "ANALYSIS");
assert.equal(recorded.claimId, "claim-1");

const evidence = kernel.store.get(recorded.evidenceId);
assert.equal(evidence.type, "Evidence");
assert.equal(evidence.method, "ANALYSIS");
assert.equal(evidence.state, "EXECUTED");
assert.equal(evidence.provenance.derivedFrom, "claim-1");

// Query the canonical project graph. No second store is introduced.
const graph = kernel.getProjectGraph(project.id);
assert(graph.entities.some(e => e.id === claim.id));
assert(graph.entities.some(e => e.id === recorded.evidenceId));
assert(graph.relations.some(r =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === claim.id
));
assert(graph.relations.some(r =>
  r.source === project.id && r.relation === "CONTAINS" && r.target === recorded.evidenceId
));

// The adapter must not silently promote analysis to verification.
assert.notEqual(evidence.state, "VERIFIED");
assert.notEqual(evidence.state, "VALIDATED");
assert.notEqual(evidence.state, "RELEASED");

// Explicit gap: the fake result is scoped to the submitted claim/property;
// it is not a system-level proof.
assert.equal(recorded.systemProof, undefined);

console.log("WP-FORMAL-ADAPTER conformance: PASS");
