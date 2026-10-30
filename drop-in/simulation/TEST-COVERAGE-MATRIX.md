# Simulation Test Coverage Matrix

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Coverage policy

"110% coverage" is not a measurable software-testing metric. This package instead defines explicit requirement, boundary, adversarial, numerical, integration, runtime and regression coverage. Passing the matrix does not establish formal proof or physical validity.

## Simulation package coverage

| ID | Area | Below boundary | On boundary | Above boundary / invalid | Evidence / suite | Status in this package |
|---|---|---|---|---|---|---|
| S-01 | Body count | empty input HOLD | 1 body accepted | >256 HOLD | `test.mjs` | covered |
| S-02 | Time step | zero/negative HOLD | positive finite, <=1 s | >1 s/non-finite HOLD | `test.mjs` | covered |
| S-03 | Steps | 0 HOLD | 1 and 10,000 accepted by validator | >10,000 HOLD | `test.mjs` | covered |
| S-04 | Body state | missing/non-finite values HOLD | zero and valid positive values | magnitude overflow HOLD | `test.mjs` | covered |
| S-05 | Mass/radius | negative mass/zero radius HOLD | zero mass fixed body; positive radius | unrepresentable inertia HOLD | `test.mjs` | covered |
| S-06 | Material | restitution outside [0,1] HOLD | 0 and 1 | >1 HOLD | `test.mjs` | covered |
| S-07 | Iterations | 0 HOLD | 1 and 100 | >100 HOLD | `test.mjs` | covered |
| S-08 | Adaptive substeps | maxSubsteps 0 HOLD | 1 and 64 | >64 or required > configured HOLD | `test.mjs` | covered |
| S-09 | History | false / bounded steps | 10,000 frames | >10,000 with history HOLD | `test.mjs` | covered |
| S-10 | Determinism | n/a | same input/seed repeat | duplicate IDs HOLD | `test.mjs` | covered |
| S-11 | Physics invariants | no-contact free motion | elastic collision / floor | excessive penetration or divergence guarded | `test.mjs`, samples | covered within planar-disc scope |
| S-12 | Backend registry | unknown backend HOLD | valid registration | duplicate/malformed registration rejected | `backend-tests.mjs` | covered |
| S-13 | Result contract | missing result HOLD | finite body states | NaN/Infinity/malformed result HOLD | `backend-tests.mjs` | covered |
| S-14 | Remote protocol | missing transport rejected | correct handshake/request IDs | timeout, mismatched IDs/schema/errors HOLD | `backend-tests.mjs` | covered |
| S-15 | Rapier adapter | unavailable package HOLD/SKIP | API-double integration | unsupported feature rejected | `backend-tests.mjs`, integration | test-double covered; live pending |
| S-16 | Platform component | invalid state HOLD | sync component tick | lifecycle/disposal and HOLD propagation | `platform-backend-integration.test.mjs` | test-double covered |
| S-17 | Samples | invalid input tests | 5 canonical scenarios | sample-specific expected bounds | `run-samples.mjs` | covered |
| S-18 | Notebook metadata | missing copyright invalid | exact package/version/notice | malformed notebook JSON invalid | `notebook-check.mjs` | covered |
| S-19 | Warp runtime | package/device unavailable => SKIP | finite-state microbenchmark | non-finite/penetrating state fails | Colab notebook | not executed in this local build environment |
| S-20 | MJX runtime | dependency/device unavailable => SKIP | finite articulated state | non-finite state fails | Colab notebook | not executed in this local build environment |

## Separate uncertainty package coverage

| ID | Area | Below boundary | On boundary | Above boundary / invalid | Evidence | Status |
|---|---|---|---|---|---|---|
| U-01 | Parameter count | 0 HOLD | 1 / 32 accepted | 33 HOLD | `uncertainty/tests/run.mjs` | covered |
| U-02 | Sample count | 0 HOLD | 1 / 10,000 accepted | 10,001 HOLD | same | covered |
| U-03 | Seed | negative HOLD | 0 / 2^32-1 | >2^32-1 HOLD | same | covered |
| U-04 | Distribution bounds | inverted HOLD | min=max accepted | non-finite/out-of-range HOLD | same | covered |
| U-05 | Normal spread | negative stddev HOLD | stddev=0 accepted | unsupported distribution HOLD | same | covered |
| U-06 | Metric count | 0 HOLD | 1 / 32 accepted | 33 HOLD | same | covered |
| U-07 | Metric values | missing/NaN HOLD | finite scalar accepted | overflow HOLD | same | covered |
| U-08 | Runner outcomes | HOLD/missing runner HOLD | OK accepted | exception/timeout HOLD | same | covered |
| U-09 | Determinism | n/a | identical seed/spec | changed seed changes sample stream | same | covered |
| U-10 | Simulation integration | invalid sim HOLD | native solver metrics | any sample HOLD aborts study | `uncertainty/tests/integration.mjs` | covered |

## Platform regression and acceptance

The package-level integration is separate from platform-wide regression. Grok must run these from the Iteration 47 root after stitching:

- `node tests/run.mjs`
- `node tests/acceptance.mjs --no-mutation --no-browser --json`
- Full mutation acceptance, without the no-mutation flag.
- Browser acceptance in the actual target browser.
- Live Rapier smoke with exact pinned package.
- Live Warp/MJX qualification in a GPU Colab runtime.

The previous baseline recorded 64/64 platform regression tests and no-mutation acceptance 55 PASS / 8 SKIP. The full mutation run timed out and browser acceptance was not executed. Those historical results are not silently upgraded by this package's new tests. Re-run all suites on the final stitched build.
