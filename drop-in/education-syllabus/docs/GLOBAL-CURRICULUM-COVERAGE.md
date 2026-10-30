# Global curriculum and jurisdiction coverage strategy

## 1. Coverage truth

This package includes:
- 249 ISO country/territory registry targets in `data/country-jurisdiction-registry.json` and one explicit curriculum-ingestion discovery target for each in `data/global-curriculum-ingestion-targets.json`.
- All 28 Indian States and 8 Union Territories in `data/india-jurisdictions.json`, with 36 unique ISO 3166-2 subdivision IDs and per-jurisdiction board discovery records in `data/india-state-board-targets.json`.
- Initial official-source registry entries for selected national and international frameworks.
- No claim that any of the 249 discovery targets or all Indian state boards have been ingested. The country directory rows are `REGISTRY_ONLY` by design. The 36 Indian subdivision identifiers are cross-checked against the 2026 UK Government/PCGN India Toponymic Factfile. Geographic subdivision identity is not evidence of education-board authority.

A global list is not a global syllabus. Countries can have decentralised systems, multiple languages, provincial/state curricula, examination boards, religious/community systems, vocational frameworks and changing academic-year editions. One country's curriculum cannot be substituted for another's.

## 2. Registered source families

The registry currently identifies source targets for:
- UNESCO ISCED 2011: cross-national classification of programmes and attainment, not a subject syllabus.
- India NCF Foundational Stage 2022 and NCF School Education 2023: national curriculum frameworks. They are not a substitute for each current board/state/UT syllabus.
- CBSE/CISCE/NIOS as India board ingestion targets.
- Common Core Mathematics and NGSS as US standards references. State adoption and local implementation must be checked jurisdiction-by-jurisdiction.
- IB PYP, MYP and DP as international programme frameworks.
- Australian Curriculum v9.0, with implementation timing determined by state/territory and sector.
- England National Curriculum (not a claim for all UK nations; Scotland, Wales and Northern Ireland need distinct registries).
- South Africa CAPS.
- New Zealand Curriculum / Te Mātaiaho; learning-area rollout and implementation dates require version-specific verification.
- European Qualifications Framework as a qualification reference, not a school syllabus.
- 1EdTech CASE 1.1 and LTI 1.3 as interoperability standards, not curricula.

## 3. India ingestion plan

Each State/UT is an independent jurisdiction record. For each one, ingest from the current official State Department of School Education, SCERT, board or gazette source. Capture:
1. Authority and source URL.
2. Board and stage/grade range.
3. Subject and paper/course identifiers.
4. Academic year, edition and effective date.
5. Language and medium.
6. Syllabus document digest and page/section locator.
7. Learning outcomes and content statements.
8. Assessment pattern and practical/lab requirements.
9. Accessibility/inclusion guidance.
10. Change history and supersession links.

Do not assume that a State has one board or one syllabus. Some states have multiple boards, open schooling, vocational pathways and language-medium variants. The ingestion workflow must permit several concurrent framework IDs per jurisdiction.

## 4. Country-level ingestion plan

For every ISO country/territory entry:
- Identify the national ministry/education authority and legal curriculum authority.
- Determine whether curricula are national, regional, provincial, state, canton, emirate, devolved or institutionally delegated.
- Register separate frameworks by authority and jurisdiction.
- Include national qualifications frameworks only as level/qualification mappings, not as content syllabi.
- Retain local languages and script variants; never normalize away language-specific learning outcomes.
- Record academic-year effective periods and superseded editions.
- Map only source-addressable standards to canonical concepts.

A registry target becomes `SOURCE_REGISTERED` when the authority/source is confirmed, `INGESTED_UNVERIFIED` when content is parsed but not reviewed, and `VERIFIED_CONTENT` only after two-person source fidelity review and schema/conformance checks. `VERIFIED_CONTENT` means source-faithful ingestion, not accreditation by the issuing authority or endorsement by PAP.

## 5. Community crowdsourcing with assurance

Thousands of contributors can accelerate syllabus coverage if contribution and authority are separated:
- Contributor submits source URL/file, edition, excerpt locator, proposed outcome extraction and concept mapping.
- Automated checks validate structure, checksums, language, duplicates, broken links and version conflicts.
- Independent reviewers verify excerpt fidelity and mapping semantics.
- Domain/board reviewers accept, reject or request revision.
- Accepted records are signed, versioned and immutable; corrections create a new revision.
- Dissenting mappings remain visible; consensus is not silently forced.
- No contributor can unilaterally turn a proposed mapping into official alignment.

Suggested review policy: two independent reviewers for ordinary mapping; three or more for high-stakes examination/credential mappings; issuing-authority evidence remains mandatory for claims of official status. Community consensus is not a substitute for the source authority.

## 6. Coverage metrics

Report separate denominators:
- Jurisdictions registered / expected.
- Authorities identified / expected.
- Current framework editions source-verified / expected.
- Documents ingested / identified.
- Standards extracted / document standards.
- Standards independently reviewed / extracted.
- Standards mapped / reviewed.
- Accepted mappings / all proposed mappings.
- Local-language editions covered / identified.
- Last verified date and age of source.

Never publish one aggregate “global coverage %” without exposing these denominators and their data provenance.

## 7. Subnational discovery index

`data/subnational-jurisdiction-targets.json` contains 5,046 ISO 3166-2 subdivision records derived from the bundled pycountry 24.6.1 data distribution. This is a discovery index only. ISO administrative subdivisions do not necessarily have independent education authority, school boards or curriculum powers. Each record therefore starts at `DISCOVERY_REQUIRED`, has no curriculum framework asserted and instructs the ingestion team to determine whether education authority is devolved. Verify the data against the current ISO publisher and current national law before operational use.

This broadens the search space for states, provinces, regions, territories, cantons and other subdivisions. It does not enumerate every school examination board, university system, language board, vocational authority or private programme. Board discovery is a separate authority-resolution task, and multiple boards may operate within one jurisdiction.
