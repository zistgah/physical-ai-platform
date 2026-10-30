# Iteration 47 stitch and regression report - Fabrication 2.2.0

## Stitch procedure

- Source baseline: uploaded `physical-ai-platform-iteration-47.zip` and its `HANDOFF.md`.
- Work performed in a disposable extraction.
- Replaced only `physical-ai-platform/drop-in/fabrication/` with this package.
- Did not edit the canonical kernel, module registry, acceptance script, application routes, MRD, document subsystem or any of the other nine drop-ins.
- Hash comparison against the original extracted Iteration 47 tree: **zero changed/added/removed files outside `drop-in/fabrication/`**. The acceptance runner created its ignored `.acceptance/` working directory; it is not part of the package or the handoff diff.

## Executed results

| Suite | Result | Notes |
|---|---:|---|
| Fabrication core tests | **115/115 PASS** | Run inside stitched platform |
| Backend ecosystem tests | **48/48 PASS** | Run inside stitched platform; actual CadQuery/OCCT, Trimesh, Shapely/GEOS and SciPy installed in this environment |
| Iteration 47 conformance | **PASS** | `tools/conformance-test-iter47.mjs` |
| Regression checklist | **64/64 suites PASS** | `tools/regression-checklist.mjs` |
| Acceptance, no-browser/no-mutation | **55 PASS, 8 SKIP** | Verdict ACCEPTED; browser and seven mutation checks skipped by explicit flags |
| Acceptance, browser enabled/no-mutation | **55 PASS, 7 SKIP, 1 UNVERIFIED** | A5 unverified: Playwright is not installed; DOM-stub route walk A2/A4 passed, including 30 routes |
| Mutation-enabled acceptance | **UNVERIFIED - timeout** | `node tests/acceptance.mjs --no-browser` exceeded the 300-second execution window during the mutation stage; no pass is claimed |

The mutation stage clones the full repository and runs the full regression checklist for each of seven mutants. It was not completed within the available execution window. This is a verification limitation, not a fabricated pass.

## Backend runtime status

| Backend | Actual status in this build |
|---|---|
| CadQuery 2.8.0 / Open CASCADE | Installed; B-rep validation, STEP round-trip and tessellation exercised |
| Trimesh 4.11.1 | Installed; topology inspection, STL round-trip and vertex welding exercised |
| Shapely 2.1.2 / GEOS | Installed; polygon validation, inward offset and Boolean intersection exercised |
| SciPy 1.17.0 / HiGHS | Installed; constrained feed/spindle optimization and infeasible-envelope rejection exercised |
| OpenCAMLib | Not installed; optional provider contract only, not runtime-tested |
| FreeCAD CAM | Not installed; optional provider contract only, not runtime-tested |
| CAMotics | Not installed; optional provider contract only, not runtime-tested |
| CavalierContours | Not installed; optional provider contract only, not runtime-tested |

## Integration semantics

- `fabricate` export name preserved.
- `fabricate` remains asynchronous.
- API version advanced to `2.2.0`.
- `preplannedToolpath` and `backendEvidence` are additive optional inputs.
- Backend CAM output is accepted only as normalized `PAI-FAB-TOOLPATH/2.1` and is independently revalidated before execution.
- No optional external backend is silently installed or selected.
- Missing backend/host/capability -> HOLD. Invalid protocol, mismatched job or corrupt toolpath -> FAIL.
- Static/browser deployment does not import Node or Python host code and has no mandatory backend dependency.

## Remaining non-claims

No CNC machine was connected, no physical part was made or measured, no CMM/PLC/controller was qualified, and no industrial certification or production release is claimed. The native stock-coverage validator remains limited to the declared rounded-rectangle pocket. General 3D/multi-axis machining needs a compatible independent CAM and simulation worker.
