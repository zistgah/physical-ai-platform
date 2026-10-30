Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 18 Diff

Against Iteration 17.

## Fixed
- Gate evaluation is synchronous again. Iteration 03 and 08 pass.
- MANUFACTURED_BY accepts WorkOrder to Component and Component to Process. Nothing from the factory path was dropped.
- Lifecycle and gate-schema no longer cycle on import.

## Added
- LMS lessons, enrollments, and assessment evidence on the graph.
- tools/regression-checklist.mjs
- tools/conformance-test-iter18.mjs

## Removed
- Remaining exclusion markers in live docs and code.
