Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Change impact

Status: SLICE.

## API

- `analyzeChange(objectId, proposedChange)` – BFS over IMPACT_RELATIONS, depth 6
- `getAffectedObjects / Requirements / Tests / Evidence / Safety / Compliance`

Each hit has path, reason, impact class, required action.

## Gaps

Impact classes are type-based. Not every edge is an impact edge (by design). No automatic evidence invalidation except via EvidenceBinding.markStaleForConfiguration.
