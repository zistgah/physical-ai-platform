# Grok handoff - simulation v3.1.0 and separate uncertainty v1.0.0

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Deliverables

This handoff contains two independently versioned drop-ins:

1. `simulation/` -> `drop-in/simulation/` (v3.1.0): retains v3 native solver and backend federation; adds complete engineering analysis, code reference, coverage matrix, browser/Colab workflow, GPU qualification notebook, notebook metadata check and explicit Warp/MJX research profiles.
2. `uncertainty/` -> `drop-in/uncertainty/` (v1.0.0): a new optional spine-compatible module for deterministic bounded Monte Carlo input uncertainty studies. It is deliberately separate from simulation and does not mutate canonical model state.

No changes to Iteration 47 kernel, canonical schemas, simulator lifecycle, acceptance script, or the existing ten modules are included.

## Browser-first / Colab notebook

The notebook is `simulation/notebooks/simulation-gpu-qualification.ipynb`. It is designed for Google Colab and includes package copyright, trademark notice, license notice, provenance, Warp and MuJoCo MJX execution checks, device detection, evidence export and this integration guidance. Use `BROWSER-COLAB.md` for upload and runtime steps.

Do not create a false direct Colab GitHub URL. Once the repository commit exists at the exact path, publish the real link using the template in `BROWSER-COLAB.md` and replace the template in the notebook. The current package has not been pushed to GitHub by this handoff.

Warp and MJX are Python research paths, not registered JS/WASM adapters. They require a separately implemented and reviewed asynchronous host/worker bridge before production platform use. Colab is not a production service.

## New module proposal: uncertainty

`drop-in/uncertainty/` is additional to the ten folders in the original Iteration 47 handoff. It consumes an injected runner and produces bounded descriptive statistics. It does not alter simulation or the canonical model. It returns HOLD if any sample fails, times out, or returns invalid metrics. It must be separately registered by Grok only after reviewing the platform's canonical extension registration convention. Do not merge its code into `drop-in/simulation/`.

## Integration order

1. Preserve a clean copy of Iteration 47.
2. Replace only `drop-in/simulation/` with this package's `simulation/` directory.
3. Add `uncertainty/` as `drop-in/uncertainty/`; do not change kernel or acceptance script.
4. Run simulation package tests from `drop-in/simulation/`: `npm run check`, `npm test`, `npm run samples`, `npm run integration`, `npm run backend-smoke`.
5. Run uncertainty tests from `drop-in/uncertainty/`: `npm run check`, `npm test`, `npm run integration`.
6. Run platform regression and acceptance from platform root. Compare with the unchanged Iteration 47 baseline.
7. Run browser acceptance and mutation acceptance in CI. Previous mutation suite timed out and browser acceptance was not executed; those are still open until rerun successfully.
8. Run live Rapier smoke with a pinned package. Run the Colab notebook on an actual GPU runtime. Record actual engine/device versions and exported evidence.
9. Only then propose central registration and UI reachability. Grok owns that final step.

## Required integration semantics

- Native `simStep()` remains the backwards-compatible synchronous default.
- Explicit backend selection that is missing/invalid/fails returns HOLD. Never silently fall back.
- Existing Iteration 47 `Simulator.step()` is synchronous. Do not insert remote async promises into `SimComponent.step()`.
- Canonical model identity, version, provenance, units, coordinate frame, algorithm and engine versions must survive mapping.
- Backend-specific state must not replace canonical model state.
- Simulation is not physical verification.

## Test/coverage documents

- `TEST-COVERAGE-MATRIX.md`: below/on/above boundary and system coverage, including explicit unexecuted GPU/live-runtime items.
- `VALIDATION-REPORT.md`: actual package test outcomes and environment limitations.
- `ENGINEERING-ANALYSIS.md`: prior-cycle analysis, backend comparisons, architectural choices, limitations and non-claims.
- `CODE-REFERENCE.md`: produced code map and commenting expectations.
- `CHANGE-MANIFEST.json`: file-level change summary.

## Acceptance gates

A package is not considered platform-integrated merely because it exists under `drop-in/`. Distinguish: package tests pass; spine-compatible; registered; UI reachable; live backend tested; platform regression passes; browser acceptance passes; mutation acceptance passes; physical validation complete. These are separate states.
