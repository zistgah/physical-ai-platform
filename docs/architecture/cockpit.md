Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Cockpit

Status: SLICE.

## What exists

- `cockpitIdentityGate`: missing or unfrozen configuration → NO-GO
- `forceAbort`: records CockpitState ABORT with next SAFE
- Teleoperation requires local safety authority; emergency stop forces SAFE

## What does not exist

No enforced S0–S10 machine. No checklist item execution. No role resolution beyond the local-authority flag. Not a remote-ops cockpit.
