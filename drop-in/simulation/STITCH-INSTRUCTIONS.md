# Grok stitch instructions - simulation backend federation

## Scope

Add the contents of this package to `drop-in/simulation/`. Do not replace the canonical kernel, `Simulator`, scheduler, replay recorder, telemetry recorder, acceptance script or any unrelated module.

## Runtime requirements

- Node.js >= 18 for package tests and Node integration.
- Existing Iteration 47 synchronous `SimComponent.step(ctx)` contract.
- Optional `@dimforge/rapier2d-compat` dependency for Rapier 2D. Install and pin an exact tested version in the platform build; do not make it a mandatory dependency for native-disc-only users.
- Remote native backends require a separately managed host implementing the JSON-RPC contract in `BACKEND-ARCHITECTURE.md`.

## Integration paths

### Existing native solver

No changes required. Existing `simStep()` and existing native adapter remain backward compatible.

### Rapier platform component

WASM must be initialized before a component enters the synchronous simulator:

```js
import { createRapierSimulationComponent } from './drop-in/simulation/platform-rapier-adapter.js';
import { SimComponent, Simulator } from './site/components/simulation/simulator.js';

const component = await createRapierSimulationComponent(SimComponent, {
  id: 'robot-physics',
  state: { bodies: canonicalBodies },
  params: { gravity: { x: 0, y: -9.81 }, floor: 0,
    solverIterations: 16, modelVersion: canonicalModelVersion }
});
const simulator = new Simulator({ dt: 1 / 120, seed: 1 });
simulator.add(component);
// simulator.step() / simulator.run(n) remain synchronous.
// Call component.dispose() when the owning simulation is disposed.
```

Do not call `createRapierSimulationComponent()` on every tick. Create one component per simulation session, retain it, and dispose it with the simulation lifecycle.

### Batch backend selection

```js
import { createSimulationBackends } from './drop-in/simulation/backends/index.js';
import { simStepWithBackend } from './drop-in/simulation/module.js';

const backends = createSimulationBackends();
const result = await simStepWithBackend(request, { backend: 'rapier2d', registry: backends });
if (result.outcome !== 'OK') { /* preserve HOLD; do not fall back */ }
```

### Native engine host

Register an explicit remote adapter with an authenticated host transport. Example profile:

```js
const backends = createSimulationBackends({ includeRapier: true, remote: [{
  id: 'chrono.multibody', engine: 'project-chrono', version: 'PINNED_BY_HOST',
  license: 'BSD-3-Clause', capabilities: ['multibody','contact','fea'],
  timeoutMs: 30000, transport: chronoTransport
}] });
```

`chronoTransport` must implement `request(envelope, {timeoutMs, signal})` and satisfy the JSON-RPC protocol. The host must return schemaVersion 1.0, engine identity in handshake, and normalized finite body states. The current remote adapter is asynchronous batch execution, not a synchronous per-tick component. Iteration 47's `Simulator.step()` does not await promises. Do not insert an async `step()` method and assume the simulator will await it. A remote engine needs a deliberate async runner/worker integration and replay/scheduler design; alternatively compile the engine into a local/WASM session. Do not block the browser main thread. Do not register a profile as platform-integrated before its real host driver and backend conformance suite exist.

## Required integration verification

1. `node --check drop-in/simulation/module.js`
2. `node --check drop-in/simulation/backends/rapier2d.js`
3. `node drop-in/simulation/test.mjs`
4. `node drop-in/simulation/backend-tests.mjs`
5. `node drop-in/simulation/run-samples.mjs`
6. `node drop-in/simulation/platform-integration.test.mjs`
7. Install the pinned Rapier dependency in CI and run the live backend smoke suite (not the API test double).
8. Run `node tests/run.mjs` from the platform root.
9. Run platform acceptance, browser and mutation suites in CI; report skips separately.
10. Run each native backend host's conformance suite and archive its engine version, build, license and validation report.

## Registration boundary

The module package does not modify the kernel or central registry. Grok owns the final registration/build integration. A backend is not `INTEGRATED` until the actual build resolves its dependencies, the platform can create and dispose a session, replay captures backend/configuration identity, the UI/workflow selects it explicitly, and full regression/acceptance pass.
