# Grok handoff - PAP Education/Syllabus/LMS package v1.3.0

## Purpose

A generic, bounded education module for the current PAP spine. It extends existing education semantics; it does not duplicate the platform, its kernel, its canonical LMS store, identity system, document system or engineering solvers.

## Included capabilities

1. **Curriculum discovery:** 249 ISO country/territory targets, 5,046 subnational discovery targets and 36 India State/UT targets. These are explicit discovery records, not claims that their boards or syllabi have been ingested.
2. **Source governance:** versioned source editions with authority, jurisdiction, language, academic year, scope, rights basis, SHA-256 source digest and reviewer metadata. `CurriculumIngestionEngine` also provides two-person independent review of source-addressable learning-outcome extractions without retaining copyrighted raw chapter text. Active content status is fail-closed.
3. **Correlation:** explicit mapping types and review states; accepted mappings require a host-verified source/extraction binding, source locator, excerpt digest and two distinct host-authorized reviewers with timestamps. Ambiguity and unreviewed mappings HOLD.
4. **Syllabus:** prerequisite DAG, cycle/dangling-reference rejection, stage progression and outcomes.
5. **Explanations:** intuitive, concrete, visual, formal, worked, misconception, practice, extension and locale-context projections. Missing source-authored content HOLDs rather than being invented.
6. **LMS:** role/scope-controlled course authoring and publication, lesson sequencing, self-enrollment, assignments, rubric scoring, submissions, guardian consent, audit events and host-verified evidence-backed mastery.
7. **Notebooks:** declarative markdown/math/code/simulation/data/lab/reflection cells, host-verified adapter registration, output-size bounds, physical activity gates.
8. **Executable samples:** measurement summary, ordinary least-squares line fit and discrete first-order feedback response, using an allow-listed pure-function runtime.

## Important boundary

The in-memory LMS repository is deterministic test infrastructure, not production persistence. Production requires a transactional repository adapter, real identity/authorization provider, guardian consent authority, evidence verifier, durable audit store and privacy controls. The reference computation runtime is not a general notebook sandbox and is not an engineering solver. No global syllabus corpus, national board syllabus coverage, LTI/CASE/QTI certification, accreditation, browser UI or production deployment is claimed.

## Start here

1. `STITCH-INSTRUCTIONS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/GLOBAL-CURRICULUM-COVERAGE.md`
4. `docs/SYLLABUS-AND-PEDAGOGY.md`
5. `docs/LMS-AND-CORRELATION.md`
6. `docs/NOTEBOOKS-AND-SIMULATIONS.md`
7. `docs/ASSURANCE-AND-TESTING.md`
8. `docs/COMPETITIVE-LANDSCAPE.md`
9. `docs/CLASSROOM-AND-LEARNER-OPERATIONS.md`
10. `docs/VERIFICATION-REPORT.md`

## Verification

```bash
npm test
node run-samples.mjs
```

Expected: 150 package assertions pass; three computational notebook samples execute; unsupervised physical activity returns HOLD. Tests do not establish school-board correctness, sandbox security, accreditation, accessibility conformance or industrial engineering validity.

## Integration state

`DROP_IN_PACKAGE_NOT_REGISTERED_IN_SPINE`. Grok must rebase on its actual latest iteration, discover current education/LMS modules and solver adapters, reconcile rather than overwrite, wire the source/correlation/explanation layer into the existing canonical education graph, use the production LMS repository and identity services, register safe notebook adapters, expose the workbench through existing UI and run full spine acceptance/regression/browser/security tests.
