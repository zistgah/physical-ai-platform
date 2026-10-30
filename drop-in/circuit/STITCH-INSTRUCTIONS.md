<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit drop-in integration guide for Grok

## 1. Integration boundary

The module is a pure execution package. It accepts an electrical netlist and simulation controls and returns a result object. It does not import the platform kernel, mutate canonical entities, read UI state, or write persistence. Keep that separation.

Import:

```js
import { circuitStep, CIRCUIT_CONTRACT } from "./drop-in/circuit/module.js";
```

Contract version: `0.3.1` (see `CIRCUIT_CONTRACT.version`).

Expected entry point:

```js
const result = circuitStep({
  netlist,                 // adapter-produced SI-unit R/C/L/V/I network
  steps,                   // positive integer
  dt,                      // seconds per step
  method: "trapezoidal",   // or "backward-euler"
  initialConditions,       // optional capacitor volts / inductor amps
  recordEvery: 1
});
```

The adapter must preserve the result's `outcome`. `HOLD` is not a recoverable success and must not be converted to a zero-valued result.

## 2. What the current platform schema does and does not define

The supplied platform has a generic `electrical` port type in `site/components/core/contracts.js`. `schemas/component-contract.schema.json` has generic `ports`, `parameters`, `units`, and `simulation` objects. The supplied archive does not define a dedicated electrical component schema, canonical R/C/L/V/I element kinds, a circuit-netlist schema, or a canonical connection-to-node lowering rule.

Therefore the adapter's canonical field mapping is an integration decision for Grok. Do not silently assume that arbitrary parameter names or a visual wire imply an electrical topology. Add an explicit, versioned electrical component/connection contract or an adapter mapping with schema validation. Keep the kernel's semantic entity model intact.

## 3. Required lowering rules

For each supported electrical component, the adapter must produce one module element:

| Canonical electrical meaning | Module element | Required physical quantity |
|---|---|---|
| Linear resistor | `R` | resistance in ohms |
| Linear capacitor | `C` | capacitance in farads |
| Linear inductor | `L` | inductance in henries |
| Independent voltage source | `V` | voltage in volts or supported waveform |
| Independent current source | `I` | current in amperes or supported waveform |

Each lowered element requires a stable, unique element ID and exactly two electrical terminals. The adapter must:

1. Resolve component identity to stable element identity.
2. Resolve connected electrical terminals into stable net/node names. A connected net must become one node regardless of how many wires or ports represent it.
3. Resolve exactly one reference node for the circuit, or use the documented default `0`.
4. Reject dangling terminals, ambiguous nets, invalid terminal cardinality, duplicate IDs, unsupported component models, and unit ambiguity with `HOLD`.
5. Convert all values to SI units before calling `circuitStep`; never rely on implicit unit prefixes.
6. Preserve orientation. For a source, `n1 -> n2` is positive current; voltage is `V(n1)-V(n2)`.
7. Carry initial conditions by stable element ID. Do not fabricate initial capacitor voltage or inductor current if the canonical state says it is unknown.
8. Pass a reproducibility manifest containing model version, adapter version, netlist digest, dt, steps, integration method, initial state, and solver version into the platform evidence layer.

## 4. Suggested adapter output shape

This is the module boundary, not a claim that these exact properties already exist in the canonical schema:

```js
{
  netlist: {
    ground: "0",
    elements: [
      { id: "component-id:R", type: "R", n1: "NET_A", n2: "NET_B", value: 1000 },
      { id: "component-id:C", type: "C", n1: "NET_B", n2: "0", value: 1e-6 },
      { id: "component-id:V", type: "V", n1: "NET_A", n2: "0", value: { type: "step", initial: 0, value: 5, at: 0 } }
    ]
  },
  steps: 1000,
  dt: 1e-5,
  method: "trapezoidal",
  initialConditions: { capacitors: {}, inductors: {} },
  recordEvery: 1
}
```

## 5. Result-to-evidence mapping

- `outcome: "OK"` means the numerical stepper completed. It does not mean the circuit is physically validated.
- `fidelity: "L1_FUNCTIONAL"` is the maximum claim emitted by this module.
- `verified: false` must remain false until independent reference evidence is attached by the platform.
- `evidence.maxLinearRelativeResidual` is a numerical linear-solve residual, not a physical-model error bound.
- `evidence.referenceComparison: "NOT_PERFORMED"` remains unchanged by the solver. The external test suite may attach a separate comparison record.
- `evidence.physicalVerification: "NOT_PERFORMED"` remains unchanged until measured hardware data is compared under a controlled protocol.
- Never promote this output to `REAL`, `HIL`, `L6`, `L7`, `VERIFIED`, or safety authorization merely because `outcome` is `OK`.

## 6. Stitch validation sequence

After overlaying the package at `drop-in/circuit/`:

```bash
node drop-in/circuit/test.mjs
node tools/conformance-test-iter47.mjs
node tools/test-components.mjs
node tools/regression-checklist.mjs
node tests/run.mjs
node tests/acceptance.mjs --no-browser --no-mutation
```

The last command deliberately skips the acceptance suite's mutation stage and real-browser stage. For a complete platform release gate, run the full acceptance script in an environment with sufficient time and a supported browser, then inspect all SKIP/UNVERIFIED outcomes. Do not reinterpret a skipped stage as a pass.

## 7. Package replacement rules

- Replace only `drop-in/circuit/` with this package.
- Do not edit the canonical kernel, acceptance script, or unrelated drop-in packages to make the module pass.
- If a platform adapter is added, keep it outside this module or in a separately versioned adapter package.
- If an electrical schema is added, version it and test migration and backward compatibility.
- Keep module tests and sample netlists alongside the module.


## 8. Backend federation - do not put native executables in the browser

The native `circuitStep()` remains a dependency-free module. Optional external adapters live in `backends/index.js` and import Node built-ins (`child_process`, `fs`, `os`, `path`, `crypto`). They are server/worker-only. Do not import `backends/index.js` into the static browser bundle or change the canonical kernel to depend on Node.

The platform execution service should accept canonical circuit IR, perform canonical validation and lowering, then invoke one of:

```js
import { runCircuit, runNgspice, runXyce } from './drop-in/circuit/backends/index.js';
const result = await runCircuit({ backend: 'auto', netlist, steps, dt, method: 'trapezoidal' });
```

Explicit `ngspice`/`xyce` selection never silently falls back. `auto` tries Xyce, then ngspice, then native only when the external executable is absent. An installed engine's parse, convergence, model or runtime failure remains `HOLD`; do not mask it with a native result.

The adapter uses `execFile` with `shell:false`, a private temporary directory, timeout/output limits and guaranteed cleanup. Model library references must be resolved by a trusted platform-owned immutable registry callback. The registry must support ordinary model-file entrypoints and named `.lib` process/corner section calls. Never pass user-supplied paths or URLs to the resolver. The resolver must verify signatures/provenance before returning `verified:true`; the adapter then independently verifies SHA-256, relative path safety, include closure, file sizes and model metadata.

Backend-only device mapping is explicit: D/Q/M/J use named ordered terminals and a typed model reference; X uses a trusted registered subcircuit plus an exact `pinOrder`. Every terminal receives a 0 V sense source, so normalized results include terminal currents. The adapter's nonlinear device schema is not yet part of the platform's canonical component schema. Grok must add/version that mapping in the canonical electrical adapter rather than treating arbitrary `devices` JSON as authoritative canonical IR.

The model library registry should preserve: upstream project, license identifier, source URL, exact release/commit, model-pack digest, model name/type/pin metadata, temperature/process corner, and approval status. The backend result records library digests and generated deck/raw-output digests. These are provenance records, not physical validation.

## 9. Integration order for Grok

1. Keep `module.js` native API and `CIRCUIT_CONTRACT` stable.
2. Add a versioned canonical electrical device/terminal schema for D/Q/M/J/X and typed model references; do not create a second ontology.
3. Implement canonical graph-to-netlist lowering with SI unit conversion, stable IDs, terminal orientation and ground resolution.
4. Resolve approved immutable model-library references through the platform registry. Do not permit arbitrary file paths, downloads or raw SPICE command strings from UI input.
5. Run external adapters in a sandboxed Node worker/service. Record executable path, version, environment image, backend configuration and model-pack hashes. Set `probeVersion:true` in the platform execution service to capture the engine's `-v` banner. Persist the banner with the execution record and pin the executable/container image. If version probing is disabled, the result explicitly records `NOT_REQUESTED`; do not treat that run as fully reproducible release evidence.
6. Normalize results into the canonical result/evidence contract. Keep `verified:false`, `referenceComparison:NOT_PERFORMED`, and `physicalVerification:NOT_PERFORMED` until separate evidence is bound.
7. Run native samples, adapter fake-runner tests, then real-engine sample tests for each installed engine. A missing engine is a skip, never a pass.
8. Add engine-specific golden/reference comparisons, nonlinear convergence cases and model-library regression packs before enabling that backend for production workloads.

## 10. No platform-wide changes in this package

This package does not modify the kernel, canonical IR, schema registry, module registry, UI, acceptance script or other drop-in packages. It supplies the bounded native solver and optional Node-only external adapters. Grok owns canonical schema integration and service registration.

## 11. Colab notebook and browser-only handoff

The package includes `notebooks/circuit-backend-lab.ipynb` and `COLAB.md`. The public GitHub Pages application must remain static-first and must not bundle Node's child-process adapter or native simulator executables. The user opens the notebook in Google Colab from the browser and explicitly starts an ephemeral cloud runtime.

After the notebook is committed to the actual GitHub repository, replace the `<OWNER>/<REPOSITORY>/<BRANCH>` placeholders documented in `COLAB.md` and expose an “Open in Colab” link from the circuit workbench/help surface. The supplied archive does not establish repository coordinates, so no repository-specific link is fabricated. The notebook verifies the package manifest, runs native/adapter tests, installs ngspice in the ephemeral Colab VM when available, and reports real-engine PASS/FAIL/SKIP distinctly. Xyce is run only when an approved compatible binary is supplied.

Do not claim ngspice or Xyce are GPU accelerated because they execute inside a GPU-enabled Colab VM. The separate `circuit-design-space` package uses JAX to vectorize analytical design sweeps and reports the actual device. It is a separate drop-in and has a separate notebook.
