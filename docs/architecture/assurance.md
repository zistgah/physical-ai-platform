Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Assurance

Status: SLICE, deepened in Iteration 08.

## Path

Hazard → CAUSED_BY → Cause
Hazard → CONTROLLED_BY → Control (Requirement or Component)
Claim → SUPPORTED_BY → Argument → EVIDENCED_BY → Evidence

`AssurancePath.walk(hazardId)` returns the hops that exist and lists missing ones. It does not invent links.

## Readiness

Unknown hazard → HOLD. Unresolved (not CONTROLLED/ACCEPTED/CLOSED) → NO-GO. Missing configuration → NO-GO on the identity gate.

## Gaps

Not a full GSN/CAE tool. Cockpit S0–S10 is a label set, not an enforced state machine. No formal safety integrity level calculation.
