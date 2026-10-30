<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit design-space test coverage matrix

| Test range | Coverage | Assertions / expected behavior |
|---|---|---|
| 01-02 | Analytical model | Exact RC response, non-zero initial voltage |
| 03-06 | Nominal grid | Cartesian count, tau/rise/current/energy, feasible and infeasible constraints |
| 07-18 | Lower/upper/invalid boundaries | Empty, zero, NaN, non-monotonic/duplicate/negative time, bad backend, candidate/output limit, unknown/bad constraints, determinism |
| 19-21 | Parameter fit | Exact tau, noisy tau, weighted least squares |
| 22-26 | Fit input boundaries | Length mismatch, NaN, insufficient samples, bad bounds, bad weights |
| 27-28 | Identifiability | R recovered only with known C; fit does not claim separate R/C |
| 29-30 | Sensitivity | Analytical derivative and invalid tau |
| 31-33 | JAX/GPU | JAX device truthful; GPU-required requests cannot silently fall back to CPU |
| 34 | Fit boundary | Fit pinned at an active parameter bound returns HOLD |
| 35-36 | Shipped samples | RC design grid and RC measurement-fit JSON samples execute |
| 37-46 | Series RLC | Under/critical/over damping, initial voltage, constraints, invalid inputs, resource bound, determinism and shipped regime sample |
| 47 | Independent reference | Closed-form RLC responses agree with independent SciPy ODE integration for all three damping regimes |
| 48 | JAX RLC | JAX vectorized RLC grid reports its actual device or HOLD |
| 49 | Damping boundary | zeta just below/on/above classification tolerance is handled consistently |
| 50-51 | Resource boundaries | candidate and output caps accept exactly-at-limit cases |
| 52-53 | Zero-valued physical constraints | zero current/overshoot constraints are accepted only where meaningful |

Run:

```bash
python -m unittest -v
```

The three shipped JSON sample datasets are executed by tests 35-36 and 46. Current environment: 53 test methods executed. JAX CPU path was exercised if JAX was importable; GPU-required behavior was tested and must return HOLD when no GPU is exposed. This test count is not a statement of branch coverage percentage. No arbitrary “110% coverage” claim is made.
