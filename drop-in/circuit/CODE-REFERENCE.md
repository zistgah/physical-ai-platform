<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit source code reference

This document describes the implementation units in the supplied source. It is intended for Grok and maintainers; the source remains authoritative.

## `module.js` - browser-compatible native solver

| Symbol / section | Responsibility | Inputs / outputs |
|---|---|---|
| `VERSION`, `SUPPORTED`, ground aliases and limits | Declare native contract version, supported linear elements, ground aliases and resource ceilings | Module constants |
| `hold()` | Produce explicit non-success result | `HOLD` + reason/details |
| `isFiniteNumber()`, `isPositiveFinite()`, `own()`, `asNode()` | Primitive validation and canonicalization helpers | Scalar/node values |
| `validateSource()` | Validate scalar, DC, step and pulse sources | Error string or `null` |
| `sourceValue()` | Evaluate a supported source waveform at time `t` | Finite source value or NaN for unsupported input (validation must run first) |
| `sourceHasJumpInInterval()` | Detect discontinuous source transitions that should not be averaged by trapezoidal startup | Boolean |
| `normalizeNetlist()` | Validate elements/IDs/terminals/values, canonicalize ground, enumerate nodes and branch unknowns | Normalized circuit or error |
| `solveLinear()` | Scaled partial-pivot dense Gaussian elimination plus relative residual check | Linear system -> solution or failure |
| `validateInitialConditions()` | Check capacitor voltage and inductor current state against known element IDs | Normalized ICs or error |
| `circuitStep()` | Assemble MNA matrix at each fixed time step, stamp R/C/L/V/I, solve, update dynamic states, record histories and return diagnostics | Netlist + timestep controls -> result/HOLD |
| `CIRCUIT_CONTRACT` | Machine-readable native API, devices, methods, units conventions and limits | Frozen contract object |

### MNA stamping and state conventions

- Non-ground node voltages are the first unknowns.
- Ideal voltage-source and inductor branch currents are additional MNA unknowns.
- Resistors stamp conductance.
- Capacitors use backward-Euler or trapezoidal companion conductance/current history.
- Inductors use branch-current MNA form and a companion relation.
- Independent voltage sources use branch-current unknowns; current sources inject into nodal RHS.
- Positive element current is defined from `n1` to `n2`; element voltage is `V(n1)-V(n2)`; passive sign convention power is `v*i`.
- Samples are recorded at `dt`, `2*dt`, ...; no implicit t=0 operating-point solve is performed.

### Complexity and limitations

The dense solver has cubic work in the number of MNA unknowns per timestep and linear memory in the matrix dimension, with bounded history storage. It is intentionally capped. It does not implement sparse matrix storage, nonlinear Newton iteration, adaptive timestep, AC/noise/DC sweeps or semiconductor compact models.

## `backends/index.js` - external engine federation

| Symbol / section | Responsibility |
|---|---|
| `BACKEND_CATALOG` | Declare native/ngspice/Xyce/OpenModelica catalog status and runtime/licensing notes |
| `hold()` | Normalize backend failure to HOLD |
| `quoteSpice()` | Format finite numeric values for SPICE deck output |
| `sourceAt()`, `sourceExpr()` | Translate supported independent source waveforms into backend expressions |
| `prepare()` | Validate and lower the normalized netlist and device declarations into engine-specific deck text and output vector requests |
| `parseRows()` | Parse numeric simulator table output into headers/rows |
| `headerIndex()` | Resolve named vectors with controlled fallback behavior |
| `normalizeOutput()` | Map engine-specific data to common time/node/branch/element/terminal/power histories and attach evidence metadata |
| `validateLibraryBundle()` | Validate immutable model-pack identity, content hashes, safe paths, size caps, nested include closure, model declarations and selected PDK sections |
| `runExternal()` | Resolve approved models, create isolated temporary workdir, write deck, invoke executable without shell, enforce timeout/output limits, parse result, hash inputs/deck/output and clean up |
| `runNgspice()` / `runXyce()` | Explicit engine entry points |
| `runCircuit()` | Backend selection and controlled absence-only fallback |
| `BACKEND_CONTRACT` | Versioned external adapter contract and capabilities |

The external adapter is Node.js-only because it uses child-process and filesystem APIs. It must execute in a trusted worker/Colab runtime, never in the browser bundle.

## `backends/test.mjs`

Deterministic fake-runner tests exercise deck generation, model mappings, parsing, process failures, timeouts, library validation, provenance and backend selection. They validate adapter logic but are not substitutes for running the actual engine binaries.

## `backends/test-real-engines.mjs`

Runs all shipped sample definitions against each available actual engine. Missing executables are SKIP. Nonzero exits, parse errors, convergence failures and reference mismatches are FAIL. Optional `CIRCUIT_REAL_ENGINE_REPORT` writes a machine-readable report. A backend with no installed executable does not receive a PASS.

## Python companion: `drop-in/circuit-design-space/module.py`

This is a separate module. See its `EXPLAINER.md` and `TEST-COVERAGE.md`. It performs analytical RC/RLC design-space sweeps, damping classification and RC tau identification; it does not run the circuit solver or own the canonical graph.
