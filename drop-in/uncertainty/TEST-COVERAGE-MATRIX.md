# Uncertainty package test coverage matrix

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

| ID | Dimension | Below boundary | On boundary | Above/invalid | Test evidence |
|---|---|---|---|---|---|
| UQ-01 | Parameter count | 0 rejected | 1 and 32 accepted | 33 rejected | `tests/run.mjs` |
| UQ-02 | Samples | 0 rejected | 1 and 10,000 accepted | 10,001 rejected | `tests/run.mjs` |
| UQ-03 | Seed | negative rejected | 0 and uint32 max accepted by validator | >uint32 rejected | `tests/run.mjs` |
| UQ-04 | Uniform bounds | inverted rejected | min=max accepted | non-finite/out-of-bound rejected | `tests/run.mjs` |
| UQ-05 | Normal distribution | negative stddev rejected | stddev=0 accepted | unsupported distribution rejected | `tests/run.mjs` |
| UQ-06 | Metrics | empty rejected | 1 and 32 accepted | 33 rejected | `tests/run.mjs` |
| UQ-07 | Runner result | missing/HOLD rejected | finite named metrics accepted | NaN/Infinity/missing metric rejected | `tests/run.mjs` |
| UQ-08 | Failure handling | no runner rejected | completed OK samples summarized | exception/timeout/HOLD aborts entire study | `tests/run.mjs` |
| UQ-09 | Determinism | n/a | same seed and spec reproduce exactly | changed seed changes stream | `tests/run.mjs` |
| UQ-10 | Integration | simulation HOLD aborts | native solver outputs aggregated | any failed sample yields HOLD | `tests/integration.mjs` |

No claim of statistical confidence interval, global sensitivity analysis, Bayesian inference, reliability certification or physical validity is made.
