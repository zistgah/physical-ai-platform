# Stitch instructions for Iteration 47 / Grok

## Scope

Replace only `physical-ai-platform/drop-in/fabrication/` with the contents of this ZIP. Do not replace the root, kernel, registry, acceptance script, other nine drop-ins, document templates or unrelated files.

## Package layout

- `module.js`: fabrication lifecycle, canonical toolpath ABI, local planning, independent validation, simulation and metrology.
- `backends/backend-adapters.mjs`: optional backend registry, capability resolver, invocation protocol, ordered pipelines and external-CAM toolpath validation.
- `backends/python-worker-host.mjs`: optional Node/desktop process host. It is not imported by browser code.
- `python/fabrication_geometry_worker.py`: optional JSON-lines worker for CadQuery/OCCT, Trimesh and Shapely/GEOS.
- `backend-catalog.json`: backend capability/license inventory and runtime status.
- `test.mjs`: original fabrication tests.
- `backend-tests.mjs`: backend contract and actual numerical-library tests.
- `samples/`: fabrication and backend known-answer fixtures.
- `BACKEND-INTEGRATION.md`: detailed backend integration and operation contracts.
- `CHANGE-MANIFEST.json`: exact package changes and compatibility notes.

## Required integration sequence

1. Extract to a temporary directory and inspect archive contents.
2. Replace only `drop-in/fabrication/`.
3. Run `node drop-in/fabrication/test.mjs`.
4. Run `node drop-in/fabrication/backend-tests.mjs` in an environment with Python 3 and the optional dependencies listed in `python/requirements-geometry.txt`. Without these packages, backend tests should report unavailable rather than pretending to pass.
5. Run `node tools/conformance-test-iter47.mjs`.
6. Run the repository acceptance and regression commands documented by the supplied iteration's own test instructions. Do not edit acceptance scripts to hide a failure.
7. Check the canonical kernel and all nine other drop-in directories against the original archive hashes.
8. Verify the application still builds as a static site without importing the Node host or requiring Python packages.

## Runtime wiring

The backend ecosystem is opt-in. A browser/desktop host must implement the documented `PAI-FAB-BACKEND/1` `probe` and `invoke` interface. The Node worker host is only for Node/desktop deployments. Do not import `python-worker-host.mjs` from static browser modules.

For OpenCAMLib, FreeCAD CAM, CAMotics and CavalierContours, Grok must install/locate the exact backend, implement the backend-specific worker, record its exact version/license/dependency manifest, and pass backend conformance tests before setting its runtime status to READY. The descriptors alone are not proof that those engines are installed.

## External CAM integration

A CAM backend must output normalized `PAI-FAB-TOOLPATH/2.1` in `result.toolpath` to use `planFabricationWithBackend`. FreeCAD G-code, OpenCAMLib cutter-location output and CAMotics simulation artifacts must not be passed as if they were normalized toolpaths. A backend-specific conversion adapter must preserve all modal, coordinate, tool and process semantics and prove round-trip/known-answer correctness.

`fabricate()` accepts `preplannedToolpath` only after revalidating it against the canonical job. The machine adapter remains independently responsible for hardware safety and durable idempotency.

## Compatibility

- Existing `fabricate` export name remains.
- `fabricate` remains asynchronous.
- `preplannedToolpath` and `backendEvidence` are additive optional inputs.
- No canonical kernel or acceptance-script edits are included.
- No optional backend is mandatory for static-first operation.
