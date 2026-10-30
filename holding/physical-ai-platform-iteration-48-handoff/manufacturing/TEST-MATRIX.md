# Manufacturing Test Coverage Matrix

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Test execution summary

The prior backend-enabled archive recorded 241 Node assertions. This Iteration 48 delivery re-runs the package tests after documentation/notebook additions and checks notebook syntax. Exact results are in `VERIFICATION.md`.

| Area | Below boundary | On boundary | Within | Above boundary | Invalid/failure | Test evidence |
|---|---|---|---|---|---|---|
| Routing inputs | Zero/missing quantity | Minimum valid quantity | Valid routing | Above capacity/horizon | Missing/invalid route | `test.mjs` |
| Quality | Missing inspection | Exact acceptance threshold | Passing inspection | Outside tolerance | Quality HOLD | `test.mjs` |
| Materials | Zero/negative availability | Exact required quantity | Sufficient stock | Excess stock | Shortage HOLD | `test.mjs` |
| Capacity | Zero capacity | Exact capacity | Partial load | Over capacity | Capacity HOLD | `test.mjs` |
| Calibration/resources | Missing evidence | Expiry boundary | Valid calibration | Expired/out-of-range | HOLD | `test.mjs` |
| Schedule | Negative start | Start at zero | Valid intervals | Beyond horizon | Overlap/precedence/duplicate/missing | `test.mjs` + Python workers |
| Solver model | Empty arrays | Minimum valid model | Multi-operation model | Large horizon / long duration | Duplicate IDs, invalid eligibility | `test.mjs`, worker tests |
| Solver output | Negative time | Zero start | Valid assignments | Horizon exceeded | Wrong station, missing op, overlap, precedence break | Independent validator tests |
| LP/MILP | Invalid bounds | Bound exactly active | Feasible optimum | Capacity exceeded | Infeasible/unknown/invalid | `workers/test_workers.py` |
| Discrete-event | Zero duration rejected | Positive duration | Multiple jobs | Queue contention | Invalid resource/job IDs | `workers/test_workers.py` |
| Backend registry | No provider | One provider | Multiple providers | Oversized payload | Disabled, unknown, duplicate, protocol mismatch | `test.mjs` |
| Transport | Timeout boundary | Exact response limit | Valid JSON | Response too large | Timeout, malformed JSON, insecure URL | `test.mjs` |
| ERPNext | Missing credential | Valid credential | Read-only resource | Unknown resource | 401/403/404/network failure | mocked transport tests |
| Colab notebook | Missing dependency | Required package present | CPU solver run | GPU availability varies | Install/runtime failure | notebook syntax and Colab-only execution |

## Numerical test corpus

- HiGHS job-shop worker: single-order precedence case.
- HiGHS job-shop worker: two independent jobs competing for one finite-capacity machine.
- Deterministic generated set: 20 feasible/infeasible pairs (40 solver executions).
- LP/MILP: integer lot-size optimum under a fractional capacity upper bound.
- Independent schedule validator: operation coverage, duplicate assignment, station eligibility, durations, precedence, no-overlap, station capacity and horizon.
- Worker protocol: request correlation, dependency absence and explicit `UNAVAILABLE`.

## What this matrix does not claim

- 100% statement, branch or MC/DC coverage has not been measured.
- The tests do not qualify all optional backend versions.
- The tests do not prove industrial, regulatory, physical, HIL or machine safety.
- Colab GPU execution is not run in the local release environment.
