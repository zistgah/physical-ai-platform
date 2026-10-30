Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Lifecycle

Status: SLICE. Evidence-based gate evaluation exists. Not a full stage machine.

## API

- `getLifecycle(projectId)` – stages, gates, decisions in the project graph
- `getCurrentStage` / `getCurrentGate`
- `evaluateGate(projectId, gateId, { configurationId, authority })`
- `advanceGate` – only on PASS or NOT_APPLICABLE
- `holdGate` / `rejectGate`
- `recordGateDecision` – stores configurationId, authority, unknown flag

## Outcomes

PASS, HOLD, FAIL, NOT_APPLICABLE.

Missing evidence or unknown hazards → HOLD. Explicit failure language → FAIL. Inapplicable gates must be marked; they are not skipped.

## Gaps

Not every G0–G12 gate is instrumented per project. Required-evidence sets are not yet per-gate schemas. Authority is recorded when supplied; it is not resolved from a role graph.
