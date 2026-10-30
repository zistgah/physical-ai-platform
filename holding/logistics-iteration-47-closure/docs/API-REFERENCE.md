Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# API reference

## Logistics JavaScript module

Import from `drop-in/logistics/module.js`.

| API | Purpose | HOLD conditions |
|---|---|---|
| `supply(input)` | Legacy estimate or structured order planning | invalid order, shortage, unqualified source, missing evidence |
| `recordShipment(input)` | Validates shipment fact | incomplete identity, status, ETA, origin/process |
| `appendShipmentEvent(input)` | Validated shipment state transition | illegal transition, duplicate ID, missing actor/location/business step/disposition, quality release evidence |
| `transitionReturnCase(input)` | Reverse-logistics workflow | missing quarantine, inspection, authorization or environmental evidence |
| `assessSourceExposure(input)` | Qualified supplier/jurisdiction/process exposure | missing part |
| `assessSupplyNetwork(input)` | Multi-tier topology validation and tier depth | cycle, dangling edge, unknown supplier status |
| `runLogisticsSimulation(input)` | Deterministic scenario runner | empty or malformed scenario set |
| `validateLifecycleChain(input)` | Forward/reverse lifecycle event chain | invalid/skip transition, missing evidence, non-monotonic time |
| `assessTradeCompliance(input)` | Export/customs workflow evidence gate | UNKNOWN, not screened, missing customs/origin/classification data |
| `planTransportRoute(input)` | Cost/time/balanced route choice | no eligible route, insufficient lane capacity, prohibited handling |
| `countIndependentSupplyPaths(input)` | Vertex-disjoint continuity path count | invalid graph, dangling edge |
| `assessObsolescenceImpact(input)` | Downstream impact and replacement evidence | unknown/failed compatibility, unknown costs, missing candidate |
| `calculateLandedCost(input)` | Explicit cost line aggregation | missing/negative/mixed-currency values |
| `calculateInventoryPolicy(input)` | Safety stock, reorder point, EOQ approximation | invalid statistical/economic inputs |
| `assessServiceCoverage(input)` | Geographic depot/spares/calibration coverage | uncovered zones or incomplete authorization/capability |
| `recordKitting(input)` | Kit manifest | shortage, over-pick, unexpected material, unreleased lot |
| `recordProductionConsumption(input)` | Work-order genealogy projection | mismatched work order, invalid kit, missing actor/time/lot |
| `simulateDisruptions(input)` | Supplier/demand/shipment what-if runs | invalid scenario inputs |
| `toEpcisEventProjection(input)` | EPCIS 2.0.1-shaped event projection | missing identifiers, timestamp, location or event semantics |

### Compatibility

The legacy `supply({part, qty, lead})` contract remains available. Structured planning is selected by the presence of `order`. Existing function names and HOLD semantics are preserved.

## Optional Python module

Import from `additional-modules/supply-optimization/optimizer.py`.

- `available_backends()` - reports detected explicit solver adapters.
- `optimize_sourcing(problem)` - SciPy HiGHS constrained LP with optional OR-Tools GLOP and Pyomo HiGHS backends.
- `safety_stock(...)` - normal-approximation safety stock and reorder point.
- `simulate_uncertainty(...)` - seeded Monte Carlo with optional PyTorch CUDA.
- `analyze_network_resilience(nodes, edges, source, sink)` - NetworkX vertex-disjoint paths, minimum cut and articulation points.
- `simulate_event_timeline(events)` - deterministic logical-time event replay.

All optimizer outputs are proposals. They do not create purchase orders, reserve stock or dispatch shipments.
