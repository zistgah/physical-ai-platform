# CAD intersection module - Iteration 47

## Purpose

`cadClip` is the browser-safe convex polygonal intersection implementation. `cadClipRobust` is the common validation boundary for optional host-side geometry engines. The package adds an adapter registry so independently maintained open-source kernels and numerical algorithms can be selected without changing the platform-owned CAD contract.

The package targets the Iteration 47 handoff row `drop-in/cad` / `cadClip` / intersection tessellation. It does not claim to be a complete CAD system or to replace the canonical CAD kernel.

## Execution model

### Browser/static path

Import `module.js`. It has no Node or Python dependency and performs convex polygonal intersection by clipping each face against the other solid's supporting half-spaces, building cap faces, welding vertices, reconstructing polygon loops, triangulating, and validating oriented edge incidence and signed volume. Unsupported concave or invalid geometry returns `HOLD`.

### Host path

Use `backends/registry.mjs` from Node. It discovers configured optional backends and chooses one explicitly or via `auto`. Current priority is CGAL-EPECK, OCCT, then Manifold3D. A selected backend's `HOLD` is propagated. The system must not silently fall back to the convex path after a backend operation failure.

- **CGAL-EPECK:** exact-predicate/exact-construction mesh corefinement bridge. Source and CMake project are supplied; compilation is not verified in this environment because CGAL development headers are absent.
- **OCCT/OCP:** reconstructs closed triangle soups as OCCT solids, executes `BRepAlgoAPI_Common`, validates the result, tessellates using OCCT, welds nodes, audits oriented edge incidence, and compares the triangle-integrated volume to the OCCT B-rep mass property. Executed in this environment.
- **Manifold3D:** optional manifold triangle mesh Boolean adapter. Supplied but not executed because `manifold3d` is not installed here.

## Numerical and geometric assumptions

- Input coordinates must be finite and both operands must use the same unit and coordinate frame.
- Input triangle meshes must represent closed, volume-bounding solids. Native adapters reject malformed/open/non-manifold input; no automatic hole filling or guessed repair is performed.
- Tolerance and tessellation deflection are in the same linear unit as the input coordinates.
- OCCT's Boolean fuzzy tolerance is not exact arithmetic. CGAL-EPECK uses exact predicates and constructions internally, but the JSON bridge serializes output coordinates as doubles; exactness is therefore not preserved past that serialization boundary.
- Manifold3D's Python bridge uses float32 vertex properties. This is an explicit precision tradeoff and must not be described as exact.
- Tangential or disjoint intersections with no positive volume return `HOLD` / `EMPTY_INTERSECTION` rather than manufacturing a zero-volume Solid.
- Output mesh must pass independent JS checks for finite coordinates, valid indices, nondegenerate triangles, closed oriented edge incidence, no unused vertices, positive signed volume, and agreement with backend-reported volume within the configured relative tolerance.

## Multi-solid and curved geometry

OCCT can return multiple solids in one shape; the current protocol preserves their tessellation as a single indexed mesh/compound result and reports `solidCount`. The canonical platform adapter must preserve this distinction if downstream features require separate Solid entities. This package does not preserve analytic curved faces or parametric feature history in the tessellated result. Curved input represented by tessellated meshes is only a mesh approximation; original analytic B-rep surfaces are not round-tripped.

## Status semantics

- `OK`: requested intersection completed and package-level output checks passed.
- `HOLD`: absent/invalid input, unsupported geometry, unavailable requested backend, backend failure, empty intersection, or failed output validation.
- `OK` is not physical verification, manufacturing approval, regulatory acceptance, or industrial certification.

## Known boundaries

- Only `INTERSECTION` is exposed by this drop-in. Union and subtraction remain outside this task's contract.
- No STEP B-rep writer is included in the drop-in; the platform's existing STEP exchange remains authoritative.
- CGAL C++ build and Manifold3D runtime tests remain unverified in the supplied environment. They are optional backends, not silently assumed to be available.
- Public `GeometryKernel.boolean()` dispatch is not modified here. Grok performs the version-controlled stitch using `STITCH-INSTRUCTIONS.md`.

## What an industry leader has

A full industrial CAD kernel provides general B-rep and mesh Boolean operations, robust geometric predicates, exact or filtered constructions, analytic and trimmed surfaces, topology healing, persistent naming, feature history, exchange formats, assembly semantics, large-model acceleration and validated performance. This package uses replaceable specialist backends rather than attempting to reimplement every proven geometry algorithm inside the platform.

## Preserved platform constraints

- Do not flatten the canonical kernel.
- Do not exclude a requirement.
- A HOLD is a HOLD.
- Do not change the acceptance script.
- Preserve the platform-owned canonical data model, provenance, identity and feature history.
