# CAD backend adapters

The CAD contract is backend-neutral. Each backend receives two closed triangle meshes and returns a JSON response with `outcome`, `operation`, `mesh`, `solid`, and `volume`. Every successful result is revalidated by `cadClipRobust` in JavaScript; backend success is not trusted on its own.

## Available engines

| Engine | Geometry domain | Algorithms | Status in this package |
|---|---|---|---|
| OCCT / OCP | B-rep and triangulated closed solids | `BRepAlgoAPI_Common`; sewing, solid validation, meshing | Executed and tested in this environment |
| CGAL EPECK | Closed triangle meshes | PMP corefinement + intersection using exact predicates and exact constructions | C++ bridge supplied; build not executed here because CGAL headers/toolchain are absent |
| Manifold3D | Manifold triangle meshes | Manifold Boolean intersection | Python adapter supplied; runtime dependency not installed in this environment |
| JavaScript `cadClip` | Convex polygonal solids only | Half-space clipping and cap reconstruction | Dependency-free; executed and tested |

`trimesh` is a mesh I/O, inspection and orchestration layer, not counted as an independent Boolean kernel. Its Boolean integration can use Manifold3D. `libigl`'s `igl::copyleft::cgal::mesh_boolean` is an additional integration surface over CGAL, not an independent numerical kernel; it is documented as an extension point rather than counted as another engine. VTK's polygon Boolean filters are not selected as a default solid kernel because this package does not establish the same closed-manifold guarantees for its supported input classes.

## Runtime selection

`registry.mjs` discovers optional engines. `selectCadBackend({ preferred: 'auto' })` selects in this order:

1. `CGAL-EPECK` if `CAD_CGAL_BACKEND` points to a built executable;
2. `OCCT` if the configured Python interpreter imports OCP;
3. `Manifold3D` if `manifold3d` imports;
4. no native backend. The caller may then use the convex-only JS path, which returns HOLD for unsupported non-convex geometry.

To select explicitly, use `preferred: 'OCCT'`, `'CGAL-EPECK'`, or `'Manifold3D'`. Do not silently fall back after a selected backend reports an operation failure. `cadClipRobust` propagates HOLD.

## Install/build

### OCCT

Install the OCP Python binding compatible with the target Open CASCADE release. This package's backend imports `OCP` directly; CadQuery is not a runtime requirement. The included test fixture generator uses CadQuery only to create test solids.

### Manifold3D

Install `manifold3d` in the configured Python environment. The adapter uses the `Mesh`, `Manifold`, `^` intersection, `status()`, `to_mesh()`, and `volume()` API. Input is float32 at the library boundary; the adapter reports this precision limitation and the JS layer independently checks topology and volume consistency. Do not treat it as an exact-construction kernel.

### CGAL EPECK

On Debian/Ubuntu, install the CGAL development package, GMP, MPFR and nlohmann-json, then:

```sh
cmake -S backends -B build/cgal -DCMAKE_BUILD_TYPE=Release
cmake --build build/cgal --config Release
export CAD_CGAL_BACKEND="$PWD/build/cgal/cad-cgal-boolean"
```

The bridge uses `Exact_predicates_exact_constructions_kernel` and `Polygon_mesh_processing::corefine_and_compute_intersection`. It rejects open, self-intersecting or non-volume-bounding input. CGAL corefinement documentation recommends exact constructions for avoiding self-intersections in the embedding of repeated Boolean results.

## Licensing and deployment

- OCCT: review the exact version's LGPL-2.1-with-exception terms and redistribution obligations.
- CGAL Polygon Mesh Processing Boolean operations: CGAL documents this package as GPL; obtain the appropriate commercial license if the deployment model requires it.
- Manifold: Apache-2.0 project licensing; verify the exact release and bundled dependencies.
- libigl: primarily MPL-2.0, but `copyleft/cgal` headers carry the corresponding third-party license obligations.

The platform owns the CAD input/output contract and backend-selection policy. No third-party backend becomes the canonical data model or an indispensable platform dependency. Backend versions and license decisions must be recorded in the build/provenance manifest before redistribution.
