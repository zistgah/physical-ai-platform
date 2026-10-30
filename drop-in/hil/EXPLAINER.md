# hil drop-in package

## Implemented capability

**Bounded hardware adapter exchange.** Performs a read-write-read exchange only through a declared hardware-backed bus adapter, bounded command, closed interlock, clear E-stop, verified subject-/policy-bound authority and a platform-supplied device-attestation verifier. A software mock is explicitly rejected.

## Validation boundary and open engineering depth

Adapter self-declaration is not independent proof of physical hardware; the verifier must validate a device certificate/attestation against a platform trust root. This does not qualify deterministic timing, bus integrity, safety, bench setup, device identity or certification. Hardware-in-loop use requires separate bench and safety validation.

## API

The public entry point is `hilStep(options)` in `module.js`. Invalid or insufficient inputs return `outcome: "HOLD"`. Results identify the reduced-order model and qualification boundary.

## Tests and sample

Run `node drop-in/hil/test.mjs` from repository root. The shared integration sample is `drop-in/samples/engineering-samples.json`; run all ten sample flows with `node drop-in/run-samples.mjs`.

## Integration constraints

- Do not flatten the canonical kernel.
- Do not introduce a parallel project graph or ontology.
- The module is not registered in the platform runtime by this package. The integrator must add a versioned adapter/registration against current canonical contracts.
- Map identifiers, units, frames, configuration identity and evidence to canonical entities at the adapter boundary; do not silently coerce them.
- Preserve `HOLD`, diagnostics, qualification labels and provenance.
- Do not promote simulation to physical verification or claim industrial qualification from these tests.
- No kernel, route, UI or acceptance-script changes are included.
