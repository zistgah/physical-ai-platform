Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 15 Diff

Against Iteration 14.

## Added
- site/components/cad/cad-contracts.js
- schemas/cad-contract.schema.json
- tools/conformance-test-iter15.mjs
- Solid entry in contracts-vertical.js

## Replaced
- site/components/cad/geometry-kernel.js
  Iteration 14 formula volume is gone.
  Volume is the mesh integral.
  Boolean subtract builds a pocket mesh.
  Revolve tessellates.
  Sketch constraints are solved or HOLD.
