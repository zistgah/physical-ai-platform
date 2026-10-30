# Changelog

## 2.2.0 - Optional open-source backend ecosystem

- Added `PAI-FAB-BACKEND/1` capability registry, backend probe/dispatch, version and identity checks, timeout/abort handling, ordered pipelines and provenance.
- Added actual optional Python worker integration for CadQuery/Open CASCADE, Trimesh, Shapely/GEOS and SciPy.
- Added STEP import/validation/tessellation, STL/mesh topology inspection, polygon validation/offset/Boolean operations and constrained feed/spindle optimization.
- Added Node/desktop host bridge with `spawn` and `shell:false`, explicit backend allowlist, mandatory file root, reduced child environment, input/output bounds and cancellation.
- Added normalized external CAM toolpath intake. External paths are independently checked against the canonical job, trajectory interpreter and supported stock-coverage validator before use.
- Added `preplannedToolpath` and `backendEvidence` as additive inputs to `fabricate`; existing `fabricate` export and asynchronous contract are preserved.
- Added backend catalog, operation contracts, license inventory, tests, samples and detailed Grok stitch instructions.
- OpenCAMLib, FreeCAD CAM, CAMotics and CavalierContours are catalogued as optional providers but remain unavailable until their executable workers are installed and validated. No false runtime-ready claim.
- Core suite: 115 passing. Backend suite: 45 passing.

## 2.1.0 - Bounded 2.5D fabrication workflow

- Deterministic rounded-rectangle pocket planner, path validation, trajectory interpretation, discrete stock-coverage simulation, machine execution assurance and uncertainty-guarded metrology.
- Asynchronous `fabricate` API with execution and measurement evidence gates.
