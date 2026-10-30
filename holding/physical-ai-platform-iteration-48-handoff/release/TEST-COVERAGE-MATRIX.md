# Iteration 48 Cross-Package Test Coverage Matrix

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Manufacturing

| Area | Coverage | Exact source |
|---|---|---|
| Routing, quality, materials, capacity, calibration | Existing boundary and HOLD tests | `manufacturing/test.mjs` |
| Native regression | Native API preserved and exercised | `manufacturing/test.mjs` |
| Solver model and schedule | IDs, eligibility, horizon, precedence, overlap, capacity | `manufacturing/test.mjs`, `manufacturing/workers/test_workers.py` |
| LP/MILP | Integer optimum and finite capacity | `manufacturing/workers/test_workers.py` |
| Job-shop numerical | Competing machine and 20 deterministic feasible/infeasible pairs | `manufacturing/workers/test_workers.py` |
| Backend transport | Correlation, explicit fallback, payload limit, timeout, HTTPS, no shell | `manufacturing/test.mjs` |
| ERPNext | Mocked read-only REST and proposal-only write behavior | `manufacturing/test.mjs` |
| Notebook | JSON metadata and Python syntax | `release/test_notebooks.py` |

## Compute orchestration

| Area | Coverage | Exact source |
|---|---|---|
| Job schema | Required fields, enums, IDs, digest, payload safety | `compute-orchestration/test.mjs` |
| Boundaries | Negative/zero/positive memory, invalid/valid accelerator, runtime | `compute-orchestration/test.mjs` |
| Generated cases | 250 deterministic resource-policy cases | `compute-orchestration/test.mjs` |
| Provider discovery | Enabled/disabled/available/unavailable/unknown | `compute-orchestration/test.mjs` |
| CPU/GPU policy | Required GPU, preferred GPU, explicit CPU fallback | `compute-orchestration/test.mjs` |
| Digest integrity | Input and output SHA-256 match/mismatch | `compute-orchestration/test.mjs` |
| Numerical method | Fixed-seed Monte Carlo vs analytic series reliability | `compute-orchestration/test.mjs` |
| Browser Worker | Result correlation, timeout, error, termination | `compute-orchestration/test.mjs` |
| HTTPS worker | HTTPS-only, response size, JSON parse, correlation, timeout | `compute-orchestration/test.mjs` |
| Evidence and state | SIMULATED/PLANNED only; no physical promotion; legal state transitions | `compute-orchestration/test.mjs` |
| Colab notebook | Metadata and Python code-cell syntax | `release/test_notebooks.py` |

## Interpretation

- Assertion counts are not the same as source-code coverage percentages.
- Conventional coverage is capped at 100%; "110%" is delivered as additional adversarial and generated tests rather than a mathematically invalid coverage percentage.
- Real Colab GPU execution, real browser Worker deployment, live HTTPS remote workers and live ERPNext were not run in the build environment.
- The Iteration 47 conformance suite and regression checklist were run on the package overlay; they do not replace a browser end-to-end test or industrial qualification.
