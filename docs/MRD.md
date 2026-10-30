Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Master Requirements Document (MRD)

**Physical AI Platform – Sovereign Physical AI and Robotics Guidance Platform**

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.

Licensed under the GNU General Public License v3.0.

This MRD consolidates the architectural, educational, operational, compliance, sovereignty, and systems-engineering requirements derived from the predecessor documents stored verbatim in `sources/mrd-predecessor/`.

Each predecessor file is an authoritative source. This document captures the essential points, invariants, and requirements without loss of architectural intent.

## 1. Foundational Objectives

- Technological sovereignty through agency, optionality, resilience, inspectability, repairability, reproducibility, substitution, local manufacturing, and computational portability.
- Use superior external technology when available, but never make it indispensable.
- Dependency progression: Dependency → Controlled Dependency → Replaceable Dependency → Sovereign Capability.
- Sovereignty is an architectural property, not merely an ownership claim.
- Commercial systems are reference implementations and performance benchmarks, not architectural definitions.
- The platform is not a robotics simulator, CAD tool, documentation portal, or AI assistant alone. It is a universal visual systems engineering, simulation, compilation, manufacturing, operations, compliance, research, business, and education platform for physical-AI systems.
- One canonical system model, many views, simulations, implementations, documents, business artifacts, regulatory artifacts, and physical realizations.
- Supports terrestrial, marine, subsea, aerial, aerospace/orbital, industrial, agricultural, mining, construction, energy, logistics, infrastructure, healthcare, education, domestic/consumer, emergency, scientific, security, defence, swarms, fixed, wheeled, tracked, legged, soft/deformable, hybrid, and spacecraft embodiments.

## 2. Core Architectural Principles

- Semantics are independent of implementation, execution, and presentation.
- Canonical System Model and contracts are the source of truth. UI, simulator, AI provider, OS, processor, manufacturer, and supplier are replaceable.
- Old implementation → adapter/migration → stable semantic contract → new implementation.
- Preserve backward compatibility; make breaks explicit, versioned, migratable, and testable.
- No mandatory backend, database, proprietary AI, or cloud service for the public GitHub Pages deployment.
- Static-first: JSON/YAML + schemas + client-side JavaScript + Markdown.
- Five fundamental object classes: Person, System, Capability, Evidence, Artifact.
- Everything is a component. Everything is composable, inspectable, simulatable, exportable, verifiable, and promotable.
- Intent is not policy. Policy is not execution. Execution is not authority. Capability is not authority.
- A component is not merely a file. A document is not the system model. A simulation is not the implementation. A vendor is not the interface.
- UNKNOWN compliance or export status → HOLD. Never UNKNOWN → ALLOW.
- AI output is a proposal until validated. AI must not be the sole safety authority.
- Political neutrality in operational channels. No political advocacy, persuasion, or stereotyping.

## 3. System Ontology and Graphs

- System Graph: System → Subsystem → Component → Port → Interface → Connection.
- Requirements Traceability: Requirement → Design → Component → Test → Evidence.
- Digital Thread: Mission → ConOps → Need → Requirement → Architecture → Component → Interface → Simulation → Design → Manufacturing → Test → Configuration → Deployment → Telemetry → Maintenance → Field Evidence → New Requirement.
- Intent Graph, Policy Graph, Execution Graph, Component Graph, State/Event Graph, Resource Graph.
- Typed relationships (temporal, causal, dependency, interface, composition, expository, interpretive). Do not flatten to generic “related_to”.
- Knowledge Graph + Workflow Engine + Standards Graph + Template System + Role-Based UI + Simulation Workbench + Compiler/IR + Evidence System.

## 4. Canonical IR and Robot ABI

- Canonical System Intermediate Representation (.sir / .sir.json) with magic number, versioning (MAJOR.MINOR.REVISION), schema, sections for header, identity, mission, stakeholder needs, intent, policy, requirements, architecture, components, ports, state, events, commands, time, coordinates, capabilities, authority, safety, security, execution, resources, simulation, targets, build, dependencies, standards, regulatory profile, verification, validation, tests, evidence, configuration, manufacturing, logistics, operations, service, commercial, education, provenance.
- Separate IR version from ABI version.
- Component PnP via self-describing packages with typed ports, units, frames, rates, deadlines, safety classes.
- State has an owner. No implicit global writable state. No hidden side effects.
- Event packets with version, source, destination, type, priority, sequence, logical/physical time, deadline, payload, integrity.
- Command ABI with authority, intent_ref, policy_ref.
- Formal execution gate: EXECUTE iff IntentValid ∧ PolicyValid ∧ AuthorityValid ∧ CapabilityValid ∧ StateValid ∧ SafetyValid ∧ TimingValid ∧ ResourceValid. Else REJECT/DEFER/DEGRADE/SAFE_STATE.
- Policy hierarchy: Law/Regulation > Mission > Organizational > Safety > System > Component Limit > Execution Request. Lower layers cannot override higher constraints.
- Targets: simulation, HIL, FPGA, RISC-V, MCU, CPU, mature-node tile mesh, robot middleware.
- Content-addressed identity, deterministic builds, provenance chain.

## 5. Workbench and Simulation

- Build & Simulate as the execution layer. System Graph Editor with multiple views: Architecture, Physical 3D, Electrical, Software, Event/State, Manufacturing, Commercial, Regulatory.
- Typed ports with domains (physical, digital, operational, organizational). Connection validation rejects incompatible types/units/timing without explicit adapters.
- Fidelity ladder: L0 Conceptual → L1 Functional → L2 Kinematic → L3 Dynamic → L4 Physics → L5 HIL → L6 Real Hardware → L7 Field.
- Simulation-to-reality promotion with explicit states (SIMULATED, REAL, HIL, PLACEHOLDER, UNVERIFIED, VERIFIED).
- Multi-physics: mechanical, electrical, thermal, control, sensor, communications, compute, AI, environment.
- Deterministic scheduler, logical/physical/simulation time, replay with seed, initial state, event sequence, tolerances.
- Fault injection across sensor, actuator, power, communication, AI, environment, human authority.
- Import pipeline: quarantine → parse → identify → license/security check → schema validation → interface/dependency extraction → provenance → component.
- Export and Publish from the canonical model (simulation, research package, technical spec, educational project, funding proposal, business plan, manufacturing package, regulatory dossier, public demo). Numbers must be consistent across generated artifacts.
- Modes: Novice (“I can build something”), Expert (“I can engineer something”), Thought Leader (“I can define something that does not yet exist”). Same project graph.

## 6. Lifecycle, Roles, and Education

- Lifecycle stages: Discover → Define → Research → Architect → Design → Simulate → Prototype → MVP → Validate → Fund → Certify → Manufacture → Procure → Deploy → Operate → Service → Bill → Audit → Improve → Retire/Recycle.
- Gates G0–G12.
- Role-first landing: Learn, Research, Build, Start, Manufacture, Deploy, Regulate, Fund, Explore. Beginner entry: “Never built a robot before? Start here.”
- Education: one knowledge graph, increasing depth from preschool (curiosity, observation) through primary, middle (invention/IP), secondary, Class 11–12 (research publication), undergraduate, masters, PhD, postdoc (field-defining).
- Domains: Mathematics, Natural Sciences, Computation, Engineering, Physical AI/Robotics, Manufacturing/Materials, Research Methodology, Entrepreneurship/IP, Society/Ethics/Policy/Standards, Systems Thinking.
- Curriculum correlation engine mapping national/state/board/university curricula to concepts, projects, labs, assessments. Teacher, parent, student, admin views. AI as planning assistant, not authority.
- Safety as first-class layer: age-appropriate training, hazard analysis, risk assessment, authorization levels, simulation before physical, software never sole safety mechanism, cockpit-style checklists, stop-work authority.
- Laboratory ladder from low-cost exploration kits to shared national facilities. Resource-aware activities (no equipment → household → classroom → maker → advanced).

## 7. Standards, Compliance, and Assurance

- Standards Graph with layers: Global (ISO, IEC, etc.), Regional, National, Sector, Organizational, Contract/Project.
- Four tiers: Universal SE (15288, 42010, 24748, 15939, EIA-632, SysML), Agency/Customer (NASA NPRs, ISRO ITeCS/RFPs, DoD), Technical Discipline, Contract/Project.
- Applicability engine: ask program type, mission, system type, environment, risk class, procurement relationship → applicable standards → tailoring → required artifacts/evidence → review gates.
- Compliance states: APPLICABLE → TAILORED → ALLOCATED → IMPLEMENTED → VERIFIED → EVIDENCED → REVIEWED → ACCEPTED (or WAIVED/DEVIATION/NOT_APPLICABLE). Never binary checkbox.
- Profiles for NASA, ISRO, Defence (MIL-STD-882, 810, 461, etc.), Commercial. One system model, multiple compliance views.
- Safety case / assurance case: Claim → Argument → Evidence.
- Reviews as executable gates (SRR, PDR, CDR, etc.) that inspect the model for missing artifacts, unverified requirements, unresolved hazards.
- Documents are views of the model, not independent artifacts.
- Dual-use/export/embargo: capability-based, jurisdiction-specific. States include UNKNOWN, UNDER_REVIEW, CONTROLLED, LICENSE_REQUIRED, etc. Default UNKNOWN → HOLD. No circumvention. Remote access, teleoperation, technical assistance, CAD, models can constitute transfers.

## 8. Manufacturing, Operations, and Commerce

- BOM hierarchy: EBOM, MBOM, SBOM, HBOM, CBOM, ABOM → System BOM.
- Production: DFM/DFA, routing, work instructions, serial/lot/batch traceability, inspection, calibration, nonconformance, rework, yield.
- Logistics graph including batteries, hazmat, pressure vessels, export controls, reverse logistics.
- Connected robot service: identity, certificate, firmware, telemetry, health, billing meter → edge → fleet/mission/digital twin/analytics/billing/audit.
- Business models: per hour/mission/km/hectare/inspection, subscription, lease, outcome-based.
- Customer service closed loop back to engineering.
- Cost/economic engine deriving unit economics, NRE, tooling, etc. from the system model.
- Supply-chain graph with origin, process, alternate suppliers, lead time, export restrictions, obsolescence.
- Sovereignty dashboard: compute, manufacturing, energy, materials, software, supply-chain resilience, repairability, single-source exposure, jurisdiction exposure (explainable graph, not simplistic percentage).

## 9. Sovereignty and Substitution

- Critical path evaluation: Risk = Criticality × Irreplaceability × External Control. Question: what happens if this disappears for five years?
- Substitution levels: supplier → component → material → architectural → computational → manufacturing.
- Examples: rare-earth magnets → ferrite/synchronous reluctance/induction; GaN/SiC → Si MOSFET/IGBT; NMC → LFP/sodium-ion; commercial compute → FPGA → mature-node tiles → mesh.
- Mature-node (e.g. 28 nm) as portable primitive, not automatic sovereignty. Still requires chemicals, gases, cleanroom, yield engineering.
- Open technology commons provide primitives; integration, verification, and manufacturing provide capability.
- Workshop-first for mechanics (CNC, hobbing, EDM, SMT, etc.); semiconductor program in parallel. Pilot workshop capital ~$615k–$1.25M vs semiconductor $5B–$11B+.
- Normal mode (best available) vs Resilience mode (locally reproducible). Architecture must survive the transition.
- Functional contracts (energy-storage, torque/speed, measurement/event, IR execution, event transport, load/stiffness) rather than vendor hard-coding.

## 10. Safety, Cockpit, Teleoperation, and International Protocol

- Cockpit-style operational states: STORED → CONFIGURATION_VERIFIED → POWER_ISOLATED → POWER-UP → SELF-TEST → CONTROL_AUTHORITY → LOW-ENERGY → CONTROLLED → FULL → SHUTDOWN → SAFE. Abnormal → ABORT → SAFE → DIAGNOSIS.
- Checklists as machine-readable components with preconditions, evidence, authorization.
- Roles: PIC, Safety Authority, Operator, Observer, Maintainer. Local safety authority can always stop.
- AI/Autonomy readiness: model identity, validation status, output bounds, policy active, human authority, fallback. AI does not own the safety boundary.
- International Teleoperation Cultural and Legal Protocol: political neutrality, respect for culture/individual/local law, no stereotyping, data minimization, jurisdiction model (operator, platform, robot, site, data, etc.).
- Legal readiness: if unknown → NO-GO. Remote access evaluated separately.
- Cultural profiles as site preferences, not population stereotypes. Language/script/locale kept distinct (e.g. Hindi/Urdu/Avadhi independent).
- Privacy zones, camera etiquette, recording consent, authority hierarchy.
- Sterile cockpit for critical phases. Post-operation evidence recording.

## 11. Disclaimers, Dual-Use, and Governance

- Formal governance layer covering education, engineering, physical AI, teleoperation, international use, safety, law, privacy, AI, research, manufacturing, commercial, standards, simulation, cybersecurity, third-party content.
- No guarantee of completeness, certification, legal advice, or fitness for purpose.
- Simulation ≠ physical safety. AI output requires verification. Capability ≠ authority.
- Dual-use/embargo: technical capability is not authorization. Uncertainty is not authorization. No circumvention via intermediaries, format changes, remote execution, AI, etc. Open source / academic / public / humanitarian ≠ unrestricted.
- Compliance decision states and evidence. Dynamic legal profiles, not hard-coded country blocks.
- User responsibility for applicable law, authorization, safety, validation.
- Master disclaimer and contextual versions on relevant surfaces.
- Import trust boundary, secrets protection, privacy classification, redaction, no hidden telemetry.

## 12. UI/UX, Persistence, Sharing, and AI Guide

- Role-first, progressive disclosure (Novice / Expert / Thought Leader).
- Project Workspace with multi-file support, manifest, local-first (IndexedDB / File System Access), GitHub as optional persistence adapter (issues as structured records).
- Explicit Save Local / Sync GitHub / Publish. Never silent overwrite or publish.
- Privacy-by-design: data minimization, secret detection, transmission review for external AI, classification before publish.
- “What leaves my machine?” view. Offline-first.
- Sharing as information-projection over the typed knowledge graph (not social network). ShareOpportunityEngine + TemplateEngine + CrossLinkResolver. Config-driven messages. Evidence-aware. Never auto-publish. Preserve version, provenance, evidence state. Canonical URLs. Bidirectional cross-links. Contribution paths.
- AI Guide: orchestration layer. Platform owns knowledge/workflow/contracts. External AI is replaceable. Context package (role + project + domain + embodiment + stage + requirements + standards + evidence + question). Support as many AI providers as possible via URL/deep-link integration. Reflexive/responsive for mobile and laptop.
- Accessibility: keyboard, screen reader, high contrast, non-color status, scalable text.
- Safety-critical UI clearly separates AI from human authority. E-stop prominent.

## 13. Implementation and Acceptance Criteria

- GitHub Pages static deployment. No mandatory other services.
- Repository structure preserving layers: site/, data/, schemas/, docs/, sources/, templates/, tests/, tools/.
- Rigorous test suite covering contracts, ports, units, migration, adapters, plugins, simulator determinism, fault injection, compliance HOLD, teleoperation authority, replay, change impact, schema validation.
- Simulations (at least conceptual/functional mobile robot or joint control) with replay and telemetry.
- All predecessor documents preserved verbatim.
- Copyright and GPL v3 on all materials.
- Architectural upgradeability demonstrated by the acceptance tests in the build guidelines (replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, etc.).

## 14. Predecessor Sources

All original requirement documents are preserved verbatim under `sources/mrd-predecessor/`. Key documents include:

- Sovereign Technology Stack architecture
- Physical-AI systems lifecycle platform
- Platform information architecture and repository structure
- Workbench specification
- Canonical IR / Robot ABI
- NASA/ISRO/Defence standards profiles
- Consolidated architecture narrative
- Missing foundational subsystems
- Educational curriculum (preschool to postdoc)
- Curriculum orchestration and correlation
- Safety architecture
- Cockpit safety / mission readiness
- International teleoperation protocol
- Comprehensive disclaimers
- Dual-use/export/embargo controls
- Build guidelines
- UI/UX, local project management, GitHub persistence, privacy
- Social sharing and cross-linking
- Rahnuma-informed information sharing corrections

This MRD is the governing requirements baseline for the platform. Implementation must trace back to these sources. Updates to requirements must preserve provenance and be versioned.

---

*End of Master Requirements Document.*
