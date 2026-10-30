Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 01 Baseline

Engineering record of the repository state prior to canonical kernel activation.

## Existing runtime entry point

- `site/index.html` loads `site/assets/js/app.js` as ES module.
- Hash-based routing in `app.js` for `/`, `/explore`, `/learn`, `/research`, `/build`, `/simulate`, `/manufacture`, `/deploy`, `/regulate`, `/standards`, `/ai-guide`, `/about`.
- `/start` is referenced from home role card but not registered in routes (unresolved).
- Seeded demo entities in `app.js` via simple `EntityStore`.

## Existing architectural spine

- `site/assets/js/physical-ai-platform-spine-detailed.js` (large monolithic specification, ~2335 lines).
- Contains `ENUMS`, `ENTITY_TYPES` (Person, Organization, Mission, System, Subsystem, Component, Port/Interface, Capability, Requirement, Constraint, Policy, Intention, Plan, Execution, State, Event, Resource, Environment, Hazard, SafetyCase, ComplianceCase, Standard, Regulation, Test, Experiment, Evidence, Artifact, Configuration, Dataset, Model, Supplier, Process, Customer, ServiceEvent, Publication, Patent, Course/Lesson, Business, Funding, Deployment, Telemetry, Incident, and more), relation handling, engines (Provenance, Requirements, Evidence, Safety, Compliance, Mission, ComponentRegistry, Contract, IR, Simulation, etc.), gates, lifecycle, and `PhysicalAIPlatform` class.
- Status: architectural source material. Not yet the active runtime of `app.js`. Mapped as: implemented (in spine), not integrated into application entry point.

## Existing core modules

- `site/components/core/store.js`: basic `EntityStore` (Map entities, array relations). No full typing, provenance, or versioning enforcement.
- `site/components/core/validation.js`: basic entity and graph validation (dangling relations, missing id/type).
- `site/components/core/contracts.js`: port types, `validatePortConnection` (direction, type, unit), `componentContract`.
- `site/components/core/event-bus.js`, `id.js`, `migrations.js`, `plugin-system.js`, `units.js`, `versioning.js`: stubs or minimal implementations.
- Status: partially implemented, not fully aligned with spine semantics.

## Existing graph implementation

- Dual: spine's richer `EntityStore` (relations as Map, typed entities) and modular `site/components/graph/knowledge-graph.js` wrapping the simple store.
- Typed relationships present conceptually in spine and MRD; not fully enforced in runtime.

## Existing persistence

- Spine contains a `Persistence` class stub.
- No active localStorage or project save/load in the application runtime.
- Status: disconnected / future adapter.

## Existing schemas

- `schemas/entity.schema.json`, `schemas/component.schema.json`, `schemas/architecture-manifest.schema.json`.
- Minimal. No project serialization schema, no SIR schema.

## Existing simulator

- `site/components/simulation/simulator.js`: deterministic `Simulator` with `SimComponent`, step, route, faults, replay, telemetry.
- `mobile-robot.js`: Battery, Motor, Controller, EmergencyStop components. `createMobileRobotSimulation` is incomplete/broken.
- `scenario.js`: `createMobileRobotScenario` that wires a basic mobile robot.
- `simulator-ui.js`: UI for the simulator.
- Status: functional reference simulator, not yet consuming canonical component/port contracts or producing Evidence artifacts.

## Existing workbench

- `site/components/workbench/system-model.js`, `ports.js`, `architecture-upgrade.js`.
- Supports system creation, component addition, basic port connect via PortRegistry.
- Not yet integrated into the application UI routes.

## Existing tests

- `tools/test-components.mjs` (minimal).
- No architectural conformance suite.

## Existing routes

- As listed in app.js. Most are static HTML descriptions. Simulate launches SimulatorUI. Build is descriptive.

## Existing disconnected modules

- Spine engines (RequirementsEngine, EvidenceEngine, SafetyEngine, ComplianceEngine, IREngine, etc.) – defined but not wired to app.
- Domain engines: education, research, manufacturing, teleoperation, compliance, safety – stubs.
- Full SIR, execution gate, provenance enforcement, project container, serialization – not active in runtime.
- Knowledge graph inspector – not present.

## References

Authoritative sources remain:

- `docs/MRD.md`
- `docs/architecture/*`
- `sources/mrd-predecessor/*` (verbatim predecessor corpus)

No architectural content was rewritten into this baseline. This file records observed state only.

**Status of spine**: valuable architectural source material. Will be preserved. Services to be mapped and integrated behind stable interfaces in the modular components. Functionality not ready for full integration will be recorded as implemented / integrated / partially integrated / future adapter.