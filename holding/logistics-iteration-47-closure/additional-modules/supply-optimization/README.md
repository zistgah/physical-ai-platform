Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Supply Optimization - additional module

This is an independent optional module added because the original ten-package handoff did not include a dedicated constrained supply optimizer or uncertainty workbench.

It is **not** merged into `logistics/` and is not imported by the static platform.

## Capabilities
- constrained supplier allocation using SciPy HiGHS LP;
- explicit due-date, capacity, approval, lifecycle, export, currency and carbon constraints;
- supplier-share diversification;
- NetworkX vertex-disjoint paths, minimum node cut and articulation points;
- deterministic event timeline replay;
- safety-stock/reorder-point approximation;
- seeded Monte Carlo stockout/fill-rate analysis;
- optional PyTorch CUDA acceleration for Monte Carlo tensor operations.

## Run

```bash
python -m pip install -r requirements.txt
python -m unittest -v test_optimizer.py
```

For GPU acceleration, use Google Colab and select an available GPU runtime. The LP remains CPU-based. The code reports the actual Monte Carlo device and falls back to NumPy CPU.

Notebook: `notebooks/supply_chain_optimization.ipynb`.
