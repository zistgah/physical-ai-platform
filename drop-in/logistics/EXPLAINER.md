Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Logistics drop-in

## What an industry leader has

An enterprise logistics and supply-chain suite combines multi-echelon planning, transactional inventory, procurement execution, supplier collaboration, warehouse and transport management, customs/trade workflows, traceability, reverse logistics, service parts, optimization and governed scenario orchestration.

## What this package delivers

A browser-compatible logistics domain module for the Iteration 47 physical-engineering spine. It provides structured planning, six-view BOM explosion, released inventory and lot controls, supplier qualification, trade evidence gates, route planning, lifecycle traceability, kitting/genealogy, reverse logistics, service coverage, obsolescence impact, landed cost, independent supply paths and deterministic disruption scenarios.

## Constraints

- Do not flatten the canonical kernel.
- Do not modify the acceptance script.
- Preserve the legacy `supply({part, qty, lead})` API.
- Preserve HOLD behavior and explicit evidence states.
- Do not claim planning is procurement or physical execution.
- Do not invent canonical entity types or unresolved relations.
- No mandatory server, database, external service, Python runtime or GPU.
- All files retain the copyright and GPL-3.0-only notice.

## Run

```bash
node test.mjs
node spine-integration.test.mjs
```

Expected logistics suite: 120 assertions. The spine integration suite requires the module to be overlaid in the Iteration 47 repository and runs against its actual canonical kernel.

## Files

- `module.js`: pure logistics domain API.
- `spine-adapter.js`: canonical Artifact/CONTAINS projection adapter.
- `test.mjs`: 120 assertions.
- `spine-integration.test.mjs`: actual kernel integration tests.
- `samples/`: original planning, network and extended lifecycle/trade/route fixtures.
- `docs/`: complete API, architecture, MRD, test and integration documentation.

## Additional optional module

The separate numerical optimization workbench is delivered outside `drop-in/` under `additional-modules/supply-optimization/`. It is not part of the original ten-package acceptance count. Grok should propose it as an eleventh package in a versioned handoff update, update the package-count conformance test in that same versioned change, and retain the original ten packages unchanged.

## Handoff

Read `STITCHING.md` and `MRD-TRACEABILITY.md` before integration. Use only existing canonical relations and persist the module's outputs as projections until new typed relations are approved.
