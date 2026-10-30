Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 18 Result

Nothing was dropped. The suites that Iteration 17 broke are green again.

## What had regressed

- `evaluateGate` was async, so Iteration 03 and 08 saw a Promise. It is synchronous again.
- Settling `MANUFACTURED_BY` removed the WorkOrder to Component direction. Both directions are valid.
- Iteration 13 and the relation-close suite asserted the relation was unresolved. They now require it defined, with the factory direction kept.

## LMS

Lessons and enrollments are canonical entities.

- A lesson HOLDs if the person is not enrolled.
- Completing a lesson writes assessment evidence.
- The course stays open while any lesson is open.
- The course completes only when every lesson is done.

## Checklist

`tools/regression-checklist.mjs` fails if a required module is missing, a exclusion marker returns, LMS behavior weakens, or any prior suite fails.
