<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD handoff - package 1.3.0

## Delivered packages

1. `cfd/`: bounded 1D laminar channel solver, backend job mapper, backend catalogue, Colab notebook and complete technical documentation.
2. `extensions/scientific-backend-orchestration/`: separate sibling package for generic backend discovery and execution envelopes. It is not nested in CFD and is not registered in the platform.

## Browser-only policy

The platform remains browser-first. The 1D reference solver runs in JavaScript. Heavy native solvers are optional external execution providers through Colab, a governed remote service or an authorized agent. No local engineering application is mandatory. Colab is optional and is not the canonical project store.

## External backend catalogue

OpenFOAM, SU2 and Code_Saturne are catalogued with official references, licence notes, physics scope and GPU cautions. They are **not yet executable adapters**. The package contains no third-party solver source/binary.

## Notebook

`notebooks/CFD_Backend_Colab.ipynb` contains attribution, licence metadata, analytical verification, CPU/GPU runtime detection, optional CuPy parameter sweep, external executable discovery and run-manifest export. Grok must commit it and publish the immutable Open-in-Colab URL using the exact procedure in `notebooks/README.md`.

## Run package tests

```bash
node test.mjs
node tests/backend-job.test.mjs
node tests/notebook-structure.test.mjs
node tests/catalogue.test.mjs
node tests/package-integrity.test.mjs
node ../extensions/scientific-backend-orchestration/tests/test.mjs
```

## Scope boundary

The native solver remains 1D steady laminar channel flow. This release does not claim a 2D/3D CFD solver, external solver execution, GPU Navier-Stokes, physical validation or platform registration. See `BUILD-ANALYSIS.md`, `TEST-MATRIX.md`, `TEST-RESULTS.md` and `STITCH-INSTRUCTIONS.md`.
