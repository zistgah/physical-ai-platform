# Grok handoff - separate uncertainty drop-in v1.0.0

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Purpose

This is an additional module not listed in the original Iteration 47 ten-package handoff. Install it as `drop-in/uncertainty/`. It provides deterministic, bounded Monte Carlo input uncertainty orchestration over an injected simulation runner. It does not belong inside `drop-in/simulation/` and does not replace or fork the canonical kernel.

## Spine contract

- Inject the simulation runner; do not import or own canonical model state.
- Never mutate the supplied parameter spec or canonical model.
- Return only `OK` or `HOLD`.
- If any sample returns HOLD, malformed metrics, non-finite metrics, throws or times out, the entire study returns HOLD. Do not publish partial percentiles as a successful study.
- Mark output as `SIMULATED`; never claim physical verification.
- Preserve seed, sample count, input ranges, metric names and package version for provenance.

## Integration

Grok should inspect the existing central drop-in registration convention and register this package as an optional analysis capability only after confirming the schema and permissions model. It should not alter the kernel, acceptance script or existing simulation module. The module entrypoint is `uncertaintyStudy(spec, { runner, timeoutMs })`.

## Tests

Run `npm run check`, `npm test`, and `npm run integration` in this folder. Then run platform regression and acceptance after adding it. No central registration or UI reachability is claimed by this ZIP.
