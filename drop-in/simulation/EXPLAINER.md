# Simulation drop-in - Iteration 47

## Status and acceptance boundary

This package closes the Iteration 47 handoff target: **`simStep` - deterministic multi-body simulation with contact**. Its native reference backend is a bounded planar rigid-disc solver. The package also exposes an optional Rapier 2D adapter and asynchronous host protocol profiles for mature external engines, plus platform adapters, executable examples, regression tests and integration contracts. The target is closed at the declared fidelity: `L3_PLANAR_RIGID_DISC_CONTACT`.

It is not a general-purpose industrial physics engine and must not be described as one. It does not claim parity with MuJoCo, Chrono, Drake, PhysX, Isaac Sim, Bullet, or Gazebo. Those systems solve materially broader problems. The module's value is a deterministic, dependency-free, inspectable contact backend that can be invoked by the platform's canonical simulation lifecycle.

## Package contents

| File | Purpose |
|---|---|
| `module.js` | Solver, validation, diagnostics, limits, and HOLD semantics |
| `platform-adapter.js` | Dependency-injected adapter to the platform `SimComponent` API |
| `test.mjs` | 36 unit, invariant, boundary, and regression test groups |
| `run-samples.mjs` | Runs every JSON sample and checks declared outcomes |
| `platform-integration.test.mjs` | Exercises scheduler, replay, telemetry, events, state propagation, and HOLD using the actual Iteration 47 classes |
| `samples/*.json` | Reproducible, versioned scenario inputs and acceptance expectations |
| `TEST-PLAN.md` | Test matrix, properties, and known test limits |
| `MARKET-POSITION.md` | Evidence-based comparison and positioning |
| `VALIDATION-REPORT.md` | Actual run record and qualifications |
| `GROK-HANDOFF.md` | Stitch instructions and integration checklist |
| `CLOSURE-STATEMENT.md` | Explicit scope closure and non-claims |

## Declared physical model

- Planar (2D) system.
- Uniform rigid discs with translational and rotational state.
- Infinite horizontal floor at configurable `floor` height, or no floor with `floor: null`.
- Disc-disc and disc-floor unilateral contact.
- Gravity, constant body force, and constant body torque.
- Restitution and Coulomb-limited friction.
- No body-body adhesion, rolling resistance, fluid drag, or material deformation.

### Units and signs

SI units are mandatory: position/radius in metres, time in seconds, mass in kilograms, force in newtons, torque in N·m, angle in radians, angular velocity in rad/s. Positive x is right, positive y is upward, and positive angular direction is counter-clockwise. Gravity is an acceleration vector in m/s².

### Numerical method

1. Validate the complete input and reject invalid or numerically unrepresentable states with `HOLD`.
2. Canonically order bodies by code-point ID comparison (not locale-dependent collation).
3. Estimate per-outer-step travel from translational speed and acceleration. Subdivide so estimated travel per body is at most half the smallest disc radius. If the required count exceeds `maxSubsteps`, return `HOLD` rather than silently run an under-resolved step.
4. Integrate constant acceleration and torque using semi-implicit Euler.
5. Detect disc-disc and disc-floor overlaps.
6. Solve normal and tangential contact impulses with sequential impulses. Normal and tangential impulses are accumulated per contact; the accumulated tangential impulse is clamped to `±μJₙ`. This avoids the friction over-application error caused by independently clamping every solver iteration.
7. Apply iterative positional correction with a small penetration slop.
8. Reject non-finite states and emit diagnostics, frame history, momentum and kinetic-energy summaries.

This is a discrete-time contact method with bounded adaptive substeps, not a mathematical guarantee of continuous collision detection. It is suitable for the declared disc model and test envelope, not arbitrary impact velocities or arbitrary geometry.

## API

```js
import { simStep } from './module.js';

const result = simStep({
  bodies: [{
    id: 'payload', x: 0, y: 1, vx: 0, vy: 0,
    mass: 1, radius: 0.25,
    restitution: 0, friction: 0.5,
    angle: 0, omega: 0,
    fx: 0, fy: 0, torque: 0
  }],
  dt: 0.01,
  steps: 100,
  gravity: { x: 0, y: -9.81 },
  floor: 0,                 // null disables floor
  solverIterations: 16,
  positionIterations: 20,
  seed: 1,
  maxSubsteps: 64,
  recordHistory: true
});
```

### Required body fields

`id`, `x`, `y`, `vx`, `vy`, `mass`, `radius`.

### Optional body fields

`static`, `restitution`, `friction`, `angle`, `omega`, `fx`, `fy`, `torque`.

- `mass: 0` or `static: true` means immovable. Static bodies have zero velocity and spin in the internal state, regardless of supplied velocity values.
- Dynamic mass and radius must produce finite inverse mass and inverse inertia.
- `restitution` is in `[0, 1]`; `friction` is non-negative.
- Inputs are not mutated. Output bodies are returned in deterministic ID order.
- `seed` is retained for replay/provenance identity; this deterministic solver has no stochastic branch and therefore does not consume it.

### Top-level parameters and bounds

| Parameter | Default | Contract |
|---|---:|---|
| `dt` | required | finite, `(0, 1]` seconds |
| `steps` | 1 | integer `[1, 10000]` |
| `gravity` | `{x:0,y:-9.81}` | finite x/y acceleration |
| `floor` | 0 | finite height or `null` |
| `solverIterations` | 16 | integer `[1, 100]` |
| `positionIterations` | 20 | integer `[1, 100]` |
| `seed` | 1 | finite replay metadata |
| `maxSubsteps` | 64 | integer `[1, 64]` |
| `recordHistory` | true | boolean; at most 10,000 history frames |

Hard limits: 256 bodies, 10,000 outer steps, 200,000 total substeps, 100 solver/position iterations, 10,000 history frames, and absolute input magnitude at most `1e50` for physical scalar values. Exceeding a limit or entering a numerically unrepresentable mass/inertia regime returns `HOLD`.

## Result contract

Success:

```js
{
  outcome: 'OK',
  algorithmVersion: '2.0.0',
  fidelity: 'L3_PLANAR_RIGID_DISC_CONTACT',
  bodies: [...],
  history: [...],
  diagnostics: {
    bodyCount, contactEvents, maxDetectedPenetration,
    finalPenetration, maxClosingVelocityResidual,
    substeps, momentum, kineticEnergy, limitations
  },
  verification: { status: 'SIMULATED', physicalVerification: false }
}
```

Failure/incomplete input:

```js
{ outcome: 'HOLD', reason: '...' }
```

`HOLD` is not a zero-state result and must not be promoted as a successful simulation. The adapter preserves the last accepted body state on a HOLD, sets `outputs.status = 'HOLD'`, and emits `simulation:held`.

## Platform adapter

`createSimulationComponent(SimComponentBase)` receives the platform's existing base class. It does not import, replace, or modify the canonical kernel. The adapter maps `state.bodies` and `params` to `simStep`, then publishes:

- `outputs.simulation`, `outputs.status`, `outputs.modelVersion`;
- body state on successful steps only;
- telemetry for body count, contact events, substeps, and penetration;
- `simulation:completed` or `simulation:held` events.

The existing `Simulator` remains responsible for scheduling, event lifecycle, replay capture, and telemetry storage. Do not create a second scheduler or replay recorder inside this module.

## Determinism and replay

For identical JSON-compatible inputs and runtime arithmetic, body ordering and contact ordering are stable. The module does not use randomness. Store the complete input object, algorithm version, component version, and platform `dt` with the platform replay record. A `seed` alone is not a complete replay record.

## Validation status

See `VALIDATION-REPORT.md` for the exact commands and results. Unit tests and samples pass; platform adapter integration passes against the supplied Iteration 47 code. Platform regression passes. The platform acceptance run without browser and mutation stages passes with those stages explicitly skipped. The full acceptance run with mutation checks exceeded the available execution window; Playwright was not installed, so the real-browser check is unverified.

## What an industry leader has

An industry-leading general-purpose physics/simulation environment typically includes some combination of 3D rigid-body mechanics, articulated constraints, robust geometry and collision pipelines, solver convergence controls, deformable/FEM or multiphysics models, sensor pipelines, calibration workflows, broad validation corpora, and production tooling. This package does not claim those capabilities. It closes the narrower Iteration 47 planar multi-body contact target with explicit boundaries and tests.

**Do not flatten the canonical kernel.** The adapter is dependency-injected and must be stitched through the existing component/build integration path.

## Engine federation (v3.0.0 additive extension)

The native solver remains the dependency-free planar reference path. The package now also provides:

- `simStepWithBackend(input, { backend, registry })` for explicit async engine selection.
- `backends/rapier2d.js` for the optional official Rapier 2D WASM binding.
- `backends/rapier2d-session.js` for a persistent world that can be stepped synchronously after WASM initialization.
- `platform-rapier-adapter.js` for creating a real Iteration 47 `SimComponent` instance after asynchronous engine initialization.
- `backends/registry.js` for result validation and JSON-RPC 2.0 remote engine transport.
- `backends/profiles.js` for explicit host profiles for MuJoCo, Project Chrono, ODE, Bullet, PhysX and Jolt.

The remote profiles are not bundled engine binaries or complete native drivers. They are named configurations over the remote-host protocol. The host must implement engine-specific input mapping, execution, result mapping, authentication, process isolation and conformance tests. See `BACKEND-ARCHITECTURE.md` and `STITCH-INSTRUCTIONS.md`.

The optional Rapier peer dependency is not installed by default. Install and pin it in the consuming platform build. Adapter contract tests use a deterministic API test double; `backend-live-smoke.mjs` must be run against the actual pinned WASM package before the backend is marked runtime-qualified.
