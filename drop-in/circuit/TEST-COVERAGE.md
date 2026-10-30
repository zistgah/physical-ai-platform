<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit test strategy and coverage matrix

## 1. Coverage policy

“110% coverage” is not a measurable software-testing metric. This package instead defines explicit test obligations across nominal, boundary, above-boundary, below-boundary, invalid, adversarial, numerical-reference, backend-contract, integration and real-engine execution. A test is counted only when it executes and asserts the stated behavior. A skipped real-engine test is never counted as a pass.

## 2. Circuit package test inventory

| ID | Layer | Test obligation | Expected result | Evidence source |
|---|---|---|---|---|
| C-NOM-01 | Native | RC step response vs analytical exponential | PASS within declared tolerance | `test.mjs` |
| C-NOM-02 | Native | RL step response vs analytical exponential | PASS within declared tolerance | `test.mjs` |
| C-NOM-03 | Native | Resistive divider | PASS exact/near-exact | `test.mjs` |
| C-NOM-04 | Native | Both integration methods | finite, expected result | `test.mjs` |
| C-NOM-05 | Native | Delayed step transition startup | no trapezoidal jump averaging defect | `test.mjs` |
| C-NOM-06 | Native | Deterministic replay | identical output | `test.mjs` |
| C-BOUND-01 | Native | Minimum valid time step and one step | valid or documented HOLD | `test.mjs` |
| C-BOUND-02 | Native | Maximum configured element/unknown/step/history/work bounds | accepted at bound | `test.mjs` |
| C-ABOVE-01 | Native | One above each resource bound | HOLD | `test.mjs` |
| C-BELOW-01 | Native | Zero/negative R,C,L and dt | HOLD | `test.mjs` |
| C-INVALID-01 | Native | Empty/missing netlist/elements | HOLD | `test.mjs` |
| C-INVALID-02 | Native | Duplicate IDs, unknown devices, same terminals | HOLD | `test.mjs` |
| C-INVALID-03 | Native | NaN/Infinity source/passive values | HOLD | `test.mjs` |
| C-INVALID-04 | Native | Unknown initial-condition IDs | HOLD | `test.mjs` |
| C-TOPO-01 | Native | Floating/singular circuit | HOLD | `test.mjs` |
| C-WAVE-01 | Native | DC, step, pulse and invalid pulse timing | correct values or HOLD | `test.mjs` |
| C-INV-01 | Native | KCL and power/current polarity checks | within tolerance | `test.mjs` |
| C-REF-01 | Samples | RC low-pass sample | analytical assertions pass | `samples/rc-lowpass.json` |
| C-REF-02 | Samples | RL step sample | analytical assertions pass | `samples/rl-step.json` |
| C-REF-03 | Samples | Resistive divider sample | reference assertions pass | `samples/resistive-divider.json` |
| C-BE-01 | Adapter | ngspice deck generation | correct dialect/deck | `backends/test.mjs` |
| C-BE-02 | Adapter | Xyce deck generation | correct dialect/deck | `backends/test.mjs` |
| C-BE-03 | Adapter | CSV/WRDATA parsing and vector mapping | normalized result | `backends/test.mjs` |
| C-BE-04 | Adapter | D/Q/M/J/X device mapping | terminal order preserved | `backends/test.mjs` |
| C-BE-05 | Adapter | PDK `.lib` corner selection | explicit section only | `backends/test.mjs` |
| C-BE-06 | Adapter | Nested include closure and SHA-256 | valid pack accepted | `backends/test.mjs` |
| C-BE-07 | Adapter | Traversal, untrusted directive, bad hash, oversized pack | HOLD | `backends/test.mjs` |
| C-BE-08 | Adapter | Missing executable | SKIP in real-engine harness; HOLD from API | `backends/test-real-engines.mjs` |
| C-BE-09 | Adapter | Nonzero exit, timeout, malformed output, absent vectors | HOLD | `backends/test.mjs` |
| C-BE-10 | Adapter | Version probe and provenance hashes | recorded or explicitly not requested | `backends/test.mjs` |
| C-BE-11 | Adapter | Auto backend selection | documented fallback only | `backends/test.mjs` |
| C-REAL-01 | Real engine | ngspice diode clamp sample | actual engine run + reference comparison | real-engine harness / Colab |
| C-REAL-02 | Real engine | Xyce diode clamp sample | actual engine run + reference comparison | real-engine harness / Colab |
| C-INT-01 | Platform | overlay into exact `drop-in/circuit/` path | package tests pass in situ | integration run |
| C-INT-02 | Platform | canonical graph lowering and result binding | Grok integration gate | not included in standalone package |
| C-INT-03 | Platform | fidelity/evidence promotion | requires platform evidence gate | not included in standalone package |

## 3. Additional design-space module matrix

| ID | Boundary class | Test | Expected result |
|---|---|---|---|
| D-NOM-01 | nominal | Analytical RC reference | PASS |
| D-NOM-02 | nominal | Cartesian R×C grid | expected candidate count |
| D-NOM-03 | nominal | rise-time/current/energy metrics | analytical values |
| D-NOM-04 | nominal | exact tau fit | tau recovered within tolerance |
| D-NOM-05 | nominal | noisy tau fit | bounded error |
| D-NOM-06 | nominal | explicit weights | fit completes |
| D-BOUND-01 | lower | two valid time samples | accepted |
| D-BOUND-02 | lower | empty resistance/capacitance/time | HOLD |
| D-BOUND-03 | lower | zero/negative values | HOLD |
| D-BOUND-04 | upper | candidate count at configured maximum | accepted |
| D-ABOVE-01 | above | candidate count one over maximum | HOLD |
| D-ABOVE-02 | above | output tensor one over maximum | HOLD |
| D-INVALID-01 | invalid | non-monotonic/duplicate/negative time | HOLD |
| D-INVALID-02 | invalid | NaN/Infinity measurement/weight/constraint | HOLD |
| D-INVALID-03 | invalid | unknown backend/constraint | HOLD |
| D-FIT-01 | identifiability | one step identifies tau only | no independent R/C claim |
| D-FIT-02 | identifiability | recover R only with independent known C | correct R |
| D-GPU-01 | runtime | JAX available | engine reports actual device |
| D-GPU-02 | runtime | require GPU without GPU | HOLD, never CPU mislabelled GPU |
| D-DET-01 | determinism | repeat same sweep | byte/value-equivalent result |

## 4. Required commands

Circuit package:

```bash
node test.mjs
node backends/test.mjs
node backends/test-real-engines.mjs
```

Design-space package:

```bash
python -m unittest -v
```

Colab notebook:

- Verify package hashes.
- Execute native and adapter test suites.
- Execute each installed real engine separately.
- Preserve PASS / FAIL / SKIP / NOT_RUN distinctions.
- Export the run manifest and environment versions.

## 5. Coverage interpretation

The native suite currently reports 69 runtime assertions. The adapter suite currently reports 104 runtime assertions using fake process runners. The design-space module currently has 53 unit tests. These counts are test assertions/cases, not a branch-coverage percentage. No 100% or 110% branch coverage claim is made without a coverage instrument and a measured report.

Release evidence must include actual engine runs, not only fake runners. Browser/Colab execution, platform graph integration and mutation testing are separate gates.
