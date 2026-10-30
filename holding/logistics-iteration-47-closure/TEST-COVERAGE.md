Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Test coverage matrix and boundary strategy

## Executed test suites in this package

- Logistics JavaScript: 120 explicit assertions.
- Canonical-spine integration adapter: 6 assertions (actual Iteration 47 kernel).
- Python optimization: 33 `unittest` cases.
- JSON samples: order/supplier/export scenario batch, multi-tier network, constrained sourcing.
- Colab notebook: 19 cells (8 executable); notebook schema validated and all 8 code cells execute on CPU. CUDA was unavailable locally. Actual Colab GPU execution is not claimed from a CPU-only test environment.

"110% coverage" is not a valid measurable software-coverage metric. This package instead reports explicit assertion counts and boundary classes. It does not claim 100% line/branch coverage unless a coverage instrument is run and archived.

## Boundary classes

| Boundary | Required test pattern | Implemented examples |
|---|---|---|
| Below minimum | zero, negative, missing, empty | quantity 0, lead -1, empty scenarios, empty graph, missing actor |
| Exactly on boundary | exact capacity, exact due date, one eligible path, zero explicit cost | supplier capacity equal to demand, route capacity equal to load, explicit zero duty |
| Above maximum | over-capacity demand, duplicate serial, lane capacity below load, invalid service share | over-picked kit, duplicate event/serial, capacity failure, share > 1 |
| Unknown | UNKNOWN/UNSPECIFIED/absent | export, customs, supplier lifecycle, quality, license, certification, spectrum |
| Contradictory | incompatible dates, mixed currencies, invalid transition | event time regression, mixed currency, BOM cycle, impossible lifecycle transition |
| Adversarial | duplicate IDs, dangling graph edges, shared bottleneck, maliciously incomplete data | duplicate stock/shipment/supplier, dangling route edge, shared raw-material cut |
| Determinism | same input + seed => same result | JS repeated planning, seeded Python Monte Carlo |
| Monotonicity | improving resource must not worsen metric | more supply cannot reduce simulated fill rate; service-level increase increases safety stock |
| Integration | adapter must use existing canonical entities/relations | actual `createKernel()` Artifact/CONTAINS integration |

## Functional test matrix

| Subsystem | Positive coverage | Negative/boundary coverage |
|---|---|---|
| BOM | all six views | missing, ambiguous, unreleased, invalid, cyclic |
| Inventory | FEFO, available stock, reservation | expiry, unknown quality, duplicate lot, no as-of date |
| Suppliers | approved active, alternate | unknown export/lifecycle, obsolete, unapproved, late, duplicate |
| Shipments | in-transit allocation, lifecycle | past ETA, arrival not released, illegal transition, missing event metadata |
| Trade/customs | clear, valid license | UNKNOWN, invalid HS format, missing screen, customs not cleared |
| Routes | lowest cost/time | special cargo restriction, insufficient lane capacity, no path, unknown objective |
| Supply continuity | disjoint alternatives | shared upstream bottleneck, cycle, dangling node |
| Obsolescence | complete replacement | missing/failed compatibility and missing cost evidence |
| Service | authorized depot with spares/calibration | uncovered geography, missing calibration, no authorization |
| Kitting/genealogy | complete released lot kit | short pick, over-pick, unexpected material, quarantined stock |
| Reverse logistics | quarantine → inspect → authorize → disposition | no quarantine, unverified inspection, unauthorized scrap |
| Landed cost | explicit line items | missing, negative, mixed currency |
| Inventory policy | valid statistical inputs | zero lead, zero holding cost, negative values |
| Python LP | feasible optimum | no capacity, late, unapproved, export unknown, currency mismatch, carbon cap infeasible, supplier share, backend selection and optional backend missing-dependency HOLD |
| Python graph | independent and shared-path graph | dangling endpoint, missing source/sink |
| Monte Carlo | seeded CPU and optional GPU branch | invalid inputs, iteration floor/ceiling |

## Coverage limitations

- No live supplier, carrier, customs, sanctions, WMS or service-depot sandbox was available.
- GPU hardware was not available in the local execution environment; notebook code detects and uses CUDA only when present.
- Full EPCIS/CBV conformance is not claimed.
- Browser UI integration is not performed by this drop-in. The adapter contract is tested against the canonical kernel; Grok must wire the browser workbench view.
- Full acceptance mutation/browser gates must be reported separately from the executed acceptance run.
