<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit Module - Consolidated Engineering Analysis and Design Record

**Package:** `physical-ai-platform/drop-in/circuit`  
**Baseline:** Iteration 47  
**Package line:** 0.4.x backend federation, with Colab/browser-only handoff additions  
**License:** GNU GPL v3.0-only unless a file or dependency notice states otherwise.

## 1. Purpose and decision

The circuit package is not intended to recreate mature SPICE implementations. It owns the platform-facing electrical simulation contract and federates proven numerical engines. The canonical platform remains authoritative for component identity, typed ports, connectivity, units, requirements, provenance, configuration, evidence, lifecycle and fidelity. Numerical engines are replaceable execution providers.

The module contains:

1. A dependency-free browser-compatible native MNA transient solver for linear R/C/L and independent V/I sources.
2. Node.js execution adapters for separately installed ngspice and Xyce engines.
3. A trusted model-library resolver contract for immutable, hashed library packs and selected PDK corners.
4. A common normalized transient-result contract with engine, input, deck, output and model provenance.
5. Independent tests, executable samples, Colab notebooks and Grok stitch instructions.

This is a federated simulation foundation. It is not a complete EDA suite, signoff flow, SPICE replacement, safety certification, or physical verification system.

## 2. Findings across prior build cycles

### 2.1 Native solver cycle (0.3.x)

The original package boundary was useful but its early implementation returned success without executing electrical mathematics. The 0.3.x line introduced actual MNA transient execution, analytical RC/RL/divider references, backward-Euler and trapezoidal integration, initial-state validation, resource limits, deterministic results and strict HOLD behavior.

The native engine remains intentionally limited to linear R/C/L and independent sources. It is suitable as a portable fallback and as a deterministic reference implementation for this narrow domain. It is not equivalent to SPICE's nonlinear device models, sparse solvers, adaptive integration or broad analysis set.

### 2.2 Numerical hardening cycle (0.3.1)

The solver uses scaled partial-pivot elimination and checks the linear-system residual. It validates topology, passive values, waveform definitions, initial-condition identifiers, matrix size, step count and recorded-history limits. Discontinuous step/pulse transitions use backward Euler for the transition interval before returning to trapezoidal integration.

These choices improve bounded reliability but do not establish industrial qualification. Dense Gaussian elimination is not appropriate for very large sparse circuits. Fixed-step integration cannot replace adaptive timestep control for all switching, stiff or multi-timescale circuits.

### 2.3 Backend federation cycle (0.4.0)

The prior iteration added ngspice and Xyce command-line adapters, model-card/device mappings (D/Q/M/J/X), content-addressed model-library packs, nested include closure, `.lib` corner selection, per-terminal current sensing, normalized output, version probing, hashes, timeouts, output caps and shell-free process invocation.

The adapters are implemented, and the adapter contract suite currently executes 104 runtime assertions with deterministic fake runners. The prior build environment did not contain the real ngspice or Xyce executables. Fake-runner tests validate the adapter contract; they do not prove that real engines accept every generated deck or every vendor model. Real-engine execution must therefore be performed in Colab or a controlled compute worker and recorded as actual evidence.

### 2.4 Browser-only and Colab requirement

The public platform remains static-first and browser-only. The browser must not spawn native binaries, require local office/EDA software, or bundle simulator executables. A browser user may open a linked Google Colab notebook; Colab provides an explicitly user-started cloud runtime for CPU/GPU workloads. The notebook is an optional execution and research surface, not the canonical project store and not a mandatory backend for the GitHub Pages site.

The notebook can install ngspice in its ephemeral Linux runtime, run the Node.js adapter if Node is available, execute package tests, and use JAX on an available GPU for design-space exploration. ngspice/Xyce circuit simulation itself is not thereby GPU-accelerated. JAX acceleration is used for explicitly vectorizable parameter sweeps and analytical surrogate calculations. A GPU is only claimed when JAX reports a GPU device.

## 3. Backend ecosystem and comparison

| Engine / tool | Role | Integration decision | Current state |
|---|---|---|---|
| Native MNA | Portable linear fallback and reference | Keep first-party and browser-safe | Implemented |
| ngspice | Mature SPICE transient and nonlinear devices | CLI adapter; engine installed separately | Adapter implemented; real binary run not established in original environment |
| Xyce | Large-scale/parallel SPICE execution | CLI adapter; engine installed separately | Adapter implemented; real binary run not established in original environment |
| OpenModelica / OMSimulator | Equation-based multiphysics and FMI co-simulation | Future separate adapter, not circuit backend alias | Not implemented |
| Qucs-S | Workbench/frontend with multiple simulation backends | Workflow reference and possible interchange adapter | Not implemented |

The platform differentiator is not a claim to have better device equations than ngspice or Xyce. It is canonical system representation, replaceability, cross-domain traceability, model provenance, verification gates, evidence integrity and lifecycle integration.

## 4. Execution architecture

```text
Browser UI (GitHub Pages; no native executable)
  -> canonical electrical graph / typed component ports / SI units
  -> versioned circuit execution request
  -> trusted execution boundary (Colab session or platform worker)
  -> backend selection: native | ngspice | Xyce
  -> generated backend deck + pinned model packs + engine version
  -> normalized transient results
  -> reference comparison and verification evidence
  -> canonical evidence graph / fidelity gate (platform-owned)
```

The Node.js adapters are server/worker-side only. Never import `backends/index.js` into the static browser bundle because it uses `node:child_process`, filesystem and temporary-directory APIs. `module.js` is browser-safe and remains separately usable for bounded linear circuits.

### Backend selection rules

- Explicit `native`, `ngspice` or `xyce` selection is deterministic.
- `auto` may select an available configured backend according to documented priority.
- Fallback is permitted only when an executable is unavailable and policy explicitly permits fallback.
- A convergence error, malformed output, invalid model, non-zero process exit or failed reference comparison is a HOLD. Never hide it by silently switching to a different solver.
- Record requested backend, actual backend, executable version, input hash, generated deck hash, model-pack hashes, raw-output hash, execution time, exit code and diagnostics.

## 5. Model library and PDK governance

Model libraries are not bundled. The platform model registry must resolve immutable identifiers to content-addressed packs. The resolver must verify source, signature/approval, license, version immutability and file hashes before the adapter accepts `verified: true`.

Required controls:

- No arbitrary URL or arbitrary host path includes.
- No mutable aliases (`latest`, `main`, `master`, `stable`) as immutable identity.
- Validate path traversal, symlinks, nested include closure, aggregate size and per-file size.
- Restrict inline model cards to supported model declarations; do not accept arbitrary simulator command scripts.
- PDK corners are explicit (`tt`, `ss`, `ff`, or registry-defined section identifiers); never infer a corner.
- Device pin order must match the registry's subcircuit metadata exactly.
- Third-party model licensing must be reviewed separately from the platform's GPL-3.0-only package license.
- A successful parse or simulation does not prove model accuracy, foundry authorization or signoff suitability.

## 6. Browser-only / Google Colab operating model

The platform UI remains a static browser app. The user explicitly opens a notebook in Google Colab. The notebook:

1. Displays copyright, project attribution, package license and third-party dependency notices.
2. Accepts the package ZIP as an upload or a pinned repository artifact after Grok publishes it.
3. Verifies package hashes before execution.
4. Installs Node.js/ngspice only inside the ephemeral Colab VM where permitted.
5. Runs native tests and real-engine adapter tests separately.
6. Records engine version and distinguishes PASS, FAIL and SKIP.
7. Uses optional JAX GPU for large parameter sweeps / analytical design-space evaluation, not for claiming GPU-accelerated SPICE.
8. Exports evidence as downloadable JSON/CSV/plots and leaves canonical acceptance/promotion to the platform.

A Colab notebook URL is repository-path-specific. Since the supplied Iteration 47 archive does not contain a Git remote or owner/repository identifier, this handoff includes a correct URL template and an explicit instruction for Grok to replace it after committing the notebook. It does not invent a GitHub URL.

## 7. Security and operational boundaries

- Browser never runs shell commands or native simulators.
- Colab is a user-authorized cloud runtime; uploaded design/model data leaves the browser and is processed by Google-hosted compute. Users must review data classification before upload.
- Do not upload secrets, export-controlled data, proprietary PDKs or confidential models unless authorized under applicable terms and organizational policy.
- Model packs are treated as untrusted until verified and approved.
- External solver processes use argument arrays, no shell, isolated temporary directories, timeouts, output caps and cleanup.
- Notebook runtime is ephemeral; outputs must be deliberately downloaded or exported. Do not claim durable storage.
- AI-generated netlists/model mappings are proposals. Validate against schema, topology, engine execution and independent references.

## 8. Additional module created outside the ten handoff packages

A separate package, `drop-in/circuit-design-space/`, is supplied alongside `drop-in/circuit/`. It is not nested inside the circuit module and does not replace the kernel. It adds:

- RC and series-RLC design-space sweeps over resistance/capacitance/inductance grids, including all three damping regimes.
- Response-time, initial-current and stored-energy metrics.
- Explicit design constraints and infeasible candidate reasons.
- RC time-constant identification from measurements using SciPy least squares.
- An explicit identifiability warning: one ideal RC step identifies tau=R*C, not R and C independently.
- Optional JAX CPU/GPU vectorization for parameter grids, with honest device reporting and explicit HOLD when GPU is required but unavailable.

This package is a companion engineering workbench module. It does not run SPICE, mutate circuit topology or promote evidence. It consumes normalized parameters/measurements and returns design-space analysis. Grok should register it as a separate optional workbench capability with a typed analysis contract.

## 9. Release position

The circuit module is a federated transient execution package with a native linear solver and implemented ngspice/Xyce adapters. The extra design-space module adds parameter sweeps and parameter identification. These are meaningful capabilities, but this release is not a complete EDA/PCB design/signoff suite, not a production-qualified safety tool, and not an industrially certified simulator.

Release gates that require real external execution are explicit: run the Colab notebook with actual ngspice and, where an approved build is available, Xyce; execute all bundled real-engine samples; compare analytical references; preserve engine versions and hashes; review model licensing; and stitch the canonical graph adapter into the platform.

## 10. Market references and strategic position

The relevant open-source ecosystem includes:

- ngspice: https://ngspice.sourceforge.io/ - mature SPICE implementation and device-model ecosystem.
- Xyce: https://xyce.sandia.gov/ - scalable/parallel SPICE simulator.
- Qucs-S: https://ra3xdh.github.io/ - schematic/workbench frontend with multiple simulation backends.
- OpenModelica: https://openmodelica.org/ and OMSimulator: https://github.com/OpenModelica/OMSimulator - equation-based modelling and co-simulation.

The platform does not presently match these tools' breadth as a standalone EDA workbench. The intended competitive advantage is the canonical model, typed component and port contracts, model-library provenance, replaceable backend federation, cross-domain digital thread, evidence integrity and lifecycle workflows. This advantage exists only when Grok completes canonical graph lowering and integration; a standalone ZIP is not yet an integrated platform capability.

The next backend families should be added only through separate typed contracts: AC complex result schema, DC sweep schema, noise spectral-density schema, sensitivity/Monte Carlo schema, and FMI/equation-based multiphysics co-simulation. Do not add a generic string-based “analysis mode” that hides incompatible result types.
