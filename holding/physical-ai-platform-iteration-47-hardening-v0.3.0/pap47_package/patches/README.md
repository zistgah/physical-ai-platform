<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Targeted spine patch overlay

These are exact replacement files from the Iteration 47 hardening worktree. They are not a complete repository. Compare each against the integrator's latest spine before applying; newer changes must be reconciled rather than overwritten.

## Source fixes

- `site/components/core/cost-model.js`: total is `null` when any required cost is undeclared; explicit zero remains valid; declared subtotal remains visible.
- `business-engine.js` and `business-closure.js`: use the canonical cost model and propagate completeness/UNSPECIFIED state into the active business paths.
- `site/components/simulation/hil-loop.js`, `hil-realtime.js`, `hil-transport.js`: a string transport or arbitrary `step()`/`tick()` object cannot claim HIL; require read/write I/O, declared hardware identity, safety interlocks, verified authority and a platform-provided synchronous identity-attestation verifier. Wall-clock duration is measured. Output remains unqualified.
- `fidelity-ladder.js`: planning produces PLANNED evidence; EXECUTED requires an explicit completed external execution record. HIL record requires device, bus and hardware-attestation declaration.
- `fidelity-levels.js`: a fidelity claim references existing accepted/verified evidence bound to project, subject and configuration; it does not manufacture evidence.
- `cad-hil-adapter.js`: HIL evidence is recorded only from an external, completed, configuration-bound hardware execution record.

## Test updates

The updated conformance tests remove old assertions that treated transport labels and JavaScript step functions as HIL, or that allowed fidelity claims to manufacture evidence. `WP-ITER47-GUARDRAILS` adds direct regression tests for the defects.

## Apply order

1. Compare the six simulation files and three business files against the latest spine.
2. Apply compatible source changes, preserving newer unrelated behavior.
3. Apply updated test files or port their assertions into the latest test structure.
4. Run `node tests/run.mjs` and the complete `node tests/acceptance.mjs` on the merged repository.
5. Verify UI cost display handles `null` as UNSPECIFIED rather than formatting it as zero.
6. Verify hardware adapters call a trusted identity verifier. A test callback returning verified=true is a fixture, not a production trust root.
