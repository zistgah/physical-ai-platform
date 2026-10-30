# Verification report - CAD drop-in v1.2.0

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
> GPL-3.0-only; see `COPYRIGHT-AND-LICENSING.md` for third-party licenses.

## Environment

- Verification environment: Linux container, Node.js and Python runtime.
- OCP / Open CASCADE Python binding: available and executed by package tests.
- CGAL development package/executable: unavailable; C++ bridge not compiled or executed.
- `manifold3d`: unavailable; adapter not executed.
- Google Colab: notebook structure and Python cell syntax validated locally; notebook was not executed in a live Colab session.
- GPU: no GPU-backed Boolean implementation is claimed. The notebook's optional PyTorch AABB demonstration is not a Boolean kernel.

## Package tests executed in this build

Command: `./run-tests.sh` from the package root.

| Test | Result | What it establishes |
|---|---|---|
| `test.mjs` core | PASS | Convex clipping, exact analytic box/tetrahedron oracles, containment, coincidence, invalid topology, winding normalization and HOLD semantics |
| Boundary additions | PASS | Face/edge/vertex contact, tolerance-boundary sliver rejection, positive overlap above tolerance and clear-gap HOLD |
| Deterministic geometry sweep | PASS, 24 cases | Analytic intersection volume and watertight topology across asymmetric dimensions |
| Seeded randomized sweep | PASS, 128 cases | Determinism, operand symmetry, analytic oracle, volume bounds and topology |
| Numeric guards | PASS | Malformed containers, coordinate overflow, sub-ULP tolerance and micro/nanoscale geometry |
| OCCT sample integration | PASS, 3 positive-volume samples | Box overlap 125, non-convex L-prism 4.5, rotated box 128 |
| Backend registry/integration | PASS | Discovery, selection, OCCT sample dispatch, analytic oracles and HOLD propagation |
| OCCT native tests | PASS, 9 cases | Non-convex, rotated, containment, coincidence, tangent, disjoint, invalid shell, topology, volume oracle and repeatability |
| Optional backend probe | PASS as availability report | OCCT detected; CGAL and Manifold3D correctly reported unavailable |
| JS syntax, Python compilation, JSON parsing | PASS | Package source/config parse checks |
| Notebook Python-cell compilation | PASS, 9 code cells | Notebook JSON is valid and each Python cell parses; not a live Colab execution |

## Samples

Seven geometry fixtures are included: box overlap, non-convex L-prism, rotated box, identical solids, contained solid, disjoint solids and tangent solids. OCCT sample tests exercise the positive-volume cases and the expected HOLD cases.

## Iteration 47 integration and regression evidence from preceding cycle

These are prior staged-repository results recorded in the preceding verification cycle; they were not rerun as part of the documentation/notebook-only v1.2.0 update.

- Canonical integration seam: PASS in staged Iteration 47 copy (canonical sketch → extrusion → JavaScript/OCCT intersection → canonical `_solid` → `validateSolid` → topology/volume/store checks).
- Iteration 47 conformance: PASS.
- Regression checklist: 64/64 PASS.
- Ten drop-in module tests: PASS.
- Reduced acceptance `--no-browser --no-mutation`: 55 PASS, 8 SKIP.
- Browser-enabled, mutation-disabled acceptance: 55 PASS, 7 SKIP, 1 UNVERIFIED.
- Full default acceptance: exceeded 300-second execution limit; UNVERIFIED.
- Full seven mutation gates: not completed. Targeted CAD-contract mutation G1e was detected as expected.

Do not present these prior results as a fresh full-platform run of v1.2.0. The CAD source change in this release adds only explicit boundary tests; the remaining changes are documentation, notebook and metadata.

## Colab verification status

- Notebook file JSON: validated.
- All ten Python code cells: syntax-compiled locally.
- Live Google Colab execution: NOT RUN.
- Dependency installation in Colab: NOT RUN.
- GPU availability and CUDA execution: NOT RUN.
- CGAL compilation in Colab: NOT RUN.
- Manifold3D runtime in Colab: NOT RUN.

The notebook itself will run the package tests and OCCT sample oracles when executed in Colab. Optional backend stages must be enabled explicitly and recorded.

## Release qualification

The v1.2.0 package has a verified convex browser path and an executed OCCT backend for the tested closed triangulated polyhedral inputs. It has a documented, source-supplied CGAL EPECK bridge and Manifold3D adapter, neither runtime-qualified in this environment. It is not an industrial-qualified general CAD kernel. Curved analytic B-rep preservation, general STEP round-trip, very-large-model performance, broad fuzzing, multi-solid canonical persistence, live browser tests and full mutation acceptance remain unverified.
