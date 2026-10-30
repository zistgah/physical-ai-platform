<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit backend federation

## Purpose

The platform must not rebuild mature circuit-simulation algorithms and model libraries unnecessarily. The canonical platform owns electrical identity, connectivity, units, provenance, requirements, evidence and lifecycle. Numerical execution is delegated through replaceable backend adapters.

This package provides three execution choices today:

| Backend | Implementation | Scope | Availability |
|---|---|---|---|
| `native` | `module.js` MNA solver | Linear R/C/L and independent V/I transient | Bundled; JavaScript |
| `ngspice` | `backends/index.js` CLI adapter | SPICE transient, R/C/L/V/I and model-based D/Q/M/J/X devices | Optional external executable |
| `xyce` | `backends/index.js` CLI adapter | Xyce transient, R/C/L/V/I and model-based D/Q/M/J/X devices | Optional external executable |
| `openmodelica` | Catalog entry only | Equation-based multiphysics / FMI co-simulation candidate | Planned; no adapter in this package |

No external simulator source, binary or model library is bundled. This avoids copying third-party code, imposing large runtime dependencies, or silently inheriting a third-party license. Install and version the backend separately in the controlled execution environment.

## API

```js
import { runCircuit, runNgspice, runXyce } from './backends/index.js';

// Explicit engine selection: failure returns HOLD; no silent downgrade.
const result = await runNgspice({
  netlist,
  steps: 1000,
  dt: 1e-5,
  method: 'trapezoidal', // or 'gear'
  probeVersion: true, // capture the engine's -v banner for provenance
  initialConditions: { capacitors: {}, inductors: {} },
  timeoutMs: 120000
});

// Auto: Xyce -> ngspice -> native, but only falls back when an executable
// is absent. A real engine failure is surfaced as HOLD, not hidden.
const automatic = await runCircuit({ backend: 'auto', netlist, steps: 1000, dt: 1e-5 });
```

`runNgspice` and `runXyce` are asynchronous Node.js APIs. They must execute in a trusted compute service/worker, not be imported into the browser bundle. `module.js` remains browser-safe and dependency-free. A static-first UI submits canonical IR to the platform execution boundary; it does not spawn a local executable.

External methods are `trapezoidal` and `gear`. `backward-euler` remains native-only because SPICE `GEAR` is not equivalent to first-order backward Euler. The adapter never labels Gear as backward Euler.

## Device and model mapping

The external adapters accept the native primitive elements `R`, `C`, `L`, `V`, `I`, plus backend device declarations:

- `D`: diode, ordered terminals `anode`, `cathode`.
- `Q`: BJT, ordered terminals `collector`, `base`, `emitter`.
- `M`: MOSFET, ordered terminals `drain`, `gate`, `source`, `bulk`.
- `J`: JFET, ordered terminals `drain`, `gate`, `source`.
- `X`: trusted subcircuit instance, with explicit `pinOrder` matching registered model pin metadata.

Example inline model:

```js
const netlist = {
  models: [{
    name: 'DMOD',
    type: 'D',
    card: '.model DMOD D(Is=1e-14 N=1)'
  }],
  elements: [
    { id: 'VCC', type: 'V', n1: 'vcc', n2: '0', value: 5 },
    { id: 'RLOAD', type: 'R', n1: 'vcc', n2: 'out', value: 1000 }
  ],
  devices: [{
    id: 'DLED', type: 'D', model: 'DMOD',
    terminals: { anode: 'out', cathode: '0' }
  }]
};
```

Inline model cards are intentionally restricted to a `.model` declaration and `+` continuation lines. Arbitrary simulator commands, `.control`, `.shell`, `.include`, `.tran` and similar directives are not accepted as inline model cards.

## Reusable model libraries and PDK packs

Large vendor/PDK model libraries are not copied into this package. The adapter accepts immutable library references through a platform-owned resolver:

```js
await runNgspice({
  netlist,
  steps: 1000,
  dt: 1e-6,
  modelLibraryRefs: ['sky130-models@<immutable-version>'],
  modelLibraryResolver: async (refs, { backend }) => {
    // This callback is implemented by the trusted platform model registry.
    // It returns the exact, previously vetted, content-addressed pack.
    return {
      verified: true,
      libraries: [{
        id: refs[0], version: 'immutable-version', source: 'platform-model-registry',
        entrypoints: ['models/device.lib'],
        // For a PDK .lib section, use libraryCalls instead of entrypoints:
        // libraryCalls: [{ path: 'models/corners.lib', section: 'tt' }],
        files: [{ path: 'models/device.lib', content: '...', sha256: '<sha256>' }]
      }],
      models: [{ name: 'NFET_CORE', type: 'SUBCKT', pins: ['D', 'G', 'S', 'B'], libraryId: refs[0] }]
    };
  }
});
```

The resolver is a trust boundary. It must resolve only approved immutable library artifacts, verify their origin/signature before returning `verified: true`, and never fetch arbitrary user-supplied URLs or paths. Registry versions must identify immutable releases/commits, not aliases such as `latest`, `main`, `master` or `stable`. A library pack declares either one or more `entrypoints` (included as `.include`) or `libraryCalls` (selected as `.lib "file" section` for PDK corners). Nested `.include` dependencies must be present in the same content-addressed bundle. The adapter independently checks each file's SHA-256, size, relative path, include closure, model metadata and forbidden executable directives. Files are copied into a private temporary directory and deleted after execution. No arbitrary host filesystem path is accepted.

A registered subcircuit model is instantiated as:

```js
{
  id: 'Q1', type: 'X', model: 'NFET_CORE',
  pinOrder: ['D', 'G', 'S', 'B'],
  terminals: { D: 'drain', G: 'gate', S: 'source', B: 'bulk' }
}
```

The pin order must exactly match the registry's model metadata. Every device terminal receives a zero-volt current-sense source. This preserves the circuit topology while exposing terminal currents for evidence and power accounting. It does add ideal series voltage-source branches; convergence behavior must be validated with each selected engine and model pack.

## Output and evidence

The adapters normalize time, node voltages, element voltages, element currents, terminal currents, branch currents and power into a common result shape. Nonlinear device power is the sum of terminal voltage relative to ground multiplied by current entering the device at each terminal.

Every successful external result contains:

- `backend` and backend dialect.
- Engine version when `probeVersion: true` (both ngspice and Xyce expose `-v`); otherwise `backendVersion: null` and `versionProbe: NOT_REQUESTED`.
- Netlist, request, generated-deck and raw-output SHA-256 digests.
- Model-card digest and content-addressed model-library provenance.
- Process exit status, output size and sample history.
- `verified: false`, `referenceComparison: NOT_PERFORMED`, `physicalVerification: NOT_PERFORMED`.

External execution is not reference verification. A successful engine run must not automatically become `VERIFIED`, `REAL`, HIL, safety approval or a higher platform fidelity claim. The adapter uses `fidelity: EXTERNAL_SOLVER_EXECUTION`, deliberately outside the platform's promotion ladder until the platform binds independent evidence.

## Isolation and resource controls

- `execFile` invocation; no shell and no shell interpolation.
- Unique private temporary directory per run, restrictive file mode, guaranteed cleanup.
- Default 120-second process timeout.
- Default 16 MiB process output buffer.
- Default 64 MiB result-file cap.
- 250,000 requested-step cap and 10,000 element cap.
- 50 MiB aggregate model-library cap and 25 MiB per file.
- Strict path validation and content digest checks.
- Non-zero process exit, missing result file, malformed table, missing vectors, non-finite values, non-monotonic time or resource violation -> `HOLD`.

These are application-level limits, not claims about the maximum capabilities of ngspice or Xyce.

## Current scope and future analyses

The external adapters currently expose transient analysis. They make the engines' native transient algorithms and supported nonlinear device models available for supported canonical mappings. They do not yet normalize AC complex sweeps, DC sweeps, noise, pole-zero, sensitivity, Monte Carlo, harmonic balance, XSPICE digital models or mixed-signal events into the platform result schema. Those require separately typed analysis contracts and result schemas; they must not be smuggled through a generic string field.

The native solver remains a small fallback for linear R/C/L/V/I circuits. It is not a substitute for the external engines. Auto mode only falls back to native when both external executables are absent. It does not conceal engine convergence or model errors.

## Browser-only and Colab notebook

The static platform UI must not import the Node.js adapter. The optional `notebooks/circuit-backend-lab.ipynb` runs in Google Colab after a user explicitly opens the notebook and uploads this package archive. It verifies the SHA-256 manifest, runs native/adapter tests, and executes real-engine samples when ngspice/Xyce binaries are available. See `COLAB.md` and `STITCH-INSTRUCTIONS.md` for the repository-specific Colab deep-link template and Grok integration steps.
