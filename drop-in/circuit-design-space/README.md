<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit Design-Space Exploration

**Separate companion drop-in:** `drop-in/circuit-design-space/`  
**Version:** 1.0.0  
**License:** GNU GPL v3.0-only. Third-party dependencies retain their own licenses.

This is an additional module not listed among the ten Iteration 47 handoff packages. It must remain separate from `drop-in/circuit/` and must not modify the kernel. It provides bounded RC and series-RLC design-space exploration, analytical response calculation, RC time-constant identification and optional JAX acceleration for large parameter grids.

## Browser-only usage

The platform UI remains static/browser-only. This Python module runs in an optional Google Colab runtime, not in the GitHub Pages browser bundle and not on the user's local computer. Open `notebooks/circuit-design-space-lab.ipynb` in Colab. See `COLAB.md` for the link template and Grok's integration requirements.

## Runtime

- Python 3.10+
- NumPy
- SciPy for parameter fitting
- JAX optional for CPU/GPU vectorized design-space sweeps

No simulator is invoked by this package. It consumes parameter grids or measurement traces and does not create or edit the canonical circuit netlist.

## API

- `rc_step_response(...)`: analytical first-order RC step response.
- `rlc_step_response(...)`: analytical series-RLC capacitor step response with damping-regime classification.
- `explore_rc_design_space(...)`: Cartesian R×C grid, transient samples, tau, 10-90 rise time, initial current, stored energy and explicit feasibility constraints.
- `explore_rlc_design_space(...)`: Cartesian R×L×C grid, natural frequency, damping regime, sampled overshoot, capacitor energy and explicit feasibility constraints.
- `fit_rc_time_constant(...)`: bounded least-squares estimate of tau.
- `resistance_from_tau(...)`: recover R only when independently known C is supplied.
- `local_sensitivity_tau(...)`: analytical local sensitivity.

## Identifiability

A single ideal first-order RC step response identifies only `tau = R*C`. It cannot independently identify R and C. The fit API reports tau only. The separate resistance helper requires independently known capacitance. This avoids a false two-parameter fit.

## GPU behavior

`backend="jax"` uses the JAX device selected by JAX and reports `jax:gpu` or `jax:cpu`. `require_gpu=True` returns HOLD if a GPU is unavailable. `backend="auto"` may use JAX if importable and otherwise falls back to NumPy; it does not claim GPU use unless the actual device is GPU. GPU acceleration applies to vectorized analytical grid evaluation, not ngspice or Xyce execution.

## Tests

```bash
python -m unittest -v
```

The test suite covers nominal, lower/upper boundary, above-boundary, invalid, determinism, identifiability and GPU-reporting cases. The package includes three runnable JSON samples (`samples/rc-design-space.json`, `samples/rc-measurements.json`, `samples/rlc-damping-regimes.json`) and the current suite contains 53 test methods. This is not a claim of 100% branch coverage.

Open [Google Colab](https://colab.research.google.com/) and upload `notebooks/circuit-design-space-lab.ipynb`. After Grok commits it to the actual repository, use the repository-specific link documented in `COLAB.md`.
