# Iteration 47 regression-test stitch patch

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
Licensed under GPL-3.0-only.

The baseline `tools/conformance-test-iter47.mjs` encoded the old CFD placeholder as expected behavior: a one-cell mesh with no viscosity or pressure gradient was accepted, and the returned residual was expected to equal exactly `1`. That contradicts the new numerical contract and would cause the repository regression suite to reject a real solver.

Apply `iteration-47-conformance.patch` at the repository root:

```bash
patch -p1 < drop-in/cfd/integration/iteration-47-conformance.patch
```

The patch changes only the CFD BIBO fixture and assertions. It does not alter the platform acceptance script, kernel, or other package tests. Re-run:

```bash
node drop-in/cfd/test.mjs
node tools/conformance-test-iter47.mjs
node tests/run.mjs
node tests/acceptance.mjs
```

The current verified result is recorded in `../TEST-RESULTS.md`.
