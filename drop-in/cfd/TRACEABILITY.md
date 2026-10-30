<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD requirement traceability

| Requirement | Implementation | Verification | State |
|---|---|---|---|
| Deterministic analytical 1D channel solver | `module.js` | `test.mjs` | CLOSED within declared 1D scope |
| Input/mesh/fluid validation and HOLD | `module.js` | 23 reason-coded HOLD cases | PASS |
| Numerical residual and analytical profile comparison | `module.js` | residual, profile and flow identity checks | PASS |
| Uniform and nonuniform mesh coverage | `module.js` | 11 uniform resolutions and nonuniform case | PASS |
| Existing Iteration 47 BIBO compatibility | `integration/iteration-47-conformance.patch` | repository conformance test | PASS when patch applied to matching baseline |
| External backend catalogue | `backend-catalogue/manifest.json` | schema/contents inspection | CATALOGUED only |
| External 2D/3D job envelope | `integration/backend-job.js` | `tests/backend-job.test.mjs` | PASS |
| Generic provider registry | sibling `extensions/scientific-backend-orchestration/` | sibling tests | PASS package-level |
| Colab notebook source | `notebooks/CFD_Backend_Colab.ipynb` | structural test and JSON parse | PASS source-level |
| Colab CPU runtime | external runtime | not available in local test environment | NOT EXECUTED |
| Colab GPU runtime | external runtime/device | not available in local test environment | NOT EXECUTED |
| OpenFOAM/SU2/Code_Saturne adapters | not yet implemented | no executable backend test | OUTSTANDING |
| Platform registration/UI reachability | host platform integration | not performed in bounded package | NOT CLAIMED |
| Physical validation | external experimental campaign | no experimental data supplied | NOT CLAIMED |

## Explicit dimensional boundary

- Native solver: 1D plane channel, steady, incompressible, Newtonian, constant properties, laminar, fully developed.
- External job mapper: 2D/3D request envelope only. It does not solve flow.
- External catalogue: candidate capabilities only; no executable adapter is delivered.
- Colab notebook: analytical reference and GPU parameter sweep; external CFD executable discovery only.
