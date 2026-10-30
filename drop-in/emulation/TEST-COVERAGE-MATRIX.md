Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Test coverage matrix - Emulation 1.2.0 and Colab Bridge 1.0.0

## 1. Coverage policy

“110% coverage” is treated as a request for deliberate over-testing: nominal cases, below/on/above boundaries, malformed inputs, adversarial structures, failure paths, negative controls, end-to-end samples, integrity tampering and regression checks. It is not a mathematically meaningful code-coverage percentage. No statement of 110% line/branch coverage is made unless measured by a coverage tool.

## 2. Emulation core matrix

| Requirement | Below boundary / negative | On boundary | Above boundary / positive | Test source |
|---|---|---|---|---|
| Device identity | Missing/empty identity => HOLD | Valid identity | Invalid type => HOLD | `test.mjs` |
| Model | Missing, async, throws => HOLD | Valid synchronous callback | Unsupported output => HOLD | `test.mjs` |
| JSON safety | Cycle, symbol, accessor, class, sparse array, undefined, function, Date | Plain nested object/array | Excessive depth => HOLD | `test.mjs` |
| Finite values | NaN/Infinity => HOLD | Finite and negative zero | Overflow-scale finite mismatch remains finite diagnostics | `test.mjs` |
| Tolerance | Just below => OK | Exact boundary inclusive | Just above => MISMATCH | `test.mjs` |
| Relative tolerance | Below => OK | Exact normalized boundary | Above => MISMATCH | `test.mjs` |
| Structured output | Missing/extra key, type mismatch | Exact nested equality | Array length mismatch | `test.mjs` |
| Stateful execution | Missing initial/next state => HOLD | Valid recurrence | Invalid next state => HOLD | `test.mjs`, `sample-test.mjs` |
| Time domains | Reversal/nonfinite => HOLD | Equal simulation/logical times where allowed | Valid monotonic progression | `test.mjs` |
| Sequence | Duplicate/reversed => HOLD | Strict increment | High safe integer validation | `test.mjs` |
| Events | Future/out-of-order/duplicate sequence => HOLD | Event at step time | Ordered event delivery | `test.mjs` |
| Fault injection | Missing target, invalid domain/type/window => HOLD | Inclusive start/end activation | Bias/scale/stuck/drop/noise/invert | `test.mjs` |
| Fault replay | Seed changes stream | Same seed reproducible | Noise remains within amplitude | `test.mjs` |
| Ports | Missing required/type/range/path/duplicate errors | Valid typed ports | Out-of-range and unsupported type => HOLD | `test.mjs` |
| Batch size | 100,001 steps rejected before model call | Non-empty bounded batch | Max guard | `test.mjs` |
| Evidence | Synthetic run cannot promote | Explicit UNVERIFIED | False VERIFIED/HIL/physical claims not accepted | `test.mjs`, spine test |

## 3. Colab Bridge matrix

| Requirement | Adversarial case | Expected behavior | Test source |
|---|---|---|---|
| Canonical serialization | Object key order changes | Stable canonical JSON | `colab-bridge/test.mjs` |
| SHA-256 | Known empty-string vector | Exact standard digest | `colab-bridge/test.mjs` |
| Job schema | Unknown schema/missing target | Reject | `colab-bridge/test.mjs` |
| Job integrity | Input tampering with old digest | Reject | `colab-bridge/test.mjs` |
| Payload safety | NaN, cycle, accessor, unsafe prototype key | Reject | `colab-bridge/test.mjs` |
| Job binding | Result from different job | HOLD | `colab-bridge/test.mjs` |
| Backend identity | Wrong backend or empty version | HOLD | `colab-bridge/test.mjs` |
| Execution provenance | Non-Colab runtime or non-executed status | HOLD | `colab-bridge/test.mjs` |
| Output contract | Empty, malformed, nonfinite output | HOLD | `colab-bridge/test.mjs` |
| Sequence/time | Duplicate sequence or backward time | HOLD | `colab-bridge/test.mjs` |
| Evidence boundary | Claims VERIFIED/HIL/physical | HOLD | `colab-bridge/test.mjs` |
| Result integrity | Tampered payload/body/digest | HOLD | `colab-bridge/test.mjs` |
| Colab URL | Missing owner/repo, traversal, non-ipynb | Reject | `colab-bridge/test.mjs` |
| Browser export | Blob MIME/size limit | Validate/reject | `colab-bridge/test.mjs` |

## 4. End-to-end sample coverage

| Sample | Model | Time samples | Positive result | Negative control |
|---|---|---:|---|---|
| DC motor | First-order speed response with state | 7 | All observations match | One poisoned RPM sample => MISMATCH |
| Thermal RC | First-order thermal response | 7 | Heating/cooling match | Invalid data covered in core tests |
| Sensor quantization | Quantizer with bias/resolution | 5 | Reported values match | Fault/invalid sensor cases in core tests |
| SciPy ODE | Linear state-space | 51 in notebook | Six methods vs analytical scalar reference | Matrix shape/nonfinite/tolerance guards |
| ngspice RC | Resistor-capacitor transient | Runtime-generated | Analytical RC response check | Invalid R/C/time bounds |
| MJX pendulum | Single hinge, batched initial states | 256 environments x 250 steps default | Finite-state check | Invalid batch/step/timestep guards |
| JAX ensemble | Vectorized scalar ODE ensemble | 100,000 x 200 steps default | Analytical RK4 error check | Size/range/nonfinite guards |
| FMPy | User-supplied trusted FMU | FMU-defined | Runtime-dependent | Unsupported variable/nonfinite/no output |
| PyBaMM | SPM/SPMe/DFN | 181 samples default | Runtime-dependent solver termination | Unsupported model/time/observable guards |

## 5. Regression matrix

| Scope | Verification | Status to report |
|---|---|---|
| Emulation 1.0.0 behavior | 103 prior unit/contract cases retained | Run result in TEST-REPORT |
| Added v1.2 boundaries | 25 additional cases | Run result in TEST-REPORT |
| Sample simulation | Motor/thermal/sensor and negative control | Run result in TEST-REPORT |
| Colab Bridge | Dedicated integrity/contract suite | Run result in TEST-REPORT |
| SIR ABI + execution gate + fidelity boundary | `spine-integration-test.mjs` | Only after package copied into repo |
| Iteration 47 conformance | Original script unchanged | Only after package copied into repo |
| Repository regression | Original checklist unchanged | Only after package copied into repo |
| Browser route walk | Requires real browser runtime | UNVERIFIED if browser unavailable |
| Colab hosted execution | Requires Google Colab account/runtime | Not run from local packaging environment |
| Native FMU security | Requires OS-level isolation and threat model | Not certified by notebook |

## 6. Mutation testing

The prior 1.1.0 cycle killed three targeted backend-runtime mutations; that Node/Python runtime has been removed. In 1.2.0, five core mutations (numeric tolerance, step sequence, event sequence, output-port gate, nonfinite-output gate) were killed. Three bridge mutations (job payload binding, result/job binding, physical-promotion gate) were also killed. These are targeted mutation samples, not exhaustive mutation scores.

## 7. Coverage interpretation

- Test counts are assertion/test-case counts, not code-coverage percentages.
- Notebook static validation is not the same as executing the notebook on Colab.
- SciPy local execution is not proof of Colab GPU operation.
- MJX/JAX GPU execution must record actual backend device.
- FMU notebook validation does not validate a specific FMU unless a trusted reference FMU is run.
- A successful simulation is not physical verification or certification.
