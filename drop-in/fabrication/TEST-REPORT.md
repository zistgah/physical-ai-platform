# Fabrication v2.2.0 - test report

## Summary

- Core fabrication suite: **115 passed, 0 failed**.
- Backend and optional-library suite: **48 passed, 0 failed**.
- Combined package tests: **163 passed, 0 failed**.
- Actual optional libraries exercised: CadQuery 2.8.0 / Open CASCADE through CadQuery, Trimesh 4.11.1, Shapely 2.1.2 / GEOS, SciPy 1.17.0, NumPy 2.3.5.
- External CAM runtimes OpenCAMLib, FreeCAD CAM and CAMotics were not installed; their descriptors are not treated as runtime tests or ready backends.

## Core suite (115)

Run:

```bash
node test.mjs
```

Covers geometry/job input validation, units/ranges, tool/process/material/fixture constraints, deterministic path generation, move sequencing and integrity, safe motion transitions, bounded stock coverage, adversarial values, interlock states, adapter mutation, timeout/abort, idempotency, execution identity/checksum, calibration validity, uncertainty guard bands, dimensional and Ra conformity, sample end-to-end behavior and failure/HOLD semantics.

Result:

```text
FABRICATION TESTS: 115 passed, 0 failed
```

## Backend suite (45)

Run:

```bash
node backend-tests.mjs
```

Covers:

- Registry uniqueness, descriptor validation and capability lookup.
- Missing host, unavailable backend, unsupported capability and unregistered provider -> HOLD.
- Backend protocol, operation, identity and version mismatch -> FAIL.
- Missing structured result, exception, timeout, abort and pipeline stop behavior.
- Input detachment and provenance preservation.
- Real CadQuery/OCCT box construction, B-rep validity, STEP export/import, volume/bounds and tessellation.
- Real Trimesh box topology, watertightness, volume, STL export/import, vertex welding and mesh inspection.
- Real Shapely/GEOS rectangle inward offset (expected area 144 mm²), polygon validation, Boolean intersection (expected area 50 mm²) and invalid bow-tie rejection.
- Real SciPy/HiGHS feed/spindle optimization with known feasible optimum, invalid flute count and infeasible process envelope.
- External normalized CAM toolpath accepted only after independent canonical validation; job mismatch rejected; preplanned path executed without silent replanning.
- Worker file-root requirement, unallowlisted backend rejection and unsupported operation rejection.

Result:

```text
BACKEND ADAPTER TESTS: 48 passed, 0 failed
```

## Integration/regression status

The package was stitched into a disposable copy of Iteration 47 by replacing only `drop-in/fabrication/`. The kernel, acceptance script and other nine drop-ins were hash-compared with the source archive. The full results are recorded in `INTEGRATION-REPORT.md` after the stitch run.

## What these tests do not prove

- No real CNC machine was connected or commanded.
- No physical part was manufactured or measured.
- No industrial machine safety PLC, controller, CMM or calibration system was qualified.
- No OpenCAMLib, FreeCAD CAM, CAMotics or CavalierContours runtime was installed or exercised.
- Local swept-cutter coverage remains bounded to the supported rounded-rectangle pocket; it is not a general 3D stock solver or collision detector.
- The SciPy optimizer is only as valid as its supplied limits and cutting-data bounds; it is not a process qualification database.
- Backend protocol tests with fake hosts prove adapter failure handling, not correctness of a third-party engine.

A package test pass is not certification or production CNC authorization.
