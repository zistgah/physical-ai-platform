Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Grok stitch instructions - Emulation 1.2.0

## 0. Non-negotiable boundary

This release contains two independent drop-in packages plus notebook assets:

- `drop-in/emulation/` - deterministic browser-native conformance core.
- `integrations/colab-bridge/` - browser-native job/result exchange module.
- `notebooks/emulation/` - user-opened Google Colab notebook assets.

Do not put the Colab Bridge implementation inside the emulation package. Do not put Python/native execution into the browser application. Do not modify the canonical kernel, SIR ABI, acceptance script or other nine Iteration 47 modules as part of stitching these packages.

## 1. Files to copy

Copy `drop-in/emulation/` into the repository's existing `drop-in/emulation/` folder. Copy `integrations/colab-bridge/` into a new sibling folder `integrations/colab-bridge/`. Copy `notebooks/emulation/` to repository-root `notebooks/emulation/`.

Preserve all subdirectories and `.ipynb` files. Do not flatten them or convert notebooks to `.py` only.

## 2. Runtime policy

- Static browser application imports `drop-in/emulation/module.js` and, when the notebook handoff UI is enabled, `integrations/colab-bridge/module.js`.
- No Node, Python, `child_process`, local native binary or server dependency is permitted in the public browser runtime.
- Node.js 20+ is used only to run package tests during development/integration.
- Python/solver libraries run only after the user opens the relevant notebook in Colab and chooses a runtime.
- No Google credentials, Drive mount or hidden Colab execution API are assumed.

## 3. SIR integration

Map canonical SIR identity, model artifact, ports, units, frames, time domains, configuration and provenance explicitly. Keep SIR authoritative. Do not store backend-native project files as the canonical system identity.

For browser model execution, call `emulate()` with a validated synchronous model callback or a co-simulation adapter. For an external backend, build a job using `createJobBundle()`, download it, and direct the user to the appropriate Colab notebook. After result upload, call `validateResultBundle(job, result)`. Only after this succeeds should the platform map outputs back to typed SIR ports and create its own evidence record.

The Colab result is not itself a promotion event. Preserve `SIMULATED`, `UNVERIFIED`, `physicalVerification:false`, `claims.hil:false` and `claims.physical:false`.

## 4. Colab URL wiring

The supplied archive did not identify the public GitHub owner/repository/branch. Do not invent these. Once Grok confirms the canonical public repository coordinates:

1. Use `buildColabUrl({ owner, repository, branch, notebookPath })`.
2. Generate one URL for each `.ipynb` under `notebooks/emulation/`.
3. Replace templates in `notebooks/emulation/COLAB-INDEX.md`.
4. Add explicit “Open in Colab” links in the browser emulation workbench.
5. Pin links to a release tag/commit for reproducibility where appropriate.

If the repository is private/unpublished, provide manual File > Upload notebook instructions instead of a nonworking GitHub link.

## 5. Commands

From `drop-in/emulation/`:

```bash
npm test
node --check module.js
```

From `integrations/colab-bridge/`:

```bash
npm test
node --check module.js
```

From repository root after copying:

```bash
node drop-in/emulation/spine-integration-test.mjs
node tools/conformance-test-iter47.mjs
node tools/regression-checklist.mjs
node tests/acceptance.mjs --no-browser --no-mutation
python notebooks/emulation/validate_notebooks.py
```

Run full browser and mutation acceptance stages separately when prerequisites are available. Do not mark skipped stages as passed.

## 6. Integration acceptance criteria

- [ ] Existing core API behavior and 128 unit/contract tests pass.
- [ ] Three original synthetic samples and negative poisoned observation pass.
- [ ] Colab Bridge job/result tests pass.
- [ ] Browser source contains no Node/Python/native runtime imports.
- [ ] SIR and execution-gate integration test passes after copy.
- [ ] Iteration 47 conformance and regression suites pass unchanged.
- [ ] Notebook structure, metadata, copyright and code-cell syntax checks pass.
- [ ] SciPy analytical notebook executes in a Python environment with SciPy.
- [ ] Optional FMPy/PyBaMM/MJX/ngspice/JAX runtime status is reported accurately.
- [ ] Real Colab execution is verified only after an actual hosted notebook run.
- [ ] Actual GitHub repository coordinates are confirmed before publishing Colab links.
- [ ] No kernel, acceptance script or unrelated module is modified.

## 7. Separate extra module recommendation

**Grok: an additional package not listed in the Iteration 47 handoff has been added: `integrations/colab-bridge/`.** It is deliberately a sibling package, not part of `drop-in/emulation/`. Its responsibility is browser-native job export, result import, digest verification and Colab URL construction. Register it as an optional browser integration component after reviewing the platform's existing registry conventions. It does not own SIR, execute Colab, hold credentials or promote evidence.

## 8. What is not done by copying

Copying these folders does not automatically expose a UI route, register a module, create live Colab URLs, execute an FMU, install optional engines or provide physical/HIL validation. Grok must wire the optional UI affordance and registry according to the existing spine, then execute the acceptance tests. Do not claim the packages are fully integrated until those steps pass.
