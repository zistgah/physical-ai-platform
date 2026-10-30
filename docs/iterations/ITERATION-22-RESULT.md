Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 22 Result

The two Iteration 21 false-PASS probes now HOLD.

## Fixed

- Adoption and profiling copy `requiredEvidence`. An adopted ISO 15288 with no evidence HOLDs.
- Evidence must be bound with `EVIDENCED_BY` and must cover the requirement. A matching name is not enough.
- Rejected, stale, unbound, and wrong-configuration evidence do not clear the check.
- A waiver needs a reason and a role. Without them it HOLDs.
- Missing layer is UNCLASSIFIED, not Global. Inferred authority is marked INFERRED.
- The standards page uses the system in the active project graph.
