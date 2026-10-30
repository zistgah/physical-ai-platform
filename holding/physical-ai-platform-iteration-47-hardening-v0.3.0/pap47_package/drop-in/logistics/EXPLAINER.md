# logistics drop-in package

## Implemented capability

**Inventory allocation and shortage hold.** Checks demand against usable inventory or quality-released lots; blocks order release for shortage, unknown supplier status or quarantined lots.

## Validation boundary and open engineering depth

No multi-echelon planning, lead-time distributions, transport routing, customs/export rules, safety stock optimization or purchase-order execution.

## API

The public entry point is `supply(options)` in `module.js`. Invalid or insufficient inputs return `outcome: "HOLD"`. Results identify the reduced-order model and qualification boundary.

## Tests and sample

Run `node drop-in/logistics/test.mjs` from repository root. The shared integration sample is `drop-in/samples/engineering-samples.json`; run all ten sample flows with `node drop-in/run-samples.mjs`.

## Integration constraints

- Do not flatten the canonical kernel.
- Do not introduce a parallel project graph or ontology.
- The module is not registered in the platform runtime by this package. The integrator must add a versioned adapter/registration against current canonical contracts.
- Map identifiers, units, frames, configuration identity and evidence to canonical entities at the adapter boundary; do not silently coerce them.
- Preserve `HOLD`, diagnostics, qualification labels and provenance.
- Do not promote simulation to physical verification or claim industrial qualification from these tests.
- No kernel, route, UI or acceptance-script changes are included.
