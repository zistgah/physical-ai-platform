Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Traceability Matrix – Architecture Docs vs Implementation

Generated against the Iteration 07 repository. Status is observed, not claimed.

Legend: IMPLEMENTED = behavior exists and is tested. SLICE = executable but shallow. STUB = class/file exists, little semantics. DOC_ONLY = documented, not implemented. BOILERPLATE_DOC = template doc that overclaims.

| MRD / architecture concern | Doc | Implementation | Tests | Honest status |
|---|---|---|---|---|
| Canonical semantic graph | canonical-semantic-model.md | canonical-kernel.js, store.js | iter01–05 | IMPLEMENTED |
| Identity / provenance survive round-trip | canonical-semantic-model.md, sir.md | kernel upsert/deserialize/canonicalize | iter02, iter05 | IMPLEMENTED |
| Project isolation | canonical-semantic-model.md | getProjectGraph, serializeProject | iter02 | IMPLEMENTED |
| Typed relations (full) | canonical-semantic-model.md | RELATION_DEFINITIONS covers subset; rest name-only | iter02 partial | SLICE |
| Port / component contract | component-model.md, contracts.js | validatePortConnection, componentContract | iter01, iter02 | IMPLEMENTED |
| Vertical contracts | platform-closure.md | contracts-vertical.js | iter05 | SLICE (required-field checks only) |
| Lifecycle stages + gates | lifecycle.md (boilerplate) | lifecycle-engine.js | iter03 | SLICE (evidence-based HOLD/PASS; not all 12 gates instrumented) |
| Configuration fingerprint / freeze | configuration.md (boilerplate) | configuration-engine.js | iter03, iter05 | IMPLEMENTED for fingerprint/freeze/compare |
| Configuration compatibility | configuration.md | isConfigurationCompatible | none deep | SLICE (interface-type heuristic) |
| Digital thread + breaks | digital-thread.md (boilerplate) | digital-thread.js | iter03 | SLICE |
| Change impact | change-impact.md (boilerplate) | change-impact.js | iter03, iter05 | SLICE (bounded traversal of a relation set) |
| Requirements traceability | traceability.md | kernel getRequirementTrace/Status | iter01–03 | IMPLEMENTED for the chain |
| Evidence states + no auto-promote | traceability.md, platform-closure.md | evidence-promotion.js | iter06 | IMPLEMENTED |
| Physical vs simulation evidence | platform-closure.md | PHYSICAL_TEST vs SIMULATION | iter06 | IMPLEMENTED as distinct methods |
| Safety case Claim-Argument-Evidence | assurance.md (boilerplate) | safety-engine.js | iter03, iter05 | SLICE |
| Hazard ontology | assurance.md | HAZARD_TYPES + addHazard | iter03 | SLICE |
| Cockpit identity gate / abort | cockpit.md (boilerplate) | safety-engine cockpitIdentityGate, forceAbort | iter03 | SLICE (no full S0–S10 machine) |
| Compliance export states | compliance.md (boilerplate) | compliance-engine evaluateExport | iter03–05 | IMPLEMENTED |
| Standards corpus | compliance.md | standards-corpus.js (10 entries) | iter04, iter07 | SLICE |
| Standards project acceptance | ITERATION-07-RESULT.md | standards-acceptance.js | iter07 | IMPLEMENTED as project-scoped; not regulatory |
| Manufacturing BOM projections | manufacturing.md (boilerplate) | manufacturing-engine.js | iter03, iter04 | SLICE (projections) |
| Factory execution | manufacturing.md | factory-execution.js, factory-closure.js | iter04, iter06 | SLICE (not MES) |
| Sovereignty analysis | MRD §9 | manufacturing-engine sovereigntyAnalysis | iter03 | SLICE (single-source heuristic) |
| SIR interchange + round-trip | sir.md | serializeToSIR / deserializeFromSIR | iter02, iter05 | IMPLEMENTED |
| SIR compiler | ITERATION-06-RESULT.md | sir-compiler.js | iter06 | SLICE (validate/normalize; not a language) |
| Import trust | platform-closure.md | import-trust.js | iter05 | IMPLEMENTED |
| Sharing boundary | platform-closure.md | sharing-boundary.js | iter05 | SLICE (record only; no transport) |
| Graph queries | platform-closure.md | graph-queries.js | iter05 | SLICE |
| Education | MRD §6 | curriculum-engine.js, education-closure.js | iter04, iter06 | SLICE (not LMS) |
| Research | MRD §6 | research-engine.js | iter04 | SLICE |
| Teleoperation | MRD §10 | teleoperation-engine.js | iter04, iter05 | SLICE (authority + stop; not remote ops) |
| Fleet | MRD §8 | fleet-engine.js | iter04 | SLICE |
| Business / cost | MRD §8 | business-engine.js, business-closure.js | iter04, iter06 | SLICE (not ERP) |
| CAD / HIL | coverage-matrix.md gaps | cad-hil-adapter.js, fidelity-ladder.js | iter04, iter06 | SLICE / adapter |
| Simulator | simulator.md | simulator.js, scenario.js, canonical-mobile-robot.js | iter01 | IMPLEMENTED (deterministic reference) |
| Workbench | MRD §5 | workbench/*.js, app.js /build | weak | PARTIAL (UI slice; modules not fully wired) |
| Execution gate graph-aware | MRD principles | evaluateExecution | iter02 | SLICE (authority/capability simplified) |
| Spine engines | physical-ai-platform-spine-detailed.js | not wired | none | DOC_ONLY / preserved source |
| Full standards legal corpus | MRD §7 | not present | none | DOC_ONLY |
| Formal verification | coverage-matrix.md | not present | none | DOC_ONLY |
| Multi-physics / real HIL | coverage-matrix.md | not present | none | DOC_ONLY |
| Historical lineages (Layer A) | predecessor corpus | not flattened | n/a | Correctly preserved as provenance |

## Doc quality correlation

| Doc | Words approx | Correlates to code? | Problem |
|---|---|---|---|
| lifecycle.md, configuration.md, digital-thread.md, change-impact.md, assurance.md, cockpit.md, compliance.md, manufacturing.md | ~60 each, identical template | Weak | Boilerplate. Same paragraph copied. Overclaims IMPLEMENTED. |
| canonical-semantic-model.md, sir.md, traceability.md, platform-closure.md | substantive | Strong | Match the kernel and closure modules. |
| coverage-matrix.md | substantive, older | Strong | Honest about gaps. More accurate than Iter 03 stub docs. |
| ITERATION-0N-RESULT.md | substantive | Strong | Generally honest about slice vs complete, except where stub docs were generated. |
