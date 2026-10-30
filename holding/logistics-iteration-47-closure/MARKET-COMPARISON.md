Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Market comparison and capability position

**Research date: 30 October 2026.** This is a public-capability comparison, not a benchmark trial, vendor certification or procurement recommendation.

## Comparable systems

| Product/system | Publicly documented capability | Current package position |
|---|---|---|
| SAP Integrated Business Planning | Demand forecasting/sensing, multi-stage inventory optimization, multilevel BOM planning, supply planning, scenario analysis and network visibility | Our deterministic module and small LP are materially narrower. No enterprise-scale stochastic multi-echelon optimization or collaboration. |
| Oracle Fusion Cloud SCM / Supply Chain Planning | Demand, supply and capacity planning, alternate resources/suppliers, production scheduling, supplier collaboration, inventory, warehouse, transport and trade integration | We have standalone domain primitives and adapter contracts, not a unified enterprise suite or live execution. |
| Kinaxis Maestro | Concurrent planning, real-time scenario rebalancing, custom optimization/ML extensions, supply chain orchestration and execution | Our Python companion is a single constrained sourcing LP plus risk simulation, not concurrent enterprise planning. |
| Blue Yonder | End-to-end planning, order management, warehouse, transportation, returns and command-center capabilities | Our lifecycle and route planning are local deterministic functions, not WMS/TMS execution or real-time command center. |
| EPCIS 2.0.1 / CBV | Interoperable supply-chain visibility event model and capture/query semantics | We provide an EPCIS-shaped candidate projection only; conformance is not claimed. |

## What is genuinely useful and differentiated here

- A browser-first, static-compatible logistics domain module that does not require a mandatory cloud backend.
- Direct alignment to a physical engineering digital thread: BOM, component, process, material, evidence, manufacturing, service and reverse lifecycle.
- Explainable supply-path resilience that can expose shared upstream material/process/jurisdiction bottlenecks instead of counting supplier names.
- Fail-closed export, quality, lifecycle, calibration and special-material evidence gates.
- An optional, replaceable open-source numerical stack rather than a mandatory proprietary optimizer.
- Clear separation between optimization proposals and authorized procurement/execution.

## Open-source backend strategy

- **SciPy HiGHS**: default constrained linear programming for source allocation. CPU solver; reproducible and suitable for LP.
- **OR-Tools GLOP**: optional alternative open-source LP backend with the same normalized model contract.
- **Pyomo + HiGHS**: optional algebraic modeling adapter for users who need a richer modeling layer; solver availability is checked explicitly.
- **NetworkX**: graph analysis, vertex-disjoint paths, cut sets and articulation points.
- **NumPy**: CPU Monte Carlo baseline.
- **PyTorch**: optional CUDA acceleration for large Monte Carlo/tensor workloads. Not used to claim GPU acceleration of the LP.
- **Google Colab**: optional browser-based execution environment; no GPU availability guarantee.
- Other adapters can be added behind the optimizer input/output contract, but solver outputs must be compared on identical data/objectives/constraints.

## Honest maturity assessment

**Current maturity:** robust, test-backed, static-first logistics domain and optional optimization prototype.

**Not established:** enterprise-grade concurrent planning, production-grade multi-echelon inventory optimization, supplier collaboration, EDI, WMS, TMS, live tracking, regulatory determination, certified EPCIS, security certification, 24/7 availability, recovery objectives, large-scale performance or multi-tenant access control.

Do not market this package as a replacement for SAP, Oracle, Kinaxis or Blue Yonder. It is a composable, auditable subsystem intended to be integrated into the Physical-AI engineering lifecycle. Its differentiation is the canonical physical-engineering context and sovereignty analysis, not parity with enterprise execution suites.

## Primary public sources

- SAP IBP features: https://www.sap.com/products/scm/integrated-business-planning/features.html
- SAP IBP feature scope (2026): https://help.sap.com/docs/SAP_INTEGRATED_BUSINESS_PLANNING/252c83bbf8184915a56d4cdd0917ef06
- Oracle Fusion Cloud Supply Planning: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26d/faips/scp-about-oracle-fusion-cloud-supply-chain-planning.html
- Oracle Fusion Cloud SCM: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26b/faips/about-oracle-fusion-cloud-supply-chain-manufacturing.html
- Kinaxis Maestro platform: https://www.kinaxis.com/en/solutions/platform
- Kinaxis Solver Studio: https://www.kinaxis.com/en/maestro-solver-studio
- Blue Yonder portfolio: https://blueyonder.com/
- Blue Yonder Warehouse Management: https://blueyonder.com/solutions/warehouse-management
- EPCIS 2.0.1 standard archive: https://ref.gs1.org/standards/epcis/archive
- Google Colab FAQ: https://research.google.com/colaboratory/faq.html
