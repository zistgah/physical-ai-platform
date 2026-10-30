# Simulation backend federation

## Design decision

The platform owns the canonical system model and the engine-neutral execution contract. Solver engines are replaceable adapters. Engine-native object graphs, identifiers, units, contact models, mesh formats and result files are not canonical state. Adapters translate canonical input into an engine-specific representation and translate results back with explicit provenance and fidelity.

The simulation package now has three execution paths:

1. `native-disc`: existing deterministic planar disc solver; synchronous and backwards-compatible.
2. `rapier2d`: official Rapier 2D WASM adapter; optional package dependency. `simStepWithBackend()` runs a bounded batch. `createRapierSimulationComponent()` pre-initializes WASM and provides a persistent world with synchronous `step(ctx)` calls for Iteration 47's synchronous Simulator.
3. Remote engine adapters: JSON-RPC 2.0 protocol for native engines hosted in a separate process, container, service or worker. The host owns process lifecycle and native dependencies; the platform owns the protocol, canonical mapping, provenance and fail-closed result validation.

An explicitly requested but unavailable backend returns `HOLD`. There is no silent fallback to the native solver because that would change numerical semantics without the caller's consent.

## Backend contract

A backend descriptor contains:

- `id`, `version`, `adapterVersion`, `license`, `capabilities`;
- `run(input) -> { outcome: 'OK'|'HOLD', ... }`;
- finite, uniquely identified body states on success;
- explicit engine identity and verification status.

`createBackendRegistry()` rejects duplicate IDs and malformed implementations. `execute()` catches backend exceptions, validates the result envelope and checks all returned kinematic fields for finite values.

## Rapier 2D

Install explicitly in the integration environment:

```bash
npm install @dimforge/rapier2d-compat
```

The adapter maps each canonical body to a Rapier rigid body and ball collider. Mass is assigned through collider density (`mass / (π r²)`), and restitution/friction are mapped to collider properties. An optional infinite horizontal floor is represented by a fixed cuboid. Forces and torques are applied each fixed step. The adapter records engine version when exposed by the installed package.

The persistent session is important for the platform's synchronous component step contract: WASM initialization is asynchronous, but happens before the component is added to `Simulator`; each subsequent physics step is synchronous. Do not construct and destroy a Rapier world on every platform tick.

The adapter intentionally does not translate arbitrary shapes, joints, motors, sensors, collision groups, CCD settings or 3D transforms. Unsupported canonical features must HOLD or be rejected by a future adapter extension; they must not be silently dropped.

## Remote native-engine protocol

A host implements a transport with this signature:

```js
transport.request(jsonRpcEnvelope, { timeoutMs, signal }) -> Promise<jsonRpcResponse>
```

Handshake:

```json
{"jsonrpc":"2.0","id":1,"method":"simulation.backend.hello","params":{"protocolVersion":"1.0","engine":"project-chrono"}}
```

Expected result:

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"1.0","engine":"project-chrono","ready":true}}
```

Execution:

```json
{"jsonrpc":"2.0","id":2,"method":"simulation.run","params":{"schemaVersion":"1.0","input":{"...":"canonical simulation request"}}}
```

Expected result:

```json
{"jsonrpc":"2.0","id":2,"result":{"schemaVersion":"1.0","result":{"outcome":"OK","bodies":[{"id":"body-1","x":0,"y":0,"vx":0,"vy":0,"angle":0,"omega":0}]}}}
```

The protocol is JSON-RPC 2.0 with request/response ID correlation. The adapter enforces a bounded timeout and AbortSignal, verifies handshake identity and protocol version, and validates returned finite kinematics. The current remote adapter is an asynchronous batch/job interface. Iteration 47's current `Simulator.step()` is synchronous and does not await remote calls; therefore remote native engines are not yet live per-tick platform components. To run them inside the real-time simulation lifecycle, Grok must add an explicit async runner/worker boundary and corresponding replay/scheduler semantics, or use an engine compiled to a synchronous local/WASM session. Do not fake a synchronous remote call or block the browser main thread. The host must also enforce payload-size limits, authentication/authorization for network transports, process isolation, engine-specific timeouts, resource limits and safe file handling. Never expose an unauthenticated native solver process to an untrusted network.

## Engine profiles

`backends/catalog.json` lists the target profiles and their integration state. Rapier is a direct JS/WASM adapter. MuJoCo, Project Chrono, ODE, Bullet, PhysX, Jolt, Drake and DART are remote-host profiles. They are not bundled and are not represented as runtime-tested by this package. A host driver must be implemented and separately conformance-tested before a profile can be marked executable.

Suggested selection:

| Problem class | Preferred backend candidates | Notes |
|---|---|---|
| Browser 2D/3D real-time rigid body | Rapier | Native WASM route; validate exact dimension and feature set |
| Articulated robot/contact/control | MuJoCo, Chrono | Joint/contact model and solver choice matter |
| Vehicle, terrain, FSI, granular, FEA | Project Chrono | Domain-specific modules and model setup required |
| General rigid-body joints/contact | ODE, Bullet, PhysX, Jolt | Compare collision pipeline, constraints, deployment and license |
| Articulated dynamics / ABA / LCP | DART | Generalized-coordinate articulated dynamics and LCP contact methods |
| Robotics multibody + optimization/control | Drake | Couple dynamics with mathematical optimization and trajectory analysis |
| Lightweight deterministic planar reference | native-disc | Useful as a transparent reference solver, not a substitute for mature engines |

## Model mapping and equivalence

Backend results are not assumed numerically identical. Differences may arise from contact formulation, friction cone approximation, stabilization, solver order, integration method, tolerances, CCD, collision margins and engine version. Every run must persist:

- canonical model/configuration version and content identity;
- backend ID, exact engine version, adapter version and build identifier;
- units, coordinate frame, gravity, timestep and substep/solver configuration;
- backend-specific contact/constraint settings;
- input/output mapping version and result provenance;
- validation case ID and tolerance profile.

Cross-engine comparison is a validation activity, not a bitwise equality requirement. Define measurable observables (trajectory, impact velocity, energy/momentum balance, constraint residual, contact penetration, force/torque) and tolerances per physical problem.

## Licensing and supply-chain requirements

Do not copy external engine source or binaries into this package. Install/pin dependencies in the consuming build, preserve each engine's license and notices, generate an SBOM, scan transitive dependencies, and review patent/export/security implications. The catalog's license field is an initial project-license reference, not legal advice or a substitute for checking the exact version and all transitive components.

## What is and is not closed

Closed in this package: native planar reference backend, direct Rapier 2D adapter implementation, persistent Rapier platform component adapter, backend registry, remote JSON-RPC contract, fail-closed selection, and conformance tests using a deterministic Rapier API test double.

Not claimed as closed: live Rapier WASM runtime execution in this environment, MuJoCo/Chrono/ODE/Bullet/PhysX/Jolt/Drake/DART host drivers, 3D articulated mapping, mesh collision, FEM, CFD, FSI, sensor simulation, calibration, sim-to-real validation, safety qualification or production deployment qualification.
