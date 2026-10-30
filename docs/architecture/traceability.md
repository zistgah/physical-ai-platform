Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Requirements Traceability

## Canonical Chain

Requirement
  ↓ ALLOCATED_TO
Allocation (Component / System)
  ↓
Architecture / Component
  ↓
Verification Method
  ↓ VERIFIES
Test
  ↓ (execution)
Artifact
  ↓ DERIVED_FROM
Evidence

## Evidence States

Explicit and ordered:

PLANNED → SPECIFIED → IMPLEMENTED → EXECUTED → TESTED → VERIFIED → VALIDATED → RELEASED

No automatic promotion.

Simulation execution produces Evidence in state EXECUTED.

It does not become VERIFIED or VALIDATED merely because an Artifact exists.

Promotion requires an explicit verification or validation process (FUTURE_ADAPTER for full process engines).

## APIs

- `getRequirementTrace(requirementId)` – full chain objects
- `getRequirementStatus(requirementId)` – allocated, tested, evidenceStates, status (no auto-promote)
- `getUnverifiedRequirements(projectId)` – requirements lacking VERIFIED evidence
- `getEvidenceForRequirement(requirementId)` – evidence objects

## Status

IMPLEMENTED for the vertical slice on the canonical mobile robot fixture.

Full compliance case, safety case, and multi-level verification engines remain FUTURE_ADAPTER.
