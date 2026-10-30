Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# MRD and predecessor-source traceability

This matrix traces the Iteration 47 governing MRD and its preserved predecessor requirements into the two modules. "Implemented" means the domain function and tests exist. "Adapter boundary" means the module validates/exports the contract but cannot claim a live external integration.

| Source requirement | Implementation | Verification | Status |
|---|---|---|---|
| MRD §8 - supply-chain graph: origin, process, alternatives, lead time, export, obsolescence | `assessSupplyNetwork`, `assessSourceExposure`, `countIndependentSupplyPaths`, supplier planning | multi-tier graph, cycle, dangling edge, shared upstream bottleneck tests | Implemented |
| MRD §8 - EBOM/MBOM/SBOM/HBOM/CBOM/ABOM → System BOM | `explodeDemand` consumes explicitly released BOM rows; supports all six views and explicit child BOM types | six-view BOM tests; missing/unreleased/cycle/ambiguity HOLD tests | Implemented as explicit projection consumer |
| MRD §8 - batteries, hazmat, pressure vessels | material profile gates | missing/valid evidence tests | Implemented as evidence gates |
| MRD §8 - avionics and radio equipment | avionics evidence, radio type approval, spectrum authorization and jurisdiction gates | unknown/missing evidence tests | Implemented as evidence gates |
| MRD §8 - export restrictions and customs | `assessTradeCompliance`, source qualification and route gates | unknown/controlled/license/customs test cases | Workflow gate implemented; authority adapter boundary |
| Predecessor logistics graph - Supplier → Procurement → Inbound → Warehouse → Kitting → Production → Finished Goods → Regional Warehouse → Distributor → Customer | `validateLifecycleChain` | complete chain, skipped-stage, duplicate and time-regression tests | Implemented |
| Predecessor logistics graph - Field Service → Reverse Logistics → Repair/Refurbish/Recycle | lifecycle state model and `transitionReturnCase` | quarantine, inspection, authorization, disposition and terminal-state tests | Implemented |
| Predecessor robotics logistics - spares, repair depots, geographic service zones | `assessServiceCoverage` | served/unserved zone, spares and calibration tests | Implemented as planning evidence |
| Predecessor robotics logistics - calibration infrastructure | service depot `calibrations` and `calibrationStatus` | current/missing calibration tests | Implemented as evidence gate |
| Predecessor supply-chain graph - independent paths | vertex-disjoint path analysis | shared raw-material/process bottleneck versus independent path tests | Implemented |
| Predecessor obsolescence engine - lifecycle, last-time-buy, replacements, compatibility, redesign cost, qualification and certification impact | lifecycle checks and `assessObsolescenceImpact` | impacted interface/test/cert/process/system counts, unknown candidate evidence and cost tests | Implemented |
| Predecessor cost/economic simulation - shipping and customs cost | `calculateLandedCost` | explicit zero, missing/mixed currency and total tests | Landed cost implemented; broad unit economics remains cost-model owner |
| Inventory uncertainty and service levels | `calculateInventoryPolicy`; `additional-modules/supply-optimization/optimizer.py` | reorder/safety-stock boundaries, LP capacity and Monte Carlo tests | Implemented planning primitives |
| Transport and route choice | `planTransportRoute` | shortest cost/time, hazardous permissions, capacity, export and no-route tests | Deterministic route planner implemented |
| Serial/lot/batch traceability | inventory allocations, shipment records, kitting and production genealogy | lot/serial identity and quality release tests | Projection implemented |
| Cross-enterprise event visibility | `toEpcisEventProjection` | event field/identifier tests | EPCIS-shaped candidate only; no conformance claim |
| Sovereignty dashboard: explainable graph, not simplistic percentage | graph paths, jurisdictions, processes, supplier concentration; existing sovereignty-risk engine owns risk formula | shared dependency and qualified supplier tests | Implemented as evidence inputs |
| Browser-only static deployment | pure JS domain, JSON fixtures, optional Colab Python | no mandatory service in JS module; local CPU notebook path | Implemented |
| Optional GPU compute | PyTorch CUDA path for Monte Carlo only | CPU fallback test; Colab device detection | Implemented conditionally; GPU runtime not guaranteed |
| Canonical system model and typed relationships | `spine-adapter.js` uses `Artifact` + `CONTAINS` only | actual `createKernel()` integration test | Implemented projection adapter |
| Procurement/carrier/customs/WMS/live service integrations | documented adapter contracts, no fabricated live calls | deterministic contract fixtures only | External adapter boundary; requires authorized provider sandbox |

## Source hierarchy

1. `docs/MRD.md` in Iteration 47 is the governing consolidated baseline.
2. `sources/mrd-predecessor/` files are preserved source material and retain their authority.
3. `HANDOFF.md` constrains package boundaries: separate `drop-in/` modules, preserve HOLD, do not flatten or mutate the kernel, and do not exclude requirements.
4. The prior logistics cycles are used as implementation history, not as a substitute for the MRD.
