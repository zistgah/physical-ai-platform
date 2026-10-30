<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Stitch instructions for Iteration 47 drop-ins v0.2.0

## Scope

This package deepens the ten modules under `drop-in/`. It does not replace the platform, kernel, acceptance harness, route table, canonical schema or module registry. Do not copy this repository over a newer spine. Transplant the package folders and the updated Iteration 47 conformance test only after comparing against the latest iteration.

## Preconditions

- Record the exact spine revision/archive SHA-256.
- Read `docs/MRD.md`, `docs/CONTRACT.md`, `schemas/sir.schema.json`, `schemas/component-contract.schema.json`, `schemas/entity.schema.json`, `site/components/core/canonical-kernel.js` and the relevant domain module.
- Confirm the target iteration has not changed package APIs or the kernel contracts.
- Do not assume that placing a folder under `drop-in/` registers it in the application.

## Files

- `patches/site/components/core/`: corrected cost completeness propagation in the active business engine/closure paths.
- `patches/site/components/simulation/`: guarded HIL adapters and evidence-gated fidelity behavior.
- `patches/tools/`: updated historical conformance tests plus a new direct regression guard suite.
- `patches/README.md`: source patch semantics and apply order.

- `drop-in/{cad,cfd,circuit,simulation,hil,fabrication,manufacturing,logistics,prototyping,emulation}/module.js`: bounded implementation.
- Corresponding `test.mjs`, `EXPLAINER.md`, `manifest.json`.
- `drop-in/samples/engineering-samples.json` and `drop-in/run-samples.mjs`: reproducible sample set.
- `tools/conformance-test-iter47.mjs`: stronger package contract/conformance check.

## Required adapter design

For each package, implement an adapter at the platform boundary. The adapter must:

1. Resolve canonical entity IDs and configuration/version identity from the current project graph.
2. Validate component ports, dimensions, units, coordinate frames and execution constraints before calling the module.
3. Map module inputs from canonical entities without inventing defaults for unknown values.
4. Map outputs to typed simulation/test/manufacturing/logistics/evidence artifacts, preserving source entity IDs, configuration hash, module version, input hash, timestamp/clock source, parameters, result status and diagnostics.
5. Preserve `HOLD` as a workflow state. Never turn a missing value into zero, an unknown supplier into approved, a mock transport into HIL, or a simulation result into physical evidence.
6. Make execution deterministic/replayable where the model permits it. Record nondeterministic hardware reads explicitly.
7. Add integration tests that create or load a real canonical project, invoke the adapter, persist the result, reload it, and verify provenance and HOLD propagation.

## Registration and workflow

- Register each package using the latest spine's established module/workbench registration mechanism. Do not create a second registry if one already exists.
- Expose the module through its appropriate engineering workbench, not a new unrelated application route.
- Add a project sample that references canonical components/ports and invokes the adapter.
- Ensure project save/load and GitHub Pages static deployment continue to work.
- Keep solver execution replaceable behind the package interface; no mandatory external runtime is introduced here.

## Test sequence

```sh
for f in drop-in/*/test.mjs; do node "$f" || exit 1; done
node tools/conformance-test-iter47.mjs
node drop-in/run-samples.mjs
node tests/run.mjs
node tests/acceptance.mjs
```

Then run the browser route walk, mutation tests, relevant domain suites and the full acceptance command on the merged spine. Do not use `--no-browser` or `--no-mutation` for the final integration verdict unless the report explicitly records those gates as skipped. Hardware integration requires a real device/bench, independently verified identity, safety review and timing measurements; a software test cannot establish these.

## Compatibility notes

- ESM, no third-party runtime dependencies.
- Package function signatures are documented in each `EXPLAINER.md` and `manifest.json`.
- The HIL entry point is asynchronous.
- CFD, circuit and simulation modules are reduced-order reference implementations with explicit qualification labels.
- CAD returns clipped triangle surface geometry, not a closed solid Boolean.
- Fabrication emits a 2-D contour motion list, not machine-certified G-code.

## Integrator report required

Return the exact base and resulting revision/hash, files added/changed, API adaptations, test logs and skipped tests, sample outcomes, browser results, and unresolved qualification items. State separately whether each package is tested, compatible, registered, workflow-reachable or fully integrated.
