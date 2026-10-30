# Simulation drop-in v3.1.0 - browser-first backend federation

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

This bounded Iteration 47 package preserves the deterministic planar native solver and adds backend federation documentation, a Colab GPU qualification notebook, a complete engineering analysis and coverage matrix. It does not modify the platform kernel or acceptance script.

## Browser-first workflow

Open `notebooks/simulation-gpu-qualification.ipynb` in Google Colab. Use [Google Colab](https://colab.research.google.com/) and upload the notebook, then select **Runtime → Change runtime type → GPU**. Detailed instructions and the policy for creating a real GitHub-backed Colab link are in `BROWSER-COLAB.md`.

The notebook probes NVIDIA Warp and MuJoCo MJX. Warp runs a bounded GPU/CPU particle microbenchmark; MJX runs an articulated pendulum model on the actual JAX device. These are independent Python qualification paths, not production JS/WASM adapters. GPU absence or dependency mismatch is `SKIP`, not `PASS`.

## Execution paths

1. `native-disc`: existing deterministic 2D rigid-disc reference solver; synchronous and backwards-compatible.
2. `rapier2d`: optional direct JS/WASM adapter and persistent component. Live Rapier runtime still requires a pinned dependency and live smoke qualification.
3. Remote profiles: MuJoCo, Project Chrono, ODE, Bullet, PhysX, Jolt, Drake and DART use the asynchronous JSON-RPC host protocol. Profiles are not bundled drivers.
4. `nvidia-warp` and `mujoco-mjx`: Colab research/qualification paths only. A separate host/worker adapter is required for production platform use.

An explicitly selected unavailable backend returns `HOLD`; there is no silent fallback. The existing Iteration 47 `Simulator.step()` is synchronous. Remote engines must not be inserted as async component steps or block the browser main thread.

## Quick start: native reference backend

```js
import { simStep } from './module.js';
const result = simStep({ bodies, dt: 1/120, steps: 120, gravity: {x:0,y:-9.81}, floor: 0 });
```

## Quick start: Rapier WASM backend

```bash
npm install @dimforge/rapier2d-compat
```

```js
import { createSimulationBackends } from './backends/index.js';
import { simStepWithBackend } from './module.js';
const registry = createSimulationBackends();
const result = await simStepWithBackend(request, { backend: 'rapier2d', registry });
```

## Tests

```bash
npm run check
npm test
npm run samples
npm run integration
npm run backend-smoke
```

The Rapier adapter suite uses a deterministic API test double. It verifies adapter mapping and Iteration 47 lifecycle behavior, not live Rapier numerical correctness. The live smoke is explicitly skipped if the optional package is absent.

## Engineering documents

- `ENGINEERING-ANALYSIS.md` - consolidated analysis across the preceding build cycles, spine invariants, backend landscape, GPU paths, parity and limitations.
- `TEST-COVERAGE-MATRIX.md` - below/on/above-boundary coverage, adversarial cases, integration and unexecuted qualification items.
- `CODE-REFERENCE.md` - produced source map and commenting standard.
- `BACKEND-ARCHITECTURE.md` - federation, adapter contract, engine mapping and licensing.
- `BACKEND-SELECTION.md` - selection guidance.
- `BROWSER-COLAB.md` - browser-only notebook workflow.
- `THIRD-PARTY-NOTICES.md` - dependency license and notice review.
- `STITCH-INSTRUCTIONS.md` and `GROK-HANDOFF.md` - integration procedure and gates.
- `VALIDATION-REPORT.md` - actual test results and unverified items.

A separate `drop-in/uncertainty/` package accompanies this package. It is not nested into simulation.
