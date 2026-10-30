Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Architecture and data-flow contract

## 1. Browser-first composition

```text
Canonical SIR / Project Graph
        |
        v
Manufacturing BOM + Supplier + Material + Process + Evidence
        |
        v
Logistics Domain (pure JavaScript)
  |-- demand / BOM explosion
  |-- inventory / lot / shipment qualification
  |-- lifecycle and trade gates
  |-- route / service coverage
  |-- kitting / consumption genealogy
  |-- obsolescence / resilience / landed cost
        |
        +--> JSON projections / CSV exchange / samples
        |
        +--> LogisticsSpineAdapter
                 |
                 v
        Canonical Artifact + CONTAINS
        (no invented entity or relation)

Optional computational path:
JSON scenario --> supply-optimization Python --> SciPy HiGHS / optional OR-Tools GLOP / Pyomo HiGHS LP
                                      |-------> NetworkX graph analysis
                                      |-------> NumPy Monte Carlo
                                      |-------> PyTorch CUDA optional
                                      |
                                      v
                             result JSON proposal
                                      |
                                      v
                        human review / canonical evidence
```

## 2. Module separation

`logistics/` is the domain contract and browser-compatible baseline. It does not import Python, Node-only APIs, a database, network access or a server.

`additional-modules/supply-optimization/` is a separate optional computational package. It is not imported by the static site. It runs in Google Colab or another authorized Python environment and returns a result artifact. It cannot mutate the canonical graph.

## 3. Canonical adapter

The current registry supports `Artifact` and `Project CONTAINS Artifact`. The adapter persists a logistics result as an Artifact with:
- `artifactKind: LOGISTICS_PROJECTION`
- `logisticsKind`
- `projectionVersion`
- `decision: OK | HOLD`
- full JSON `payload`
- provenance, source project and `authority: PROJECTION_ONLY`

The adapter intentionally does not create a new `Shipment`, `InventoryLot`, `ReturnCase` or `SupplyAllocation` entity type. It does not write `CONSUMES`, `HAS_EVENT`, `SUPPLIED_BY` or `MANUFACTURED_BY` without a versioned registry contract. This is deliberate spine preservation, not a missing shortcut.

## 4. Event and traceability semantics

Shipment events carry event ID, event time, actor, location, business step and disposition. The EPCIS projection maps identifiers and visibility fields to an ObjectEvent-shaped payload, but marks `conformance: NOT_CLAIMED`. Before external exchange, the payload must be validated against the exact EPCIS 2.0.1 and CBV vocabulary/schema and trading-partner profile.

## 5. Failure semantics

- `OK`: supplied data satisfies the function's explicit contract.
- `HOLD`: missing, contradictory, unqualified or unsafe data prevents the decision.
- `PLANNED_NOT_PURCHASED`, `SOURCE_PLAN`, `INBOUND_COMMITTED`, `KIT_READY`, `ROUTE_PLAN_ONLY` are deliberately distinct from physical execution.
- No function turns missing cost into zero, unknown export status into clear, shipment arrival into quality release, or AI/solver output into authority.

## 6. Determinism and provenance

The JS functions use supplied dates and data. They do not read wall-clock time. Scenario inputs must be versioned and hashed by the adapter if persisted. The Python Monte Carlo path uses an explicit seed. Persist result, input snapshot, module version, solver version, objective weights, scenario ID and review/approval evidence together.
