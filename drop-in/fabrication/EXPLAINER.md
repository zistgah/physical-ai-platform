/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
# Fabrication - Architecture and Integration Specification

## 1. Purpose and handoff interpretation

The Iteration 47 handoff defines this package's target as **a toolpath and a measured part**. The module therefore implements a complete evidence-gated workflow for one explicitly bounded machining feature. It preserves the drop-in boundary: only `drop-in/fabrication/` is changed; the canonical kernel, spine, other nine drop-ins and acceptance script are not changed.

The required semantic states are:

- `HOLD`: required input, authority, execution confirmation or evidence is missing/unknown.
- `FAIL`: known invalid geometry/process/path, identity mismatch, malformed evidence or out-of-tolerance result.
- `PLANNED`: valid plan exists, but no execution has been attempted.
- `SIMULATED`: the structured path passed the deterministic motion interpreter and the bounded discrete swept-cutter stock-coverage simulation. Neither is a physical machine/physics simulation.
- `OK`: execution adapter reports completion for the exact toolpath and machine, and external measurement evidence passes tolerance including uncertainty.

`OK` is deliberately unreachable from only a named solid and machine. The former two-field smoke test was semantically too weak: it asserted success without a toolpath, execution record or measured part. The new tests assert `HOLD` for that call.

## 2. Architecture

```text
Canonical model / CAD-derived feature
              |
              v
      Fabrication job adapter
              |
              v
   validateJob (HOLD / FAIL)
              |
              v
  2.5D pocket planner (planFabrication)
              |
              v
  PAI-FAB-TOOLPATH/2.1 + checksum
              |
       +------+------+ 
       |      |      |
       v      v      v
 validate  trajectory  discrete swept-cutter
 toolpath  interpreter stock-removal simulation
       |      |      |
       +------+------+ 
              |
              v
  machine safety + executeToolpath adapter
              |
              v
  execution record bound to checksum + machine ID
              |
              v
  external measured-part evidence + calibration
              |
              v
  uncertainty-guarded tolerance decision
              |
         HOLD / FAIL / OK
```

The module is a pure-JavaScript drop-in and has no imports from the kernel or other platform modules. This avoids coupling the kernel to a replaceable fabrication strategy. Do not flatten the canonical kernel. The canonical model remains authoritative; the fabrication job is an explicit projection of its feature, material, stock, fixture, machine and inspection semantics. The module does not mutate canonical entities. Grok should connect canonical entities through an adapter at the boundary, not add fabrication-specific fields to the kernel.

## 3. Supported geometry and assumptions

`solid`:

```js
{
  id: "feature-id",
  kind: "rectangular-pocket",
  units: "mm",
  dimensions: { x: 40, y: 30, z: 8 },
  cornerRadiusMm: 3,
  originMm: { x: 5, y: 7 }
}
```

- `dimensions.x/y` are pocket extents; `dimensions.z` is pocket depth from stock top datum.
- `originMm` is the pocket's lower-left XY location in stock coordinates. Omitted origin defaults to `{x:0,y:0}`.
- The feature is a rounded rectangle. The internal corner radius must equal the flat endmill radius. A different radius requires a finishing/contour strategy not implemented here.
- This is a feature description, not a general B-rep or triangle-mesh CAM input.

`stock`:

```js
{ id: "stock-id", units: "mm", dimensions: { x: 60, y: 50, z: 20 } }
```

Stock origin is the coordinate datum. The feature must fit XY stock and leave a positive floor. Stock dimensions must fit machine travel.

`tool`:

```js
{ id: "endmill-6", diameterMm: 6, maxStepdownMm: 3, fluteLengthMm: 12 }
```

`material`:

```js
{ id: "AL6061", lotId: "LOT-AL-01", maxCuttingSpeedMMin: 200 }
```

The module computes cutting speed from cutter diameter and spindle RPM and rejects a process above the declared material limit. The material limit must come from a qualified process/material source; the module does not invent cutting data.

`fixture`:

```js
{ id: "vise-01", setupId: "setup-01", verified: true,
  clearanceOutcome: "PASS", clearanceEvidenceId: "FIX-CLEAR-001" }
```

Fixture verification and clearance evidence are mandatory. `clearanceEvidenceId` references an external fixture/tool clearance assessment. The module does not perform collision detection and does not independently validate the evidence artifact.

`surfaceFinish` and `inspectionPlan`:

```js
{ maxRaUm: 3.2 }
{ id: "IP-01", method: "CMM_AND_PROFILOMETER" }
```

The module checks the measured Ra result against the specified maximum, including measurement uncertainty. It does not predict surface roughness from cutting parameters.

`process`:

```js
{
  stepdownMm: 2.5,
  stepoverMm: 3,
  feedMmMin: 600,
  spindleRpm: 8000,
  safeClearanceMm: 5,
  maxSegmentLengthMm: 10
}
```

`maxSegmentLengthMm` defaults to 20. `safeClearanceMm` defaults to 5. All units are millimetres, feed is mm/min, spindle speed is RPM.

`machine` must supply `id`, positive XYZ `travelMm`, `maxFeedMmMin` and `maxSpindleRpm`. For execution, all four interlock states are mandatory and must be exactly `true`: `ready`, `emergencyStopClear`, `doorClosed`, `workholdingVerified`.

`tolerance` supplies positive/non-negative `x`, `y`, `z` and positive `cornerRadiusMm` limits in mm. `surfaceFinish.maxRaUm` is the maximum permitted Ra in micrometres. Measurement uncertainty is added to absolute dimensional deviation and measured Ra before acceptance; uncertainty can never make a marginal result pass.

## 4. Public API and integration contract

`FABRICATION_API_VERSION` is `2.2.0`; the structured toolpath schema is `PAI-FAB-TOOLPATH/2.1`. The public export name `fabricate` is preserved, but the execution contract is now asynchronous and callers must await it. This is an explicit versioned API change, not synchronous backward compatibility.

### `planFabrication(input)`

Synchronous planning-only API. It validates inputs, builds the bounded raster path, validates the path and runs the trajectory interpreter. It does not call machine adapters, require live interlocks, or claim execution.

Returns:
- `HOLD` for absent required job sections, incomplete material/fixture/inspection evidence or unknown machine interlocks.
- `FAIL` for known invalid values, unsupported geometry, process limits or path complexity.
- `PLANNED` with `toolpath`, `validation`, trajectory `simulation`, `stockSimulation` and `planning` when valid.

### `fabricate(input)`

Asynchronous lifecycle API. **The export name is preserved; the return type is now a Promise and callers must `await fabricate(input)`.**

Required machine adapter:

```js
machine.executeToolpath(toolpath, { signal, idempotencyKey })
  -> Promise<{
       completed: true,
       executionId: "durable-execution-id",
       machineId: "machine-id",
       toolpathIntegrityId: toolpath.integrityId,
       startedAt?: "ISO-8601",
       completedAt?: "ISO-8601"
     }>
```

Adapter obligations:

1. Independently enforce the machine's local safety PLC/interlocks. Module flags are not a replacement for hardware safety.
2. Verify the received path checksum and machine identity before execution.
3. Honor `AbortSignal`; timeout requests abort but cannot prove the machine physically stopped.
4. Implement durable idempotency keyed by `idempotencyKey` so retries cannot duplicate a machining job.
5. Return a durable execution ID and the exact toolpath checksum.
6. Never report `completed:true` until controller state and job completion are verified.

The module freezes the path object before passing it to the adapter. It checks returned machine identity and checksum. Adapter claims remain adapter claims; independent machine telemetry/audit is a platform integration responsibility.

### `validateToolpath(toolpath, options)`

Checks schema, units, frame, nominal geometry, bounds, process clearance, move sequence, finite coordinates, move count, cutting parameters, feature envelope, checksum and motion-state coherence.

### `simulateToolpath(toolpath)`

Interprets RAPID, PLUNGE, LINEAR_CUT and RETRACT transitions; checks vertical entry/exit, safe rapid transitions, level cutting, safe terminal state and estimates commanded cut length/time.

### `simulateStockRemoval(toolpath, options)`

Runs a bounded discrete XY grid simulation. For each target cell inside the rounded-rectangle pocket, it sweeps the endmill's circular XY footprint along plunge points and linear-cut segments, determines the deepest intersecting pass, and reports fully cut cells, residual cells, coverage fraction, estimated removed volume and residual volume. Default resolution is 0.5 mm; grid size is capped to prevent unbounded allocation. The planner rejects a path if any target cell remains uncut.

This is a geometry-specific coverage/material-removal approximation. It is not a high-fidelity voxel/B-rep stock solver and does not model chip formation, cutting forces, chatter, heat, deflection, surface generation, machine kinematics, fixtures or collisions. `physicalSimulation` remains false.

### `evaluateMeasurement({nominal, measured, tolerance})`

Checks XYZ, internal corner radius and measured surface roughness Ra. Requires instrument, calibration ID and certificate evidence, calibration status and validity window, measurement evidence ID, operator, raw evidence reference, timestamp, method matching the approved inspection plan, and explicit uncertainty budgets for XYZ, corner radius and surface finish. Computes signed deviations and guard-banded decisions for dimensions and Ra:

`abs(measured_dimension - nominal_dimension) + measurement_uncertainty <= dimensional_tolerance`

`measured_Ra + Ra_uncertainty <= surfaceFinish.maxRaUm`

Missing provenance or uncertainty => `HOLD`; expired/invalid calibration, malformed timestamps or invalid numeric evidence => `FAIL`; nonconforming measurement => `FAIL`. Calibration certificate authenticity remains an external evidence-validation responsibility.

## 5. Toolpath schema

Schema identifier: `PAI-FAB-TOOLPATH/2.1`.

- Units: `mm`.
- Coordinate frame: `STOCK_TOP_DATUM_Z_DOWN`.
- Positive Z: into stock; negative Z: above stock top datum.
- Move types: `RAPID`, `PLUNGE`, `LINEAR_CUT`, `RETRACT`.
- Sequence numbers are zero-based and contiguous.
- Cutting moves carry feed and spindle speed.
- `integrityId` is a deterministic corruption-detection checksum. It is **not** cryptographic authentication or a digital signature.

## 6. Failure handling

| Condition | Result | Reason |
|---|---|---|
| Missing solid/stock/tool/process/tolerance | HOLD | Input unknown |
| Missing machine execution adapter | HOLD | Execution path unknown |
| Interlock absent or false | HOLD | Safety authority unknown/not clear |
| Missing calibration/evidence ID | HOLD | Measurement provenance incomplete |
| Unsupported feature, impossible geometry, invalid units | FAIL | Known invalid request |
| Process exceeds tool or machine rating | FAIL | Known invalid process |
| Path corruption or unsafe transition | FAIL | Path integrity/sequence violation |
| Adapter timeout/exception/incomplete report | HOLD | Physical completion unconfirmed |
| Adapter reports wrong checksum or machine ID | FAIL | Execution record mismatch |
| Measured part outside guard-banded tolerance | FAIL | Known nonconformance |
| Exact execution + valid conforming metrology | OK | Evidence chain complete within this module's scope |

## 7. Stitch instructions for Grok

1. Unzip `fabrication.zip` into a temporary directory and inspect the file list.
2. Replace only `physical-ai-platform/drop-in/fabrication/` with this package's `module.js`, `test.mjs`, `samples/`, and documentation.
3. Preserve all other drop-in folders and the canonical kernel. Do not edit the Iteration 47 acceptance script to hide missing behavior.
4. Run `node drop-in/fabrication/test.mjs` from the platform root (or `node test.mjs` from the module directory).
5. Run `node tools/conformance-test-iter47.mjs`.
6. Run `node tools/conformance-test.mjs` and `node tools/regression-checklist.mjs`.
7. Run every `tools/conformance-test*.mjs` individually if the regression checklist is interrupted; preserve exit status and logs.
8. At the platform boundary, map canonical CAD feature/stock entities into the documented input. Map machine data through a controller-specific adapter. Map CMM/probe evidence into `measuredPart` only after provenance verification.
9. Update the platform integration test to assert the awaited Promise contract. Do not add a compatibility shortcut that returns `OK` for a named solid and machine.
10. Commit the integration as a separate platform change. This package itself does not alter the spine or acceptance script.

## 8. What an industry leader has / capability comparison basis

Mature CAM suites offer general 2D/3D strategies, material-removal verification, machine kinematics, controller-specific postprocessing, collision checking and probing/inspection workflows. This module does not implement those capabilities. Its value in Iteration 47 is a bounded, auditable fabrication lifecycle contract and a deterministic starter strategy that can be replaced behind the same package boundary.

## 9. Safety and validation boundary

Never send this package's structured path directly to a real CNC without a separately validated postprocessor, machine-specific simulation, setup verification, qualified operator review and controller safety checks. The sample's fake adapter and CMM fields are synthetic test fixtures. They are not proof of a physical cut or calibrated measurement.

## 8. Optional backend ecosystem (API 2.2.0)

The previous 2.1 package implemented a bounded in-house pocket planner but did not provide a real route for established geometry, CAM and numerical libraries to participate. API 2.2 adds that route.

The platform-owned interfaces are:

- `PAI-FAB-BACKEND/1`: backend probe/invoke protocol.
- `PAI-FAB-TOOLPATH/2.1`: normalized path ABI.
- `backend-catalog.json`: capability and license inventory.

The backend registry is capability-driven. `resolveBackend()` selects only from an explicit preference list or matching registered capabilities and requires a READY handshake. It does not silently fall back to another algorithm. `invokeFabricationBackend()` verifies protocol, backend identity, operation, version, capability, structured output, timeout and cancellation. `executeBackendPipeline()` preserves ordered stage provenance and stops at the first HOLD/FAIL.

### Backends actually exercised

- **CadQuery / Open CASCADE:** create and validate a solid, export/import STEP, compare volume and bounding dimensions, and tessellate imported STEP under bounded tolerances.
- **Trimesh:** inspect mesh vertices/faces, finite coordinates, indices, watertightness, winding, volume, surface area and bounds. STL import performs explicit coincident-vertex welding only; no hole filling or automatic repair is performed.
- **Shapely / GEOS:** validate polygons, compute offsets with bounded join/tessellation parameters, and execute union/intersection/difference/symmetric difference.
- **SciPy:** constrained feed/spindle optimization using `scipy.optimize.linprog(method="highs")`. It maximizes feed x axial stepdown x radial stepover subject to machine feed and minimum/maximum spindle limits, material cutting-speed cap, process minimum feed and chip-load interval; a secondary LP minimizes spindle RPM at the selected feed. Inputs and limits must be qualified engineering data. This is an optimizer, not a validated cutting-data database.

### CAM engines available through the contract

- **OpenCAMLib:** drop-cutter/push-cutter algorithms and cutter geometry.
- **FreeCAD CAM:** CAD-to-CAM job operations, tool libraries, postprocessor workflows.
- **CAMotics:** 3-axis G-code simulation/stock-removal analysis.
- **CavalierContours:** 2D polyline offset/Boolean geometry.

Their descriptors and normalized output contract are present. Their executable adapters are not marked READY because those packages were absent in the build environment. Grok must supply the backend-specific worker, exact version and licence manifest, and known-answer integration tests before enabling them. See `BACKEND-INTEGRATION.md`.

### Using a backend-generated toolpath

`planFabricationWithBackend()` accepts a provider only when it returns `result.toolpath` in `PAI-FAB-TOOLPATH/2.1`. The function runs `validateExternalToolpath()` which checks the normalized schema and checksum, compares nominal dimensions, stock, feature bounds, tool, material lot, fixture and inspection plan with the canonical job, then independently runs the local trajectory interpreter and supported stock coverage simulation. `fabricate()` accepts `preplannedToolpath` and revalidates it again before execution.

A FreeCAD postprocessor's G-code, OpenCAMLib cutter-location points, or CAMotics simulation result must be converted by a separately tested adapter. They are not equivalent artifacts. For geometry outside the supported rounded-rectangle envelope, this module returns HOLD rather than pretending its local coverage simulator validates arbitrary geometry.

### Host isolation

The Node host uses `spawn()` with `shell:false`, an allowlist of backend IDs, a required `allowedRoot`, path resolution, input/output bounds, timeout and abort. It deliberately constructs a reduced child environment rather than inheriting application secrets. The host still needs OS/container resource controls, read-only mounts where appropriate, artifact retention, dependency pinning and external authentication. Do not run untrusted geometry workers with elevated privileges.
