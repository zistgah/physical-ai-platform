Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Physical AI Platform - Emulation Drop-in

**Package:** `pap.drop-in.emulation`  
**Version:** 1.2.0  
**API:** `emulate()`  
**License:** GNU GPL v3.0 (`GPL-3.0-only`)  
**Deployment:** static-first browser; no mandatory server, Node.js or Python runtime.

## Purpose

Iteration 47 defines the target as **“a result that matches the device.”** This package executes a deterministic model and compares its predicted response with supplied observations. It returns `OK`, `MISMATCH`, or `HOLD`. A successful comparison remains `SIMULATED` / `UNVERIFIED`; it is not physical verification, HIL, safety certification, or field validation.

The 1.2.0 revision corrects the deployment mismatch in 1.1.0. The prior optional backend runtime used Node.js `child_process` to launch Python. That is removed from the browser deliverable. Heavy numerical engines now execute in user-launched Google Colab notebooks, while a separate `integrations/colab-bridge` package handles browser-side job/result exchange.

## Package map

| Path | Purpose |
|---|---|
| `module.js` | Pure browser-compatible deterministic conformance core |
| `manifest.json` | Machine-readable package identity, runtime and contracts |
| `backends/registry.json` | External solver/backend catalog with honest implementation status |
| `backends/README.md` | Backend selection, licensing, deployment and extension policy |
| `samples/` | Synthetic motor, thermal and sensor fixtures |
| `test.mjs` | Unit, boundary, negative and adversarial contract tests (128 cases) |
| `sample-test.mjs` | End-to-end sample simulations (19 time steps plus negative control) |
| `spine-integration-test.mjs` | SIR ABI, execution gate, evidence and fidelity boundary test; run after copying into repository |
| `README.md` | Package entry point |
| `ENGINEERING-ANALYSIS.md` | Consolidated analysis from prior build cycles and Iteration 47 source |
| `BROWSER-ONLY-ARCHITECTURE.md` | Static browser and Colab execution architecture |
| `BACKEND-CATALOG.md` | Detailed open-source engine comparison and status |
| `TEST-COVERAGE-MATRIX.md` | Requirement-to-test traceability and boundary coverage |
| `CODE-REFERENCE.md` | Module-by-module and function-level implementation guide |
| `COLAB-NOTEBOOKS.md` | Notebook inventory, launch and return workflow |
| `MARKET-ASSESSMENT.md` | Comparable market tools and competitive positioning |
| `STITCH-INSTRUCTIONS.md` | Grok integration instructions |
| `TEST-REPORT.md` | Actual verification results and environment limits |
| `CLOSURE-REPORT.md` | Closure scope and remaining external responsibilities |
| `LICENSES-AND-NOTICES.md` | Copyright, GPL and third-party license policy |

The sibling module `integrations/colab-bridge` is intentionally separate. Notebooks are under `notebooks/emulation/`; they are not embedded in the browser runtime bundle.

## Outcomes

| Outcome | Meaning | Platform treatment |
|---|---|---|
| `OK` | Every compared output matches within declared tolerance | Model-response match only; evidence remains unverified |
| `MISMATCH` | Model executed but output values or structure differ | Not a match; preserve diagnostics |
| `HOLD` | Missing/invalid contract, invalid data, unsupported execution or failure | Fail closed; never reinterpret as success |

## Browser-native API

```js
import { emulate, validatePortContract, createCoSimulationAdapter } from './drop-in/emulation/module.js';

const result = emulate({
  device: { id: 'motor-01', type: 'DC_MOTOR', modelId: 'motor-model', modelVersion: '1.0.0' },
  input: { voltage_V: 12 },
  observed: { rpm: 1399.8 },
  model: input => ({ rpm: input.voltage_V * 116.6666667 }),
  tolerance: { absolute: 0.5, relative: 1e-4 },
  metadata: { fidelity: 'L1', observationSource: 'SYNTHETIC_FIXTURE' },
  seed: 42
});
```

The core accepts one-step or ordered multi-step execution, optional explicit state recurrence, typed ports, events, separate simulation/logical/physical time values, deterministic fault injection, recursive comparison and replay metadata. See `CODE-REFERENCE.md` for exact semantics.

## External numerical engines

The platform does not reimplement established solver libraries. It preserves SIR as canonical and treats engines as replaceable computational backends. The registry identifies SciPy, FMPy/FMI, PyBaMM, MuJoCo MJX/JAX, ngspice, SUNDIALS, OpenModelica/OMSimulator, Project Chrono/PyChrono and OpenFOAM.

**Important status distinction:**

- The SciPy notebook is executed locally in this build environment against an analytical reference.
- FMPy, PyBaMM, MuJoCo MJX, ngspice and JAX notebooks are delivered with executable code and runtime checks. Optional native/runtime availability varies; see the test report for what was actually executed.
- SUNDIALS, OpenModelica/OMSimulator, Project Chrono and OpenFOAM are documented plugin candidates, not claimed as implemented adapters in this package.

## Browser-only execution model

The GitHub Pages/static browser deployment imports only `module.js` and the sibling `colab-bridge/module.js`. The browser exports a bounded JSON job bundle. A user opens the relevant notebook in Colab, selects CPU/GPU/TPU, runs a pinned backend, and downloads a result bundle. The browser bridge verifies schema, job binding, SHA-256 digest, backend identity, sequence/time order and the non-promotion invariant before the platform accepts the result for further validation.

The browser does not execute arbitrary Python or native solver binaries. No mandatory backend or Colab account is introduced into the platform's core. Google Colab is an optional user-selected execution environment and its resource availability is not guaranteed.

## Run tests

Package development/test tooling requires Node.js 20+; this is a test harness requirement only, not a browser runtime dependency.

```bash
npm test
npm run test:unit
npm run test:samples
```

After copying the package into the actual Iteration 47 repository:

```bash
node drop-in/emulation/spine-integration-test.mjs
node tools/conformance-test-iter47.mjs
node tools/regression-checklist.mjs
node tests/acceptance.mjs --no-browser --no-mutation
```

Colab notebook validation and execution instructions are in `COLAB-NOTEBOOKS.md`. The notebook test script is `notebooks/emulation/validate_notebooks.py`.

## Non-goals and evidence boundaries

This package does not itself provide real-time scheduling/WCET guarantees, hardware bus access, physical sensor acquisition, native FMU sandboxing, calibrated parameter identification, uncertainty quantification, signed assurance evidence, or regulatory certification. A notebook simulation is not HIL. A result matching a supplied observation does not independently establish that the model or observation is authentic.

## Versioning

- Package version: `1.2.0`.
- Core API version: `1.2.0`.
- Colab Bridge version: `1.0.0` in the separate sibling package.
- SIR version and ABI version remain owned by the canonical platform and are not changed here.
