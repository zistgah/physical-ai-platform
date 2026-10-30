# Stitch instructions for Grok - CAD drop-in v1.2.0

## Non-negotiable boundaries

- Baseline: Iteration 47, `HANDOFF.md`.
- Target: `drop-in/cad`, module `cadClip`, intersection tessellation.
- Do not flatten or replace the canonical kernel, SIR, entity graph, schema, feature history, or evidence system.
- Do not change the acceptance script to make this package pass.
- Keep `HOLD` behavior. Never create or persist a canonical Solid after a drop-in `HOLD`.
- Do not import Node/Python backend code into browser modules.
- Do not silently downgrade to the convex JavaScript path after an explicitly selected native backend fails.

## Package contents

- `module.js`: browser-safe convex engine and backend-neutral `cadClipRobust` result validator.
- `backends/registry.mjs`: Node-only optional backend discovery and selection.
- `backends/occt_backend.py`: OCP/Open CASCADE backend.
- `backends/manifold_backend.py`: optional Manifold3D backend.
- `backends/cgal_backend.cpp`, `backends/CMakeLists.txt`: CGAL EPECK backend source/build.
- `backends/node-occt-adapter.mjs`: Node subprocess adapters for the three native backends.
- `manifest.json`: package identity, inputs/outputs, operations and compatibility claims.
- `tests/`, `samples/`: executable and geometry fixtures.

## Current spine seam

The Iteration 47 source inspected for this package exposes:

- `site/components/cad/geometry-kernel.js`: `GeometryKernel.boolean(projectId, aId, bId, op, options)` and `_solid(...)`.
- `site/components/cad/cad-contracts.js`: `validateSolid`, `meshVolume`, `watertight`.
- canonical mesh representation: `{ vertices: [{x,y,z}], faces: [[triangle indices]] }`.
- `_solid` persists canonical Solid entities and applies the existing CAD contract.

The drop-in must remain an adapter. It does not own canonical identity, project store, provenance, feature graph, or unit conversion.

## Recommended dispatch

In the `INTERSECT` branch of `GeometryKernel.boolean`:

1. Resolve canonical operands and verify both are valid Solid entities.
2. Verify units and coordinate frames match. If not, perform an explicit canonical transform/conversion or return `HOLD`.
3. On a host runtime, call `selectCadBackend({ preferred: 'auto' })` once at service initialization and retain the selected backend descriptor. Do not probe a subprocess for every Boolean operation.
4. If a native backend is selected, call `cadClipRobust(a.mesh, b.mesh, { backend, tolerance, deflection })`.
5. If no native backend is installed, call `cadClip(a.mesh, b.mesh, { tolerance })`. This supports convex polyhedra only; non-convex inputs must `HOLD`.
6. If the result is not `OK`, return it unchanged. Do not write any entity.
7. Pass `result.mesh` through canonical `_solid(...)`. Recompute volume and topology with the platform's `validateSolid`; do not trust the backend's scalar alone.
8. If canonical validation fails, return `HOLD` and ensure no entity or relationship remains in the canonical store.
9. Persist operation provenance: operation, engine name/version, tolerance, deflection, input entity IDs and revisions, output mesh hash, and backend status. Preserve both source relationships as typed `DERIVED_FROM` edges using the repository's established relation API.
10. Preserve multi-solid semantics. If `result.solidCount > 1`, either create individually validated canonical Solid children under a canonical result group or HOLD until the kernel's multi-solid contract is explicitly implemented. Do not flatten separate solids into a single semantic solid without a declared contract.
11. Feature history must record the Boolean operation and both parent revisions. Do not invent analytic face identity where tessellation has discarded it.

Illustrative service-level adapter (adapt exact imports and relation method names to current source; this is not a patch):

```js
const selection = await selectCadBackend({ preferred: 'auto' });
const result = selection.selected
  ? await cadClipRobust(a.mesh, b.mesh, { backend: selection.selected, tolerance, deflection })
  : cadClip(a.mesh, b.mesh, { tolerance });
if (result.outcome !== 'OK') return result;
if ((result.solidCount ?? 1) !== 1) return { outcome: 'HOLD', reason: 'Multi-solid persistence adapter is required' };
const candidate = geometry._solid(projectId, {
  id, name, feature: 'INTERSECT', mesh: result.mesh, planes: []
});
if (candidate.outcome === 'HOLD' || validateSolid(candidate).outcome !== 'PASS') {
  // Use the canonical store's transaction/rollback mechanism; never leave an orphan.
  return { outcome: 'HOLD', reason: 'Canonical CAD validation failed' };
}
// Add typed DERIVED_FROM relationships and feature-history provenance here.
return { ...candidate, boolean: { operation: 'INTERSECTION', engine: result.engine, tolerance, deflection } };
```

Important: the existing `_solid` method may not be transactional. Inspect its actual implementation and use the kernel's transaction/rollback API if available. If no safe rollback exists, validate the mesh with `validateSolid` before calling `_solid`, then persist relationships only after creation succeeds.

## Host setup

- OCCT: `python3` must import `OCP`. Set `PYTHON` to the intended interpreter if not the default.
- CGAL: build `backends/cgal_backend.cpp` per `backends/README.md`, then set `CAD_CGAL_BACKEND` to the executable path.
- Manifold3D: install `manifold3d` into the configured Python environment.

`registry.mjs` returns availability metadata. Explicitly requested unavailable engines must not be treated as successful selection.

## Verification commands

From this package folder:

```sh
node --experimental-default-type=module test.mjs
node --experimental-default-type=module backend-integration-test.mjs
python3 tests/occt-test.py
python3 tests/optional-backend-test.py
```

From repository root after copying into `drop-in/cad/`:

```sh
node --experimental-default-type=module drop-in/cad/test.mjs
node --experimental-default-type=module drop-in/cad/integration-test.mjs
node --experimental-default-type=module tools/conformance-test-iter47.mjs
node --experimental-default-type=module tools/regression-checklist.mjs
node --experimental-default-type=module tests/acceptance.mjs
```

If browser or mutation stages cannot complete in the target runner, record them as SKIP/UNVERIFIED. Never report a reduced invocation as full acceptance.

## Expected state after stitch

- Package present: yes.
- Package tests: pass.
- Canonical adapter seam: tested by `integration-test.mjs`.
- Public `GeometryKernel.boolean()` dispatch: not changed by this package; must be implemented by Grok.
- UI reachability: not provided by this package.
- Host native backend: OCCT verified in the build environment; CGAL/Manifold optional and require installation/build.
- Existing acceptance script and kernel: unchanged by this package.


## Browser-only Colab notebook integration (v1.2.0)

The package now includes `COLAB_CAD_WORKBENCH.ipynb`, `COLAB-GPU-STRATEGY.md`, `CAD-ENGINEERING-DOSSIER.md`, `TEST-MATRIX.md` and `COPYRIGHT-AND-LICENSING.md`.

Grok must:

1. Keep the notebook as an optional workbench resource, not a dependency of the static browser app.
2. Add a CAD workbench resource/help link to `COLAB_CAD_WORKBENCH.ipynb` and `COLAB-GPU-STRATEGY.md`.
3. If the notebook is committed to the platform repository, create the Colab launch URL from the actual repository, branch and notebook path: `https://colab.research.google.com/github/<owner>/<repo>/blob/<branch>/<path>/COLAB_CAD_WORKBENCH.ipynb`. Do not fabricate these values. Until committed, direct users to https://colab.research.google.com/ and File → Upload notebook.
4. Provide the exact versioned CAD ZIP as the notebook upload input. Preserve its SHA-256.
5. Keep notebook outputs separate from canonical entities until the platform adapter validates and binds them to canonical IDs/revisions.
6. Preserve the notebook copyright, trademarks, GPL notice and third-party license inventory when copying or linking it.
7. Keep GPU work optional. The notebook's PyTorch example is AABB broad-phase only, not a GPU Boolean or exact geometry proof.
8. Do not add notebook code to the browser application bundle or make Colab mandatory for browser-native convex intersection.

## Notebook test commands

In Colab, run the notebook top-to-bottom. Its package test cell executes `./run-tests.sh`; OCCT sample cells compare the seven included fixtures against their expected outcomes/volumes. Optional CGAL and Manifold3D cells are explicitly opt-in and report their own status.
