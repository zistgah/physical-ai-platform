<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Iteration 47 circuit handoff addendum

This delivery contains two separate drop-in packages:

1. `drop-in/circuit/` - version 0.4.1 circuit solver and ngspice/Xyce backend federation.
2. `drop-in/circuit-design-space/` - version 1.0.0 additional module not listed in the ten-folder handoff; RC and series-RLC design-space exploration, damping classification, RC parameter identification, and optional JAX CPU/GPU vectorization.

Keep the packages separate. Do not place design-space code inside `drop-in/circuit/`. Do not modify the canonical kernel or acceptance script.

The public platform remains static-first and browser-only. Both packages include Colab notebooks for user-initiated cloud execution. Node.js/native simulators and Python/JAX run only in the optional Colab runtime or a future trusted worker. No local software is required for normal browser use. ngspice/Xyce are not claimed to be GPU accelerated; JAX accelerates analytical design-space grids when a real GPU device is available.

Read the circuit package's `ENGINEERING-ANALYSIS.md`, `CODE-REFERENCE.md`, `TEST-COVERAGE.md`, `COLAB.md`, `STITCH-INSTRUCTIONS.md` and `VERIFICATION-REPORT.md`. Read the corresponding files in the separate design-space package.

The supplied Iteration 47 archive does not identify a Git remote/owner/repository/branch. Grok must replace the Colab deep-link placeholders with actual repository coordinates after committing the notebooks. Until then, users open Google Colab and upload the notebook from the relevant package ZIP.
