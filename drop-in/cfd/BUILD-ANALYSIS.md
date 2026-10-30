<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD Build Analysis and Consolidated Engineering Decisions

**Package:** `cfd-reference-and-backend-bridge`  
**Package version:** 1.3.0  
**Baseline:** Physical AI Platform Iteration 47 and the prior CFD 1.2.0 drop-in in this working build  
**Date:** 2026-10-30  
**Package licence:** GPL-3.0-only

## 1. Scope and evidence boundary

This document consolidates the CFD-specific analysis, recommendations and design decisions carried through the available Iteration 47/CFD build material. The supplied working tree contained Iteration 47, the previous CFD package and the current handoff. It did not contain two additional independent historical CFD archives. Accordingly, this is a traceable consolidation of the available build cycles and retained decisions, not a claim that unavailable source archives were exhaustively diffed.

The existing native solver remains a 1D, steady, fully developed, incompressible, constant-property, Newtonian, laminar plane-channel Couette-Poiseuille reference. It is analytically checkable and dependency-free. It is not generalized into an unverified 2D/3D Navier-Stokes implementation. This boundary is deliberate: solver breadth without conservation, convergence, mesh and benchmark verification would be a regression in engineering integrity.

## 2. Carried-forward findings

1. Iteration 47 introduced ten isolated drop-in engineering package boundaries but did not register them in the platform runtime. A folder under `drop-in/` is not, by itself, an integrated capability.
2. The prior CFD placeholder was replaced by a real tridiagonal finite-volume solution for one bounded analytical problem.
3. The CFD result must remain `SIMULATED_NOT_PHYSICALLY_VALIDATED`; a small algebraic residual is not physical validation.
4. The old Iteration 47 conformance fixture encoded placeholder behavior and required a narrowly scoped fixture correction. The canonical kernel and platform acceptance script remain untouched.
5. External open-source solvers should be usable through replaceable adapters. They must not be copied into this package or become canonical stores.
6. The browser is the user-facing environment. Heavy external solver execution is delegated to an explicitly selected Colab runtime, remote compute service or authorized agent. Browser JavaScript/WASM remains the light-weight reference path.
7. GPU availability and useful GPU acceleration are separate facts. A GPU runtime does not mean an arbitrary CFD executable uses the GPU. Accelerator support must be established for the exact solver release, build, model and device.

## 3. Why external backends are now part of the design

A single in-house module should not reimplement decades of validated numerical methods. The platform should make mature libraries available through a common job/result contract, while preserving provenance and the ability to replace each backend.

### Initial candidate catalogue

| Backend | Candidate use | Current package status | Important constraint |
|---|---|---|---|
| OpenFOAM (OpenCFD distribution) | General finite-volume CFD; incompressible/compressible, turbulence, heat and multiphase workflows | Catalogued only | Pin distribution and release. Do not infer general GPU support from selected GPU infrastructure or offload features. GPL-3.0. |
| SU2 | Aerodynamics, compressible/incompressible flow, adjoint and design optimization | Catalogued only | Serial binary and MPI-enabled build are not equivalent. GPU support is not assumed. LGPL-2.1. |
| Code_Saturne | General finite-volume CFD, turbulence, heat transfer, combustion and multiphase workflows | Catalogued only | CUDA requires an explicit compatible build and NVIDIA SDK/dependencies; stock Colab GPU is not sufficient evidence. GPL-2.0-or-later. |
| PETSc | Sparse linear algebra, Krylov solvers and preconditioning used by scientific solvers | Candidate dependency, not a standalone CFD solver | Adapter must expose solver/preconditioner settings and convergence histories. |
| Gmsh | Mesh generation and conversion | Candidate mesh backend | Mesh quality and physical-group mappings must be checked before solver submission. |
| ParaView/VTK | Result visualization and post-processing | Candidate visualization backend | Visualization does not validate numerical correctness. |

No third-party binary or source is bundled. Licence compatibility, redistribution and attribution must be reviewed for each pinned release and distribution channel.

## 4. Browser-only execution model

The browser owns interaction, canonical model selection, job definition, status, visualization and review. It does not silently execute arbitrary native solver binaries. A browser workflow may:

- run the bounded JavaScript reference solver directly;
- run suitable numerical kernels through WebAssembly/WebGPU where a compatible implementation exists;
- create a notebook launch link for Colab;
- submit a signed/authorized job to a separately governed remote service or local agent;
- import result artifacts and provenance through a controlled adapter.

Google Colab is an optional execution environment, not the canonical project database. Notebooks are versioned `.ipynb` source artifacts in the repository. The Colab URL must point to a committed immutable path. The platform must not assume Colab quotas, GPU models, runtime lifetime or accelerator availability.

## 5. GPU strategy

The notebook distinguishes three classes:

1. **Solver-native GPU:** only when the selected solver release, build options, numerical method and device explicitly support the requested case. Code_Saturne documents an explicit CUDA build path; this is not an out-of-box Colab guarantee.
2. **GPU-accelerated research around CFD:** parameter sweeps, surrogate training, optimization, sensitivity analysis, uncertainty propagation and selected post-processing can use CuPy/JAX/PyTorch when available.
3. **CPU fallback:** identical mathematical definition, logged backend and reproducible result contract. CPU fallback must not be misreported as GPU execution.

The included notebook exercises a batched analytical parameter sweep on CuPy when a CUDA device is detected. It also has an explicit opt-in, version-pinned OpenFOAM v2606 installation path using the official Debian/Ubuntu repository helper, plus an optional bounded `pitzDaily`/`simpleFoam` smoke run. Both are disabled by default and are not claimed as executed in this build. It does not claim that CuPy or OpenFOAM GPU infrastructure is a GPU Navier-Stokes solver.

## 6. New package boundary

A separate sibling package, `extensions/scientific-backend-orchestration/`, has been added. It is not embedded in the CFD solver module. Its purpose is generic provider discovery and execution-envelope governance for future scientific domains.

It does not own the canonical graph, create a parallel ontology, make network calls, dynamically load code or promote evidence. The host injects adapters. Jobs must carry canonical subject references and a configuration reference. Successful adapter execution is returned as `EXECUTED_UNVERIFIED` with an unverified simulation evidence proposal.

The CFD-specific `integration/backend-job.js` only maps a CFD request into that generic envelope. It refuses 1D/4D jobs in this external 2D/3D bridge, missing graph bindings, missing inputs and unsupported execution modes.

## 7. Colab notebook deliverable

`notebooks/CFD_Backend_Colab.ipynb` includes:

- copyright, trademark, author and licence metadata;
- stable notebook ID and version;
- Colab runtime and accelerator discovery;
- analytical channel-flow verification;
- optional CuPy GPU parameter sweep with CPU fallback;
- discovery of OpenFOAM, SU2 and Code_Saturne executables;
- explicit warnings that discovery is not execution or integration;
- a run manifest with runtime, accelerator, benchmark, trust state and checksums;
- exact instructions for importing results through the platform evidence boundary.

The notebook's Open-in-Colab link is intentionally a template until Grok commits the notebook to the authoritative repository. An invented owner/repository/commit would be a false link. `notebooks/README.md` explains the exact publication procedure.

## 8. Integration state model

The following states are distinct and must remain distinct:

- `CATALOGUED`: backend and licence information recorded.
- `INSTALLED`: exact binary/build is present in a controlled runtime.
- `DISCOVERED`: adapter probe confirms the requested capability is available.
- `ADAPTER_IMPLEMENTED`: input/output mapping, process control and diagnostics implemented.
- `EXECUTION_TESTED`: solver invoked successfully on a declared case.
- `BENCHMARK_VERIFIED`: outputs compared against independent benchmark/reference within stated tolerances.
- `PLATFORM_INTEGRATED`: registered, reachable from workflow, graph-bound and regression-tested.
- `PHYSICALLY_VALIDATED`: correlated with applicable physical measurements and uncertainty.

This package only catalogs candidate engines and supplies generic adapter contracts. It does not claim any external solver reached `EXECUTION_TESTED` or beyond.

## 9. Retained and improved low-hanging features

- A backend catalogue with exact official source and licence references.
- A Colab notebook with CPU/GPU detection and a real analytical calculation.
- A GPU-accelerated batched parameter sweep when CuPy and a compatible CUDA runtime are available.
- A generic backend registry that validates manifests, adapter interface, physics/dimensionality, execution modes and canonical bindings.
- No dynamic code loading, network I/O or evidence auto-promotion in the generic registry.
- A CFD-to-generic-job adapter.
- Notebook structural tests and backend contract tests.
- Machine-readable manifests and a change manifest.
- Detailed Grok stitch instructions and test matrix.

## 10. What remains out of scope

This build does not implement a 2D/3D CFD solver, turbulence closure, compressible flow, transient pressure-velocity coupling, multiphase transport, heat/species transport, mesh adaptation, FSI, MPI decomposition, solver-native GPU kernels, an OpenFOAM/SU2/Code_Saturne executable adapter, Colab-to-platform network transport, or physical validation. Each requires a separate engineering work package and benchmarks. The generic orchestration package is an interface and governance substrate, not a substitute for those solvers.

## 11. Source-derived facts vs design inference

- **Source-derived:** Iteration 47 handoff lists ten drop-in modules and states that the kernel and acceptance script were not changed. The CFD 1.2.0 code and documentation define the bounded channel model and test scope.
- **Research-derived:** official project documentation establishes release, installation, capability and licensing facts referenced in `MARKET-COMPARISON.md`.
- **Design decisions:** backend registry, Colab manifest, trust states and adapter lifecycle are this package's implementation decisions, not claims made by the third-party projects.
