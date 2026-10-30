<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Test results - CFD package 1.3.0

## Package-level verification

The following tests are run for this package release (all PASS):

- `node cfd/test.mjs` - retained CFD solver tests plus explicit minimum/maximum mesh boundary checks: PASS. At 10,000 cells the default 1e-10 residual target correctly HOLDs on round-off (measured residual about 7.25e-9); an explicit 1e-8 tolerance passes.
- `node cfd/tests/backend-job.test.mjs` - new CFD job envelope tests: PASS.
- `node cfd/tests/notebook-structure.test.mjs` - new notebook metadata and contract tests: PASS.
- `node cfd/tests/catalogue.test.mjs` - backend source/licence/GPU-caution metadata: PASS.
- `node cfd/tests/package-integrity.test.mjs` - source and manifest attribution: PASS.
- `node extensions/scientific-backend-orchestration/tests/test.mjs` - new generic backend registry tests: PASS.
- `python -m json.tool cfd/notebooks/CFD_Backend_Colab.ipynb` - notebook JSON parse: PASS.

## Repository regression verification

The supplied Iteration 47 repository was tested with the 1.3.0 CFD package and the separate extension package present at `extensions/scientific-backend-orchestration/`:

- `node tools/conformance-test-iter47.mjs`: PASS; all ten original drop-in packages remain counted as ten.
- `node tests/run.mjs`: 64/64 conformance suites PASS.
- `node tests/acceptance.mjs`: 63 checks, 62 PASS, 1 UNVERIFIED, 0 FAIL; exit code 0; verdict ACCEPTED.
- The sole UNVERIFIED item was the real-browser Playwright route walk because Playwright was not installed. DOM-stub route checks ran: 30 routes rendered. Seven mutation/removal checks in acceptance detected their injected defects.
- S0 repository checklist: 64 suites PASS.

The new sibling package is package-tested but not registered in the platform runtime or reachable from a UI route. Grok must perform those explicit integration steps and rerun the platform suite after registration.

## Not executed / not claimed

- Actual Colab CPU runtime execution: NOT EXECUTED in Colab; all non-magic notebook cells executed locally on CPU.
- OpenFOAM v2606 installation and pitzDaily/simpleFoam smoke-run cells: NOT EXECUTED (explicit opt-ins remain disabled).
- Actual Colab GPU runtime execution: NOT EXECUTED in this environment.
- OpenFOAM, SU2 or Code_Saturne solver invocation: NOT EXECUTED; no concrete process adapters are included.
- GPU-native CFD solver benchmark: NOT EXECUTED.
- Physical experiment correlation: NOT EXECUTED.
- Application route/UI registration: NOT EXECUTED.

## Test coverage statement

No unsupported “110% coverage” claim is made. The new tests prove package contracts, validation boundaries, fresh backend preflight, trust semantics, catalogue integrity and notebook structure. The notebook non-magic cells were also executed sequentially in the local CPU environment, including the 250,000-case NumPy parameter sweep and run-manifest export. They do not prove external solver correctness, Colab runtime compatibility, GPU acceleration of CFD solvers, or physical validity. A line/branch coverage percentage and mutation score require a configured instrumented runner and must be measured in CI.
