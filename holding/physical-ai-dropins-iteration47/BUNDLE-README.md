# Iteration 47 Physical AI drop-in bundle

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

This archive contains two independently versioned packages. They are sibling folders, not merged modules:

- `simulation/` -> install as `drop-in/simulation/` (v3.1.0).
- `uncertainty/` -> install as `drop-in/uncertainty/` (v1.0.0), a new optional package beyond the original ten-module Iteration 47 handoff.

Do not modify the canonical kernel or acceptance script. Grok owns final central registration, UI reachability and any async worker/host bridge. Read each package's `GROK-HANDOFF.md` before integration.

The simulation notebook is `simulation/notebooks/simulation-gpu-qualification.ipynb`. Open [Google Colab](https://colab.research.google.com/) and upload the notebook. A direct repository-backed Colab URL must only be published after the notebook is committed at the exact repository path; do not invent one.

Package-authored materials are licensed under GPL-3.0. Third-party engine licenses remain separate. See each package's `LICENSE` and simulation's `THIRD-PARTY-NOTICES.md`.
