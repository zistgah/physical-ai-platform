<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Test plan

## Coverage philosophy

"110% coverage" is not a mathematically meaningful coverage target. The target is complete requirement traceability plus boundary-value, adversarial, mutation-sensitive and integration testing. A percentage must come from an instrumented coverage tool and a defined denominator; it must not be invented.

## Test layers

1. **Unit - numerical core:** analytical profile, flow integral, residual, mesh convergence, uniform/nonuniform mesh, Couette/Poiseuille superposition, reversal and zero-flow.
2. **Boundary:** minimum/maximum cell count, smallest/largest accepted mesh, tolerance boundaries, extreme aspect ratio, wall values, pressure gradient signs, very small/large physical scales.
3. **Adversarial:** null/array input, missing properties, NaN/Infinity, non-monotone coordinates, wrong domain endpoints, overflow/singular assembly and non-finite diagnostics.
4. **Determinism:** repeated identical runs, frozen input and no mutation.
5. **Fixture:** all JSON samples parse and execute.
6. **Backend envelope:** invalid manifests, unknown licence, duplicate IDs, unsupported mode, dimension mismatch, missing subject/config references, adapter exceptions and unverified evidence semantics.
7. **Notebook:** valid ipynb JSON, metadata, attribution, accelerator path, CPU fallback, backend discovery and no saved outputs.
8. **Integration:** existing Iteration 47 CFD conformance patch, repository regression suites and full acceptance suite.
9. **External engine:** not run in this package release. Future adapters require exact version installation, executable probe, benchmark run, parser validation and resource-failure tests.
10. **Physical validation:** not run. Requires independent physical test data and uncertainty analysis.

## Boundary interpretation

- Below boundary: reject invalid/missing values with explicit HOLD.
- On boundary: accept only values included in the documented closed interval and verify numerical behavior.
- Above boundary: reject unsupported dimensions, cell counts, tolerances, aspect ratios and resource bounds.
- Specific: verify each physics assumption and expected analytical/benchmark result independently.

## Mutation testing

A strong test suite should fail if the computed velocity is replaced by zeros, residual is hard-coded, flow integral is removed, a HOLD is converted to OK, the backend trust state is promoted, or canonical references are ignored. Existing module assertions cover several numerical mutations; backend tests cover trust-promotion and missing-binding mutations. Run an external mutation tool in CI for line-level mutation score when available.
