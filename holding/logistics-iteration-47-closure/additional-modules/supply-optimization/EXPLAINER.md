Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Optional supply-optimization module

## What an industry leader has

A mature enterprise optimizer supports concurrent multi-echelon planning, probabilistic demand/supply uncertainty, capacity and inventory constraints, real-time collaboration, solver governance and execution integration.

## What this module delivers

A separate, optional computational package for the Physical-AI platform:
- constrained sourcing LP using SciPy HiGHS, with optional OR-Tools GLOP and Pyomo HiGHS adapters;
- supplier share, lead-time, capacity, carbon, currency, approval, lifecycle and export gates;
- NetworkX path/cut analysis;
- safety stock and reorder-point approximation;
- seeded Monte Carlo risk simulation;
- optional PyTorch CUDA for Monte Carlo tensor operations;
- deterministic event replay;
- browser-based Colab notebook.

## Constraints

- This module is outside the original ten-package `drop-in/` directory.
- It is not imported by the static platform.
- It does not persist to or mutate the canonical spine.
- It does not create POs, reserve inventory, clear customs or dispatch shipments.
- The LP runs on CPU; CUDA is optional for Monte Carlo.
- Preserve the copyright and GPL-3.0-only notices.

## Run

```bash
python -m pip install -r requirements.txt
python -m unittest -v test_optimizer.py
```
