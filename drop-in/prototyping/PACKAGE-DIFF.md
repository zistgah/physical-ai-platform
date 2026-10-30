# Package diff summary - Iteration 47 prototyping v1.1.0

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

Compared with the supplied Iteration 47 `drop-in/prototyping/` folder:

## Added

- Backend registry and capability selection for 12 open-source engineering/numerical backends.
- Worker/RPC runtime with strict preflight, version pinning, approved artifact URI schemes, digest checks, finite JSON validation, timeout and abort propagation, output validation, and failure semantics.
- Backend execution provenance validation and simulation evidence candidate construction.
- Numerical benchmark profiles and independent validators with SHA-256 validation-report generation.
- Real SciPy `solve_ivp` RC transient worker and reproducible sample job.
- Worker request/response JSON Schemas and engine-specific worker driver profiles.
- Backend ecosystem, license inventory, MRD traceability, detailed stitch instructions, machine-readable manifest and change manifest.
- Backend protocol, numerical benchmark, and end-to-end integration tests.

## Modified

- `module.js`: simulation/SIL evidence now requires a verified backend execution record bound to the exact project/configuration fingerprint/revision/test and a registered compatible benchmark.
- `test.mjs`: regression coverage for backend evidence provenance and fail-closed behavior.
- `integration-test.mjs`: actual SciPy execution now flows through the canonical kernel, EvidenceBinding, G4 GateSchemaEngine and LifecycleEngine.
- Existing samples and documentation updated to the stronger provenance contract.
- Iteration 47 conformance runner import patch supplied separately.

## Preserved

- Canonical kernel, entity types, relation registry, SIR, lifecycle engine and application routes.
- Existing `prototype(input)` function entry point.
- Existing HOLD/FAIL/OK distinction.
- All other nine drop-in packages.
- Existing acceptance script source.

## Exact repository changes required for stitching

1. Replace only `drop-in/prototyping/` with this package.
2. Review and apply `conformance-test-iter47.patch` to `tools/conformance-test-iter47.mjs`.
3. Have the host register the worker transport and selected backend capabilities through the existing platform registry.

No kernel or acceptance-script patch is included.
