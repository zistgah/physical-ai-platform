<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Test coverage matrix

| ID | Requirement / boundary | Test | Expected | Result in this package |
|---|---|---|---|---|
| CFD-01 | Valid 1D channel, analytical solution | `test.mjs` | OK, residual within tolerance | PASS (prior suite retained) |
| CFD-02 | Uniform mesh refinement | 11 grids, 3 to 1000 cells | finite result and analytical consistency | PASS (prior suite retained) |
| CFD-17 | Minimum/maximum mesh-size boundary and residual target | `test.mjs` | 3 cells accepted; 10,000 cells HOLD at 1e-10 round-off target and pass at 1e-8 | PASS |
| CFD-03 | Nonuniform mesh | nonuniform face fixture | finite converged solution | PASS (prior suite retained) |
| CFD-04 | Couette / Poiseuille superposition | analytical comparisons | profile/flow agreement | PASS (prior suite retained) |
| CFD-05 | Flow reversal and zero flow | signed pressure and zero forcing | correct sign / zero result | PASS (prior suite retained) |
| CFD-06 | Missing, malformed and non-finite inputs | 23 HOLD cases | reason-coded HOLD | PASS (prior suite retained) |
| CFD-07 | Input immutability / determinism | frozen input and repeated run | identical output; no mutation | PASS (prior suite retained) |
| CFD-08 | Sample fixtures | parse/run four JSON files | all execute | PASS (prior suite retained) |
| CFD-09 | Fake result mutations | nonzero field/residual/flow assertions | suite fails if result is fabricated | PASS (prior suite retained) |
| CFD-10 | External job dimensionality | 1D/2D/3D/4D | 2D/3D accepted, 1D/4D HOLD | PASS (new adapter test) |
| CFD-11 | Canonical bindings | absent subject/config refs | HOLD | PASS (new adapter test) |
| CFD-12 | Execution mode | browser/native unsupported mode | HOLD | PASS (new adapter test) |
| CFD-13 | Notebook metadata/attribution | parse ipynb | required metadata and attribution | PASS (new structural test) |
| CFD-15 | Backend catalogue licence/source/GPU metadata | `tests/catalogue.test.mjs` | three candidate engines; no false execution claim | PASS |
| CFD-16 | Package attribution and manifest integrity | `tests/package-integrity.test.mjs` | all authored source files and manifests carry metadata | PASS |
| CFD-18 | OpenFOAM install activation is explicit opt-in and version-pinned | `notebook-structure.test.mjs` | install and smoke run disabled by default; exact v2606 package and official helper recorded | PASS structural only; install/smoke run not run |
| CFD-14 | Notebook GPU fallback contract | inspect notebook cells | CuPy detection, CPU fallback | PASS (structural only; actual Colab GPU not available here) |
| BO-01 | Manifest validation | orchestration test | invalid manifest HOLD | PASS |
| BO-02 | Unknown licence | orchestration test | HOLD | PASS |
| BO-03 | Duplicate backend ID | orchestration test | HOLD | PASS |
| BO-04 | Capability discovery | orchestration test | match only supported domain/dimensions | PASS |
| BO-07 | Fresh preflight before execution | orchestration test | unavailable/probe failure blocks execution | PASS |
| BO-05 | Adapter exception | orchestration test | HOLD | PASS |
| BO-06 | Trust non-promotion | orchestration test | EXECUTED_UNVERIFIED; promotion false | PASS |
| INT-01 | Iteration 47 conformance | repository conformance test | PASS | Run in repository; see TEST-RESULTS.md |
| INT-02 | Full regression | repository suite | PASS | Run in repository; see TEST-RESULTS.md |
| INT-03 | Full acceptance | acceptance script | no FAIL; explicit unverified browser state | Run in repository; see TEST-RESULTS.md |
| EXT-01 | OpenFOAM executable adapter | not supplied | version-pinned invocation + benchmark | NOT IMPLEMENTED / NOT CLAIMED |
| EXT-02 | SU2 executable adapter | not supplied | version-pinned invocation + benchmark | NOT IMPLEMENTED / NOT CLAIMED |
| EXT-03 | Code_Saturne executable adapter | not supplied | version-pinned invocation + benchmark | NOT IMPLEMENTED / NOT CLAIMED |
| GPU-01 | GPU CFD solver run | no solver GPU build | solver-specific GPU benchmark | NOT EXECUTED |
| PHY-01 | Physical validation | no experiment supplied | measurement correlation and uncertainty | NOT EXECUTED |

The previous CFD core suite remains in place; new tests add backend and notebook contracts. `PASS` in the external backend catalogue means metadata/contract tests only, not external solver execution.
