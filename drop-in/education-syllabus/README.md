# PAP Education, Syllabus, LMS and Notebook Orchestration - Drop-in v1.3.0

A bounded extension for the existing Physical AI Platform spine. It provides source-versioned curriculum ingestion controls, global jurisdiction discovery targets, India state/UT board discovery targets, reviewed curriculum correlation, prerequisite sequencing, role-specific explanations, an access-controlled LMS workflow engine, learner-specific progress, rubric assessment, declarative computational notebooks and allow-listed educational reference computations.

It does **not** replace the PAP kernel, canonical LMS, identity provider, persistent repository, CAD/CFD/circuit/simulation solvers, document system or application UI. It is generic: solver adapters are discovered from the actual spine at integration time.

## Quick start

```bash
npm test
node run-samples.mjs
```

Expected: **150 package assertions pass**. The sample runner validates six role views and ten explanation modes, executes measurement statistics, least-squares regression and a discrete first-order feedback demonstration, then exercises the complete LMS course-to-parent-consented-progress workflow. Unsupervised physical execution returns HOLD.

## Package entry points

- `module.js` - curriculum registry, source-edition registry, correlation, syllabus sequencing, role plans, notebook contract, learning records and canonical education adapter.
- `curriculum-ingestion.js` - contributor extraction, source digest and two-person independent review workflow; raw copyrighted chapter text is not stored.
- `explanation-engine.js` - source-authored explanation projections; never invents missing explanation modes.
- `lms-engine.js` - role/scope-checked course, lesson, enrollment, assignment, submission, rubric assessment, guardian consent and evidence-backed mastery workflows.
- `reference-education-runtime.mjs` - deterministic allow-listed educational computations; no `eval`, arbitrary imports, filesystem or network access.
- `data/framework-registry.json` - selected international/national reference frameworks and interoperability standards.
- `data/country-jurisdiction-registry.json` and `data/global-curriculum-ingestion-targets.json` - 249 ISO country/territory directory and ingestion-discovery targets.
- `data/subnational-jurisdiction-targets.json` - 5,046 administrative-subdivision discovery targets from pycountry 24.6.1; a subdivision does not imply a separate school board or curriculum.
- `data/india-jurisdictions.json` and `data/india-state-board-targets.json` - 28 States + 8 UTs with unique ISO 3166-2 subdivision identifiers and board-discovery status. These are **not** verified board syllabi.
- `data/starter-syllabus.json` - integrated STEM example with prerequisite graph and multi-representation explanations.
- `data/levelled-learning-examples.json` - one worked progression across 11 learner bands; explicitly not board alignment.
- `samples/*.json` - executable educational notebook fixtures.
- `tests/test.mjs` - 150 behavior, negative, access-control, evidence, curriculum-ingestion and numerical assertions.
- `docs/*` - architecture, global ingestion, pedagogy, LMS/correlation, notebooks, assurance and competitive analysis.

## Curriculum authority rule

A jurisdiction directory, framework record, web URL or generated topic list is not an authoritative syllabus. Active curriculum sources require jurisdiction, issuing authority, title, edition, academic year, language, scope, rights basis, source digest and two distinct host-verified reviewers. Accepted mappings additionally require a host-verified source/extraction binding and two independent mapping reviewers. Correlations require source locators and excerpt digests. Unreviewed or ambiguous mappings remain HOLD.

## Execution and assurance rule

Notebook code/simulation execution requires a host-verified sandbox attestation. The reference educational runtime is an allow-listed classroom computation harness, **not** a production sandbox or validated engineering solver. Physical activities require explicit supervision, risk and authority references. Learning mastery requires host-verified, subject-bound evidence. Educational assessment is not engineering verification, professional accreditation or clinical diagnosis.
