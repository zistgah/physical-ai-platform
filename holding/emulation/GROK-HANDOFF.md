Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Grok handoff - exact integration instructions

## What is in this bundle

- Existing Iteration 47 package upgraded: `drop-in/emulation/` version 1.2.0.
- Additional module: `integrations/colab-bridge/` version 1.0.0.
- Six standalone Colab notebooks: `notebooks/emulation/`.

## Why the additional module is outside `drop-in/`

The unchanged Iteration 47 conformance script asserts exactly ten packages in `drop-in/`. The first integration attempt failed when the additional bridge was placed under `drop-in/`. It was moved to `integrations/colab-bridge/`, after which the unchanged conformance script passed. Do not move it into `drop-in/` unless you deliberately version and update that architectural contract.

## Stitch steps

1. Replace the existing `drop-in/emulation/` folder with the folder in this bundle.
2. Add `integrations/colab-bridge/` at repository root.
3. Add `notebooks/emulation/` at repository root.
4. Import the emulation core and bridge as browser ES modules. Do not add Node, Python, native binaries or a backend service to the static app.
5. Map canonical SIR to job bundle; user downloads job JSON, opens selected Colab notebook, runs, downloads result JSON, and imports it through `validateResultBundle()`.
6. Map imported values to SIR ports with explicit units and frames. Create a platform-owned simulation evidence record; retain SIMULATED/UNVERIFIED status.
7. Confirm repository owner/repository/branch and fill the Colab URL templates. The supplied archive does not contain a confirmed public GitHub URL.
8. Run commands in the package stitch instructions and test report.

## Preserve

- Canonical kernel and SIR authority.
- Existing ten-package drop-in structure.
- Existing acceptance script.
- Other nine modules.
- HOLD/MISMATCH/OK and evidence promotion semantics.
- Browser-only static deployment.

## Test results already obtained

See `drop-in/emulation/TEST-REPORT.md`. The supplied Iteration 47 working copy passed 64/64 regression suites, conformance, and the SIR/fidelity integration boundary. Platform acceptance passed 55 checks with eight explicit skips under the no-browser/no-mutation command. Do not misreport those skipped stages as passed.
