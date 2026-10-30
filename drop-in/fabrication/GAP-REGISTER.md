# Fabrication v2.2.0 - scope and closure register

## Closed within the declared package scope

| Requirement | Closure evidence |
|---|---|
| Bounded 2.5D rounded-pocket planning | `module.js`, 115 core tests |
| Tool/material/process/stock/fixture gates | `validateJob`, adversarial tests |
| Deterministic normalized toolpath ABI | `PAI-FAB-TOOLPATH/2.1`, checksum and path tests |
| Trajectory interpretation | independent move-state interpreter |
| Discrete stock coverage | swept-cutter coverage simulation and regression tests |
| Execution assurance | interlock, timeout, abort, idempotency, machine/path identity checks |
| Measurement assurance | calibration/provenance/uncertainty and dimensional/Ra guard bands |
| Optional backend registration | `PAI-FAB-BACKEND/1` registry and capability resolution |
| Optional backend invocation | handshake, protocol, version, timeout, abort, structured result and provenance checks |
| Actual geometry/numerical library adapters | CadQuery/OCCT, Trimesh, Shapely/GEOS, SciPy workers executed in test environment |
| External CAM toolpath acceptance | normalized output contract and independent canonical validation |
| Stitching instructions | `STITCH-INSTRUCTIONS.md` |

## Runtime availability, not implementation defects

These providers are represented in the capability catalog but were not installed in the test environment. They must remain `HOLD` until an exact runtime and backend-specific worker are installed, probed, and validated:

| Backend | Runtime status | Required before READY |
|---|---|---|
| OpenCAMLib | Not installed; contract registered | Native/Python worker, cutter-location to normalized path adapter, known-answer surface/cutter tests |
| FreeCAD CAM | Not installed; contract registered | FreeCAD macro/worker, job creation, Path extraction, postprocessor-specific tests and fixture checks |
| CAMotics | Not installed; contract registered | CLI/project worker, G-code dialect qualification, 3-axis stock simulation fixtures and limitations handling |
| CavalierContours | Not installed; contract registered | Native binding worker, topology-preserving offset/Boolean adapter, cross-check fixtures |

This is not marked closed as an executable integration. It is explicitly catalogued as optional and unavailable, so it cannot be selected or silently treated as a passing backend.

## Explicit engineering envelope

- Current native planner: rounded-rectangle internal pocket, flat endmill, 2.5D raster plus contour.
- Current local stock-coverage validator: the same declared rounded-rectangle pocket envelope.
- General B-rep and triangle mesh inspection/tessellation is available through CadQuery/OCCT and Trimesh. This does not imply general CAM strategies for arbitrary solids.
- Shapely and SciPy provide real planar geometry and constrained process optimization; neither substitutes for CAM, cutting-data qualification, collision checking or physical validation.
- External CAM output must be converted to normalized `PAI-FAB-TOOLPATH/2.1` and independently validated.
- Arbitrary G-code must be checked by a separately integrated controller-aware parser/simulator; it is not accepted as a normalized toolpath by this module.

## Not claimed

No five-axis/turning capability, general adaptive 3D CAM, machine kinematics, fixture collision detection, chip/thermal/deflection physics, controller-specific postprocessing, real CNC control, CMM integration, GD&T conformance or industrial qualification is claimed by this package.

The backend ecosystem is the extensibility mechanism for those engines. Each must be integrated and validated as a backend, not represented as already delivered by a catalog row.
