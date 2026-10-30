# Simulation Engineering Analysis and Decision Record

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

**Package:** `ayeai-physical-ai-simulation-dropin` · **Version:** 3.1.0 · **Baseline:** Iteration 47  
**License:** GNU GPL v3.0 for package-authored materials. Third-party engines retain their own licenses.

## 1. Scope and source baseline

This document consolidates the engineering decisions and limitations carried across the preceding simulation build cycles. The authoritative platform constraints come from Iteration 47's `HANDOFF.md`, MRD, `Simulator`, scheduler, replay and telemetry components. The module remains a bounded drop-in. It must not alter the canonical kernel or acceptance script.

### Prior-cycle progression

| Cycle | Delivered | Defect or boundary identified | Decision carried forward |
|---|---|---|---|
| v2 native solver | Deterministic planar rigid-disc solver; angular state, frictional impulses, restitution, adaptive substeps, positional correction, diagnostics and samples | Geometry limited to uniform discs and horizontal floor; no articulated/mesh/deformable multiphysics; overclaim risk | Keep as transparent reference solver; state fidelity limits explicitly |
| v3 federation | Engine registry, fail-closed dispatch, Rapier 2D adapter, persistent Rapier session/component, JSON-RPC remote host contract, named engine profiles | Rapier API tests used deterministic doubles, not live runtime; other engines were profiles only; remote execution incompatible with synchronous per-tick `Simulator.step()` | Never equate profile with driver; no silent fallback; no async fake in sync loop |
| v3.1 browser/Colab hardening | Colab GPU qualification notebook, Warp and MuJoCo MJX research paths, evidence export, full analysis and test matrix, separate uncertainty package | Notebook execution does not automatically integrate external Python engines into browser runtime; GPU availability and driver compatibility vary | Separate research runtime from production adapter; Grok must implement reviewed host/worker bridge |

## 2. Platform spine invariants

1. Canonical platform model remains authoritative. Engine-native object graphs are ephemeral execution state only.
2. No changes to the kernel, Iteration 47 `Simulator`, scheduler, replay recorder, telemetry recorder or acceptance script are included in this package.
3. `UNKNOWN`, missing, invalid, timed-out, non-finite, unsupported, or mismatched execution outcomes never become `ALLOW` or `OK`.
4. An explicitly selected backend failure returns `HOLD`. No silent fallback to another numerical method.
5. Simulation evidence remains `SIMULATED`; it is not physical verification, calibration, certification, or safety assurance.
6. Every backend run must preserve canonical model identity/version, unit system, coordinate convention, solver configuration, engine and adapter versions, execution environment, and evidence provenance.
7. Iteration 47 `Simulator.step()` invokes component `step(ctx)` synchronously and does not await promises. Native remote/GPU engines cannot be inserted as async components without an explicit async execution design.

## 3. Numerical scope of native solver

The retained reference solver models planar uniform rigid discs with translational and rotational degrees of freedom, an optional infinite horizontal floor, gravity and applied forces/torques. It uses semi-implicit Euler integration, adaptive bounded substeps, accumulated sequential normal/tangential impulses, Coulomb friction, restitution thresholding, and iterative positional correction.

It is intentionally not represented as a general-purpose physics engine. Limitations include polygon/mesh collision, guaranteed continuous collision detection, articulated bilateral constraints, 3D geometry, deformable/FEM, fluids/CFD, thermal/electrical fields, calibrated constitutive material laws, sensor models, and sim-to-real validation.

## 4. External engine landscape and selection rationale

| Engine | Intended domain | Current package state | Next qualification requirement |
|---|---|---|---|
| Rapier 2D | Browser-compatible 2D rigid bodies and contacts | Direct adapter code; API-double tested; live WASM smoke pending | Pin exact package, run live numerical suite in browser and CI |
| MuJoCo | Articulated bodies, contacts, robotics, biomechanics | Remote host profile; MJX Colab research path | Host driver, model mapping, pinned engine, CPU/GPU comparison |
| Project Chrono | Multibody, vehicle, FEA, granular, FSI and sensor workflows | Remote host profile | Domain-specific module build, CUDA/HIP qualification, driver |
| ODE | Rigid-body joints and contact | Remote host profile | Native host, exact license/dependency review, numerical conformance |
| Bullet | Rigid-body dynamics and collision | Remote host profile | Native host, solver configuration and validation suite |
| PhysX | Real-time rigid body and collision, supported GPU features | Remote host profile | Exact release license check, GPU feature support and host driver |
| Jolt | Multicore real-time rigid body/collision | Remote host profile | Host driver, deterministic behavior and conformance |
| Drake | Robotics multibody, optimization and control | Remote host profile | Model mapping, solver/license review and host driver |
| DART | Generalized-coordinate articulated dynamics and contact | Remote host profile | Host driver and reference-case comparison |
| NVIDIA Warp | Custom GPU kernels for particles, FEM, fluids and geometry | Colab notebook research path only | Build domain solver, create host service, define canonical mapping |
| MuJoCo MJX | JAX/XLA articulated-body execution on GPU/TPU | Colab notebook research path only | Host service, batched model mapping and numerical qualification |

The catalog records status honestly. Warp and MJX are not direct JS/WASM adapters. The notebook demonstrates separate Python execution. Project Chrono has GPU-capable modules but requires an explicit CUDA/HIP build; that capability is not inferred from the generic host profile.

## 5. Browser-only execution architecture

The platform UI remains browser-native. Optional Python/GPU engines execute in a separate Colab or managed compute runtime. The browser should communicate with a managed asynchronous job service, not a notebook kernel directly in production.

Recommended production flow:

`Browser UI -> canonical request validator -> async job API -> isolated engine worker -> normalized result validator -> provenance/evidence store -> browser poll/stream`

The boundary must include authentication, authorization, origin allowlisting, payload-size quotas, rate limits, cancellation, deadlines, worker isolation, per-engine resource limits, version pinning, and auditable job identity. A Colab runtime is ephemeral and user-controlled; it is suitable for research, prototyping and qualification, not a trusted production service or long-lived always-on host.

## 6. GPU paths

### NVIDIA Warp

Warp compiles Python kernels to CPU or CUDA execution and offers primitives for physics, geometry, FEM and differentiable workflows. It is a building-block framework, not a turnkey replacement for every domain solver. The notebook uses a bounded particle-gravity/floor-clamp microbenchmark to prove device execution and finite-state behavior. That microbenchmark is explicitly not equivalent to the native rigid-disc contact solver.

### MuJoCo MJX

MJX offers JAX/XLA and Warp implementations for articulated MuJoCo simulation. The notebook builds a small pendulum model, steps it, and records the actual JAX device. The test is a runtime qualification sample, not a full contact validation suite. GPU execution depends on the selected Colab runtime, driver, package versions and XLA configuration.

### Project Chrono

Chrono's GPU modules include CUDA/HIP paths for GPU-based FSI-SPH and DEM. This requires compiling Chrono with a supported backend. It is not a Python `pip install` assumption and is not executed by the current notebook.

## 7. Backend parity and numerical evidence

Do not demand bitwise equality across engines. Contact formulations, friction approximations, stabilization, broadphase, collision margins, solver ordering, timestep and integrator differ. Define a problem-specific observable set and tolerance profile:

- position/trajectory error;
- impact and rebound velocity;
- angular velocity and torque response;
- momentum and energy balance where applicable;
- constraint residuals;
- maximum contact penetration and contact force;
- timestep/substep sensitivity and convergence;
- repeatability across identical pinned runtime configurations.

A backend cannot be marked qualified solely because it returns finite state. Include analytical checks, independently sourced reference cases, parameter sweeps, boundary cases and physical measurement comparisons where the use case requires them.

## 8. Reproducibility and supply chain

Pin exact versions of Python, engine, CUDA/ROCm, driver, JAX/XLA, Warp, OS image, adapter, compiler flags and model mapping. The current notebook pins `warp-lang==1.18.0`, `mujoco==3.17.0`, and `mujoco-mjx==3.17.0`; these are candidate pins and remain unqualified until the Colab notebook is executed successfully. Generate an SBOM, retain dependency notices, scan transitive dependencies, and review the exact license of the pinned release. Do not copy third-party binaries/source into this package. Colab notebook execution must export runtime metadata with evidence.

## 9. Explicit non-claims

This package does not claim: a universal 3D solver; industrial qualification; validated sim-to-real transfer; physical verification; certified safety behavior; direct integration of every catalog engine; live Rapier runtime qualification; GPU runtime qualification outside the notebook's own session; or production hosting from Colab.
