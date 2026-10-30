# Simulation backend market position - Iteration 47 package v3.0.0

## Executive assessment

The package is now an engine-federation foundation, not a claim to replace mature physics engines. It retains a small native planar reference solver, provides a direct Rapier 2D adapter, and defines a validated remote execution protocol for native engines. The strongest strategic design choice is that canonical model, provenance, replay and evidence remain platform-owned while physics execution is replaceable.

The package is **not** a state-of-the-art general-purpose physics engine. It is a bounded simulation subsystem with a path to reuse established engines. Only Rapier's adapter is implemented directly; MuJoCo, Chrono, ODE, Bullet, PhysX, Jolt, Drake and DART are named remote-host profiles. They require host drivers and engine-specific conformance tests before runtime availability can be claimed. The current remote interface executes asynchronous batch jobs; it is not a synchronous per-tick integration into Iteration 47's current Simulator.

## Comparable systems

| Engine | Strong domains | Integration in this package | Position |
|---|---|---|---|
| Rapier | 2D/3D rigid bodies, joints, collision events, WASM and deterministic options | Direct Rapier 2D adapter and persistent platform session | The only external engine with a direct adapter in this drop-in; live WASM test pending |
| MuJoCo | Articulated multibody dynamics, contact, robotics, biomechanics and control | JSON-RPC host profile | Strong candidate for articulated robot and contact-control tasks |
| Project Chrono | Multibody, FEA, vehicles, granular, FSI, sensors and parallel modules | JSON-RPC host profile | Broadest multiphysics/engineering candidate in this profile set |
| ODE | Rigid-body dynamics, joints and frictional contact | JSON-RPC host profile | Mature alternative for rigid-body/joint workloads |
| Bullet | Collision detection and rigid-body simulation, robotics and ML ecosystems | JSON-RPC host profile | Broad ecosystem; host and exact version must be pinned |
| PhysX | Real-time 3D rigid-body/collision with CPU/GPU options | JSON-RPC host profile | Candidate for real-time 3D and GPU-capable deployments |
| Jolt | Multicore rigid-body and collision | JSON-RPC host profile | Candidate for multicore real-time scenes |
| Drake | Robotics multibody dynamics, optimization and control | JSON-RPC host profile | Candidate when simulation is coupled to optimization and trajectory analysis |
| DART | Generalized-coordinate articulated dynamics, Featherstone ABA and LCP contact | JSON-RPC host profile | Candidate for articulated robotics and contact mechanics |
| Drake | Robotics multibody dynamics, optimization and control | JSON-RPC host profile | Candidate when simulation is coupled to optimization and trajectory analysis |
| DART | Generalized-coordinate articulated dynamics, Featherstone ABA and LCP contact | JSON-RPC host profile | Candidate for articulated robotics and contact mechanics |

## Why federation instead of reimplementing everything

A new solver must earn trust against analytical solutions, reference implementations, convergence studies, experimental data and domain-specific validation. Reimplementing every collision pipeline, constraint solver, integrator, contact law and multiphysics method would create a large maintenance burden and a weaker evidence base. An adapter boundary allows the platform to exploit mature algorithms while preserving canonical semantics and supplier replaceability.

The federation must not imply numerical equivalence. Engines differ in contact formulations, friction approximations, constraint stabilization, collision margins, CCD, integration schemes, solver ordering and defaults. Comparisons must use physical observables and explicit tolerance profiles.

## Open-source references and licensing

- Rapier official docs describe 2D/3D engines, JavaScript/WASM bindings, collision, joints and Apache 2.0 licensing: https://rapier.rs/docs/ and https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- MuJoCo documentation describes its multibody-with-contact purpose and MJCF/URDF model interface: https://mujoco.readthedocs.io/en/stable/overview.html
- Project Chrono describes multibody, FEA, vehicle, granular, FSI and sensors; its project site identifies BSD-3-Clause licensing: https://www.projectchrono.org/
- ODE's upstream repository documents rigid-body dynamics, joints, frictional contact and dual BSD/LGPL licensing: https://github.com/odedevs/ode
- Bullet's upstream repository documents real-time collision and multiphysics simulation and zlib licensing: https://github.com/bulletphysics/bullet3
- NVIDIA PhysX upstream repository documents PhysX SDK 5 and current Apache 2.0 licensing; verify the exact release and bundled subcomponents: https://github.com/NVIDIA-Omniverse/PhysX
- Jolt's upstream repository documents multicore rigid-body physics and MIT licensing: https://github.com/jrouwe/JoltPhysics

The catalog license labels are an initial per-project reference, not legal advice. Exact release, subdirectory, bundled component, binary distribution and transitive dependency licenses must be reviewed before distribution. Generate an SBOM and retain notices.

## Current parity assessment

| Dimension | Package v3.0.0 |
|---|---|
| Canonical-model/engine separation | Implemented at adapter boundary |
| Native planar reference solver | Implemented and tested |
| Direct external engine adapter | Rapier 2D implemented; live runtime not tested in this environment |
| Persistent synchronous platform stepping | Rapier session factory implemented and test-double integrated with Iteration 47 Simulator |
| Native engine host protocol | Implemented and tested with protocol doubles |
| Named external engine profiles | MuJoCo, Chrono, ODE, Bullet, PhysX, Jolt |
| Actual native host drivers | Not included |
| 3D/articulated/FEM/CFD/FSI in this package | Not implemented by package-native code; use the relevant external engine host when delivered |
| Physical calibration / sim-to-real | Not performed |
| Industrial/safety qualification | Not claimed |

## Recommended adoption sequence

1. Pin and live-test Rapier 2D in CI, including actual WASM init, gravity, impact, restitution, friction, floor, disposal and repeatability envelope.
2. Implement MuJoCo host for articulated robot models and validate against MuJoCo's own test assets plus analytical/reference trajectories.
3. Implement Project Chrono host for vehicle/multibody and relevant FEA/FSI workloads.
4. Add ODE/Bullet/PhysX/Jolt hosts only where they provide a measurable capability or deployment advantage.
5. Create a backend capability resolver that refuses unsupported requested physics rather than silently degrading.
6. Build cross-engine validation cases with observable/tolerance profiles and archive engine build provenance.

## Verdict

The package now has the right extensibility architecture to reuse established open-source engines. It does not yet have all those engines wired and qualified. The direct Rapier 2D adapter is test-double verified but not live-runtime verified here; all other named engines require host implementations. This is an honest, stitchable step toward an industry-grade federated simulation subsystem, not a claim that the destination has already been reached.
