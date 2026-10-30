# PAP CAD drop-in - v1.2.0

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
> GPL-3.0-only; third-party backend licenses remain separate.

This is the Iteration 47 `cadClip` module for closed-solid intersection tessellation. It provides a browser-safe convex JavaScript implementation and replaceable optional native backend adapters.

## Start here

1. `CAD-ENGINEERING-DOSSIER.md` - consolidated analysis and decisions from the preceding build cycles.
2. `manifest.json` - package identity, contract, dependencies and status.
3. `EXPLAINER.md` - implementation and numerical assumptions.
4. `ENGINE-COMPARISON.md` - market and open-source backend comparison.
5. `TEST-MATRIX.md` - below/on/above-boundary and geometry coverage matrix.
6. `COLAB-GPU-STRATEGY.md` - browser-only and GPU execution strategy.
7. `COLAB_CAD_WORKBENCH.ipynb` - executable Google Colab notebook.
8. `COPYRIGHT-AND-LICENSING.md` - attribution and third-party license inventory.
9. `STITCH-INSTRUCTIONS.md` - precise integration instructions for Grok.
10. `VERIFICATION.md` - actual test results and unverified stages.

## Browser-only execution

The browser-native `module.js` has no Node/Python imports. It supports convex polygonal solids only. For native geometry engines, use a host service or the optional Google Colab workbench. No local CAD software is required.

To open the notebook: download `COLAB_CAD_WORKBENCH.ipynb`, open [Google Colab](https://colab.research.google.com/), select **File → Upload notebook**, and upload the notebook. See `COLAB-GPU-STRATEGY.md`.

## Run package tests in a host/Colab runtime

```bash
./run-tests.sh
```

The OCCT native backend is executed in the recorded verification environment. CGAL and Manifold3D are optional adapters whose dependencies were unavailable there; their status is explicitly recorded. Do not report optional adapters as runtime-tested until their cells/builds and test oracles pass.

## Release boundaries

The package does not modify the canonical kernel or acceptance script. It does not itself register public `GeometryKernel.boolean()` dispatch or UI routes. Grok must stitch those integration points according to `STITCH-INSTRUCTIONS.md`. Multi-solid canonical persistence remains HOLD until the spine has an explicit contract.
