# PAP Iteration 47 engineering hardening package v0.3.0

This is a bounded integration package, not a full platform archive.

- `drop-in/` contains ten strengthened engineering modules, individual tests, manifests, a shared sample corpus, and an executable sample runner.
- `patches/` contains targeted source replacements for the previous cost, HIL and fidelity evidence regressions, plus updated historical conformance tests and a new regression guard suite.
- `docs/ITERATION-47-PACKAGE-DEPTH.md` records implemented depth and limitations.

## Start here

1. Read `drop-in/STITCH-INSTRUCTIONS.md`.
2. Read `patches/README.md`.
3. Run `node drop-in/test-all.mjs` from the repository root after copying `drop-in/`.
4. Apply/reconcile the source patches against the latest spine, then run `node tests/run.mjs` and the complete acceptance/browser/mutation suite.

The package is tested in isolation and the targeted source patches pass the repository's 65-suite regression checklist. The ten modules are **not registered in the platform runtime or reachable from the UI**. Do not claim full platform integration until the adapters, registry, graph persistence and UI workflow are stitched and tested on the latest spine.
