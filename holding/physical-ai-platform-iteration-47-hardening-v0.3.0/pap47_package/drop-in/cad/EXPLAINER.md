# cad drop-in package

## Implemented capability

**Surface clipping.** Clips a triangulated polygonal surface against the positive half-space of a plane. Validates finite vertices, face indices, normal and tolerance; triangulates clipped polygons and deduplicates generated vertices.

## Validation boundary and open engineering depth

Not a closed B-rep Boolean, robust exact predicate kernel, self-intersection resolver, manifold repair or feature-history system. It does not calculate a closed solid intersection volume.

## API

The public entry point is `cadClip(base, cutter, options)` in `module.js`. Invalid or insufficient inputs return `outcome: "HOLD"`. Results identify the reduced-order model and qualification boundary.

## Tests and sample

Run `node drop-in/cad/test.mjs` from repository root. The shared integration sample is `drop-in/samples/engineering-samples.json`; run all ten sample flows with `node drop-in/run-samples.mjs`.

## Integration constraints

- Do not flatten the canonical kernel.
- Do not introduce a parallel project graph or ontology.
- The module is not registered in the platform runtime by this package. The integrator must add a versioned adapter/registration against current canonical contracts.
- Map identifiers, units, frames, configuration identity and evidence to canonical entities at the adapter boundary; do not silently coerce them.
- Preserve `HOLD`, diagnostics, qualification labels and provenance.
- Do not promote simulation to physical verification or claim industrial qualification from these tests.
- No kernel, route, UI or acceptance-script changes are included.
