/** Copyright © 1993-2026 Abhishek Choudhary. GPL-3.0-only. */
# Fabrication drop-in - Iteration 47

**Package version:** 2.2.0  
**Toolpath ABI:** `PAI-FAB-TOOLPATH/2.1`  
**Backend protocol:** `PAI-FAB-BACKEND/1`

This package provides a bounded fabrication workflow and an optional backend ecosystem. It does not try to reimplement every mature geometry/CAM engine. The platform owns the semantic job, evidence and normalized toolpath contract; optional libraries provide specialized algorithms through explicit adapters.

## What is implemented

- Deterministic rounded-rectangle 2.5D pocket planning, tool/process/stock/material/fixture checks, trajectory interpretation, discrete stock-removal coverage, execution and uncertainty-guarded metrology.
- External normalized toolpath ingestion. `planFabricationWithBackend()` obtains a CAM provider result, validates it against the canonical job, independently interprets the trajectory and runs the supported stock coverage check. `fabricate()` can execute that exact preplanned path after revalidation.
- Capability registry, backend handshake, version and identity binding, timeout, cancellation, ordered backend pipelines and provenance.
- Actual optional Python workers for CadQuery/Open CASCADE, Trimesh, Shapely/GEOS and SciPy. These were installed and exercised in the build environment.
- Adapter contracts/catalog entries for OpenCAMLib, FreeCAD CAM, CAMotics and CavalierContours. Their runtimes were not installed in this environment and are not represented as tested or ready.

## Package files

- `module.js` - fabrication workflow and canonical normalized toolpath ABI.
- `backends/backend-adapters.mjs` - capability registry, host protocol, backend invocation, pipelines and external CAM path validation.
- `backends/python-worker-host.mjs` - Node/desktop host bridge. Not imported into browser code.
- `python/fabrication_geometry_worker.py` - optional geometry/numerical worker.
- `python/requirements-geometry.txt` - optional host-only dependency ranges.
- `python/requirements-geometry-tested.txt` - direct dependency versions exercised by this handoff (not a transitive lockfile).
- `backend-catalog.json` - capability, role, license and runtime inventory.
- `test.mjs` - 115 core fabrication tests.
- `backend-tests.mjs` - 45 backend/protocol/real-library tests.
- `samples/` - fabrication and backend known-answer fixtures.
- `EXPLAINER.md`, `BACKEND-INTEGRATION.md`, `STITCH-INSTRUCTIONS.md`, `TRACEABILITY.md`, `GAP-REGISTER.md`, `TEST-REPORT.md`, `INTEGRATION-REPORT.md` - integration and assurance documentation.

## Tests

Core, no optional dependency required:

```bash
node test.mjs
```

Expected: `FABRICATION TESTS: 115 passed, 0 failed`.

Backend tests require Python 3 and the optional libraries in `python/requirements-geometry.txt`:

```bash
node backend-tests.mjs
```

Expected in the tested build environment: `BACKEND ADAPTER TESTS: 48 passed, 0 failed`.

## Public API

```js
import { FABRICATION_API_VERSION, fabricate, planFabrication,
  validateExternalToolpath } from "./module.js";
import { createBackendRegistry, invokeFabricationBackend,
  planFabricationWithBackend } from "./backends/backend-adapters.mjs";

const plan = planFabrication(job); // deterministic local 2.5D path
const backendPlan = await planFabricationWithBackend({
  job, host, backendId:"some-cam-provider",
  capability:"cam.toolpath.normalized",
  operation:"cam.generate", payload:{ /* provider job */ }
});
const result = await fabricate({ ...job,
  preplannedToolpath: backendPlan.toolpath,
  backendEvidence: backendPlan.backendEvidence
});
```

`FABRICATION_API_VERSION` is `2.2.0`. `fabricate` retains the public name and remains asynchronous. `preplannedToolpath` and `backendEvidence` are additive inputs. `OK` still requires adapter-confirmed execution and conforming external measurement evidence.

## Architectural boundaries

- No mandatory external dependency; static-first deployment remains possible.
- No browser import of Node APIs or Python.
- No kernel, acceptance script or other drop-in changes.
- Missing host/backend/evidence => `HOLD`; known malformed or mismatched results => `FAIL`.
- Backend descriptors are not claims of installation. Probe must return READY for the exact capability.
- G-code, cutter-location data and CAM job objects are not silently treated as the normalized toolpath ABI.
- The current independent stock-removal checker remains limited to the declared rounded-rectangle pocket envelope. General 3D/multi-axis paths require an independent compatible simulation provider.
