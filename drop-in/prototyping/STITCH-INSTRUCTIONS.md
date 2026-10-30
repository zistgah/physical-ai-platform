# Stitch instructions - prototyping and open-engine adapter layer

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Package target

Install the contents of this package at `drop-in/prototyping/` in the supplied Iteration 47 repository. This is a bounded drop-in; it is not a platform replacement. The canonical kernel, graph, SIR, lifecycle engine, application registry and acceptance script remain authoritative.

## Files

- `module.js`: prototype revision/evidence evaluator. Simulation/SIL evidence must include validated external backend execution provenance.
- `backend-registry.js`: backend capability catalogue and discovery/selection.
- `backend-runtime.js`: worker/RPC execution adapter, preflight, output integrity checks and simulation evidence candidate builder.
- `benchmark-profiles.js`, `benchmark-validation.js`: numerical acceptance profiles and SHA-256 report generation.
- `backend-driver-profiles.json`: engine-specific worker profiles and allowlisted entrypoint/plugin requirements.
- `backend-job.schema.json`, `backend-response.schema.json`: worker protocol schemas.
- `workers/scipy_reference_worker.py`: actual SciPy RC transient reference worker.
- `test.mjs`: prototype evaluator regression tests.
- `backend-test.mjs`: backend registry, runtime, validator and end-to-end SciPy tests.
- `integration-test.mjs`: canonical-kernel, evidence-binding, G4 and lifecycle integration.
- `samples/`: complete prototype and simulation-evidence examples, plus a real SciPy RC job request.
- `manifest.json`, `CHANGE-MANIFEST.json`: machine-readable package identity and change inventory.
- `BACKEND-ECOSYSTEM.md`: engine comparison, licenses, numerical benchmarks and operational guidance.
- `EXPLAINER.md`, `INTEGRATION.md`, `TEST-REPORT.md`: module and integration documentation.
- `conformance-test-iter47.patch`: minimal conformance runner update to execute the backend test as part of Iteration 47.

## Stitch sequence

1. Replace only `drop-in/prototyping/` with this package directory. Do not overwrite other drop-ins.
2. Review `CHANGE-MANIFEST.json` and `manifest.json`.
3. Apply the included patch from repository root if the current `tools/conformance-test-iter47.mjs` matches the Iteration 47 baseline:

   ```bash
   patch -p1 < drop-in/prototyping/conformance-test-iter47.patch
   ```

   If the patch does not apply cleanly, do not force it. Add the two imports from the patch to the current conformance test after inspecting its latest content.
4. Run package tests:

   ```bash
   node drop-in/prototyping/test.mjs
   node drop-in/prototyping/backend-test.mjs
   node drop-in/prototyping/integration-test.mjs
   ```

5. Run the existing platform checks:

   ```bash
   node tools/conformance-test-iter47.mjs
   node tools/regression-checklist.mjs
   node tests/acceptance.mjs
   ```

6. Connect the host's trusted worker service to `createBackendAdapter({backendId, transport, validator})`. The transport must implement the worker protocol in `backend-job.schema.json` and `backend-response.schema.json` and must stage immutable artifacts. Do not call shell commands from browser code.
7. Register the adapter and expose its capabilities through the platform's existing canonical module/route registry only when the host integration owner is ready. This package does not modify the platform registry.
8. Convert a verified worker run to a candidate with `toSimulationEvidenceCandidate()`. The host must persist the Evidence entity, add `Evidence --DERIVED_FROM--> Test`, bind it with `EvidenceBinding.bind(evidenceId, configurationId)`, and preserve the exact configuration fingerprint. The host must not synthesize relations merely to force a pass.
9. Run the prototype evaluator, then the existing `GateSchemaEngine` and `LifecycleEngine` with the required authority. Never map evaluator `OK` directly to lifecycle `PASS`.

## Backend deployment

- The worker must be a separately managed execution service (container, VM, HPC job or equivalent).
- Pin backend version and worker image digest. Return the exact engine version and environment fingerprint.
- The worker must use allowlisted executable profiles and argument arrays, never user-supplied shell text.
- Use the license information and source URLs in `backend-registry.js` and `BACKEND-ECOSYSTEM.md` as an initial inventory, not legal advice. Verify the exact selected version and all bundled components before redistribution.
- The supplied SciPy worker is executable with Python 3 and SciPy. Other backend profiles are integration-ready contracts; they require their corresponding engine installation and worker driver.

## Compatibility boundaries

- `prototype()` remains a pure evaluator.
- No canonical entity type or relationship is added.
- No kernel or lifecycle implementation is duplicated.
- No solver binaries or third-party source are vendored.
- The backend registry is capability metadata, not a parallel ontology.
- Missing worker, missing validator, unsupported operation, unverified numerical result, stale configuration or missing graph binding produces HOLD.
- Explicit numerical failure produces FAIL.

## Release acceptance

A backend is `ADAPTER-CONTRACT-READY` when its catalogue and worker profile exist. It is `WORKER-CONNECTED` when a real worker responds. It is `BENCHMARK-VERIFIED` when its actual binary/version passes an independent benchmark suite. It is `SPINE-INTEGRATED` only after canonical registration, graph persistence, lifecycle evaluation and full platform regression pass. These labels must not be collapsed.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
