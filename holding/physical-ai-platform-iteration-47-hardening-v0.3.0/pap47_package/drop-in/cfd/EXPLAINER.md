# cfd drop-in package

## Implemented capability

**1-D steady transport solver.** Solves a one-dimensional steady convection-diffusion scalar transport equation on a uniform line mesh using first-order upwind coefficients and Gauss-Seidel iteration with under-relaxation. Returns the field, residual, iterations and convergence state.

## Validation boundary and open engineering depth

Not incompressible Navier-Stokes, compressible flow, turbulence, multiphase, heat transfer, 2-D/3-D CFD, mesh adaptation or validated industrial CFD.

## API

The public entry point is `cfdStep(options)` in `module.js`. Invalid or insufficient inputs return `outcome: "HOLD"`. Results identify the reduced-order model and qualification boundary.

## Tests and sample

Run `node drop-in/cfd/test.mjs` from repository root. The shared integration sample is `drop-in/samples/engineering-samples.json`; run all ten sample flows with `node drop-in/run-samples.mjs`.

## Integration constraints

- Do not flatten the canonical kernel.
- Do not introduce a parallel project graph or ontology.
- The module is not registered in the platform runtime by this package. The integrator must add a versioned adapter/registration against current canonical contracts.
- Map identifiers, units, frames, configuration identity and evidence to canonical entities at the adapter boundary; do not silently coerce them.
- Preserve `HOLD`, diagnostics, qualification labels and provenance.
- Do not promote simulation to physical verification or claim industrial qualification from these tests.
- No kernel, route, UI or acceptance-script changes are included.
