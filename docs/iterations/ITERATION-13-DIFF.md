Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 13 Diff

Against Iteration 12.

## Changed
- relation-registry.js consumes PACKAGE_RELATIONS. Unresolved overlay entries stay unresolved.
- lifecycle-engine.js consults GateSchemaEngine when configurationId is supplied.
- safety-engine.js exposes cockpit().
- app.js calls workbench and inspector, and adds /cockpit and /boundaries.

## Added
- site/components/core/industrial-boundary.js
- site/components/manufacturing/factory-resolution.js
- tools/conformance-test-iter13.mjs
- evaluateConstraints on the SIR checker.
- legalStatus NOT_A_DETERMINATION on standards queries.

## Not claimed
- No industrial subsystem.
- No legal standards database.
- No general-purpose SIR language.
- MANUFACTURED_BY not invented.
