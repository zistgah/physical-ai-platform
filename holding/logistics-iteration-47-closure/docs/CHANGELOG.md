Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Changelog

## 3.0.0 - 2026-10-30

### Logistics domain
- Preserved prior structured planning, BOM, FEFO, reservations, supplier, shipment, reverse logistics and supply graph functions.
- Added forward/reverse lifecycle chain validation, trade/customs evidence gates, transport route planning, independent path/cut analysis, obsolescence impact, landed cost, inventory policy, service-zone/spares/calibration coverage, kitting, production genealogy, disruption scenarios and EPCIS-shaped candidate projection.
- Added browser-compatible canonical Artifact/CONTAINS projection adapter.
- Expanded logistics suite to 120 assertions and actual kernel integration suite to 6 assertions.

### Additional module
- Added separate `additional-modules/supply-optimization/` with SciPy HiGHS sourcing LP, optional OR-Tools GLOP and Pyomo + HiGHS adapters, NetworkX resilience analysis, seeded Monte Carlo, inventory policy and event replay.
- Added 33 Python tests, synthetic fixtures and Google Colab notebook.
- Kept numerical dependencies out of the static site and outside the original ten-package drop-in count.

### Documentation and verification
- Added MRD traceability, engineering analysis of previous cycles, architecture, API, test coverage, market comparison, browser-only/Colab and Grok stitching documentation.
- Ran package, kernel, Iteration 47, architectural, regression and restricted acceptance tests.
- Full unfiltered acceptance timed out; the report records this qualification explicitly.
