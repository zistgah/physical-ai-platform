Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 09 Diff

Against Iteration 08.

## Added

- `data/standards/corpus.json` — 27 standards named in the MRD and predecessor corpus. Provenance per entry. All INFORMATIONAL.
- `tools/emit-traceability.mjs` — writes `docs/iterations/TRACEABILITY.md` with one row per iteration plus the standards table.
- `docs/iterations/TRACEABILITY.md` — generated. Iterations 01–09.
- `tools/conformance-test-iter09.mjs` — corpus completeness, provenance, query, adoption does not mutate corpus, traceability rows present.
- `docs/iterations/ITERATION-09-RESULT.md`
- `docs/iterations/ITERATION-09-DIFF.md` (this file)

## Changed

- `site/components/compliance/standards-corpus.js` — regenerated from `data/standards/corpus.json`. Was 10 hardcoded entries; now 27. Added `all()` and tier filter.
- `CHANGELOG.md` — Iteration 09 section.

## Not changed

- Canonical kernel, relation registry, evidence binding, lifecycle, assurance path, SIR compiler.
- Corpus entries are not mutated on project adoption.
- No standard text was imported. Profiles only.

## Test delta

- New: `conformance-test-iter09.mjs` passed.
- Regression: Iteration 04, 07, 08 suites passed.
