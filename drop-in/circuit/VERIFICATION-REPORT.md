<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit package 0.4.1 - verification report

## Verification scope

The package was tested in a fresh extraction of the supplied Iteration 47 archive with the replacement overlaid at `drop-in/circuit/`. The separate additional package was placed at `drop-in/circuit-design-space/`. No kernel, canonical schema, acceptance script, UI route, registry or existing handoff package was modified.

## Current execution results

| Check | Result | Meaning |
|---|---:|---|
| Native circuit tests | 69 assertions PASS | RC/RL/divider analytical references, numerical invariants, invalid inputs, resource bounds and sample execution |
| Backend adapter tests | 104 assertions PASS | 104 runtime assertions using deterministic fake runners for ngspice/Xyce deck generation, device mappings, parser, model packs, PDK corners, security, provenance and failure behavior |
| Real ngspice tests | 4 SKIP | `ngspice` executable absent in this build environment; no real-engine pass claimed |
| Real Xyce tests | 4 SKIP | Xyce executable absent; no real-engine pass claimed |
| Circuit notebook validation/smoke | PASS | nbformat 4, attribution/license, metadata, integrity check, all code cells executed in an offline harness with Colab file APIs mocked; apt installation intercepted |
| Design-space tests | 53 tests PASS | Analytical RC/RLC responses, three damping regimes, design grids, independent ODE cross-check, fitting, identifiability, boundary/invalid cases, JAX and GPU truthfulness |
| Design-space notebook validation/smoke | PASS | nbformat 4, attribution/license, metadata, package integrity, all code cells executed; CPU JAX path exercised, GPU-required path correctly HOLDed |
| Iteration 47 conformance | PASS | Existing iteration conformance test |
| Component tests | 18/18 PASS | Existing platform component suite |
| Regression checklist | 64/64 PASS | Existing repository checklist |
| Existing test runner | PASS | `tests/run.mjs` |
| Acceptance `--no-browser --no-mutation` | 55 PASS, 8 SKIP; ACCEPTED | Seven mutation checks and one browser check explicitly skipped |
| Acceptance `--no-browser` | TIMEOUT at 600 s | Mutation-enabled run did not return a verdict; not a pass and not evidence of a circuit failure |
| Full browser acceptance | NOT RUN | No browser runner was executed in this environment |
| Colab notebook runtime | NOT RUN HERE | Notebook syntax/structure verified; actual Google-hosted Colab execution is a separate gate |

## Commands executed

```bash
node drop-in/circuit/test.mjs
node drop-in/circuit/backends/test.mjs
node drop-in/circuit/backends/test-real-engines.mjs
python -m unittest -v  # from drop-in/circuit-design-space/
python notebooks/validate_notebooks.py
python notebooks/validate_notebook.py  # from design-space package
node tools/conformance-test-iter47.mjs
node tools/test-components.mjs
node tools/regression-checklist.mjs
node tests/run.mjs
node tests/acceptance.mjs --no-browser --no-mutation
node tests/acceptance.mjs --no-browser  # exceeded 600-second execution limit
```

## Real-engine harness details

The revised real-engine harness evaluates every sample definition for each backend. In this environment it reported:

- ngspice: 0 PASS, 0 FAIL, 4 SKIP.
- Xyce: 0 PASS, 0 FAIL, 4 SKIP.

The sample definitions are three linear reference circuits and one nonlinear diode-clamp circuit. Adapter fake-runner tests do not substitute for real engine runs. The Colab notebook installs ngspice in its ephemeral runtime where permitted and runs this exact harness. Xyce requires a separately approved compatible executable.

## Notebook verification boundary

Both notebooks passed JSON/nbformat validation, copyright/license checks, metadata checks and Python code-cell syntax compilation. The design-space module itself was executed locally with 34 passing tests. The circuit notebook was not run in a live Google Colab session in this environment. Do not report Colab runtime success until a Colab run manifest is produced.

## Additional package verification

`drop-in/circuit-design-space/` is a separate eleventh module beyond the ten folders listed in `HANDOFF.md`. Its 34 unit tests pass. JAX CPU vectorization was exercised where JAX was available. The explicit GPU gate was tested: if JAX does not expose a GPU device, `require_gpu=True` returns HOLD. This environment did not establish GPU execution; no GPU PASS is claimed.

## Regression boundary

The package overlay changed only `drop-in/circuit/` and added the separate `drop-in/circuit-design-space/` directory. The kernel, canonical schemas, acceptance script, UI, registry and original nine other drop-in folders were not edited. Existing 64 regression suites, 18 component tests, iteration-47 conformance and the reduced acceptance suite passed.

## Release claims not made

- No real ngspice or Xyce run was completed in this build environment.
- No live Colab execution was completed here.
- No GPU execution is claimed.
- No canonical electrical graph lowering or UI registration is claimed; Grok must stitch these to the existing spine.
- No OpenModelica/OMSimulator adapter is included.
- No AC, DC sweep, noise, pole-zero, sensitivity, Monte Carlo, harmonic-balance or mixed-signal result normalization is claimed by the circuit package.
- No production qualification, safety certification, foundry signoff, HIL, physical verification or industrial certification is claimed.
- The full mutation-enabled and browser acceptance gates remain unverified due timeout/environment limits.
