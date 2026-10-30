# CAD Test Matrix - Boundary, Adversarial and Regression Coverage

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
> GPL-3.0-only. Third-party licenses remain applicable.

## 1. Test philosophy

"110% coverage" is not a mathematically meaningful software coverage metric. No finite test suite proves all possible geometries. This package uses layered evidence: analytic oracles, deterministic cases, seeded property tests, malformed-input tests, native backend tests, integration tests and explicit unverified stages. A future CI run should add line/branch coverage, mutation score, fuzzing duration and large-model performance budgets.

Tests must fail when the implementation is removed or weakened. A PASS only establishes the behavior represented by that test; it does not establish industrial qualification.

## 2. Boundary matrix

| Dimension | Below boundary | On boundary | Above boundary | Expected behavior | Executed coverage |
|---|---|---|---|---|---|
| Missing operands | null / absent | N/A | valid objects | HOLD for missing; continue validation for present | Yes |
| Tolerance | zero, negative, NaN | positive finite minimum representable for coordinates | Infinity / non-number | Invalid values HOLD; representability guard HOLD | Yes |
| Coordinate | NaN / Infinity | finite values near scale/ULP floor | very large finite span beyond stable range | HOLD on invalid/unstable; valid range computed | Yes |
| Topology | open shell | closed manifold shell | non-manifold / duplicate / disconnected shell | only supported closed shell may proceed | Yes |
| Intersection measure | disjoint | face/edge/point tangency | positive-volume overlap | zero-volume contact HOLD; positive volume OK | Yes |
| Geometry class | non-convex on JS path | convex planar polyhedron | non-convex on OCCT path | JS HOLD; OCCT native may process supported polyhedral solid | Yes, selected samples |
| Tessellation deflection | zero/negative | positive finite | coarse positive | invalid HOLD; coarse/fine affects approximation only | Input validation yes; convergence study pending |
| Backend availability | unavailable explicit backend | available selected backend | backend operation failure | unavailable/failure HOLD; no silent downgrade | Yes |
| Result topology | open / duplicate / bad indices | closed oriented 2-manifold | valid but volume mismatch | invalid result HOLD | Yes |
| Persistence | canonical validation fails | valid single solid | multiple disconnected solids | rollback/HOLD unless explicit multi-solid contract | Adapter guidance; full transactional dispatch pending |

## 3. Geometry case matrix

| ID | Case | Expected result | Backend/test | Status |
|---|---|---|---|---|
| G01 | Overlapping axis-aligned boxes | Exact volume 125 | JS + OCCT sample | PASS |
| G02 | Contained solid | Inner volume | JS + OCCT sample | PASS |
| G03 | Identical solids | Original volume | JS + OCCT sample | PASS |
| G04 | Disjoint solids | HOLD / empty volumetric intersection | JS + OCCT sample | PASS |
| G05 | Face-tangent solids | HOLD | JS + OCCT sample | PASS |
| G05a | Edge-only tangency | HOLD | JS boundary test | PASS |
| G05b | Vertex-only tangency | HOLD | JS boundary test | PASS |
| G05c | Sliver overlap at tolerance boundary | HOLD as degenerate | JS boundary test | PASS |
| G05d | Positive sliver above tolerance | OK with analytic volume | JS boundary test | PASS |
| G05e | Clear gap above tolerance | HOLD | JS boundary test | PASS |
| G06 | Oblique tetrahedron overlap | Analytic volume | JS | PASS |
| G07 | Asymmetric extents | Analytic volume 48 | JS | PASS |
| G08 | Reversed global winding | Same volume | JS | PASS |
| G09 | Single reversed face | Normalize or HOLD; current path normalizes tested case | JS | PASS |
| G10 | Large coordinate translation | Translation-invariant volume | JS | PASS |
| G11 | Micro-scale geometry | Scale-consistent volume | JS | PASS |
| G12 | Non-planar face | HOLD | JS | PASS |
| G13 | Open shell | HOLD | JS + OCCT | PASS |
| G14 | Duplicate face | HOLD | JS | PASS |
| G15 | Disconnected input shell | HOLD | JS + OCCT precondition | PASS |
| G16 | Out-of-range face index | HOLD | JS | PASS |
| G17 | Non-finite vertex | HOLD | JS + OCCT input gate | PASS |
| G18 | Non-convex L-prism intersection | Analytic volume 4.5 | OCCT | PASS |
| G19 | Rotated box | Analytic volume 128 | OCCT | PASS |
| G20 | Backend returns HOLD | HOLD propagated | JS backend integration | PASS |
| G21 | Backend returns malformed mesh | HOLD | JS validator | PASS |
| G22 | Backend mesh volume mismatch | HOLD | JS validator | PASS |
| G23 | Seeded box property sweep | Oracle, symmetry, bounds, topology | JS 128 cases | PASS |
| G24 | Deterministic property sweep | Oracle and watertightness | JS 24 cases | PASS |

## 4. Numeric and tolerance-specific coverage

| ID | Input condition | Expected | Executed |
|---|---|---|---|
| N01 | tolerance = 0 | HOLD | Yes |
| N02 | tolerance < 0 | HOLD | Yes |
| N03 | tolerance = Infinity | HOLD | Yes |
| N04 | tolerance below coordinate ULP guard | HOLD | Yes |
| N05 | default scale-aware tolerance | finite positive value | Yes |
| N06 | large translation with small local extent | stable result or HOLD, never false OK | Yes |
| N07 | micro-scale dimensions | positive volume within test oracle tolerance | Yes |
| N08 | coordinate span overflow | HOLD | Yes |
| N09 | NaN/Infinity coordinates | HOLD | Yes |
| N10 | B-rep volume versus tessellated volume | mismatch beyond configured allowance => HOLD | OCCT path yes |
| N11 | deflection refinement convergence | error trend quantified over multiple deflections | Not yet executed |
| N12 | randomized sliver/thin-feature stress | fuzzed distribution and failure-rate report | Not yet executed |

## 5. Backend qualification matrix

| Backend | Build/discovery | Unit tests | Non-convex oracle | Runtime status | Release gate |
|---|---|---|---|---|---|
| JavaScript convex | Browser-safe source | PASS | Not supported by design; HOLD | Executed | Ready for supported convex inputs |
| OCCT/OCP | Import/probe PASS | 9 native cases PASS | L-prism PASS | Executed | Ready for tested closed triangulated polyhedra, subject to host qualification |
| CGAL EPECK | C++ source supplied | Not run | Source targets PMP corefinement | Not compiled; CGAL dev package absent | NOT RELEASE-QUALIFIED |
| Manifold3D | Adapter supplied | Not run | Adapter supports mesh Boolean | Dependency absent | NOT RELEASE-QUALIFIED |

## 6. Integration and platform regression matrix

| Test | What it proves | Result |
|---|---|---|
| `integration-test.mjs` | Iteration 47 canonical sketch/extrude/intersection/persist/validate seam | PASS in staged baseline |
| `backend-integration-test.mjs` | Registry discovery, backend selection, sample dispatch, HOLD propagation | PASS |
| `tools/conformance-test-iter47.mjs` | Iteration 47 conformance | PASS |
| `tools/regression-checklist.mjs` | 64 checklist suites | 64/64 PASS |
| Ten drop-in module tests | Existing module tests remain green | PASS in recorded staged run |
| `tests/acceptance.mjs --no-browser --no-mutation` | Reduced acceptance invocation | 55 PASS, 8 SKIP |
| Acceptance with browser enabled, mutation disabled | Browser route stage attempted | 55 PASS, 7 SKIP, 1 UNVERIFIED |
| Full default acceptance | Complete default acceptance | Exceeded 300-second execution limit; UNVERIFIED |
| Targeted mutation G1e | Deliberately weakened CAD contract is detected | PASS as a mutation test |
| Full seven mutation gates | Mutation resistance across all gates | Not completed |

Do not convert skipped or unverified rows to PASS in generated reports.

## 7. Missing tests before industrial qualification

These are concrete test programmes, not generic future-work labels:

1. Deflection convergence: run the same curved/triangulated proxy geometry at at least five deflections; compare mesh volume, Hausdorff distance and triangle count against a high-resolution reference.
2. Fuzzing: generate closed convex and non-convex polyhedra with controlled perturbations, seed every case, retain minimal failing fixtures, and run under time/memory limits.
3. Differential testing: compare OCCT, CGAL and Manifold3D on common supported meshes; compare volume, connected-component count, watertightness and symmetric difference. Disagreement must be triaged, not majority-voted.
4. Adversarial geometry: nearly coplanar faces, sliver triangles, very short edges, tiny gaps, near-tangent overlap, thin walls, high aspect ratios, repeated vertices and near-degenerate intersections.
5. Multi-solid results: intersections that produce multiple disconnected components; verify separate canonical children or HOLD and rollback.
6. Large models: 10k, 100k, 1M triangle scaling with wall time, peak memory and output quality; no performance claims until measured.
7. Browser runtime: run the convex engine in actual Chromium/Firefox/WebKit; verify no Node/Python imports and no UI thread lock.
8. Browser WASM: when a Manifold/CGAL WASM adapter is added, run the same conformance fixtures against native and WASM paths.
9. License compliance: automated SBOM, pinned versions, license scan and redistribution review.
10. Canonical transaction tests: force a failure after validation and prove no orphan entity or relationship remains.

## 8. Commands

```bash
./run-tests.sh
node --experimental-default-type=module integration-test.mjs
node --experimental-default-type=module backend-integration-test.mjs
python3 tests/occt-test.py
python3 tests/optional-backend-test.py
```

Platform regression commands are listed in `STITCH-INSTRUCTIONS.md` and must be run from the Iteration 47 repository root after staging the package.
