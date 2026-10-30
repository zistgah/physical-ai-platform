# Assurance case and verification plan

## Top-level claim

The package provides a bounded, fail-closed education syllabus and learning orchestration capability that can be integrated into the existing PAP canonical spine without replacing its ontology or kernel.

## Subclaims and current evidence

| Claim | Evidence in package | Status / limitation |
|---|---|---|
| Jurisdiction discovery targets are complete for the bundled directory | 249 distinct ISO country/territory entries and 36 unique India State/UT subdivision identifiers | Directory completeness only; no syllabus coverage claim |
| Curriculum source edition is traceable | `CurriculumSourceRegistry` requires jurisdiction, authority, edition, academic year, language, HTTPS URL, scope, rights basis and digest; ACTIVE source editions require two distinct host-verified reviewers | Implemented; external source fidelity and legal review remain required |
| Correlations cannot be silently accepted | Source locator and excerpt digest, verified source/extraction binding, two host-authorized reviewers and review timestamps | Implemented at API boundary; reviewer independence/authorization must be supplied by host governance |
| Syllabus sequencing is structurally valid | Duplicate, missing prerequisite and cycle checks | Implemented and tested |
| Explanation views do not invent missing content | `ExplanationEngine` only projects source-authored explanation variants | Implemented; missing variants HOLD |
| LMS workflow enforces roles and scopes | Course lifecycle, enrollment, assignments, submissions, rubric validation, parent consent and audit events | Implemented as domain engine; production repository and identity providers must be injected |
| Mastery is evidence-gated | Host evidence verifier, learner/outcome binding and accepted evidence requirement | Implemented at engine boundary; verifier must resolve real canonical evidence |
| Learner progress is individual | Enrollment and completed outcome IDs are keyed by learner | Implemented in workflow repository; do not use the legacy global `Lesson.done` flag as learner mastery |
| Notebook execution is fail-closed | Host-verified adapter attestation, unavailable adapter HOLD, output bounds and physical supervision/risk/authority gates | Implemented as contract; no production sandbox is supplied or certified |
| Educational computations execute | Measurement statistics, OLS regression and discrete first-order feedback samples | Implemented as deterministic educational reference models, not validated engineering solvers |
| Canonical graph projection is available | Adapter writes Curriculum entity and CONTAINS relation | Implemented against declared kernel contract; full latest-spine integration unverified |
| Global curriculum coverage | Country/territory and India jurisdiction registries | Not claimed; discovery targets only |
| LMS interoperability | CASE/xAPI projections and LTI target documentation | Not certified; full services are not implemented |

## Executed tests

`tests/test.mjs` currently contains 150 assertions covering:
- global country/territory, 5,046 subnational discovery targets and India State/UT directory identity and uniqueness;
- source authority, jurisdiction, rights, edition, digest and two-person reviewer gates;
- framework validation and proposed/accepted/rejected correlation states;
- syllabus validity, prerequisite order, cycles and dangling references;
- learner bands, role plans, parent support and late-learner accommodations;
- source-authored explanation modes, 11 learner-band examples and missing-mode HOLD;
- notebook structure, adapter attestation, unavailable runtime and output bounds;
- physical activity supervision, risk and authority gates;
- measurement statistics, linear regression and feedback simulation correctness/failure cases;
- LMS authorization, course publication, enrollment, assignments, submissions, rubric scoring, guardian consent, evidence-backed mastery and audit events;
- learning event identity, timestamps, subject-bound evidence and descriptive/non-causal correlation;
- canonical kernel adapter behavior.

`run-samples.mjs` builds the starter syllabus, generates six role plans, validates ten explanation modes and 11 levelled examples, executes notebook fixtures, exercises the three executable notebook computations, runs a complete LMS workflow through parent-consented progress, and verifies that unsupervised physical execution HOLDs. It does not execute CAD/CFD/circuit/robotics solvers.

## Additional production qualification required

- property-based/fuzz testing for untrusted curriculum documents and notebook JSON;
- multilingual Unicode normalization, RTL, mixed-script and translation review;
- WCAG 2.2 AA audit and assistive-technology testing;
- privacy, consent, retention, child safeguarding and role authorization review;
- sandbox penetration tests and supply-chain scanning;
- source edition change and mapping invalidation tests;
- real canonical-kernel round-trip and persistence tests;
- browser end-to-end tests and load tests;
- CASE/LTI/xAPI/Caliper/QTI conformance tests;
- statistical validation and fairness review before consequential analytics.

No industrial, accreditation, legal, child-safety or educational outcome certification is claimed.
