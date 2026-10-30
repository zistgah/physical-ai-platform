# Open numerical and engineering backend ecosystem

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Objective

The prototyping package must not reimplement every mature geometry kernel, mesh generator, CFD solver, finite-element solver, circuit simulator, or multibody solver. It provides a stable orchestration boundary so mature, independently maintained numerical engines can be used as replaceable execution backends while the platform retains ownership of the canonical model, requirements, configuration, provenance, evidence, and lifecycle authority.

The adapter boundary is intentionally out-of-process (`WORKER_RPC`). A worker can run an engine in a pinned container, VM, HPC queue, or dedicated service. The browser-facing platform does not execute shell commands and does not link proprietary or copyleft libraries into the canonical kernel. A deployment can use an online worker service or a locally operated worker, subject to the deployment's security and sovereignty policy.

## Backend coverage catalogue

| Domain | Backend candidates | Capability coverage | License note |
|---|---|---|---|
| Geometry/B-rep | Open CASCADE Technology | B-rep/NURBS operations, booleans, tessellation, geometry validation | LGPL-2.1 with OCCT exception; satisfy notices/source obligations |
| Meshing | Gmsh | 2D/3D mesh generation, refinement, conversion | GPL family with linking exception; inspect selected release |
| CFD | OpenFOAM | Steady/transient, multiphase and conjugate heat-transfer workflows | GPL-3; keep as separate worker process |
| Multiphysics FEM | Elmer FEM | Structural, fluid, thermal, electromagnetic, acoustic and coupled PDEs | GPL modules plus LGPL solver-library components |
| Structural FEM | Code_Aster | Static/nonlinear, modal, thermal, contact, fatigue workflows | GPL family; package dependency inventory required |
| Structural FEM | CalculiX | Linear/nonlinear finite-element workflows, modal, thermal and contact analyses | GPL-2 for the solver distribution; inspect bundled pre/post tools separately |
| Circuit | ngspice | DC, AC, transient and noise analyses | Modified BSD base with file-level exceptions; use its COPYING inventory |
| Circuit | Xyce | DC, AC, transient, sensitivity and parallel circuit analysis | GPL-3-or-later |
| Multibody/contact | Project Chrono | Rigid/flexible bodies, contact, vehicle, granular and FSI modules | BSD-3-Clause; optional module dependencies vary |
| Multibody/aeroelastic | MBDyn | Nonlinear multidisciplinary multibody and aeroelastic analysis | GPL-2 family |
| Robotics/contact | MuJoCo | Multi-joint dynamics, contact and control rollouts | Apache-2.0 |
| General numerical methods | SciPy | ODE integration, optimization, interpolation, sparse/dense linear algebra | BSD-3-Clause with bundled-component notices |

The machine-readable source of truth is `backend-registry.js`; `backend-catalog.json` is its generated snapshot. `backend-driver-profiles.json` describes the worker-facing input/output profile and allowlisted engine entrypoint or adapter plugin. The catalogue is extensible; it is not a claim that these are the only useful engines.

## Why this architecture matters

1. **Use proven algorithms instead of rewriting them.** Mature engines keep their own numerical methods, solvers, meshing, device models and convergence machinery.
2. **Keep the platform's semantics sovereign.** External engines receive a typed job and artifact references. Their private object models do not become the canonical ontology.
3. **Keep replacement practical.** A backend is selected by domain, operation, input format and explicit preference. No silent fallback is allowed.
4. **Preserve reproducibility.** Every run records backend ID/version, adapter version, input digest, output digest, worker run ID, environment fingerprint, timestamps, and an independently validated benchmark report digest.
5. **Prevent false evidence.** A solver exit code is not validation. A separate benchmark validator must return `VERIFIED` before a simulation evidence candidate can be constructed.
6. **Respect licensing.** Engines are not copied into this package. The selected distribution, transitive dependencies, binary redistribution and network-service model require a license inventory before deployment.

## Execution contract

`createBackendAdapter()` receives two injected interfaces:

- `transport.execute(envelope)`: trusted worker/RPC transport. It stages approved artifacts, invokes an allowlisted engine profile and returns a structured response. It must enforce timeout, memory/CPU quota, filesystem isolation, network policy and cancellation.
- `validator({manifest, request, response})`: independent numerical acceptance logic. It compares solver outputs with an analytical solution, verified reference dataset, mesh-quality criterion, convergence criterion or project-specific acceptance profile. It returns `VERIFIED`, `HOLD`, or `FAIL` plus a benchmark ID and SHA-256 report digest.

The adapter never accepts arbitrary command strings, executable paths, shell fragments or argv from user input. Worker images own their allowlists. `solverOptions` are JSON-only, finite, cycle-free and reject executable-looking keys. The host must pin engine versions and retain the worker image digest.

## Numerical benchmark profiles included

| Profile | Backends | Reference criterion | What it validates |
|---|---|---|---|
| `rc-lowpass-step-tau` | SciPy, ngspice, Xyce | At t=RC, Vout/Vstep = 1 - exp(-1) = 0.6321205588; absolute tolerance 0.005 V for a 1 V step | Transient integration and circuit response |
| `calculix-cantilever-small-deflection` | CalculiX, Code_Aster, Elmer | Euler-Bernoulli beam; 1 m span, 200 GPa, 20 x 10 mm section, 10 N tip load; 0.01 m tip deflection, 0.0001 m tolerance | Linear structural response in small-deflection regime |
| `chrono-mujoco-simple-pendulum` | Chrono, MuJoCo, MBDyn | Small-angle period 2.0064092926 s for 1 m pendulum and g=9.80665 m/s²; 0.02 s tolerance | Multibody integration and timing |
| `occt-box-intersection-volume` | Open CASCADE | Unit-volume intersection of overlapping axis-aligned boxes; 1 m³ | Boolean geometry volume |
| `gmsh-mesh-quality-minimum` | Gmsh | Positive minimum Jacobian and maximum aspect ratio ≤20 | Basic mesh validity; project-specific quality checks still required |
| `openfoam-lid-driven-cavity-re100` | OpenFOAM, Elmer | Residual ≤1e-6 and mass imbalance ≤1e-8 | Necessary numerical checks only; not full-field benchmark validation |

These profiles are intentionally bounded. For example, a residual threshold alone does not validate an entire CFD velocity field. Production profiles should add reference probe values, integral conservation, mesh/time-step refinement, and comparison tolerances from a recognized benchmark dataset.

## Real execution included

`workers/scipy_reference_worker.py` is a real, narrow SciPy worker for a first-order RC step response. It uses `scipy.integrate.solve_ivp` (RK45), computes the response at one time constant, returns a structured worker response and SHA-256 digests. `backend-test.mjs` invokes it as a subprocess, then runs the actual adapter, SHA-256 benchmark validator, evidence-candidate builder and `prototype()` evaluator. The environment used for this package had SciPy 1.17.0 installed; the end-to-end numerical response was executed, not mocked.

This worker is a reference integration for the general numerical library. It is not a replacement for ngspice or Xyce. The other listed engine binaries were not installed in the verification environment; their integration contracts and worker profiles are prepared, but their numerical execution is not claimed as tested here.

## Operational requirements for deployment

- Pin engine release, worker image digest, OS/architecture and solver configuration.
- Record all transitive solver libraries and license texts; ngspice, Elmer, Code_Aster and CAD distributions have component-level license nuance.
- Stage artifacts by immutable content digest; never resolve mutable URLs during a run.
- Enforce CPU, memory, wall-clock, disk, output-size and concurrency quotas.
- Disable outbound network by default; permit only declared artifact storage and approved license/update endpoints.
- Treat solver logs as untrusted data; sanitize before rendering.
- Persist complete input decks, solver logs, stdout/stderr, output files, mesh, model, convergence history and validation report.
- Use a cryptographic digest provider and signed worker attestations in the host evidence subsystem. A digest alone is not a signature or a tamper-proof audit log.
- Do not promote simulation to HIL or physical evidence. Do not infer safety or certification from a benchmark pass.

## Extension procedure

1. Add a reviewed backend record to `backend-registry.js`.
2. Add its worker profile to `backend-driver-profiles.json`.
3. Add an operation-specific request and response schema where needed.
4. Add at least one published or analytical benchmark profile and a validator.
5. Implement the worker-side adapter outside the browser-facing application. Use a process/container boundary unless a library's ABI and license review explicitly support another integration.
6. Add positive, negative, malformed-output, timeout, deterministic replay, version mismatch, benchmark tolerance and regression tests.
7. Add an end-to-end test from job request through worker output, validator, evidence candidate, canonical graph binding and G4 evaluation.
8. Do not mark the backend `QUALIFIED` until its actual engine binary/version is exercised against the benchmark suite and an independent engineering review approves the validation basis.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
