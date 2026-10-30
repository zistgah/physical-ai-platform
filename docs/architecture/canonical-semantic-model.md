Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Canonical Semantic Model

Iteration 02 – Semantic hardening of the executable kernel.

## Status

IMPLEMENTED and INTEGRATED for the vertical slice:

Project → System → Component → Port → Connection → Requirement → Allocation → Test → Simulation → Artifact → Evidence → SIR → Round-trip → Traceability → Execution-readiness.

PARTIALLY_INTEGRATED: deeper engines from the spine (Lifecycle, full IR compiler, Sovereignty, etc.) remain FUTURE_ADAPTER.

SCHEMA_ONLY: full formal verification, multi-physics, distributed execution.

## Identity

Every object has stable:

- id (never mutated on deserialize)
- type
- version
- creator
- created (preserved)
- modified (updated only on actual mutation)
- provenance
- status
- schemaVersion

Serialization timestamps are metadata of the package, not of the object.

## Project Boundary

`kernel.getProjectGraph(projectId)` returns the deterministic closure of objects reachable via relations from the Project.

Export of Project A never includes objects belonging only to Project B.

Import restores only the provided graph.

## Relations

Defined in `RELATION_DEFINITIONS` with:

- source type constraints
- target type constraints
- cardinality
- inverse
- allowDuplicate
- metadataRequired

Validation rejects invalid source/target types, prohibited duplicates, missing required metadata, and dangling endpoints.

Unresolved relations (not yet specified by architecture) are name-validated only and marked.

## Connections

First-class `Connection` entities created via `createConnection`.

Validator invokes existing `validatePortConnection` for direction, type, unit, frame, domain, safetyClass, authority.

Adapter path supported via `allowAdapter`.

## Execution Readiness

`evaluateExecution({ intentId, planId, executionId, projectId })` resolves graph objects and returns structured decision:

outcome, intent, policy, authority, capability, state, safety, timing, resources, reasons, evidence, timestamp.

Legacy boolean `evaluateExecutionGate` preserved.

Distinction maintained: evaluation ≠ authorization ≠ planning ≠ execution.

## Extension Points

Preserved for Requirements, Safety, Compliance, Standards, Research, Education, Manufacturing, Operations, Teleoperation, Business, Sharing, AI Guide, Simulation, Verification, Validation, Sovereignty.

No empty fake engines added.

## Determinism

`canonicalizeGraph` produces a sorted representation suitable for semantic equality comparison independent of insertion order.
