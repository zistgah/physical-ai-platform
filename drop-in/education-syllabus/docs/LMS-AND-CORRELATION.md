# LMS, curriculum correlation and learning analytics

## 1. Do not conflate three graphs

1. **Curriculum graph:** frameworks, standards, concepts, prerequisites, outcomes and assessment criteria.
2. **Learning delivery graph:** courses, sections, lessons, activities, cohorts, instructors, enrollments and schedules.
3. **Evidence/learning record graph:** attempts, submissions, feedback, accepted mastery evidence and learner reflections.

They connect through stable identifiers, but they have different semantics. A curriculum mapping is not a learner event. A viewed lesson is not mastery. A course completion is not professional certification. Educational assessment evidence is not engineering verification.

## 2. Correlation model

A board standard maps to one or more canonical concepts using EXACT, PARTIAL, PREREQUISITE, EXTENSION or CONTEXTUAL. Mapping must preserve the source's own ID and wording. It must also retain a source locator and excerpt hash.

The current package requires a registered framework, source locator, SHA-256 excerpt digest, a host-verified source/extraction binding, and two distinct host-authorized reviewers with review timestamps before an accepted mapping is returned. The host verifier remains the identity authority; a reviewer string alone is not a credential. Similarity models may rank candidate mappings, but they cannot approve them. The system should expose:
- standards fully covered by the syllabus;
- standards partially covered;
- prerequisite concepts needed before the standard;
- extension concepts beyond the standard;
- unmapped standards;
- syllabus concepts with no board mapping;
- conflicts and outdated/superseded editions.

Do not infer curriculum equivalence from matching topic names alone.

## 3. LMS workflows

### Teacher-led classroom
1. Select institution/course and verified framework edition.
2. Select outcomes and concept sequence.
3. Choose or adapt lesson plan and notebook activities.
4. Assign cohort, group and differentiated tasks.
5. Run interactive class simulation or notebook.
6. Capture formative responses and rubric evidence.
7. Review misconceptions and reteach recommendations.
8. Export class progress and lesson reflection.

### Professor / university
1. Select syllabus and qualification outcomes.
2. Attach lectures, derivations, computational notebooks, labs and research readings.
3. Configure assessment criteria and reproducibility requirements.
4. Assign independent projects and peer review.
5. Link code, datasets, simulations and technical reports.
6. Review method, evidence, limitations and citations.

### Lab assistant
1. Receive approved lab session and learner roster.
2. Verify equipment, calibration, consumables and risk controls.
3. Check physical supervision/authorization.
4. Record raw data, equipment IDs, calibration and deviations.
5. Submit evidence for instructor review.
6. Do not independently promote engineering verification unless the canonical assurance process authorizes it.

### Parent / home supporter
1. View only authorized progress and upcoming work.
2. See explanations and safe home activities.
3. Ask open questions and encourage learner explanation.
4. Share observations; cannot change official grades or competency state.

### Self-starter / independent learner
1. Choose goal and prior knowledge check.
2. Build a pathway with visible prerequisites.
3. Work through explanation, notebook and practice.
4. Use formative feedback and retries.
5. Submit portfolio evidence where review is needed.
6. Export a portable learning record.

## 4. Learning analytics

Useful measures include mastery evidence by outcome, attempt trajectories, item difficulty, misconception prevalence, time-on-task distributions, concept transition drop-off, notebook execution errors, cohort-level coverage, accessibility usage and intervention response.

Analytics must:
- expose sample size and missingness;
- distinguish raw event from derived metric;
- avoid causal claims from correlation;
- avoid ranking learners by opaque composite scores;
- provide subgroup analysis only with lawful basis, minimum cohort sizes and privacy safeguards;
- avoid sensitive-trait inference;
- allow correction/appeal and explain recommendations;
- keep the educator responsible for pedagogical decisions.

The current `LearningRecordEngine.correlation()` requires an explicit cohort, at least five complete pairs, returns HOLD for zero variance and labels output descriptive/non-causal. It does not rank individuals or imply causality. `LearningManagementEngine` separately provides course lifecycle, enrollment, assignments, submissions, rubric scoring, guardian consent, audit events and host-verified mastery evidence. Its `MemoryLearningRepository` is test-only; production must inject a durable transactional repository and real identity/consent/evidence services. Production needs confidence intervals, outlier sensitivity, missing-data policy, privacy thresholds and longitudinal statistical review before high-stakes use.

## 5. Interoperability targets

- **1EdTech CASE 1.1:** exchange competency frameworks and standards. Use as the target model for framework/competency export/import; this package emits a minimal projection, not a certified CASE service.
- **1EdTech LTI 1.3 / LTI Advantage:** secure launch and role/context exchange with external tools, plus Assignment and Grade Services and Names and Role Provisioning where required. No LTI server/client is included here.
- **xAPI:** learning activity statement projection. Current `toXAPI()` is a basic adapter sketch; it is not yet a complete xAPI conformance implementation or LRS.
- **Caliper Analytics:** future event interoperability adapter after the event ontology is mapped and tested.
- **QTI:** future assessment item import/export adapter; preserve item response processing and scoring semantics.

Never claim certification or conformance from a shape-compatible JSON object. Run the relevant standards' conformance tests and interoperability validation.

## 6. Source and mapping assurance

`CurriculumSourceRegistry` requires source identity, jurisdiction, issuing authority, edition, academic year, language, scope, rights basis, HTTPS locator and source digest for ingested content. Active source records require two distinct host-verified reviewers and immutable source metadata. `CurriculumIngestionEngine` handles extracted learning outcomes: contributors submit source locators and excerpt hashes, while two independent authorized reviewers verify source fidelity, locator and meaning. A contributor cannot approve their own extraction. Rejected or failed revisions are closed; submit a new revision to correct them.

Accepted curriculum mappings require both a verified source/extraction binding (`verifySource` host callback) and two independently authorized reviewers (`verifyReviewer` host callback). The package does not authenticate people itself. The current institution's identity, conflict-of-interest and reviewer-qualification services must provide those decisions.

## 7. Learner analytics privacy

`LearningRecordEngine.correlation()` now requires an explicit cohort scope and a minimum cohort size of five. It can optionally constrain the activity/object. It returns descriptive Pearson association only, not individual rankings or causal explanations. High-stakes intervention, diagnosis, placement or grading must not be based on this statistic. Production analytics require a documented lawful basis, privacy threshold, missingness policy, subgroup disclosure controls, retention policy and human review.
