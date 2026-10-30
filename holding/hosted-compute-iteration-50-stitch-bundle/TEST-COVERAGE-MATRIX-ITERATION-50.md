# Iteration 50 - Test Coverage and Boundary Matrix

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.**  
**SPDX-License-Identifier: GPL-3.0-only**

## 1. Coverage statement

No claim of "110% code coverage" is made. Code coverage cannot exceed 100%, and assertion count is not a line/branch coverage percentage. This deliverable instead reports executed assertions and maps each public contract to positive, negative, boundary and integration tests. A future CI job may add a line/branch coverage tool; it has not been run here.

## 2. Executed test inventory

| Test asset | Purpose | Assertions / checks | Execution environment |
|---|---|---:|---|
| `drop-in/hosted-compute/test.mjs` | Catalog, planning, validation, digest, evidence invariants | 201 assertions (latest run) | Node.js 22 |
| `drop-in/hosted-compute/integration.mjs` | Module registry to plan to result to evidence-draft path | 14 explicit assertions | Node.js 22 |
| `tools/conformance-test-hosted-compute-iter50.mjs` | Platform registry reachability and contract smoke | 11 assertions | Node.js 22 |
| `notebooks/test_notebook.py` | Notebook metadata, code syntax, full notebook execution, numerical solution, artifacts and digest | 69 assertions across SciPy, PyTorch CPU and Numba JIT CPU runs | Python 3.13.5, NumPy 2.3.5, SciPy 1.17.0, PyTorch 2.10.0 CPU, JAX 0.9.0.1 CPU |
| Existing HIL tests | Ensure Iteration 49 HIL module behavior remains intact | 4,108 core assertions; 26 adapter assertions; 43 HIL conformance assertions | Node.js 22 |
| Existing platform conformance | Detect regressions across previous suites | 66/66 suites in Iteration 50 | Node.js 22 |
| Existing platform acceptance | Preserve platform acceptance criteria | Iteration 50: 55 PASS, 8 SKIP, 0 FAIL (A5 + 7 mutation checks explicitly skipped with --no-browser --no-mutation) | Existing acceptance script, unchanged |

Counts are test-run outputs, not source-line coverage. The notebook test executes the default SciPy path and explicit PyTorch CPU and Numba CPU paths.

## 3. Plan contract matrix

| Field / condition | Below boundary / invalid | On boundary | Above boundary / valid range | Expected behavior |
|---|---|---|---|---|
| Project ID | missing / empty | non-empty string | n/a | HOLD / READY |
| Configuration ID | missing / empty | non-empty string | n/a | HOLD / READY |
| Solver ID | missing / empty | non-empty string | n/a | HOLD / READY |
| Run ID | missing / empty | non-empty string | n/a | HOLD / READY |
| Backend ID | unknown / absent | catalogued ID | n/a | HOLD / READY |
| Input hash | malformed / missing | 64 hex chars | valid 64 hex chars | HOLD / READY |
| Requirements | absent, empty, blank item | one non-empty ID | multiple IDs deduplicated | HOLD / READY |
| Wall-time limit | zero, negative, NaN, Infinity | smallest positive finite | larger positive finite | HOLD / READY |
| Memory limit | zero, negative, NaN, Infinity | smallest positive finite | larger positive finite | HOLD / READY |
| GPU count | negative / fractional | zero | positive integer | HOLD / READY |
| GPU memory cap | zero / negative / non-finite | smallest positive finite | larger positive finite | HOLD / READY |
| Tolerance | zero, negative, NaN, Infinity | smallest positive finite | larger positive finite | HOLD / READY |
| Domain / accelerator | incompatible with selected backend | supported capability | another supported capability | HOLD / READY |
| Execution mode | unsupported desktop/local mode | COLAB_HOSTED | EXTERNAL_HOSTED | HOLD / READY |
| Creation timestamp | invalid date | valid ISO timestamp | valid later timestamp | HOLD / READY |

## 4. Result validation matrix

| Result field / invariant | Negative test | Boundary test | Positive test | Expected behavior |
|---|---|---|---|---|
| Result schema | absent/wrong schema | exact schema ID | exact schema ID | HOLD / ACCEPTED |
| Plan/project/config/run/solver/backend identity | each independently tampered | exact match | exact match | HOLD / ACCEPTED |
| Execution state | RUNNING / missing | COMPLETED | COMPLETED | HOLD / ACCEPTED |
| Backend/runtime/device/precision | missing/empty | non-empty | populated | HOLD / ACCEPTED |
| Input hash | malformed or mismatch | exact plan hash | exact plan hash | HOLD / ACCEPTED |
| Output hash | malformed | 64 hex chars | 64 hex chars | HOLD / ACCEPTED |
| Timestamps | malformed or finish before start | start equals finish | finish after start | HOLD / ACCEPTED |
| Validation checks | absent, empty, duplicate, failed | one passing unique check | multiple passing unique checks | HOLD / ACCEPTED |
| Metrics | empty, NaN, +/-Infinity, string, null | finite zero | finite numeric values | HOLD / ACCEPTED |
| Validation error | missing, negative, non-finite | error equals tolerance | error below tolerance | HOLD / ACCEPTED |
| Validation error above limit | n/a | exact tolerance accepted | tolerance + epsilon | ACCEPTED / HOLD |
| Resource usage | missing, negative, non-finite, fractional GPU count | exactly at caps | below caps | HOLD / ACCEPTED |
| Resource overrun | n/a | cap equality | any amount above cap | ACCEPTED / HOLD |
| GPU memory telemetry | missing when GPU memory cap requested; invalid value | exactly at GPU memory cap | any amount above cap | HOLD / ACCEPTED / HOLD |
| Detached digest | missing, altered payload, wrong digest | exact SHA-256 | exact SHA-256 | HOLD / ACCEPTED |
| HIL/L5/physical claims | caller attempts to inject true | always false in draft | always false in draft | never promoted |

## 5. Notebook numerical matrix

| Case | Input | Expected | Tested |
|---|---|---|---|
| Grid lower bound below | `n=3` | ValueError | Yes |
| Grid lower bound on | `n=4` | 16x16 sparse matrix | Yes |
| Grid upper bound on | `n=512` | 262144x262144 sparse matrix | Yes, assembly only |
| Grid upper bound above | `n=513` | ValueError | Yes |
| Non-integer grid | `n=4.0` | ValueError | Yes |
| Boolean grid | `n=True` | ValueError | Yes |
| Matrix symmetry | 4x4 interior case | A = Aᵀ | Yes |
| Analytical solution | n=16,32,64 | error decreases | Yes |
| Convergence order | 16→32→64 | observed order > 1.7 | Yes |
| Residual | all reference grids | relative residual < 1e-9 | Yes |
| PyTorch stencil | n=32, CPU available | analytical error and residual within bounds | Yes on CPU; CUDA unverified |
| Numba JIT stencil | n=32, CPU available | analytical error and residual within bounds | Yes on CPU |
| Explicit backend selection | `pytorch` + `cpu` | result backend remains PyTorch | No silent substitution to SciPy | Yes |
| JAX stencil | n=32, JAX CPU available | analytical error and residual within bounds | Yes on CPU; GPU/TPU unverified |
| CuPy sparse CG | optional CUDA runtime | analytical error and residual within bounds | Not installed locally; CUDA solver unverified |
| PyAMG preconditioned CG | optional CPU runtime | analytical error and residual within bounds | Not installed locally; optional solver unverified |
| Taichi/Warp | optional CPU/GPU runtime | deterministic vector-kernel parity | Not installed locally; optional kernels unverified |
| ODE/mesh/rigid-body libraries | torchdiffeq, Diffrax, meshio, PyVista, PyBullet, MuJoCo | analytic ODE, mesh round-trip, finite rigid-body free-fall | Not installed locally; optional smoke paths unverified |
| Result envelope | exported run | schema, checks, hashes, resource data | Yes |
| Detached digest | exported JSON | SHA-256 recomputes | Yes |
| Result bundle | output directory | input/result/summary in ZIP | Yes |

## 6. Integration and regression matrix

| Invariant | Verification | Status |
|---|---|---|
| New module importable | Node ESM import | PASS |
| Module registry exposes new package | `REACHABLE` key and API assertions | PASS |
| Existing HIL core preserved | SHA-256 comparison against Iteration 49 archive | PASS (byte-for-byte unchanged) |
| Existing HIL adapter tests preserved | Re-run unchanged | PASS (26 assertions) |
| Canonical kernel unchanged | SHA-256 comparison to Iteration 48 baseline | PASS (byte-for-byte unchanged) |
| Acceptance script unchanged | SHA-256 comparison to Iteration 48 baseline | PASS (byte-for-byte unchanged) |
| Preservation audit | 38 baseline files compared against Iteration 47/48/49 archives | PASS (38/38) |
| Platform acceptance | `node tests/acceptance.mjs --no-browser --no-mutation` | ACCEPTED (55 PASS, 8 SKIP, 0 FAIL) |
| No mandatory runtime dependency | manifest `runtimeDependencies: []` | PASS |
| Notebook remains browser-hosted | no local runtime install prerequisite; Colab workflow documented | PASS |
| GPU acceleration actually exercised | requires hosted CUDA/TPU runtime | UNVERIFIED here |
| Live native solvers | requires pinned hosted runner and actual binaries | NOT EXECUTED |
| Browser UI link | actual repo slug and route are not in supplied handoff | NOT INTEGRATED; Grok action |
| Full mutation suite | not run in this iteration; the full acceptance invocation exceeded the execution window | UNVERIFIED |
| Real-browser Playwright A5 | explicitly skipped with `--no-browser`; Playwright browser execution not performed | UNVERIFIED |

## 7. Fault-injection and adversarial cases

The tests deliberately mutate each bound identity field, hashes, timestamps, solver status, metrics, validation result, resource usage and execution mode. They also attempt to smuggle HIL/L5/physical claims into a notebook result. Every mutation must either cause HOLD or be ignored by canonical evidence construction. A result with a bad digest cannot be accepted even if all numerical fields look valid.

## 8. Remaining coverage work

- Add GPU-backed CI jobs on actual NVIDIA CUDA and TPU runtimes.
- Add property-based fuzzing for JSON envelope shape, numeric ranges and nested payloads.
- Add mutation testing for the hosted-compute package and the overall repository.
- Add line/branch coverage reporting without modifying acceptance criteria.
- Add signed runtime identity and supply-chain attestation tests.
- Add real SU2/OpenFOAM/PETSc/FEniCSx/MFEM/Elmer benchmark suites when dedicated hosted runners are available.
- Add browser UI tests for Colab link launch and result import when the actual repo slug and UI route are integrated.
