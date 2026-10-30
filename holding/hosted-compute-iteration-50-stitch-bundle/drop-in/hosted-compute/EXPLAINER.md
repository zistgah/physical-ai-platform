# Hosted Compute and Solver Interoperability

**Physical AI Platform - Iteration 50**  
**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.**  
**AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.**  
**SPDX-License-Identifier: GPL-3.0-only**

## 1. Purpose and boundary

This is a new eleventh drop-in package, separate from `drop-in/hil`. It adds a browser-first path for using mature numerical libraries and GPU-capable runtimes without installing solver software on the user's computer. The static platform remains the control plane. A Google Colab or compatible hosted Jupyter notebook is an optional execution plane. Results are returned as explicit, hash-bearing artifacts and validated before they can be mapped to canonical platform evidence.

This module is deliberately not a solver implementation and not a notebook execution service. It does not execute Python, install packages, provision a GPU, or call remote APIs. It creates an execution plan and validates the result envelope returned by the notebook or a dedicated hosted runner. The notebook demonstrates a real, analytical numerical case and includes executable SciPy, PyTorch, JAX and Numba paths, plus optional CuPy sparse CG, PyAMG, Taichi, Warp, ODE, mesh and rigid-body adapters.

The platform owns:

- project and configuration identity;
- solver and backend selection intent;
- requirements and execution limits;
- result schema, integrity checks and evidence boundary;
- canonical integration and provenance.

External libraries own their algorithms and runtime-specific implementation. Their own licences and compatibility obligations remain in force.

## 2. Why this package is separate from HIL

HIL backends are communication transports for real devices and buses (ROSbridge, MQTT, OPC UA, Modbus, SocketCAN). Numerical backends solve equations or simulate a plant. Conflating them would incorrectly treat a solver runtime as a physical bus, or a successful notebook run as physical verification.

The new package emits only `method: SIMULATION`, `fidelity: UNVERIFIED`. It hard-codes `hil`, `l5`, `physicalVerification` and `industrialQualification` claims to false in the evidence draft. It cannot promote HIL evidence or bypass the existing attestation gate.

## 3. Backend ecosystem catalogue

The catalog is a discovery map, not an assertion that every upstream is installed or that every package runs in Colab without work.

| Domain | Libraries | Role | Hosted-runtime fit |
|---|---|---|---|
| Reference numerics | NumPy, SciPy | arrays, sparse matrices, Krylov methods, optimization, ODEs, FFT | Native in many notebook images or pip |
| Tensor / GPU / autodiff | PyTorch, JAX/XLA, CuPy | tensor execution, automatic differentiation, CUDA arrays, compiled kernels | PyTorch/JAX often present; CuPy requires CUDA-compatible wheel and driver |
| Custom GPU physics | Taichi, NVIDIA Warp, Numba | particle/PDE kernels, differentiable simulation, JIT kernels | Optional pip wheels; verify actual device and supported architecture |
| Sparse / FEM | PETSc/petsc4py, FEniCSx, MFEM, scikit-fem, PyAMG | Krylov solvers, multigrid, finite-element assembly and preconditioning | scikit-fem/PyAMG pip-friendly; PETSc/FEniCSx/MFEM often need native/MPI builds |
| CFD / multiphysics | SU2, OpenFOAM, Elmer FEM | finite-volume/finite-element PDE solvers, CFD, coupled physics | Usually binary/container/native-build runner, not guaranteed Colab pip install |
| Rigid/multibody | PyBullet, MuJoCo, Project Chrono | robotics dynamics, contact, multibody, vehicle and FEA workflows | Python wheels for some; native builds and domain validation for others |
| Time integration | torchdiffeq, Diffrax | differentiable ODE/SDE integration | pip-friendly; accelerator follows PyTorch/JAX installation |
| Mesh / post-processing | meshio, PyVista | mesh interchange, inspection and visualization | pip-friendly; format metadata and rendering support vary |

Catalog records carry project URLs, expected upstream licence labels, domains, accelerators and installation profile hints. Upstream licences, versions, API surfaces and transitive dependencies must be rechecked at integration time. The platform does not vendor these libraries and declares zero mandatory runtime dependencies.

## 4. API

### `listComputeBackends(filters = {})`

Returns cloned catalog entries. Optional filters: `domain`, `accelerator`, `hostedFit`. It never installs or probes an upstream. Runtime discovery is performed by the notebook after connecting to the hosted runtime.

### `createComputePlan(input)`

Returns `{status, diagnostics, plan}`. Missing project/configuration/solver/run IDs, unknown backend, malformed SHA-256 input hash, absent requirement IDs, invalid limits, non-positive tolerance, unsupported execution mode or backend-domain/accelerator mismatch returns `HOLD` and `plan: null`.

The plan includes project/configuration/run identity, solver/backend IDs, requirements, resource caps, tolerance, input hash, execution mode and policy flags. Defaults are conservative, but production integration should bind these values to canonical project/configuration records rather than accepting notebook-authored values.

### `verifyComputeResultDigest(result)`

Uses Web Crypto (`crypto.subtle`) to verify SHA-256 over `result.digestPayload`. The parsed digest payload must equal the result envelope after removing `digestPayload` and `resultDigest`. Returns false if Web Crypto is unavailable, the payload is malformed, the envelope was modified, or the digest differs.

### `validateComputeResult(result, plan, {digestVerified})`

Synchronous validator. The caller may set `digestVerified: true` only after independently verifying the detached digest. For browser/async integration prefer `validateComputeResultAsync`.

It checks schema, plan/project/configuration/run/solver/backend binding, completion state, runtime/device/precision, input/output hashes, timestamps, non-empty unique passing checks, finite metrics, validation method/error/tolerance, resource accounting (including optional GPU-memory caps), execution mode and digest verification. Missing/invalid state returns `HOLD` and no evidence draft.

### `validateComputeResultAsync(result, plan)`

Verifies the digest and then performs the full validator. This is the recommended browser path.

### `toCanonicalEvidenceDraft(result, plan, options)`

Alias for validated conversion. It does not write to the kernel. Grok must pass the accepted draft through the existing canonical Artifact/Evidence binding API and preserve the current evidence/provenance model. No duplicate graph or ontology is introduced.

## 5. Numerical notebook benchmark

`notebooks/PAP_Hosted_Compute_Backends.ipynb` solves the manufactured-solution Poisson problem on a unit square:

\[
-\nabla^2 u = 2\pi^2\sin(\pi x)\sin(\pi y),\quad u|_{\partial\Omega}=0,
\]

with exact solution `u = sin(pi*x) sin(pi*y)`. It assembles the five-point finite-difference operator, solves with SciPy CG, and checks analytical error, residual and second-order grid refinement. It then applies the same stencil matrix-free using PyTorch, JAX and Numba, with actual device probing. Optional adapters include CuPy sparse CG, PyAMG-preconditioned CG, Taichi/Warp kernel parity, torchdiffeq/Diffrax ODE checks, meshio/PyVista mesh checks and PyBullet/MuJoCo rigid-body smoke simulations. The local acceptance execution produced:

- relative L2 errors: 0.00285077, 0.00075559, 0.00019469 for 16, 32 and 64 interior nodes;
- observed refinement orders: 1.9157 and 1.9564;
- maximum SciPy relative residual: 1.25e-13;
- PyTorch CPU, JAX CPU and Numba JIT CPU parity checks passed;
- no CUDA GPU was available in the local validation environment, so CUDA/TPU execution remains unverified. CuPy, PyAMG, Taichi, Warp, Diffrax, torchdiffeq, meshio, PyVista, PyBullet and MuJoCo were not installed locally.

The benchmark is a verified test case for this discrete Poisson problem. It does not validate general CFD, turbulence, compressibility, contact, nonlinear material models, mesh quality or multiphysics coupling.

## 6. Browser-only / Colab operating model

1. The user opens the static platform in a browser.
2. The workbench presents a notebook link and a canonical project/configuration-bound compute plan.
3. The user opens the `.ipynb` in Google Colab. Select a GPU/TPU runtime only when needed.
4. The notebook probes actual libraries, versions, devices and precision. It must not assume requested accelerator availability.
5. It runs the numerical case and writes input, output summary and result envelope artifacts.
6. The user downloads the result bundle through the browser.
7. The platform validates the detached digest and result contract before canonical evidence import.

No local Python, CUDA toolkit, Docker, office suite or local solver install is required for the browser/Colab path. Native solvers such as OpenFOAM, SU2, PETSc, MFEM or Elmer may require a separately managed hosted runner with pinned images and system libraries. The browser remains the control plane; runner lifecycle and data transfer are replaceable adapters.

Colab resources are not guaranteed. GPU type, availability, quotas, idle timeout and VM lifetime vary. Runtime termination can destroy unpersisted files. The notebook writes downloadable artifacts and must not rely on an ephemeral VM as the canonical store.

## 7. Integrity and evidence rules

- Input SHA-256 binds the numerical case definition and canonical identifiers.
- Output SHA-256 binds the exported output summary.
- Detached result SHA-256 protects the full result envelope during transfer.
- The digest is integrity, not identity, authorship or trusted attestation.
- A passing result is a simulation execution record, not physical evidence.
- The platform must retain the original input/output artifacts and runtime manifest for reproducibility.
- Unknown resource use is not zero. Missing peak memory causes HOLD under the current contract.
- The notebook cannot create or sign L5 evidence.

## 8. Dependencies and licences

Core JavaScript package: no runtime dependencies. Notebook baseline: Python, NumPy and SciPy; PyTorch/JAX/Numba are probed, while CuPy, PyAMG, Taichi, Warp, torchdiffeq, Diffrax, meshio, PyVista, PyBullet and MuJoCo are optional and can be explicitly activated in the notebook. Colab often includes PyTorch and JAX, but the notebook probes rather than assumes this. The package catalog includes upstream licence labels as integration metadata. Verify the exact release, dependencies, bundled assets and redistribution obligations before packaging an upstream binary or wheel. GPL-3.0-only governs this package's original source and does not erase third-party licence obligations.

## 9. Test commands

```bash
node drop-in/hosted-compute/test.mjs
node drop-in/hosted-compute/integration.mjs
node tools/conformance-test-hosted-compute-iter50.mjs
python notebooks/test_notebook.py
```

The notebook test executes the notebook end-to-end when `nbclient` is installed, including explicit SciPy, PyTorch CPU and Numba CPU selection. It checks the notebook metadata and Python syntax, solves the numerical problem, produces the output bundle and validates the detached digest.

## 10. Open engineering work

The package-level plan/result/evidence contract is complete for this iteration. The following require later bounded work and must not be represented as done:

- CUDA/TPU hardware execution in a real Colab account and accelerator-specific numerical comparison;
- signed runner identity, attested image digest and provenance trust chain;
- separate host/device memory budgets and robust GPU utilization/timing telemetry;
- real solver adapters for PETSc, FEniCSx, MFEM, SU2, OpenFOAM and Elmer with validated benchmark suites;
- solver-specific mesh, units, coordinate-frame, boundary-condition and material schemas;
- long-running/MPI/multi-GPU jobs through a managed hosted runner;
- artifact import UI and canonical graph persistence workflow;
- mutation testing and full browser UI test coverage.

These are physical/runtime or next-package integration tasks, not defects concealed by the current notebook benchmark.
