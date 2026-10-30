Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Digital thread

Status: SLICE.

## API

- `getDigitalThread(projectId)` – entities by thread step, plus breaks
- `traceForward` / `traceBackward` – relation traversal
- `getThreadBreaks` – orphan requirement, unverified requirement, orphan test, orphan implementation
- `getTraceabilityFindings` – breaks plus stale verification

## Gaps

Thread steps are a fixed list. Not every MRD hop (ConOps, Need, Field Evidence) is a first-class entity. Findings are structural, not semantic completeness checks.
