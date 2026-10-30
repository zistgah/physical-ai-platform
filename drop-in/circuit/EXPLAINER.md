<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit drop-in - iteration 47 replacement

## What this package delivers

## What an industry leader has

A validated netlist, transient solver, device-model library, convergence controls, and reference results. This package implements a bounded linear transient core and explicitly documents the substantial capability gap to mature SPICE tools.

This package replaces the iteration-47 circuit placeholder with an executable, deterministic, fixed-step linear transient solver. `circuitStep()` uses modified nodal analysis (MNA), companion models for capacitors and inductors, and scaled partial-pivot Gaussian elimination.

The intended contract is the handoff target: a transient result that matches known circuits. The package is independent of the platform kernel and does not mutate canonical entities, schemas, acceptance scripts, or other drop-in modules.

## Capability and fidelity declaration

- Fidelity: `L1_FUNCTIONAL`.
- Solver: dense MNA with scaled partial-pivot Gaussian elimination.
- Devices: linear resistor (`R`), capacitor (`C`), inductor (`L`), independent voltage source (`V`), independent current source (`I`).
- Source forms: scalar DC, `{type:"dc",value}`, `{type:"step",initial,value,at}`, `{type:"pulse",low,high,delay,rise,width,fall,period}`.
- Integration: backward Euler and trapezoidal. Trapezoidal uses backward Euler for startup and any sampled interval crossing a discontinuous independent-source jump; continuous ramps retain trapezoidal integration.
- State: explicit capacitor initial voltages and inductor initial currents.
- Outputs: node voltages, branch currents, element voltage/current/power histories, final state, solver residual evidence.
- Ground aliases: `0`, `gnd`, `ground`, mapped to `netlist.ground` (default `0`).
- Current-source direction: `n1` to `n2`. Voltage is `V(n1)-V(n2)`. Passive element current follows `n1` to `n2`.

The bundled native solver is not a full SPICE engine and remains limited to linear R/C/L/V/I transient analysis. Optional Node.js adapters delegate to separately installed ngspice and Xyce engines. Those adapters support model-based diode (D), BJT (Q), MOSFET (M), JFET (J), and trusted subcircuit (X) instances, with per-terminal current sensing and content-addressed model-library packs. The external adapter currently normalizes transient analysis only. AC/noise/DC sweeps, mutual inductance, transmission lines, parasitic extraction, electrothermal co-simulation, PCB extraction and physical calibration are not claimed by this package. Unsupported or unresolvable devices return `HOLD`.

## API contract

```js
import { circuitStep, CIRCUIT_CONTRACT } from "./module.js";

const result = circuitStep({
  netlist: {
    ground: "0",
    elements: [
      { id: "V1", type: "V", n1: "vin", n2: "0", value: { type: "step", initial: 0, value: 5, at: 0 } },
      { id: "R1", type: "R", n1: "vin", n2: "out", value: 1000 },
      { id: "C1", type: "C", n1: "out", n2: "0", value: 1e-6 }
    ]
  },
  steps: 1000,
  dt: 1e-5,
  method: "trapezoidal",
  initialConditions: { capacitors: { C1: 0 }, inductors: {} },
  recordEvery: 1
});
```

`netlist.elements` (or legacy alias `netlist.components`) is an array of elements. Each element requires a unique `id`, supported `type`, two distinct terminals (`n1`,`n2`; aliases `positive`/`negative` and `from`/`to` are accepted), and `value`. R/C/L values must be finite and strictly positive. Source values must be finite and valid waveform objects.

`steps` is a positive safe integer. `dt` is a finite positive number in seconds. `duration = steps * dt`. `recordEvery` decimates recorded output but never discards the final sample. The solver advances at fixed `dt`; source transitions are sampled on that grid. It does not insert event-aligned substeps.

There is no implicit sample or DC operating-point solve at `t=0`. The first returned sample is at `t=dt`. If the application needs a DC operating point, it must provide an explicit initial state or use a future DC analysis implementation.

## Return contract

Success returns `outcome: "OK"`, version, fidelity, method, solver name, units, time history, final electrical state, and evidence. `verified` remains `false`; `referenceComparison` and `physicalVerification` remain `NOT_PERFORMED` because the module cannot self-certify external reference or physical agreement.

Failure returns `outcome: "HOLD"` with a reason and, where applicable, time/step/residual details. The module must never turn malformed, unsupported, singular, or resource-exceeding inputs into `OK`.

## Numerical method

- Resistors stamp conductance into the nodal matrix.
- Voltage sources add branch-current unknowns and ideal voltage constraints.
- Inductors add branch-current unknowns and backward-Euler/trapezoidal companion equations.
- Capacitors stamp companion conductance plus a history-current term.
- Independent current sources inject current using the documented `n1 -> n2` orientation.
- The dense linear system is solved using scaled partial pivoting. A normalized residual check rejects numerically inconsistent solutions.
- Trapezoidal integration starts with backward Euler to establish a stable history term. It also uses backward Euler across a detected step/pulse discontinuity so the trapezoidal companion model does not average across an ideal source jump. Continuous pulse ramps remain trapezoidal. Transitions are sampled on the fixed time grid; no event-aligned substeps are inserted.

The solver is deterministic for identical JavaScript runtime, inputs, and floating-point implementation. Determinism is not a claim of cross-platform bitwise identity.

## Resource bounds

Defaults are exported in `CIRCUIT_CONTRACT.limits`:

| Bound | Default |
|---|---:|
| Elements | 512 |
| MNA unknowns | 256 |
| Time steps | 250,000 |
| Recorded samples | 250,000 |
| Estimated dense-solver work (`unknowns³ × steps`) | 300,000,000 |
| Estimated history values | 5,000,000 |

Callers may supply positive safe-integer overrides in `limits`. The dense solver has cubic solve cost in the number of unknowns and is deliberately bounded by both a work estimate and a history-memory estimate. A sparse solver is required before targeting large circuit netlists.

## Verification included

Run from this directory:

```bash
node test.mjs
node backends/test.mjs
node backends/test-real-engines.mjs
```

The native suite contains 69 assertions covering:

- RC charging against the continuous-time exponential and backward-Euler discrete closed form.
- RC discharge with explicit initial capacitor voltage.
- RL current rise and decay with explicit initial inductor current.
- Resistive divider voltage and voltage-source current sign.
- Current-source polarity and KCL balance.
- Delayed step and periodic pulse sources.
- Large resistance / small conductance scaling.
- Custom ground aliases and element power.
- Deterministic replay and honest evidence flags.
- HOLD behavior for missing, malformed, unsupported, singular, invalid-IC, and over-limit inputs.
- Every shipped JSON sample, with executable assertions.

Samples are under `samples/`: `rc-lowpass.json`, `rl-step.json`, and `resistive-divider.json`.

## Platform stitch contract for Grok

1. Extract this archive into the platform root so the files land at `drop-in/circuit/`.
2. Keep the public export name `circuitStep` and preserve `outcome: "OK" | "HOLD"`.
3. Pass a canonical electrical netlist through an adapter. Do not make this module read or mutate the canonical kernel directly.
4. Map canonical component IDs to stable element IDs; map typed electrical ports to `n1` and `n2`; convert units explicitly to SI.
5. Preserve source polarity, ground identity, initial-state ownership, and simulation time units.
6. Propagate `HOLD` without converting it to success or a default result.
7. Store returned fidelity/evidence as simulation evidence, not as `REAL`, `HIL`, or `VERIFIED` evidence.
8. Run `node drop-in/circuit/test.mjs`, `node tools/conformance-test-iter47.mjs`, and the full regression checklist after overlaying the package.
9. Do not edit `site/components/core/canonical-kernel.js`, the canonical IR/schema, `tools/conformance-test-iter47.mjs`, or unrelated modules to accommodate this implementation.

The iteration-47 handoff says the kernel and acceptance script did not change and that the package is to be improved independently. This package follows that boundary. The supplied iteration-47 archive currently contains the original circuit placeholder; this archive is a replacement payload and has not been silently inserted into the user's baseline.

## What is deliberately unchanged

- Do not flatten the canonical kernel. The circuit solver remains an independently replaceable package behind an adapter.

- Canonical kernel and canonical entity model.
- Canonical IR and schema definitions.
- Iteration-47 acceptance script.
- Platform simulation fidelity ladder.
- Other nine drop-in packages.
- Platform wiring and UI.

## Industry comparison and maturity statement

A linear R/C/L transient core is a useful embedded foundation, not parity with established SPICE engines. ngspice, Xyce, LTspice, Qucs-S and commercial EDA tools have broader device libraries, nonlinear convergence machinery, additional analysis modes, mature model ecosystems and extensive validation histories. This module's defensible differentiator is its small replaceable interface and explicit simulation-evidence boundary inside the Physical AI platform. No claim of state-of-the-art SPICE fidelity or production sign-off is made.


## Backend federation and external libraries

See `BACKENDS.md` for the complete external-engine contract, model-library resolver, supported nonlinear devices, subcircuit pin mapping, process isolation, resource limits, output normalization and evidence rules. The adapters are Node-only and must run behind a platform execution service; do not import them into the browser bundle.

`node backends/test.mjs` exercises the adapter contract with deterministic fake process runners, including model cards, diode/BJT/MOSFET/JFET mapping, trusted model libraries, subcircuits, error handling and auto fallback. These are adapter contract tests, not proof that an external simulator binary ran. `node backends/test-real-engines.mjs` runs the shipped sample suite against installed ngspice and Xyce binaries. If an executable is absent, the script reports `SKIP`; a skip is not a pass.

The package includes `samples/backends/diode-clamp.json` for external SPICE validation. The three original linear samples remain unchanged and continue to run against the native solver.

## Consolidated engineering record

For the complete analysis across native solver, numerical hardening, backend federation, model-library trust, market positioning, browser-only execution, Colab/GPU strategy and the additional design-space module, see `ENGINEERING-ANALYSIS.md`. For source-level function responsibilities see `CODE-REFERENCE.md`; for nominal/boundary/above-boundary/invalid/backend/real-engine coverage obligations see `TEST-COVERAGE.md`.
