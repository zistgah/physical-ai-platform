# Verification logs

- `package-tests.log`: `node tests/test.mjs` from this package; 146 PASS.
- `package-samples.log`: `node run-samples.mjs`; three educational notebook computations, role/explanation checks, LMS workflow and jurisdiction discovery assertions pass.
- `iteration47-regression.log`: `node tools/regression-checklist.mjs` on the supplied Iteration 47 spine copy; 64/64 suites pass.
- `iteration47-acceptance-no-browser-no-mutation.log`: completed `node tests/acceptance.mjs --no-browser --no-mutation` on the supplied Iteration 47 spine copy; 55 PASS, 8 SKIP. Browser and mutation gates were explicitly skipped.

The Iteration 47 logs are baseline checks only. The package remains unregistered and not integrated into the spine.
