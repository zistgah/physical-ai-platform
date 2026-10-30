# Geometry backend comparison and selection rationale

This is a capability comparison for the specific `cadClip` intersection-tessellation contract, not a marketing ranking.

| Backend | Primary representation | Boolean approach | Strength relevant here | Boundary relevant here | Package status |
|---|---|---|---|---|---|
| Open CASCADE Technology (OCCT) | Analytic/topological B-rep; also mesh-to-B-rep adapter | General Fuse / Boolean Common | Mature CAD B-rep operations, topology and shape validation; suitable as the current host-side production candidate | Fuzzy tolerance and floating-point geometry; this drop-in returns tessellation and does not preserve original analytic surface history | Installed OCP 7.9.3.1; executed tests |
| CGAL Polygon Mesh Processing | Triangulated surface meshes | Corefinement and Boolean intersection | Exact-predicate and exact-construction kernel options; well suited to robust mesh Boolean work | GPL licensing for the Boolean package; heavier C++ build and memory requirements; output JSON double serialization is a boundary | EPECK bridge source included; not compiled in this environment |
| Manifold3D | Manifold triangle meshes | Manifold Boolean / CSG | Dedicated Boolean engine with manifold output guarantees, performance focus, and bindings for Python and JS/WASM | Input must be a valid manifold solid; Python bridge uses float32 vertex properties in this implementation | Adapter included; runtime unavailable in this environment |
| libigl | Eigen-based mesh processing | `igl::copyleft::cgal::mesh_boolean` | Useful mesh processing, remeshing, repair, and algorithm composition; can expose CGAL Boolean capability | Its Boolean entry point depends on CGAL and has separate copyleft license implications; not an independent Boolean kernel from CGAL | Documented extension point, not a separate backend |
| trimesh | Python mesh representation and utilities | Delegates Boolean to Manifold3D or Blender | Strong mesh I/O, validation, inspection and orchestration ecosystem | Not itself the Boolean algorithm; selected engine remains a dependency | Interoperability candidate, not counted as a kernel |
| VTK | Polygonal datasets | `vtkBooleanOperationPolyDataFilter` and related filters | Visualization, data conversion, mesh processing and scientific pipeline integration | Official documentation warns about coplanar overlapping cells; not selected as an authoritative solid backend | Not enabled as a Boolean backend |
| Open3D | Legacy and tensor triangle meshes | Tensor `TriangleMesh.boolean_intersection/union/difference` | Useful mesh processing and geometry utilities | Current documented Boolean operation always uses CPU, even in tensor API; not a GPU Boolean backend | Candidate for mesh QA/interoperability, not enabled here |
| NVIDIA Warp | Mesh query and simulation data structures | JIT GPU/CPU kernels, ray casts and closest-point queries | Useful for GPU broad-phase, spatial queries and simulation-adjacent geometry work | Not a general exact B-rep Boolean kernel; custom narrow-phase needs validation | Optional Colab GPU workbench kernel, not a CAD Boolean backend |

## Selection policy

1. CGAL-EPECK is preferred when explicitly built and installed for mesh intersection workloads requiring exact predicates and exact constructions.
2. OCCT is the current verified backend and the preferred available option when CGAL is absent. It has the strongest existing fit with the platform's STEP/B-rep ecosystem.
3. Manifold3D is a valid optional mesh Boolean backend where its manifold-input contract and float32 boundary are acceptable.
4. JavaScript clipping remains the static/browser fallback for convex polygonal solids only.

Selection is capability- and deployment-dependent. No single backend is declared universally superior. A failed selected backend returns HOLD; the dispatcher does not hide it by switching engines after execution starts.

## Upstream technical references

- OCCT Boolean Operations: https://www.occt3d.com/dev/doc/overview/html/specification__boolean_operations.html
- CGAL Mesh Boolean Operations: https://cgal.geometryfactory.com/CGAL/doc/main/PMP_Boolean_operations/index.html
- CGAL exact construction guidance: https://doc.cgal.org/6.1/Polygon_mesh_processing/index.html
- Manifold3D package and algorithm overview: https://pypi.org/project/manifold3d/
- Manifold3D documentation: https://manifoldcad.org/docs/html/
- Trimesh Boolean API: https://trimesh.org/trimesh.boolean.html
- libigl mesh Boolean API: https://github.com/libigl/libigl/blob/main/include/igl/copyleft/cgal/mesh_boolean.h
- libigl license guidance: https://libigl.github.io/license/
