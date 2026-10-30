# Verification report - Education/Syllabus/LMS package v1.3.0

Date: 2026-10-30

## Package tests

- `node tests/test.mjs`: **150 PASS**.
- `node run-samples.mjs`: PASS.
- Three executable educational notebook computations: repeated-measurement statistics, ordinary least-squares linear regression, and a discrete first-order feedback demonstration.
- End-to-end LMS fixture: course authoring, lessons, publication, enrollment, assignment, submission, rubric assessment, host-verified mastery and consented parent view.
- Physical activity without supervision, risk and authority context: HOLD.
- Source edition and extracted outcome ingestion: digest, rights, source locator, contributor/reviewer separation, two independent reviews and immutable revision checks.
- Accepted curriculum mappings: require a host-verified source/extraction binding and two distinct host-authorized reviewers.
- Notebook adapters: host-attestation validation, malformed-cell rejection, cell-count/serialized-size/output bounds, and adapter HOLD propagation.
- Learning analytics: cohort-scoped descriptive correlation, minimum cohort size five, zero-variance HOLD and no causal claim.
- Jurisdiction registries: 249 country/territory targets, 5,046 ISO 3166-2 subdivision discovery targets, and 36 India State/UT board discovery targets.

## Scope of what these results prove

The tests prove behavior of this package's deterministic JavaScript functions, workflow state machines and sample fixtures under Node. The sample notebook runtime is an allow-listed educational computation harness. It is not a production sandbox or an engineering solver. The LMS workflow engine is tested against a memory repository; production requires a durable transactional adapter and actual PAP identity/consent/evidence services.

The jurisdiction counts prove the bundled discovery registries are internally complete against their bundled datasets. They do not prove that all national, state, provincial or examination boards have been identified or that any of their syllabi have been ingested.

## Existing spine baseline re-run

On the supplied Iteration 47 spine working copy, `node tools/regression-checklist.mjs` passed all 64/64 suites. `node tests/acceptance.mjs --no-browser --no-mutation` completed with 55 PASS and 8 SKIP (browser walk and mutation gates were explicitly skipped), verdict ACCEPTED. These runs do not include the drop-in package because it is not integrated into the spine.

## Not executed / not claimed

- Browser UI end-to-end integration into PAP.
- Production notebook sandbox isolation/penetration testing.
- Real CAD/CFD/circuit/robotics solver integration through latest-spine adapters.
- Full national/state/provincial board discovery and current syllabus ingestion at scale.
- LTI 1.3, CASE, QTI, xAPI or Caliper certification.
- WCAG audit, child safeguarding/privacy/legal audit, load/chaos tests.
- School/college accreditation or engineering industrial qualification.

## Verdict

This is a bounded, executable education package ready for technical integration review. It is not a production-accredited LMS or global curriculum service. Its production dependencies and unverified claims are explicit in the handoff.
