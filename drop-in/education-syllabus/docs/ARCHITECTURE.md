# Architecture and contracts

## 1. Scope

This package fills a documented gap in Iteration 47: `docs/iterations/SYLLABUS-STATUS.md` says no syllabus is carried, and the executable correlation only contains eleven board/level/subject triples with concept IDs but no chapter text, learning outcomes or pedagogy. The existing education modules (`curriculum-engine.js`, `board-import.js`, `board-correlation*.js`, `lms.js`, `education-path.js`, `education-closure.js`, `role-views.js`) remain authoritative existing modules. This package adds a bounded content and orchestration layer; it does not rewrite those modules.

## 2. Architecture

```text
Official curriculum / qualification / competency source
  -> FrameworkRegistry (authority, jurisdiction, version, URL, status)
  -> CurriculumSourceRegistry (jurisdiction + authority + edition + academic year + language + rights + digest + review)
  -> CurriculumCorrelationEngine (standard <-> canonical concept)
       proposed -> in review -> accepted / rejected / superseded
  -> SyllabusEngine (concept graph + prerequisites + outcomes + sequence)
  -> ExplanationEngine (source-authored explanation variants)
  -> LearningExperienceEngine (role, level, support profile, context)
  -> LearningManagementEngine (role/scope checked delivery and assessment workflow)
  -> NotebookEngine (declarative cells + replaceable sandbox adapters)
  -> LearningRecordEngine (append-only learning events + descriptive analytics)
  -> CanonicalEducationAdapter (projection to existing PAP Curriculum entity)
```

The platform's canonical system graph remains the source of project identity and cross-domain relationships. This package's local Maps are bounded in-memory registries for package operation/testing. Production persistence must be supplied by the existing PAP storage/kernel path or an adapter; do not promote these Maps into a second project store.

## 3. Core contracts

### Framework record

Required: `id`, `name`, `authority`, `jurisdiction`, HTTPS `url`, `status`. Production ingestion should additionally retain publisher edition, academic year, publication/effective dates, language, source file digest, access/license terms, source locator and ingestion timestamp. `REGISTERED_REFERENCE_NOT_SYLLABUS` is appropriate for classification standards (e.g. ISCED) and interoperability standards (e.g. CASE/LTI). Do not mistake them for course content.

### Curriculum mapping

Required: mapping ID, framework ID, source standard ID, canonical concept ID, mapping type, review state, source locator and source excerpt SHA-256. A separate CurriculumSourceRegistry binds a curriculum artifact to jurisdiction, authority, edition, academic year, language, scope, rights basis, full-source digest and reviewer metadata. Accepted mapping requires a verified source/extraction binding and two distinct host-authorized reviewers with timestamps. Mapping types are EXACT, PARTIAL, PREREQUISITE, EXTENSION and CONTEXTUAL. Similarity scores may propose mappings but may not accept them. Conflicting accepted mappings are HOLD.

### Syllabus concept

Required: stable concept ID, title, learning outcome, core explanation and at least one activity. Optional fields include prerequisites, worked example, misconceptions, checks, media, standard references, safety profile, estimated effort, locale and assessment rubric. Prerequisite graph must be acyclic and all prerequisite IDs must resolve.

### Notebook cell

Types: markdown, math, code, simulation, question, dataset, lab_protocol, reflection, media. Code/simulation requires a named adapter. Adapter registration requires a host-supplied `verifyAdapter` callback that validates runtime attestation. An adapter boolean or self-assertion is not sufficient. Physical lab protocol requires supervision and risk assessment reference; physical execution also requires explicit authority context. This package defines no general Python kernel, CAD solver, CFD solver or hardware transport itself.

### Learning event

Append-only event with unique ID, actor, verb, object, timestamp and optional evidence state/metrics. Duplicate event IDs HOLD. Mastery requires a host-verified evidence reference explicitly bound to the learning outcome; attempts and viewed events do not equal mastery. Learning analytics are descriptive and non-causal.

## 4. Canonical graph integration

`CanonicalEducationAdapter.publishSyllabus(projectId, syllabus)` writes one `Curriculum` entity and `Project CONTAINS Curriculum`. It does not write an alternate lesson/course ontology or mutate engineering entities. The integrator must reconcile with the current `LMS`, `EducationPath`, and `EducationClosure` APIs before adding lesson-level projection. Do not create duplicate `Course` or `Lesson` records if an equivalent canonical object exists.

The adapter intentionally accepts draft syllabus only. It does not assert accreditation, official board alignment or course completion. `LearningManagementEngine` is a domain-policy engine with an in-memory repository for tests; production must inject a durable transactional repository, real identity provider, guardian-consent authority and evidence verifier. Integrate its behavior into the existing PAP LMS rather than installing a second LMS store.

## 5. Generic simulation/tool adapter contract

A simulation provider from any other PAP workstream can be exposed as:

```js
{
  id: 'provider.module.adapter',
  kind: 'simulation' | 'cad' | 'cfd' | 'circuit' | 'math' | 'physics',
  runtimeAttestation: { issuer: 'trusted-host', isolation: 'worker', ... },
  execute: async ({ cell, context }) => ({
    status: 'COMPLETED' | 'HOLD' | 'FAILED',
    result: {},
    units: {},
    assumptions: [],
    warnings: [],
    evidenceRef: null
  })
}
```

This is a learning execution adapter, not a trusted engineering evidence verifier. The adapter result must be separately checked by the owning engineering module before any result is promoted into engineering evidence. The syllabus layer must not import CAD/CFD/HIL implementations directly.

## 6. Web-only execution

Notebook definitions are declarative JSON. A browser deployment may register:
- JupyterLite/Pyodide or another WebAssembly kernel for supported code cells.
- Native PAP simulation adapters for browser-compatible solvers.
- A remote execution adapter for workloads that exceed browser resources.

Browser execution requires resource quotas, worker isolation, timeouts, cancellation, memory limits, origin restrictions, no ambient credentials, dependency pinning, deterministic seeds where relevant, output-size limits and audit events. The package includes an allow-listed deterministic educational reference runtime for three sample computations. It is not a general sandbox. Production notebook execution requires a separately qualified worker/remote sandbox with a host attestation verifier; this package does not supply or certify that environment.

## 7. Failure semantics

- Unknown jurisdiction/framework/standard: HOLD.
- Source version or locator absent: HOLD for accepted correlation.
- Mapping only proposed: HOLD for official coverage claims.
- Concept cycle or dangling prerequisite: HOLD.
- Missing runtime adapter: HOLD.
- Unsandboxed code execution adapter: HOLD.
- Physical activity without supervision/risk reference: HOLD.
- Learning record without valid timestamp or identity: HOLD.
- Insufficient or zero-variance paired observations: HOLD for correlation.
- Correlation never implies causation or learner diagnosis.

### Source extraction and independent review

`CurriculumIngestionEngine` accepts source-addressable outcome extractions linked to a registered source edition. It stores locator, excerpt hash and paraphrased learning outcomes, not full copyrighted chapter text. A contributor cannot review their own extraction. A host identity/governance verifier must authorize two distinct reviewers; each must confirm source match, locator match and semantic match. A failed/rejected review closes that extraction revision; corrections require a new immutable revision. `VERIFIED_CONTENT` means source-fidelity review passed, not official accreditation or board endorsement.

`CurriculumCorrelationEngine` also requires accepted mappings to bind to a host-verified source edition/extraction and two distinct host-authorized reviewers. A fuzzy match or one reviewer cannot establish accepted equivalence. The host `verifySource` callback should resolve `extractionId` to `CurriculumIngestionEngine.getVerified()` and confirm framework, standard, source digest and excerpt hash.
