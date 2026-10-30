Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Changelog

## Iteration 03 – Lifecycle + Configuration + Digital Thread + Assurance + Manufacturing

### Added
- LifecycleEngine with evidence-based gates (PASS/HOLD/FAIL/NOT_APPLICABLE), decision recording, #/lifecycle view.
- ConfigurationEngine with deterministic fingerprints, freeze/immutability, comparison, baselines, #/configuration view.
- DigitalThread with forward/backward trace, thread-break detection, traceability findings, #/traceability view.
- ChangeImpactEngine with path/reason/impact-class analysis.
- SafetyEngine upgraded: Claim-Argument-Evidence, hazard ontology, cockpit readiness (unknown→HOLD, unresolved→NO-GO), identity gate (missing config→NO-GO), abort→SAFE.
- ComplianceEngine upgraded: export states, workflow states, small profiled standards dataset + applicability engine, #/compliance view. Backward-compatible evaluate() preserved.
- ManufacturingEngine upgraded: EBOM/HBOM/SBOM/MBOM/CBOM/ABOM/SystemBOM projections, process-plan slice, sovereignty analysis, #/manufacture view.
- Canonical mobile robot fixture extended with LifecycleStage, Gate, Configuration, Hazard.
- New entity types and relations in canonical kernel.
- tools/conformance-test-iter03.mjs
- Architecture docs and ITERATION-03-BASELINE.md / RESULT.md

### Changed
- CONTAINS relation targets expanded to include new entity types.
- Navigation updated.

### Preserved
- All Iteration 01 and 02 tests and semantics.
- Spine, MRD, predecessor corpus.
- Existing simulator and kernel identity/project-isolation guarantees.

### Not in this iteration
Education, full research, full teleoperation, full CAD, full standards corpus, full SIR compiler, factory execution.

## Iteration 04 – Deferred verticals closed as slices

### Added
- Standards corpus (10 provenance-labelled profiles) + query/adopt.
- Factory execution (work orders, routing, inspection evidence).
- CAD manifest import and HIL evidence adapter.
- Expanded SIR structured sections (lifecycle, assurance, manufacturing, education, research, operations, business).
- Education curriculum paths, research experiment/dataset/publication, teleoperation sessions with mandatory local safety authority, fleet/deployments, business cost aggregation + funding/customer.
- UI routes: #/standards, #/education, #/research, #/operations.
- tools/conformance-test-iter04.mjs

### Preserved
- All Iteration 01–03 tests and semantics.
- Canonical graph as the single semantic source of truth.

## Iteration 05 – Platform closure and integration

### Added
- Unified vertical contracts.
- Import trust boundary (imported ≠ verified).
- Canonical graph queries (orphans, cycles, coverage, stale, readiness).
- Explicit sharing/publication boundary.
- Cross-vertical integration conformance suite.
- Demonstrator objects: Baseline, Deployment, Telemetry.

### Changed
- Kernel validateGraph reports orphans.
- SIR serialization cleaned (no duplicate key); lossless round-trip confirmed.

### Preserved
- All Iteration 01–04 tests and semantics.
- Single canonical semantic model.
- Historical lineages not flattened.

## Iteration 06 – Close remaining limitations

### Added
- Explicit evidence promotion (authority required; simulation never auto-validated).
- Physical test evidence method, distinct from simulation.
- Fidelity ladder: SIL / HIL / PHIL / RIL.
- Standards tailoring and evidence-binding workflow.
- SIR compiler: validate, normalize, fail on loss.
- Factory process-plan and quality records.
- Business cost rollup and customer order.
- Education course / lesson / competency assessment.
- CAD geometry manifest import.

### Preserved
- All prior tests and the single canonical model.
- Simulation evidence remains SIMULATION/EXECUTED until explicit promotion.
- Standards remain informational until project action.

## Iteration 07 – Standards no longer informational-only at project scope

### Added
- StandardsAcceptance: profile → adopt → review (evidence required) → accept (authority + rationale).
- Project-scoped ACCEPTED state. Regulatory authority remains false.
- Corpus entries remain informational and are not mutated.

### Tests
- tools/conformance-test-iter07.mjs

## Iteration 08 – Quality-review gap closure

### Changed
- Replaced eight boilerplate architecture docs with accurate API/gap descriptions.
- Execution gate no longer assumes authority or state. Unresolved → HOLD.
- Lifecycle decisions record configuration and authority.

### Added
- relation-registry.js: defined vs unresolved for every typed relation.
- evidence-binding.js: configuration binding and stale-on-change.
- assurance-path.js: walkable hazard → control path; missing hops reported.
- docs/architecture/non-goals.md
- tools/conformance-test-iter08.mjs

## Iteration 09 – Traceability for every iteration; full named standards corpus

### Added
- data/standards/corpus.json: 27 standards named in MRD and predecessor corpus.
- tools/emit-traceability.mjs and docs/iterations/TRACEABILITY.md covering iterations 01–09.
- tools/conformance-test-iter09.mjs

### Changed
- standards-corpus.js regenerated from the corpus file.

## Iteration 10 – Standards provenance corpus and SIR language draft

### Added
- 164-record standards corpus with publisher provenance and edition watchlist.
- SIR language first draft: lexer, parser, compiler to PAI-SIR.

### Preserved
- Original Iteration 09 provenance. Official URLs added, not substituted.
- Platform status INFORMATIONAL. No standard text imported.

## Iteration 11 – Work-package stitch

### Added
- 19 validated drop-in packages from the Iteration 10 cycler.
- Per-package conformance tests.

### Not changed
- Canonical kernel, relation registry, standards corpus.

### Not supplied
- WP-COCKPIT-STATES.

## Iteration 12 – Cockpit state records

### Added
- CockpitMachine: S0–S10, ABORT, DIAGNOSIS as graph records.
- Freeze gate on leaving S0. Illegal transitions rejected.

### Not changed
- Kernel, registry, standards corpus, safety-engine.

## Iteration 13 – Integration and boundaries

### Integrated
- Overlay relations consumed by the registry, except unresolved MANUFACTURED_BY.
- Gate schemas consulted by lifecycle. Cockpit wired through safety. Workbench and inspector wired into pages.

### Not invented
- No factory, no legal standards database, no general-purpose language, no industrial subsystem.

## Iteration 14 – Geometry CAD

### Removed
- False non-goal markers. No domain is a non-goal.

### Added
- Geometry CAD kernel: sketch, extrude, revolve, boolean, mesh, STL.

## Iteration 15 – CAD contract and mesh kernel

### Added
- CAD-GEOMETRY contract. A volume without a watertight mesh is not a solid.

### Replaced
- Geometry kernel. Volume is the mesh integral. Pocket boolean and tessellated revolve.

## Iteration 16 – CAD features

### Added
- Partial revolve, non-rectangular pocket, boundary notch, chamfer, fillet, shell, draft.
- Arc and spline sketches. STEP manifold solid B-rep. Assembly interference.

## Iteration 17 – Domain systems

### Added
- SIR runtime, MES, ERP, LMS, prover, multi-physics solver, distributed runtime.
- HIL loop, fleet operations, teleop remote stack, cockpit execution, standards binding.
- Interactive workbench.

## Iteration 18 – No drops, LMS, checklist

### Fixed
- Gate evaluation synchronous. Both MANUFACTURED_BY directions kept.

### Added
- Graph-backed LMS. Regression checklist over every prior suite.

## Iteration 19 – CAD claims closed

### Fixed
- General profile boolean. Interactive CAD workbench.

## Iteration 20 – Remaining domains

### Added
- SIR ABI, graph editor views, fidelity, HIL binding, board correlation, component model, NURBS.

## Iteration 21 – Standards display

### Fixed
- Standards no longer display as null.

## Iteration 22 – Evidence integrity

### Fixed
- Adoption copies required evidence. Only bound valid evidence clears.

## Iteration 23 – Workbench and simulation

### Added
- Software, event, commercial, regulatory, physical 3D views.
- Import quarantine, consistent export, modes, fault injection, extended physics.

## Iteration 24 – Role pages and privacy

### Fixed
- Deploy, Regulate, and Fund have views.
- Import trust boundary. Names escaped.
- S7 can shut down without FULL. More cockpit preconditions.
- CHANGELOG, LICENSE, and CITATION aligned.
