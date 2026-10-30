# Stitch instructions for Grok / PAP integrator

## Important: bounded scope

This archive adds only the education syllabus/correlation/notebook/LMS projection package. It intentionally contains no CAD, CFD, circuit, HIL, fabrication, manufacturing, logistics, emulation, simulation solver or platform kernel. Those may arrive from other workstreams and must be discovered from the actual current spine at integration time.

## 0. Rebase against the latest spine

1. Identify the latest repository iteration/commit, not merely Iteration 47.
2. Record the exact base commit/archive SHA-256.
3. Read current `HANDOFF.md`, `docs/MRD.md`, `docs/iterations/SYLLABUS-STATUS.md`, education modules, module registry, routes, LMS and tests.
4. Check whether the previous hardening guardrails are already integrated. Preserve these semantics without duplicating code:
   - unknown component cost is UNSPECIFIED/null, never coerced to zero; explicit zero remains valid;
   - HIL requires real, bound, attested device transport and safety/authority gates; a `step()` mock is not HIL;
   - fidelity promotion requires pre-existing subject/configuration-bound accepted evidence; invoking a run function must not manufacture EXECUTED evidence.
5. If any invariant is absent, raise a separate regression finding. Do not silently mix unrelated fixes into this education package.

## 1. Copy only this package

Copy `drop-in/education-syllabus/` into the corresponding `drop-in/education-syllabus/` location or the repository's established education package path. Do not copy the whole source archive or create a second platform.

## 2. Integrate with existing education architecture

The current Iteration 47 spine contains:
- `site/components/education/curriculum-engine.js`
- `board-import.js`
- `board-correlation.js`
- `board-correlation-exec.js`
- `lms.js`
- `education-path.js`
- `education-closure.js`
- `role-views.js`
- `site/components/core/module-registry.js`
- `site/assets/js/app.js` education route.

These are discovery hints only; re-check the latest spine. Do not replace the existing modules wholesale. Use the new package as a content/correlation/notebook layer and adapt its `CanonicalEducationAdapter` to the existing kernel. Reconcile IDs and prevent duplicate Course/Lesson/Curriculum entities.

## 3. Registry and persistence

- Load `framework-registry.json` and jurisdiction registries as reference data.
- Persist accepted mappings and review decisions through the existing canonical store or a dedicated existing content store. Do not rely on process-local Maps for production persistence.
- Use `CurriculumSourceRegistry` for source editions and `CurriculumIngestionEngine` for two-person reviewed learning-outcome extractions and contribution/review workflow. Preserve authority, jurisdiction, academic year, edition, language, scope, rights basis, SHA-256 digest and reviewer metadata. The ingestion engine requires two independent host-verified reviewers, rejects self-review and does not store copyrighted raw chapter text. `global-curriculum-ingestion-targets.json` enumerates 249 country/territory discovery targets; `subnational-jurisdiction-targets.json` enumerates 5,046 administrative subdivisions as discovery candidates only. It does not assert syllabus ingestion or that each subdivision has an education board. `india-state-board-targets.json` enumerates all 28 States + 8 UTs with unique subdivision IDs; board discovery remains required.
- Use the host identity/governance system for reviewer authorization, qualification, conflict-of-interest checks, source fetch/archive provenance and audit history. `CurriculumSourceRegistry` requires two distinct host-verified reviewers for ACTIVE source editions. `CurriculumIngestionEngine` requires two independent reviewers for VERIFIED_CONTENT extractions. `CurriculumCorrelationEngine` requires a host-verified source/extraction binding and two distinct host-authorized reviewers for ACCEPTED mappings. The package cannot authenticate identities itself.

## 4. Integrate notebook adapters generically

Discover actual solver modules from the current registry at stitch time. Register adapters by contract; do not import a named CAD/CFD/simulation package unless it exists and has a documented API. Notebook adapter output is not engineering evidence. Solver validation and evidence promotion remain with the owning engineering module and kernel.

A browser runtime needs a real sandbox implementation and security review. `NotebookEngine` requires a host-supplied `verifyAdapter` function and runtime attestation. It bounds notebook size, cell count and result size, and propagates adapter HOLD. The sample adapter is a deterministic allow-listed educational reference runtime only; it is not a production sandbox. Add worker/process isolation, CSP/origin isolation, network/filesystem denial, CPU/memory quotas, timeout, cancellation, pinned dependencies and security testing.

## 5. LMS and interoperability

- Reuse existing canonical Person, Course, Lesson, Curriculum, Evidence and relations.
- Keep curriculum mapping, learning delivery and learner evidence semantically distinct.
- Map to CASE 1.1 only after validating the full CASE information model and service contract.
- Implement LTI 1.3/OIDC/AGS/NRPS/Deep Linking as a separate reviewed adapter; this package does not implement an LTI server/client.
- Implement xAPI/Caliper/QTI as separate conformance-tested adapters. `toXAPI()` is illustrative projection only.
- Reuse `lms-engine.js` as a workflow/policy reference or selectively transplant its course lifecycle, role/scope checks, rubric assessment, submissions, consent and audit behavior into the existing LMS. Do not install `MemoryLearningRepository` in production. Inject a durable transactional repository, actual identity provider, consent authority and host evidence verifier. Preserve role authorization and privacy in existing identity/access modules.
- Do not rely on the existing legacy global `Lesson.done` flag as learner-specific progress; progress must be keyed by learner/enrollment and accepted evidence.

## 6. UI integration

Create/extend the existing Education workbench rather than adding a second route. It should provide:
- framework/source catalogue with edition and verification status;
- curriculum coverage matrix with accepted/partial/unmapped states;
- concept graph and syllabus sequencing;
- teacher/professor/lab assistant/parent/student/independent learner views;
- notebook and simulation activity launch;
- assessment rubric and evidence review;
- learner progress and descriptive analytics;
- accessibility, localization and low-bandwidth options.

Do not show `REGISTRY_ONLY` jurisdiction entries as curriculum coverage.

## 7. Tests required after stitch

1. Run package `node tests/test.mjs` (150 assertions) and `node run-samples.mjs` (three notebook computations plus LMS end-to-end sample).
2. Add kernel integration tests against the latest real kernel, not only the adapter stub.
3. Test duplicate course/lesson prevention and project graph round-trip.
4. Test role permissions and unauthorized access.
5. Test source edition change invalidates affected mappings and derived syllabus snapshots.
6. Test accepted mapping review workflow, reviewer independence and conflict resolution.
7. Test notebook sandbox timeouts, memory limits, cancellation, network restrictions and deterministic replay.
8. Test simulation adapters from whatever packages are actually present; no dependency on assumed module names. Distinguish education-only reference computations from validated engineering solvers.
9. Test xAPI/CASE/LTI/QTI conformance if implemented.
10. Run complete acceptance, regression, mutation, browser, accessibility and security suites.

## 8. Report integration state honestly

Report separately:
- package copied;
- imports/registry integrated;
- canonical entities persisted;
- UI reachable;
- notebook runtime operational;
- standards ingestion verified;
- interoperability conformance passed;
- full acceptance and regression passed.

The package is not integrated merely because its folder exists. Do not claim global curriculum coverage or industry-grade LMS completion from the starter directory. Preserve the distinction between 5,046 subdivision discovery records and actual education authorities/boards; do not turn ISO subdivision records into assumed boards. Package tests: 150 assertions; samples: three deterministic educational computations plus an LMS course-to-parent-view workflow. These are package checks, not full-spine or production qualification.
