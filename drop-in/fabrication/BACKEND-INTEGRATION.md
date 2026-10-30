# Optional fabrication backend ecosystem

## Why this exists

The fabrication module is an orchestrator and assurance boundary, not an attempt to rewrite every mature geometry/CAM/numerical codebase. The platform owns the semantic job, units, coordinate frames, evidence and normalized toolpath ABI. Specialized engines remain replaceable providers.

The integration deliberately has two execution modes:

1. **Browser/static-first:** no local binary or Python runtime is required. A web/desktop host can implement the `PAI-FAB-BACKEND/1` host interface and call a remote or local isolated worker. If no host exists, the result is `HOLD`.
2. **Node/desktop host:** `backends/python-worker-host.mjs` invokes the included optional Python worker with `spawn` and `shell:false`. It enforces an explicit file root, output bounds, timeouts, cancellation and backend allowlisting. This is a host adapter, not a browser import.

No backend is downloaded, installed, enabled, or silently selected by this package.

## Backend catalog and maturity

See `backend-catalog.json` and `backends/backend-adapters.mjs`.

| Backend | Intended role | What this package actually integrates | Runtime status in build environment |
|---|---|---|---|
| CadQuery + Open CASCADE | B-rep/STEP geometry, validity, tessellation | Executable Python worker operations and round-trip self-test | Installed and exercised |
| Trimesh | Triangle mesh inspection, topology, bounds, volume | Executable Python worker operations and STL round-trip self-test | Installed and exercised |
| Shapely + GEOS | 2D polygon validation, offset, Boolean operations | Executable Python worker operations and known-answer tests | Installed and exercised |
| SciPy / HiGHS | Constrained process feed/spindle optimization | Executable LP optimizer with feasible/infeasible known-answer tests | Installed and exercised |
| OpenCAMLib | Drop-cutter/push-cutter toolpath generation, cutter models | Capability descriptor and normalized CAM backend contract; no native runtime adapter is claimed | Not installed; not runtime-tested |
| FreeCAD CAM | Profile, pocket, adaptive, drilling, postprocessing | Capability descriptor and normalized CAM backend contract; FreeCAD-specific job/macro adapter still required | Not installed; not runtime-tested |
| CAMotics | 3-axis G-code simulation and stock removal | Capability descriptor and NC simulation contract; CLI/project adapter still required | Not installed; not runtime-tested |
| CavalierContours | 2D polyline offsets and Boolean geometry | Capability descriptor and backend protocol; native binding adapter still required | Not installed; not runtime-tested |

The exercised geometry/numerical backends are real libraries, not mocks. Direct tested versions are recorded in `python/requirements-geometry-tested.txt`; it is not a transitive lockfile. The CAM-specific providers are not falsely marked as installed. The architecture is ready to register their workers, but their runtime adapters and conformance fixtures remain a separate integration task because those executables/packages were absent in this environment.

## Host protocol

The host implements:

```js
const host = {
  async probe({ protocol, backendId }) {
    return {
      state: "READY",          // or UNAVAILABLE
      version: "backend-version",
      capabilities: ["geometry.planar.offset"]
    };
  },
  async invoke({ protocol, backendId, operation, payload, timeoutMs, signal }) {
    return {
      protocol: "PAI-FAB-BACKEND/1",
      backendId,
      operation,
      status: "COMPLETED",     // UNAVAILABLE or REJECTED are not success
      backendVersion: "backend-version",
      result: { /* structured operation result */ },
      artifactRefs: []
    };
  }
};
```

The host must isolate untrusted input and backend processes, authenticate remote services, enforce CPU/memory/file/network limits, keep credentials outside payloads, and persist artifacts/provenance. The module does not run arbitrary shell commands and does not accept arbitrary executable paths from a fabrication job.

## Calling a backend

```js
import { createBackendRegistry, invokeFabricationBackend } from "./backends/backend-adapters.mjs";
import { createPythonGeometryHost } from "./backends/python-worker-host.mjs";

const registry = createBackendRegistry();
const host = createPythonGeometryHost({ allowedRoot: "/srv/pai-fabrication/jobs" });
const result = await invokeFabricationBackend({
  registry, host,
  backendId: "shapely",
  capability: "geometry.planar.offset",
  operation: "geometry.planar.offset",
  payload: {
    coordinates: [[0,0],[20,0],[20,10],[0,10],[0,0]],
    offsetMm: -1,
    joinStyle: "mitre"
  }
});
```

The host file root is mandatory. File-based operations resolve paths and reject paths outside `FABRICATION_ALLOWED_ROOT`. The Python worker never repairs geometry silently.

## Using external CAM output

The fabrication module does not trust a CAM provider's success flag. A CAM adapter must return a structured `result.toolpath` in the platform-owned `PAI-FAB-TOOLPATH/2.1` schema. Arbitrary G-code, FreeCAD Path strings, OpenCAMLib cutter-location points, or an NC file are not interchangeable with this schema.

Use `planFabricationWithBackend()` to:

1. Probe the named provider and capability.
2. Execute the provider operation through the isolated host.
3. Require a normalized toolpath artifact.
4. Validate checksum, units, frame, sequence, motion states, geometry, material, tool, process, fixture and inspection-plan binding.
5. Independently run the local trajectory interpreter and the bounded stock-coverage check.
6. Return `PLANNED` only when all applicable checks pass.

Then pass `preplannedToolpath` and `backendEvidence` to `fabricate()`. `fabricate()` revalidates the path against the job before it can be sent to the machine adapter. It does not replan over the backend's path.

The present independent stock-coverage checker only accepts the declared rounded-rectangle pocket geometry. For general B-rep, 3D or multi-axis paths, a separately qualified stock-simulation backend is required and must return evidence bound to the exact toolpath checksum. This package will not downgrade to its 2D check or silently treat missing simulation as success.

## Operation contracts and adapters still required

### OpenCAMLib

A native worker should accept a validated triangulated surface, cutter type/parameters, sampling/step tolerances and a bounded work budget. It should invoke the documented drop-cutter or push-cutter algorithms, return cutter-location data plus algorithm/version/tolerance provenance, then convert that data into `PAI-FAB-TOOLPATH/2.1`. Cutter-location output must not be treated as controller-ready G-code. Validate units, triangle winding, mesh closure/quality and sampling density. OpenCAMLib documents cylindrical, ball, bull, cone and composite cutters; actual support must be capability-probed.

### FreeCAD CAM

A FreeCAD worker should import or bind a B-rep model, create a CAM Job with stock/tool/controller definitions, run selected operations, run its job sanity checks, and export its internal Path representation. A separate controller-specific postprocessor is required for G-code. The adapter must preserve FreeCAD's operation parameters and postprocessor identity. FreeCAD documentation explicitly notes geometry-quality checks and the need to inspect generated paths; clamp awareness is not automatic in all workflows.

### CAMotics

A CAMotics worker should consume a postprocessed NC program plus exact stock/tool/workpiece setup, run its 3-axis simulation, and export a machine-readable result or stock mesh. It is a simulator, not a CAM generator. Its published limitations include no 5-axis or lathe simulation and incomplete collision/overcut detection; do not promote its result to general collision clearance.

### CavalierContours

A native binding should expose closed-polyline offset and Boolean operations, preserving bulges/arcs where supported, join style, tolerance, topology validity and all generated islands/holes. Compare output against Shapely/GEOS fixtures before selecting it for a production path.

## Numerical and safety rules

- Normalize units explicitly; never infer inch/mm.
- Every geometry operation records tolerance and kernel/backend version.
- Reject invalid/self-intersecting input unless a separately authorized repair operation is requested and records before/after artifacts.
- Preserve all islands and holes; do not discard disconnected regions.
- Bound triangle count, toolpath move count, grid size, operation time and output size.
- Preserve input artifact hashes and backend output artifact hashes in host evidence.
- Compare backend results with independent known-answer or cross-backend fixtures.
- Never infer machine collision clearance from mesh validity or stock-removal simulation alone.
- Never call a CAM backend result physical execution, HIL, measured-part conformity or certification.
- License review is per exact release, transitive dependency, build and distribution mode; the catalog is an engineering inventory, not legal advice.

## SciPy process optimization contract

`numerics.process.optimize` requires tool diameter, integer flute count, process minimum feed, machine minimum/maximum spindle and maximum feed, material maximum cutting speed, minimum/maximum chip load per tooth, axial stepdown and radial stepover. It solves a linear program with `scipy.optimize.linprog(method="highs")`, maximizing feed x stepdown x stepover under the supplied constraints, then minimizes RPM while preserving the optimum feed. It returns the selected feed, RPM, chip load, cutting speed and material removal rate. The caller must supply qualified machine/material/process limits; the optimizer does not invent or certify them.

## Known-answer tests executed

- CadQuery/OCCT: construct a 10 x 20 x 5 mm solid, validate B-rep, export/import STEP, compare volume and bounds.
- Trimesh: construct a 10 x 20 x 5 mm mesh, verify watertightness/volume, export/import STL and compare.
- Shapely/GEOS: inward 1 mm offset of a 20 x 10 mm rectangle yields 18 x 8 mm area = 144 mm².
- Shapely/GEOS: overlapping 10 x 10 mm polygons produce a 5 x 10 mm intersection = 50 mm².
- Shapely/GEOS: reject a self-intersecting bow-tie polygon.
- SciPy/HiGHS: solve a constrained process case with feed 800 mm/min, spindle 8000 RPM, chip load 0.05 mm/tooth and MRR 4800 mm³/min; reject an infeasible minimum-feed/chip-load envelope.
- Backend contract: fake provider protocol/version/identity/capability/timeout/abort/pipeline failure cases.
- External CAM: normalized path accepted only after independent path and stock-coverage validation; mismatched nominal geometry rejected.

These tests validate the integrated geometry adapters and protocol. They do not qualify the absent CAM runtimes.

## Upstream references consulted

- OpenCAMLib algorithm/cutter overview and LGPL statement: https://opencamlib.readthedocs.io/en/latest/ and https://pypi.org/project/opencamlib/
- FreeCAD CAM job, operation and postprocessor workflow: https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/CAM_Workbench.md
- CAMotics 3-axis simulation, G-code support and documented limitations: https://camotics.org/ and https://camotics.org/gcode.html
- CadQuery Apache-2.0 licensing: https://github.com/CadQuery/cadquery
- Open CASCADE LGPL-2.1 plus exception: https://www.occt3d.com/dev/doc/overview/html/index.html
- FreeCAD LGPL2+ licensing: https://github.com/FreeCAD/FreeCAD/blob/main/src/Doc/LICENSE.html
- CavalierContours polyline offset/Boolean library and MIT license: https://github.com/jbuckmccready/CavalierContours

Licenses must be checked against the exact release and transitive dependencies selected for deployment.
