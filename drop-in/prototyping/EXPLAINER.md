# Prototyping module - engineering specification

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## What an industry leader has

A credible prototype capability requires controlled revisions, requirements traceability, repeatable tests, configuration-specific evidence, fidelity-aware simulation/physical distinction, reviewable provenance, and an explicit lifecycle authority boundary. This module implements the bounded evaluator portion of that capability; it does not claim to provide the complete enterprise PLM workflow.

## Purpose

`prototype()` is a pure, fail-closed evaluator for the Iteration 47 `drop-in/prototyping` package. Its target is **a revision with evidence**. It determines whether a proposed prototype-review package is internally complete and traceable. It is an evaluator, not a persistence service, simulator, safety authority, certification body, or lifecycle gate engine.

## Constraints

- Do not flatten the canonical kernel.
- Do not exclude a requirement.
- A HOLD is a HOLD; missing or unknown information never returns OK.
- The canonical kernel and acceptance script remain unchanged.
- This package is a drop-in evaluator; Grok owns host integration.

## Governing architecture

The Master Requirements Document requires one canonical system model and typed graph relationships. This module consumes canonical-style records and requires these edges:

- `Test --VERIFIES--> Requirement`
- `Evidence --CONFIGURED_BY--> Configuration`
- `Evidence --DERIVED_FROM--> Test`

It does not create a second graph, invent relationship aliases, modify the canonical kernel, or advance the lifecycle. The host remains responsible for persistence, authorization, gate evaluation, audit history, and lifecycle transitions.

## Required input

```js
prototype({
  config: {
    id: "cfg-01",
    type: "Configuration",
    status: "FROZEN",
    fingerprint: "sha256:..."
  },
  revision: {
    id: "rev-02",
    configurationId: "cfg-01",
    parentRevisionId: "rev-01", // optional for first revision
    parentRevision: { id: "rev-01", configurationId: "cfg-01" }, // required when parent id is set
    changes: ["Changed bracket geometry"]
  },
  requirements: [{ id: "req-01", type: "Requirement" }],
  tests: [{
    id: "test-01", configurationId: "cfg-01", revisionId: "rev-02",
    requirementIds: ["req-01"], status: "PASS", result: { fit: true }
  }],
  evidence: [{
    id: "ev-01", configurationId: "cfg-01",
    configurationFingerprint: "sha256:...", revisionId: "rev-02",
    testId: "test-01", method: "PHYSICAL_TEST", state: "TESTED",
    realization: "REAL", fidelityLevel: "L6", result: { fit: "within tolerance" }
  }],
  relations: [
    { source: "test-01", relation: "VERIFIES", target: "req-01" },
    { source: "ev-01", relation: "CONFIGURED_BY", target: "cfg-01" },
    { source: "ev-01", relation: "DERIVED_FROM", target: "test-01" }
  ]
});
```

All tests must pass. Every test must produce at least one accepted evidence record. Every declared requirement must be covered by at least one test. A test must identify its requirement IDs and have canonical `VERIFIES` edges. Evidence must be bound to the exact configuration fingerprint and revision, and must have both canonical evidence edges.

## Configuration and revision integrity

- Configuration type must be `Configuration`.
- Configuration status must be one of `FROZEN`, `BASELINED`, `APPROVED`, or `RELEASED`.
- Configuration fingerprint is mandatory. Evidence fingerprint must exactly match it.
- Revision must identify the configuration and contain one or more non-blank change descriptions.
- If `parentRevisionId` is supplied, `parentRevision` must resolve that ID and belong to the same configuration. A self-parent is rejected.
- This package compares the supplied fingerprint values. It does not calculate or cryptographically verify a digest; the host must calculate and protect the fingerprint.

## Evidence fidelity policy

The MRD defines the fidelity ladder L0-L7 and explicitly distinguishes simulation, HIL, and real hardware. The module therefore requires explicit realization and fidelity declarations:

| Method | Required realization | Allowed fidelity |
|---|---|---|
| `SIMULATION`, `SIL` | `SIMULATED` | L0-L4 |
| `HIL`, `PHIL`, `RIL` | `HIL` | L5 |
| `PHYSICAL_TEST` | `REAL` | L6-L7 |
| `INSPECTION` | `SIMULATED`, `HIL`, or `REAL` | L0-L4, L5, or L6-L7 respectively |

A simulation can support prototype learning and review, but the evaluator explicitly returns `simulationOnlyRequirementIds` and a note that simulation-only support is not physical verification or safety certification. It never promotes simulation to real hardware evidence. `PLACEHOLDER` and `UNVERIFIED` are not accepted as completed test evidence.

## Outcomes

- `HOLD`: absent, malformed, unresolved, stale, unsupported, or insufficient information. HOLD is not a pass.
- `FAIL`: explicit test/evidence failure, duplicate identities, self-parent revision, or contradictory configuration/revision bindings.
- `OK`: this evaluator's checks passed. `OK` is not `G4 PASS`, safety approval, certification, or permission to operate.

The host must still invoke the canonical `EvidenceBinding`, `GateSchemaEngine`, and `LifecycleEngine` with appropriate authority and project context. The G4 engine remains the only lifecycle authority.

## Non-goals and explicit boundaries

This module does not:

- run CAD, CFD, circuit, multibody, HIL, or emulation simulations;
- acquire sensor or physical test data;
- infer test results from a model or AI response;
- calculate configuration fingerprints;
- sign evidence cryptographically or provide tamper-evident storage;
- establish legal, export, safety, or certification authorization;
- persist canonical entities or relations;
- approve or advance G4/G5 or any lifecycle state.

These are intentional boundaries, not hidden claims of capability. The respective canonical services and drop-in modules own those functions.

## Safety and integrity properties

- Pure function: no I/O, network, timers, or mutation.
- Fail-closed validation of missing and malformed inputs.
- Duplicate identity rejection for requirements, tests, and evidence.
- Explicit contradiction detection for configuration and revision bindings.
- Evidence freshness check through `stale` / `status=STALE` and fingerprint matching.
- Substantive result check; empty objects and empty strings do not count as results.
- Status normalization is whitespace- and case-insensitive.
- Supports multiple evidence records per test.
- Does not mutate frozen inputs.

## Executable tests

Run from repository root:

```bash
node drop-in/prototyping/test.mjs
node drop-in/prototyping/integration-test.mjs
```

The isolated suite covers positive, negative, boundary, fidelity, traceability, immutability, and sample-fixture cases. The integration suite creates canonical entities, links them through the kernel, binds evidence, evaluates G4, checks authority HOLD behavior, and evaluates lifecycle state.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Open-source engineering backend integration

The package now exposes a replaceable backend ecosystem. It does not duplicate mature numerical engines. `backend-registry.js` catalogs their supported domains, operations, formats, worker profile, upstream source and license notes. Current candidates include Open CASCADE Technology, Gmsh, OpenFOAM, Elmer FEM, Code_Aster, CalculiX, ngspice, Xyce, Project Chrono, MBDyn, MuJoCo and SciPy.

`createBackendAdapter()` is the common protocol adapter. It accepts an injected trusted worker transport and an independent numerical validator. It validates project/configuration/revision/test identity, pinned backend version, operation, input format, units, spatial frame where applicable, immutable input digests, finite JSON solver options, execution timeout, deterministic seed, worker response identity, timestamps, output artifact formats/digests and environment fingerprint. It rejects arbitrary executable/shell fields. It does not run shell commands in the browser.

A successful solver exit is not enough. The independent validator must compare actual numerical output to a declared benchmark or acceptance profile and return `VERIFIED` with a SHA-256 report digest. Only then can `toSimulationEvidenceCandidate()` produce an `EXECUTED` simulation evidence candidate. The host still persists the Evidence entity and adds canonical graph relations. `prototype()` checks the backend run's configuration fingerprint, revision and test binding before accepting simulation/SIL evidence.

The benchmark validators include RC step response, cantilever-beam deflection, small-angle pendulum period, B-rep box-intersection volume, Gmsh mesh-quality checks, and bounded CFD residual/conservation checks. The CFD profile explicitly states that residual/conservation checks alone are not full-field validation.

### Actual solver execution in this package

The included SciPy worker is executable and tested. It uses `scipy.integrate.solve_ivp` to integrate a first-order RC transient, measures the output at one time constant, and is checked against the analytical response. The backend test executes the Python worker through the JavaScript adapter, generates a SHA-256 benchmark report using WebCrypto, constructs simulation evidence and passes that evidence through `prototype()`.

The other external engines have catalog and worker-driver profiles, but their binaries were not installed in this verification environment. They are adapter-contract-ready, not solver-qualified by this package run. Grok's worker deployment must implement their driver profiles and execute their real benchmark suites before marking them benchmark-verified.

See `BACKEND-ECOSYSTEM.md`, `backend-driver-profiles.json`, `backend-job.schema.json`, `backend-response.schema.json`, and `STITCH-INSTRUCTIONS.md` for the complete integration contract and license/operational requirements.
