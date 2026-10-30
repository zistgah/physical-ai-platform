# CAD Engineering Dossier - Iteration 47 Drop-in

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
> Package license: GPL-3.0-only. Third-party engines retain their own licenses. See `COPYRIGHT-AND-LICENSING.md`.

**Package:** `pap.drop-in.cad`  
**Module:** `cadClip`  
**Release:** 1.2.0  
**Baseline:** Physical AI Platform Iteration 47  
**Handoff target:** `drop-in/cad/`  
**Operation in scope:** closed-solid intersection and intersection tessellation.

## 1. Executive engineering decision

This package is a bounded CAD intersection module. It is not a complete CAD system, a general-purpose commercial geometry kernel, or an industrially certified product. Its current defensible capability is:

1. A dependency-free browser JavaScript implementation for validated convex polygonal solids.
2. An optional host-side Open CASCADE (OCCT/OCP) backend for Boolean common/intersection of closed triangulated polyhedral inputs, including tested non-convex examples.
3. An optional CGAL EPECK C++ bridge supplied as source, not compiled or executed in the recorded build environment.
4. An optional Manifold3D adapter supplied as source, not executed because the dependency was unavailable.
5. A backend-neutral registry and a common result-validation boundary.
6. Samples, deterministic and seeded tests, integration tests, a browser-only Colab workbench and explicit Grok stitching instructions.

The architecture deliberately allows proven external numerical algorithms to be called through adapters. The canonical platform contract, SIR, entity identity, provenance, feature history, units and evidence remain owned by the Physical AI Platform. Third-party libraries are replaceable execution engines, not a second source of truth.

**Engineering status:** useful and tested bounded capability; not state-of-the-art parity with Parasolid/ACIS or the full scope of CGAL/OCCT; not industrially qualified. Do not use the phrase "holy grail" as a qualification claim.

## 2. Scope and non-goals

### In scope

- `INTERSECTION` / Boolean common for supported closed solids.
- Polygonal and triangulated mesh input.
- Convex clipping in browser JavaScript.
- Native backend dispatch on a host or remote notebook runtime.
- Tessellation, mesh validation, volume comparison and explicit HOLD behavior.
- Geometry samples and reproducible tests.
- Backend comparison, license notes, and integration guidance.

### Not implemented by this module

- General Boolean `UNION` or `DIFFERENCE`.
- Analytic NURBS, trimmed surfaces, exact curved B-rep preservation or surface-surface intersection.
- STEP/IGES import/export workflow for Boolean results (the platform has separate CAD import/export facilities).
- Parametric constraint solving, feature-tree editing UI, face/edge naming stability or topology naming guarantees.
- CAM toolpath generation, FEA, CFD, meshing for analysis, or manufacturing planning.
- General multi-shell/hollow-solid input contract.
- Automatic conversion between coordinate frames or physical units.
- Production-scale performance qualification or safety certification.

These are not silently inferred from the presence of a library adapter. They require separately scoped capabilities and validation.

## 3. Iteration history and findings consolidated

### Cycle A - initial convex browser module

The first substantive implementation replaced the Iteration 47 placeholder with a JavaScript convex-polyhedron intersection path. It validates input topology, normalizes face winding, clips polygons against cutter half-spaces, creates cap faces, welds vertices, reconstructs a polygonal solid, tessellates it and computes volume. It is intentionally bounded to convex solids.

The test suite covers missing inputs, invalid tolerances, malformed and non-finite geometry, non-manifold/open/disconnected shells, containment, coincident solids, disjoint/tangent cases, tetrahedra, asymmetric boxes, scale/translation, deterministic sweeps and seeded randomized boxes.

### Cycle B - native OCCT path and canonical integration seam

The next cycle added an OCP/Open CASCADE backend. It sews triangle faces into a shell, constructs and validates solids, runs `BRepAlgoAPI_Common`, tessellates the result, checks oriented edge incidence and compares mesh-integrated volume with the OCCT B-rep mass property.

A canonical integration test exercised the Iteration 47 CAD seam: sketch creation, extrusion, intersection adapter, canonical `_solid` persistence and `validateSolid` checks. This verifies the seam; it does not mean the public `GeometryKernel.boolean()` dispatch was changed or registered.

A real integration defect was identified during earlier work: triangulated coplanar facets were treated as separate faces by the initial candidate, so the input normalization/sewing path was improved. The native test suite includes a non-convex L-prism case to demonstrate why standalone convex tests are insufficient.

### Cycle C - replaceable backend ecosystem

A registry and adapters were added for:

- OCCT/OCP: executed in the verification environment.
- CGAL EPECK: C++ source/build integration supplied; compilation unavailable in the recorded environment.
- Manifold3D: Python adapter supplied; runtime dependency unavailable in the recorded environment.
- Browser JavaScript convex fallback: executed and tested.

`trimesh` is treated as an I/O/inspection/orchestration layer, not a separate Boolean kernel. `libigl`'s CGAL-backed Boolean function is treated as an integration surface over CGAL, not an independent kernel. This avoids double-counting wrappers as independent numerical algorithms.

### Current cycle - browser-first reproducibility

This release adds this engineering dossier, a detailed test matrix, browser/Colab setup and usage documentation, GPU capability guidance, licensing/provenance notes, and a Colab notebook. The notebook is an optional remote execution workbench; it does not change the platform's browser-only product architecture or make a local CAD installation mandatory.

## 4. Architecture and data flow

```text
Canonical SIR / CAD Solid entities
    |  resolve IDs, revisions, units, coordinate frame, provenance
    v
Platform-owned CAD adapter boundary
    |  normalize input to closed indexed triangle mesh
    v
CAD backend registry (host-side only)
    |-- CGAL EPECK bridge (optional, not build-verified here)
    |-- OCCT/OCP (executed and tested)
    |-- Manifold3D (optional, not runtime-verified here)
    `-- JavaScript convex implementation (browser-safe)
    v
Backend result contract
    |  status, engine/version, mesh, volume, tolerance, diagnostics
    v
Independent JavaScript result validation
    |  finite coordinates, indices, non-degenerate triangles,
    |  edge incidence/orientation, signed volume, volume agreement
    v
Canonical CAD contract validation
    |  units/frame, solid contract, provenance, identity, feature history
    v
Transactional canonical persistence or HOLD
```

The backend registry is host-side Node code. `module.js` is browser-safe. The browser must not import Python, C++ or Node subprocess modules. A browser can use the JavaScript convex path directly; for non-convex work it can call a remote execution service or Colab-hosted experiment through a separately governed connector. Colab is not an implicit always-on production service.

## 5. Numerical methods and assumptions

### 5.1 JavaScript convex clipping

The JavaScript path uses half-space clipping. The cutter's faces define inward half-spaces. Each base polygon is clipped against each plane; edge-plane crossings are collected into a cap polygon. Vertices are welded within a tolerance and faces are reconstructed. Output validation checks topology and volume.

**Assumption:** both operands are valid, closed, convex polygonal solids with planar faces. Non-convex inputs must return HOLD on this path. It uses IEEE-754 double precision, not exact arithmetic.

### 5.2 OCCT B-rep common

The OCCT adapter converts each input triangle to a planar face, sews faces, constructs a solid, normalizes closed-solid orientation, and validates the shape. It executes `BRepAlgoAPI_Common`, validates the resulting B-rep, tessellates using linear deflection and angular deflection, welds repeated face-local nodes, checks oriented edge incidence and compares the mesh volume with the B-rep mass property.

**Assumption:** closed, volume-bounding, triangulated polyhedral input. This does not preserve analytic curved surfaces that were already lost when the input was represented as triangles. A B-rep validity result does not by itself prove mesh validity; the adapter performs separate checks.

### 5.3 CGAL EPECK bridge

The source bridge uses `Exact_predicates_exact_constructions_kernel` and Polygon Mesh Processing corefinement/intersection. Exact constructions improve robustness of constructed intersection geometry compared with inexact constructions. The bridge then serializes coordinates to JSON floating-point numbers, so exactness is not preserved across the external JSON boundary; it is an exact-kernel computation followed by double-precision interchange. The source is supplied, but it was not compiled or executed in this environment. It must not be selected in production until its build, executable protocol, oracle tests and license obligations are verified in the target environment.

### 5.4 Manifold3D

The adapter calls Manifold3D's mesh Boolean intersection. The adapter documents its float32 boundary and validates the returned mesh independently. This is a robust manifold-mesh engine, not an exact-construction kernel. Its adapter was not executed in this environment because the dependency was absent.

### 5.5 Tolerance policy

- Coordinates, tolerance and deflection must use one consistent caller-defined linear unit.
- The module does not infer or convert units.
- Tolerance must be positive, finite and meaningful relative to coordinate magnitude and geometry scale.
- Deflection controls tessellation approximation, not Boolean topological correctness.
- Angular deflection is an engine tessellation parameter.
- A tolerance smaller than representable floating-point resolution must HOLD rather than imply false precision.
- Backend-specific tolerance semantics differ. Record engine, version, tolerance and deflection in provenance.

No single tolerance is suitable for all physical scales. Production callers must derive tolerances from the model's declared units, scale, manufacturing/analysis requirements and backend characteristics.

## 6. Backend comparison and market position

See `ENGINE-COMPARISON.md` for a detailed comparison. The short position is:

| Technology | Strongest relevant capability | Role here | Current evidence |
|---|---|---|---|
| OCCT | Mature open-source B-rep modelling and Boolean operations | Primary native B-rep/polyhedral backend | Executed and tested |
| CGAL | Computational geometry; exact-kernel options; mesh corefinement | Exact-construction mesh backend candidate | Source supplied; not compiled/executed |
| Manifold3D | Manifold triangle-mesh Boolean operations | Fast mesh backend candidate | Adapter supplied; dependency unavailable |
| libigl | Geometry processing algorithms and CGAL Boolean wrapper | Optional integration surface | Not a separate backend here |
| trimesh | Mesh I/O, inspection and orchestration | Utility layer | Not a Boolean kernel here |
| Parasolid / ACIS | Mature commercial modelling kernels | Industrial comparison points | Not used or benchmarked here |

The package does not claim parity with Parasolid, ACIS, full OCCT or CGAL. The platform-level advantage is backend replaceability under a stable canonical contract, not a claim that the adapter itself has more geometry algorithms than the upstream libraries.

## 7. Result contract and failure semantics

Successful result shape includes:

- `outcome: "OK"`
- `operation: "INTERSECTION"`
- `solid` and `mesh`
- positive finite `volume`
- `topology` diagnostics
- `engine` and available version metadata
- `tolerance` and `deflection`
- optional `solidCount`

Failure returns `outcome: "HOLD"`, reason and, where available, a stable code. Empty or zero-volume contact is HOLD for this solid-intersection operation. Invalid topology, backend unavailability when explicitly requested, backend exceptions, invalid result meshes and volume mismatch must not be converted to success or silently hidden by fallback.

The backend layer must not persist canonical entities. Persistence belongs to the platform adapter after independent validation. If the platform cannot atomically validate and persist a multi-solid result, it must HOLD rather than flatten multiple disconnected solids into one semantic solid.

## 8. Canonical integration rules for Grok

1. Resolve canonical Solid IDs and revisions through the existing graph/store.
2. Validate units and coordinate frames; do not guess or silently transform.
3. Normalize the current canonical mesh into the backend input contract without creating a parallel ontology.
4. Select/probe a backend at service initialization, not once per face or every hot-loop iteration.
5. For browser-only operation, use the convex JavaScript backend only when the convex precondition is established. Non-convex geometry without a remote/native backend must HOLD.
6. If an explicitly selected backend fails, propagate HOLD. Do not silently downgrade.
7. Validate the result mesh and volume independently.
8. Re-run the platform's canonical `validateSolid` contract.
9. Persist only after validation, using the existing transaction/rollback mechanism.
10. Record operation, input IDs/revisions, engine/version, tolerances, output hash, timestamp, and provenance.
11. Create typed `DERIVED_FROM` relations using the platform's relation API.
12. Preserve disconnected output solids explicitly. Until a multi-solid persistence contract exists, return HOLD for `solidCount > 1`.
13. Keep feature history and source revisions. Do not invent stable analytic face identity from tessellated triangles.
14. Keep UI reachability and public Boolean dispatch as explicit integration work; copying the package alone does not register it.

See `STITCH-INSTRUCTIONS.md` for concrete commands and the current Iteration 47 seam.

## 9. Browser-only and Google Colab execution

The platform product remains browser-only. The Colab notebook runs in a remote browser-hosted runtime. Users do not need a local CAD application, compiler or GPU. Colab can provision CPU or GPU runtimes, subject to account/quota availability.

Notebook behavior:

- Upload this package ZIP from the browser.
- Extract it into the remote runtime.
- Install Python dependencies in that runtime.
- Execute package tests and OCCT samples.
- Optionally install/build CGAL in the remote runtime.
- Optionally install Manifold3D.
- Detect GPU availability and demonstrate GPU broad-phase/point-cloud operations where useful.
- Save outputs and reports from the notebook session.

**GPU honesty:** standard OCCT B-rep Boolean operations are not made GPU-accelerated merely by selecting a Colab GPU. GPU resources can accelerate suitable broad-phase pair filtering, point-cloud operations, voxel/SDF experiments, large batched transforms and ML-based reconstruction. These are auxiliary workflows. An approximate GPU result must never replace the exact/validated Boolean backend or be promoted to canonical geometry without a separately validated reconstruction and error bound.

Colab session storage is ephemeral. Persist required results to a user-controlled repository or approved storage connector. Do not put secrets or private CAD files in a public notebook or public repository.

## 10. Security, safety and data governance

- Treat uploaded geometry and notebooks as untrusted input.
- Enforce file size, vertex count, face count, CPU time and memory limits at the execution service boundary.
- Do not execute arbitrary notebook code from untrusted contributors without review.
- Do not send proprietary CAD data to public runtimes without authorization.
- Keep GPU/remote compute execution distinct from hardware execution and HIL.
- Preserve dual-use/export-control gates in the canonical platform; open-source backend availability is not authorization to transfer controlled geometry.
- Never let an AI-generated geometry proposal become verified physical evidence without the platform's validation and approval process.

## 11. Reproducibility and versioning

Record:

- package version and SHA-256 of the ZIP;
- backend and exact library version;
- Python, Node, C++ compiler and CMake versions where relevant;
- runtime type (browser, Colab CPU, Colab GPU, host native);
- tolerance, deflection and unit;
- input file hashes and sample identifiers;
- test command, date, result, skipped stages and logs.

A Colab result is not reproducible solely from a notebook URL. Pin dependencies and retain the package hash and environment report. Update pins only after regression tests.

## 12. Closure criteria

### Closed within this package

- Convex browser intersection implementation and tests.
- OCCT backend implementation and executed tests in the recorded environment.
- Backend registry and optional adapter sources.
- Seven documented sample geometries.
- Independent result validation.
- Package-level integration seam test.
- Colab notebook and browser-only execution guide.
- Engineering dossier, comparison, licensing and test matrix.

### Not closed / cannot honestly be marked complete

- Public `GeometryKernel.boolean()` dispatch and UI registration (Grok integration boundary).
- CGAL build and runtime qualification in a dependency-equipped environment.
- Manifold3D runtime qualification in a dependency-equipped environment.
- Browser-native non-convex Boolean backend (would require a WASM integration and browser tests).
- Full analytic curved B-rep workflow and STEP round-trip of Boolean results.
- Multi-solid canonical persistence semantics.
- Full browser and full mutation acceptance stages in the recorded environment.
- Industrial qualification, performance envelopes and certification.

These are explicit boundaries. Do not remove them from the handoff to make the package appear closed.

## 13. Primary references

Use upstream documentation for implementation decisions and verify version-specific licenses before distribution:

- CGAL Polygon Mesh Processing: https://doc.cgal.org/latest/Polygon_mesh_processing/
- CGAL corefinement: https://doc.cgal.org/latest/Polygon_mesh_processing/group__PMP__corefinement__grp.html
- OCCT Boolean operations: https://dev.opencascade.org/doc/overview/html/specification__boolean_operations.html
- OCCT documentation: https://dev.opencascade.org/doc/overview/html/
- Manifold3D: https://github.com/elalish/manifold
- NVIDIA Warp: https://nvidia.github.io/warp/stable/index.html
- Open3D tensor mesh Boolean API: https://www.open3d.org/docs/latest/python_api/open3d.t.geometry.TriangleMesh.html
- trimesh Boolean API: https://trimesh.org/trimesh.boolean.html
- libigl Boolean API: https://libigl.github.io/tutorial/#mesh-boolean
- Parasolid: https://plm.sw.siemens.com/en-US/nx/parasolid/
- Spatial ACIS: https://www.spatial.com/solutions/3d-acis-modeling

---

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.**  
AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
This package is distributed under GPL-3.0-only except for third-party components governed by their respective licenses.
