# Prototyping package - integration handoff for Grok

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Integration objective

Install this package at `drop-in/prototyping/` in Iteration 47. The package is a pure evaluator called by the host's prototype workflow. The host owns canonical persistence, UI, authorization, audit, gate decisions, and lifecycle transitions.

## Files

- `module.js`: production evaluator; named export `prototype(input)`.
- `test.mjs`: isolated executable suite (70 assertions in the delivered build).
- `integration-test.mjs`: canonical-kernel and G4 integration test (5 assertions).
- `samples/`: valid physical evidence, valid simulation evidence, and fail-closed unbound-evidence fixtures.
- `EXPLAINER.md`: full contract, fidelity policy, semantics, and non-goals.
- `TEST-REPORT.md`: exact verification record and limitations.
- `MARKET-COMPARISON.md`: scoped market benchmark and positioning.
- `conformance-test-iter47.patch`: minimal update to the Iteration 47 conformance fixture and imports. It does not modify the kernel or `tests/acceptance.mjs`.

## Integration sequence

1. Copy this directory to `drop-in/prototyping/`.
2. Apply `conformance-test-iter47.patch` from the repository root if Grok wants the platform's Iteration 47 conformance runner to import and execute this module's tests. Review the patch first. It only updates `tools/conformance-test-iter47.mjs`.
3. Adapt the host workflow to collect canonical Configuration, Baseline/revision, Requirement, Test, Evidence, and relation records. Do not synthesize missing graph edges in the adapter merely to obtain `OK`.
4. Ensure evidence is bound through `EvidenceBinding.bind(evidenceId, configurationId)` and that the resulting `configurationFingerprint` matches the configuration's current fingerprint.
5. Pass the actual kernel relation collection (or a faithful read-only projection) as `relations`.
6. Call `prototype()` as a pre-review completeness evaluator.
7. Independently call `GateSchemaEngine.evaluateGate(projectId, gateId, { configurationId, authority })` and then the lifecycle engine as required by the existing workflow.
8. Preserve all three outcomes. Never map module `OK` directly to gate `PASS`, and never map `HOLD` to success.

## Canonical relation orientation

The current canonical kernel uses these directions:

- `kernel.addVerification(requirementId, testId)` creates `Test --VERIFIES--> Requirement`.
- `kernel.addEvidence(testId, evidenceId)` creates `Evidence --DERIVED_FROM--> Test`.
- `new EvidenceBinding(kernel).bind(evidenceId, configurationId)` creates `Evidence --CONFIGURED_BY--> Configuration` and stores the configuration fingerprint.

Do not reverse these directions. The evaluator deliberately checks the source/target orientation.

## Mapping revision

Iteration 47 currently represents a revision with the canonical `Baseline` entity and its `configurationId`, `parentRevisionId`, and `changes`. This package does not add a new entity type. The adapter must resolve `parentRevisionId` to the actual parent Baseline record and supply it as `revision.parentRevision`. A first revision may omit both parent fields.

## Simulation and physical evidence

The simulation sample is expected to return `OK` from this module, but with every requirement listed as simulation-only. That means evidence is suitable for prototype review and iteration, not physical validation. A physical test cannot be passed off as simulated, and a simulation cannot be labelled REAL or HIL. HIL/PHIL/RIL evidence must declare L5/HIL. Physical test evidence must declare L6 or L7/REAL.

The CFD, circuit, multibody simulation, HIL, CAD, fabrication, manufacturing, logistics, and emulation modules remain independent drop-ins. This package consumes their result/evidence records; it does not replace or invoke their solvers. Their own module tests must remain green.

## Compatibility and versioning

- ES module; no runtime dependencies.
- Node.js 22 was used for verification.
- Browser use is possible after bundling/import through the existing site module loader; no Node-only APIs occur in `module.js`.
- Input contract is intentionally strict. If canonical entity fields change, update the adapter and contract tests together. Do not weaken fidelity or HOLD rules to paper over schema drift.
- No kernel file, schema, lifecycle engine, or `tests/acceptance.mjs` is changed by this package.

## Handoff acceptance

Grok should run:

```bash
node drop-in/prototyping/test.mjs
node drop-in/prototyping/integration-test.mjs
node tools/conformance-test-iter47.mjs
node tools/regression-checklist.mjs
node tests/acceptance.mjs
```

The first four commands were run against the working Iteration 47 copy for this handoff, with results recorded in `TEST-REPORT.md`. The full `tests/acceptance.mjs` command did not complete within the available execution window and is explicitly UNVERIFIED; Grok must rerun it in the target CI/runtime. The browser-specific acceptance path also requires the project's browser test environment.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Open-source backend integration (package v1.1.0)

Additional files:

- `backend-registry.js`: capability discovery and explicit backend selection.
- `backend-runtime.js`: worker RPC adapter, job preflight, response integrity, verified run record and simulation evidence candidate builder.
- `benchmark-profiles.js` / `benchmark-validation.js`: numerical acceptance profiles and SHA-256 report generation.
- `backend-driver-profiles.json`: engine-specific worker profile definitions.
- `backend-job.schema.json` / `backend-response.schema.json`: protocol schemas.
- `workers/scipy_reference_worker.py`: actual SciPy RC transient worker.
- `backend-test.mjs`: backend contract, benchmark, failure, and SciPy end-to-end tests.

### Backend job flow

1. Discover a compatible backend using `listBackends()` or `selectBackends()`. A preferred backend that is unavailable for the requested operation returns HOLD; no silent fallback occurs.
2. Create an adapter with `createBackendAdapter({backendId, transport, validator})`.
3. Submit a request containing project, configuration ID and fingerprint, revision, test, pinned backend version, domain, operation, input format, immutable input artifacts and SHA-256 digests, units, coordinate frame for spatial jobs, solver options, timeout and deterministic seed where applicable.
4. The host worker executes only the declared backend profile in an isolated, resource-limited environment. It returns a protocol-versioned response with exact backend version, matching input digest, output artifact references/digests, result metrics, timestamps, deterministic state and environment fingerprint.
5. The independent benchmark validator checks actual numeric output and creates a SHA-256 validation report. Missing metrics return HOLD; out-of-tolerance results return FAIL.
6. `toSimulationEvidenceCandidate()` requires a fully validated run and exact project/configuration fingerprint/revision/test bindings. It does not persist or create canonical relations.
7. The host persists the candidate as Evidence, creates `DERIVED_FROM` and `CONFIGURED_BY` relations through the existing kernel services, then calls `prototype()` and the existing G4/lifecycle authority.

The worker transport is a host-injected boundary. Do not implement it by concatenating shell commands in the browser. The worker service owns process invocation, allowlists, timeouts, resource quotas, artifact staging, logs and worker-image pinning.

### Compatibility change

Simulation/SIL evidence passed to `prototype()` now requires a `backendExecution` object containing backend ID/version, worker run ID, input/output digests, configuration fingerprint, revision and test bindings, successful exit status, environment fingerprint, and a verified benchmark/report digest. Physical/HIL evidence remains governed by the existing fidelity and provenance contract. Existing simulation fixtures must be upgraded with real worker provenance; they must not be grandfathered through a weaker path.
