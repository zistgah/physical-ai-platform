Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Grok stitching and integration instructions

## Non-negotiable constraints

- Do not modify or flatten the canonical kernel.
- Do not modify the original MRD, predecessor sources or acceptance script.
- Do not merge `supply-optimization` into `logistics`.
- Keep the optional optimizer outside `drop-in/` for the current Iteration 47 baseline; the existing conformance test asserts exactly ten drop-in packages.
- Do not add invented canonical entity types or relations.
- Do not claim external services are connected.
- Preserve all HOLD and evidence-state semantics.
- Browser-only/static-first deployment remains functional without Colab or Python.

## 1. Overlay the logistics module

Copy:
- `logistics/` → repository `drop-in/logistics/`

Do not overwrite `site/components/manufacturing/logistics.js` with the new domain module. The existing `Logistics` class is a canonical compatibility surface. The new adapter is an optional bridge.

Keep:
- `additional-modules/supply-optimization/` → repository `additional-modules/supply-optimization/`

This is an additional optional module. Do not count it as an eleventh `drop-in/` package until a versioned handoff update changes the package registry and package-count conformance contract.

## 2. Canonical projection integration

Use `drop-in/logistics/spine-adapter.js`:

```js
import { LogisticsSpineAdapter } from "./drop-in/logistics/spine-adapter.js";
const adapter = new LogisticsSpineAdapter(kernel);
const saved = adapter.persistProjection({
  projectId,
  id: "stable-plan-id",
  kind: "SUPPLY_PLAN",
  result: logisticsResult
});
```

It stores a canonical `Artifact` and uses existing `Project --CONTAINS--> Artifact`. It does not create Shipment, InventoryLot, ReturnCase or SupplyAllocation entity types. It does not write unresolved `CONSUMES`, `HAS_EVENT`, `SUPPLIED_BY` or `MANUFACTURED_BY` edges.

If native first-class logistics entities are desired later, propose a versioned entity/relation schema extension with registry tests and migration. Do not silently introduce those types during this stitch.

## 3. Manufacturing, substitution, sovereignty and cost integration

- Feed released product-structure BOM projections into `supply({order,boms,...})`. Do not infer missing CBOM/ABOM contents.
- Use `substitution.js` for component substitution; use logistics impact analysis for supply availability and downstream impact evidence.
- Feed independent-path and exposure evidence into the existing `sovereignty-risk.js` model. Do not create a second sovereignty percentage.
- Feed landed-cost breakdown into the existing cost-model only after currency and provenance validation.
- Keep manufacturing capacity and work-order execution in the manufacturing module. Logistics kitting/consumption is a traceability proposal until the canonical event relation is resolved.

## 4. Colab integration

- Add `additional-modules/supply-optimization/notebooks/supply_chain_optimization.ipynb` to the notebook catalog.
- Add a Colab URL only after confirming repository owner/name/branch.
- The notebook must remain optional and must not be imported by the static application.
- Use synthetic sample data by default.
- Require review/approval before promoting a result to a canonical procurement plan.

## 5. Run tests

From the repository root:

```bash
node drop-in/logistics/test.mjs
node drop-in/logistics/spine-integration.test.mjs
(cd additional-modules/supply-optimization && python -m unittest -v test_optimizer.py)
node tools/conformance-test-iter47.mjs
node tools/conformance-test.mjs
node tools/regression-checklist.mjs
node tools/mutation-report.mjs
node tests/acceptance.mjs --no-mutation --no-browser
```

Then run the unmodified full acceptance script in an environment with sufficient time and Playwright. Record every skip, timeout and unavailable gate.

## 6. Browser UI wiring

Add a Logistics workbench view that:
- imports JSON scenario/sample files in-browser;
- displays demand, shortages, allocations, source path, holds and warnings;
- exposes route and service coverage analysis;
- displays provenance and evidence status;
- exports result JSON;
- opens the Colab notebook externally for optional advanced optimization.

Do not auto-commit, auto-procure, auto-dispatch or auto-release inventory. Do not silently send user data to Colab or any external service. Show exactly what data leaves the browser.

## 7. Release and regression discipline

- Keep `logistics` and `supply-optimization` version numbers independent.
- Hash source files and fixtures in the package manifest.
- Re-run all package tests after any edit.
- Re-run the original platform acceptance and regression suites after overlay.
- Compare canonical kernel and acceptance script hashes before/after overlay to prove they were not changed.
