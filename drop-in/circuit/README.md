<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit simulation package 0.4.1

**Target:** `drop-in/circuit/` in Physical AI Platform Iteration 47.  
**License:** GNU GPL v3.0-only; see `LICENSES.md` for third-party license boundaries.

## Contents

- `module.js`: browser-compatible native MNA transient solver for linear R/C/L and independent V/I sources.
- `backends/index.js`: Node.js adapters for separately installed ngspice and Xyce, with trusted model-library/PDK pack support.
- `samples/`: native reference circuits and nonlinear backend sample.
- `notebooks/circuit-backend-lab.ipynb`: Google Colab execution and real-engine validation notebook.
- `ENGINEERING-ANALYSIS.md`: consolidated analysis and decisions across prior build cycles.
- `CODE-REFERENCE.md`: implementation-level source documentation.
- `TEST-COVERAGE.md`: nominal, boundary, above/below-boundary, invalid, numerical, backend and integration test matrix.
- `STITCH-INSTRUCTIONS.md` / `STITCHING.md`: Grok integration contract.
- `COLAB.md`: browser-only operating model and notebook-link instructions.

## Quick verification

```bash
node test.mjs
node backends/test.mjs
node backends/test-real-engines.mjs
```

Missing ngspice/Xyce binaries are SKIP in the real-engine harness, never PASS. Use the Colab notebook to install and run ngspice in an optional cloud runtime. Xyce requires a separately approved compatible binary.

## Browser-only architecture

Do not import `backends/index.js` into the static browser bundle. The public GitHub Pages application remains static/browser-only. The user opens the Colab notebook from the browser to run optional cloud compute. The notebook does not create a mandatory platform backend.

## Related separate module

`drop-in/circuit-design-space/` is a new companion module beyond the ten folders in the Iteration 47 handoff. It is delivered separately and must not be nested into this package.
