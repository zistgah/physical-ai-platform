# Prototyping package v1.1.0 - verification report

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Environment

- Source baseline: supplied Iteration 47 archive and `HANDOFF.md`.
- Runtime: Node.js v22.16.0.
- Python worker runtime: Python 3 with SciPy 1.17.0.
- No CAD/CFD/FEM/circuit/multibody engine binary was installed in the execution environment.
- Kernel, schemas, lifecycle engine, unrelated drop-ins and `tests/acceptance.mjs` were not modified.
- The working-copy Iteration 47 conformance runner was updated only to import the new backend integration test; the minimal patch is included.

## Package tests executed

| Test | Result | Scope |
|---|---|---|
| `node drop-in/prototyping/test.mjs` | PASS - 73 assertions | Prototype configuration/revision/evidence/fidelity/graph/immutability regression |
| `node drop-in/prototyping/backend-test.mjs` | PASS - 64 assertions | Backend catalog, preflight, injection rejection, bounded timeout, worker failure modes, benchmark validation, real SciPy execution and evidence handoff |
| `node drop-in/prototyping/integration-test.mjs` | PASS - 12 assertions | Canonical kernel, EvidenceBinding, G4 authority, LifecycleEngine, plus actual SciPy-to-kernel-to-G4 path |
| SciPy RC worker | PASS | Real `scipy.integrate.solve_ivp` RK45 execution, analytical RC response comparison, WebCrypto SHA-256 validation report, evidence candidate and prototype evaluator |

The SciPy reference worker test uses the installed SciPy library, not a mock. The integration test additionally runs the actual SciPy worker, creates canonical configuration/revision/test/evidence records, binds Evidence through the canonical services, and evaluates G4 and the lifecycle engine. The other worker responses in the protocol-negative and adapter tests are test doubles; they verify protocol behavior and do not claim numerical engine execution.

## Platform verification

| Test | Result | Notes |
|---|---|---|
| Iteration 47 conformance | PASS | `node tools/conformance-test-iter47.mjs`; package, backend and kernel integration tests imported by the runner |
| Regression checklist | PASS - 64/64 | `node tools/regression-checklist.mjs`; all historical conformance suites pass |
| Ten drop-in package tests | PASS - 10/10 | All ten `drop-in/*/test.mjs` scripts executed individually |
| Acceptance, no browser/no mutation | UNVERIFIED | Latest run exceeded the 300-second execution window; an earlier run before the final kernel-integration test reported 55 PASS / 8 SKIP |
| Full acceptance | UNVERIFIED | Default run exceeded the 300-second execution window |
| Mutation-enabled acceptance, no browser | UNVERIFIED | `--no-browser` run exceeded the 300-second execution window |
| Real browser acceptance | UNVERIFIED | Not established in the final run; requires browser automation runtime |
| Other external solver benchmarks | Not executed | Corresponding engine binaries and worker drivers are not installed here |

## What is established

- The backend registry discovers candidates by domain/operation/input format and refuses unsupported preferred-backend fallback.
- Worker jobs require version pinning, configuration/revision/test identity, digested inputs, units, safe JSON options and bounded timeout.
- The worker protocol rejects wrong engine identity, wrong operation, mismatched input digest, version mismatch, malformed timestamps, missing outputs, invalid digests and nondeterministic responses for deterministic jobs.
- A solver process result is not accepted without a separate benchmark validator.
- Numerical validation produces a real SHA-256 report digest through WebCrypto.
- The SciPy worker computes the RC response at t=RC and is checked against 1-exp(-1) within 0.005 V.
- The resulting run is bound to the sample's project/configuration fingerprint/revision/test and is accepted by the prototype evaluator as simulation-only evidence.
- Simulation/SIL evidence without verified backend execution provenance now HOLDs.

## What is not established

- The catalogue is not a claim that all listed engines are installed, operational or benchmark-qualified.
- The OpenFOAM, Gmsh, Open CASCADE, Elmer, Code_Aster, CalculiX, ngspice, Xyce, Chrono, MBDyn and MuJoCo profiles require their real worker drivers and binary-specific tests.
- The included CFD residual/conservation benchmark is only a necessary-condition smoke profile, not a full-field CFD validation.
- Cryptographic digests provide integrity identifiers, not digital signatures or tamper-evident audit storage. Host-side signed attestations and immutable storage remain required for production assurance.
- The package does not register the backend catalogue in the platform UI/route registry. Grok performs that integration.

## Release decision

**Package state: backend protocol and prototype evaluator tested; one real numerical backend (SciPy) executed and benchmark-verified.** Other listed backends are integration profiles, not claimed as tested solver executions. Platform-wide release remains dependent on running the full acceptance and regression suites after Grok's stitch and implementing the worker drivers for the selected engines.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
