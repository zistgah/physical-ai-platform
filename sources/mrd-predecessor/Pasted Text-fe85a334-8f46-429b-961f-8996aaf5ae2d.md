Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
Physical AI Platform

UI/UX, Local Project Management, GitHub Persistence and Privacy Compliance Specification

1. Fundamental architectural principle

The platform is a static-first application.

It must not require:

- an application server
- a proprietary backend
- a platform database
- a mandatory cloud account
- a proprietary AI provider
- server-side session storage
- server-side project storage

The browser is the primary execution environment.

Persistent project data belongs to the user.

The preferred persistence model is:

USER
 |
 +-- Local Browser Workspace
 |      |
 |      +-- IndexedDB / browser storage
 |      +-- File System Access where supported
 |      +-- Imported local files
 |      +-- Temporary simulation state
 |      +-- Drafts
 |
 +-- Local Project Files
 |      |
 |      +-- JSON
 |      +-- YAML
 |      +-- Markdown
 |      +-- CSV
 |      +-- CAD
 |      +-- simulation files
 |      +-- source code
 |      +-- datasets
 |      +-- images
 |      +-- generated artifacts
 |
 +-- GitHub Repository
 |      |
 |      +-- durable project files
 |      +-- issues
 |      +-- issue comments
 |      +-- pull requests
 |      +-- releases
 |      +-- project history
 |
 +-- External AI
        |
        +-- user-controlled prompt/export
        +-- optional integration
        +-- no mandatory platform-owned AI database

The platform itself should not become the custodian of the user's project.

The user should always be able to:

1. work entirely locally;
2. export a complete project;
3. save it to GitHub;
4. clone/download it later;
5. move it to another machine;
6. open it without the original AI provider;
7. reconstruct the project from its files and Git history.

---

2. UI/UX architecture

The interface should be organized around the user's task rather than the internal software modules.

Primary navigation:

HOME
EXPLORE
LEARN
RESEARCH
BUILD
SIMULATE
MANUFACTURE
DEPLOY
OPERATE
REGULATE
PROJECTS
FILES
STANDARDS
AI GUIDE

Secondary global controls:

[Project]
[Workspace]
[GitHub]
[Files]
[Undo]
[Redo]
[Save]
[Validate]
[Simulate]
[Export]
[Publish]
[Privacy]
[Safety]
[Compliance]

The user should never need to understand the underlying component architecture merely to use the application.

---

3. Role-first landing page

The first screen should ask:

«What are you trying to do?»

Cards:

LEARN
I want to understand something.

RESEARCH
I want to investigate a question.

BUILD
I want to build a system.

SIMULATE
I want to test an idea.

INVENT
I want to create something new.

MANUFACTURE
I want to produce something.

START
I want to create a product or company.

DEPLOY
I want to operate a system.

REGULATE
I want to evaluate compliance.

TEACH
I want to teach or mentor.

EXPLORE
I want to browse the knowledge graph.

A beginner must not be confronted with:

- schema IDs
- ABI versions
- NoC topology
- requirement IDs
- compliance matrices
- Git commands

unless the user enters an expert context.

---

4. Progressive disclosure

Three principal interface modes:

Novice

Show:

- visual components
- simple terminology
- guided steps
- examples
- explanations
- safe defaults
- immediate feedback
- visual simulation
- project wizard

Hide unless requested:

- implementation details
- version compatibility
- formal contracts
- standards clauses
- compiler details
- raw JSON
- dependency graphs

Expert

Expose:

- component contracts
- ports
- interfaces
- units
- requirements
- simulation parameters
- control loops
- timing
- power
- manufacturing
- standards
- verification
- provenance
- configuration
- Git history

Thought Leader / Architect

Expose:

- ontology
- canonical IR
- ABI
- architectural alternatives
- trade spaces
- formal models
- research gaps
- benchmark definitions
- standards gaps
- provenance
- evidence graph
- dependency graph
- sovereignty analysis
- alternative architectures
- proposed primitives
- new component types

The same underlying project must support all three modes.

---

5. Workspace model

The fundamental UI object is the:

«Project Workspace»

A workspace is not equivalent to a single file.

A project may contain:

Project
 |
 +-- project manifest
 +-- requirements
 +-- architecture
 +-- components
 +-- interfaces
 +-- simulation
 +-- source code
 +-- CAD
 +-- electronics
 +-- datasets
 +-- experiments
 +-- test results
 +-- research
 +-- manufacturing
 +-- compliance
 +-- business
 +-- education
 +-- documentation
 +-- evidence
 +-- provenance

The UI must therefore support multi-file projects from the beginning.

Do not design the application around "upload one file".

---

6. Project manifest

Every project should have a machine-readable manifest.

Example:

{
  "schema": "physical-ai.project",
  "schema_version": "1.0.0",
  "project_id": "proj.example.robot.001",
  "name": "Mobile Inspection Robot",
  "version": "0.1.0",
  "created": "2026-10-23T00:00:00Z",
  "modified": "2026-10-23T00:00:00Z",
  "authors": [],
  "license": "GPL-3.0-or-later",
  "files": [],
  "components": [],
  "requirements": [],
  "experiments": [],
  "simulations": [],
  "evidence": [],
  "standards_profiles": [],
  "configuration": {},
  "provenance": []
}

The manifest is the project index.

It should never contain unnecessary personal information.

---

7. Project file tree

The UI should provide a familiar file explorer.

Example:

Mobile Inspection Robot/
│
├── project.json
│
├── architecture/
│   ├── system.json
│   ├── architecture.md
│   └── interfaces.json
│
├── requirements/
│   ├── requirements.json
│   └── traceability.json
│
├── components/
│   ├── chassis/
│   ├── battery/
│   ├── motor/
│   ├── controller/
│   └── sensors/
│
├── simulation/
│   ├── world.json
│   ├── scenario.json
│   ├── parameters.json
│   ├── results/
│   └── replay/
│
├── software/
│   ├── controller/
│   └── firmware/
│
├── cad/
│   ├── chassis.step
│   └── brackets/
│
├── electronics/
│   ├── schematic/
│   ├── pcb/
│   └── bom/
│
├── experiments/
│   ├── EXP-001/
│   └── EXP-002/
│
├── research/
│   ├── literature/
│   ├── manuscript/
│   └── datasets/
│
├── manufacturing/
│   ├── mbom.json
│   ├── routing.json
│   └── work-instructions/
│
├── compliance/
│   ├── standards.json
│   ├── requirements-matrix.json
│   └── evidence/
│
├── safety/
│   ├── hazards.json
│   ├── risk-assessment.json
│   └── checklists/
│
└── docs/
    ├── README.md
    └── project-history.md

The actual directory structure can differ by project type, but the semantic model must remain stable.

---

8. Local file management

The browser must provide a local file manager abstraction.

Operations:

NEW PROJECT
OPEN PROJECT
IMPORT FILE
IMPORT DIRECTORY
ADD FILE
ADD DIRECTORY
RENAME
MOVE
COPY
DELETE
DUPLICATE
DOWNLOAD
EXPORT
EXPORT PROJECT
OPEN WITH
VALIDATE
COMPARE
DIFF
REVERT

The application must distinguish:

LOCAL FILE
PROJECT FILE
GENERATED FILE
IMPORTED FILE
REMOTE FILE
DERIVED FILE
TEMPORARY FILE

Never silently overwrite an existing user file.

---

9. Multi-file import

Import should support:

single file
multiple files
directory
ZIP archive
Git repository export
project archive
simulation package
dataset package
CAD package
source-code project

Import pipeline:

SELECT FILES
      |
      v
QUARANTINE
      |
      v
FILE IDENTIFICATION
      |
      v
FORMAT DETECTION
      |
      v
LICENSE CHECK
      |
      v
SECURITY CHECK
      |
      v
SCHEMA/PARSER
      |
      v
SEMANTIC EXTRACTION
      |
      v
DEPENDENCY EXTRACTION
      |
      v
PROVENANCE
      |
      v
PROJECT INTEGRATION

The UI must show this process.

Do not silently ingest arbitrary files.

---

10. Import preview

Before importing:

IMPORT PREVIEW

Files detected: 37

Recognized:
  12 JSON
  8 Markdown
  4 Python
  3 CSV
  2 STEP
  1 STL
  1 YAML
  6 unknown

Dependencies:
  4 internal references
  2 missing references
  1 external URL

Potential issues:
  2 duplicate filenames
  1 unsupported CAD format
  3 files contain executable content

[Cancel]
[Import Safe Files]
[Review]
[Import All]

Executable files should never execute merely because they were imported.

---

11. File trust states

Every imported artifact should have a trust state:

UNREVIEWED
PARSED
VALIDATED
TRUSTED
MODIFIED
DERIVED
QUARANTINED
REJECTED

Trust must be independent of file format.

A ".json" file can contain malicious or misleading content.

A ".step" file can contain malformed geometry.

A ".py" file is executable source and requires stronger handling.

---

12. Local project storage

Local persistence should use browser-native mechanisms where appropriate.

Preferred hierarchy:

In-memory
    |
IndexedDB
    |
File System Access API
    |
Explicit local export
    |
GitHub

IndexedDB may hold:

- project index
- workspace state
- UI preferences
- drafts
- cached metadata
- simulation state
- temporary results

Do not treat browser storage as the authoritative archival copy.

The UI must explicitly state:

«Local browser storage is a working copy. Export or synchronize your project if you need durable preservation.»

---

13. GitHub as persistence

Because there is no application database, GitHub becomes an optional user-controlled persistence backend.

The user chooses the repository.

The platform should never assume ownership of the repository.

Project persistence options:

LOCAL ONLY

LOCAL + GITHUB

GITHUB REPOSITORY

GITHUB FORK

GITHUB BRANCH

GITHUB PULL REQUEST

The user should be able to select:

Repository
Branch
Project directory
Persistence mode

---

14. GitHub project structure

A repository containing multiple projects should support:

repository/
│
├── projects/
│   ├── robot-a/
│   │   ├── project.json
│   │   └── ...
│   │
│   ├── robot-b/
│   │   ├── project.json
│   │   └── ...
│   │
│   └── irrigation-system/
│       ├── project.json
│       └── ...
│
├── shared/
│   ├── components/
│   ├── standards/
│   ├── schemas/
│   └── templates/
│
└── .github/
    └── ISSUE_TEMPLATE/

This permits one GitHub repository to become a complete personal or laboratory knowledge base.

---

15. GitHub Issues as database records

Issues should not merely be bug reports.

They become structured persistence records for objects that do not naturally belong in ordinary files.

Potential record types:

PROJECT_RECORD
DECISION_RECORD
REQUIREMENT_RECORD
RESEARCH_QUESTION
EXPERIMENT_RECORD
TEST_RECORD
INCIDENT_RECORD
RISK_RECORD
CHANGE_REQUEST
ARCHITECTURE_DECISION
SUPPLIER_RECORD
CUSTOMER_REQUIREMENT
FIELD_OBSERVATION
LESSON_LEARNED
MILESTONE
TASK
REVIEW
COMPLIANCE_REVIEW
SAFETY_REVIEW

Use labels/type metadata to distinguish them.

GitHub's issue templates and issue forms are specifically designed to standardize structured submissions, including required fields, dropdowns and other form elements.

---

16. Issue-backed object model

Example:

PROJECT
  |
  +-- Issue #101 PROJECT_RECORD
  |
  +-- Issue #102 REQUIREMENT
  +-- Issue #103 ARCHITECTURE_DECISION
  +-- Issue #104 EXPERIMENT
  +-- Issue #105 TEST
  +-- Issue #106 RISK
  +-- Issue #107 CHANGE_REQUEST

The project manifest stores the relationships:

{
  "issue_records": [
    {
      "type": "requirement",
      "issue": 102,
      "id": "REQ-001"
    }
  ]
}

The GitHub issue is persistence.

The project file remains the canonical machine-readable project representation.

Do not make the entire architecture dependent on GitHub-specific issue semantics.

---

17. GitHub issue synchronization

Synchronization must be explicit.

States:

LOCAL ONLY
LOCAL MODIFIED
REMOTE CURRENT
REMOTE MODIFIED
CONFLICT
SYNCED

Example:

Project: Mobile Robot

Local:
  modified 4 minutes ago

GitHub:
  modified 21 minutes ago

Status:
  LOCAL CHANGES

[Review Changes]
[Commit]
[Discard Local Changes]

Never silently overwrite local work.

---

18. Conflict handling

If both local and GitHub copies changed:

SYNC CONFLICT

project.json
  LOCAL VERSION
  REMOTE VERSION

requirements.json
  LOCAL VERSION
  REMOTE VERSION

experiment/EXP-003/results.json
  LOCAL ONLY

Choose:

[Use Local]
[Use Remote]
[Merge]
[Save Both]
[Cancel]

For structured JSON:

three-way semantic merge

should be preferred over textual merge.

For binary files:

keep local
keep remote
save both

Do not attempt unsafe automatic binary merging.

---

19. GitHub Issue templates

The repository should ship with:

.github/
└── ISSUE_TEMPLATE/
    ├── project.yml
    ├── requirement.yml
    ├── experiment.yml
    ├── test.yml
    ├── risk.yml
    ├── decision.yml
    ├── change-request.yml
    ├── incident.yml
    ├── research-question.yml
    └── field-observation.yml

The templates should be generated from the platform schemas where possible.

GitHub requires issue forms to live under ".github/ISSUE_TEMPLATE", and form responses are converted into the issue body.

---

20. Privacy-by-design architecture

The application should follow:

«Data minimization by default.»

The platform should collect no personal information merely because the user opened the website.

Do not create:

- hidden analytics profiles
- behavioural tracking
- fingerprinting
- unnecessary cookies
- invisible telemetry
- shadow user accounts
- server-side conversation histories

---

21. Explicit data classes

Every piece of information should be classified.

PUBLIC
PROJECT
PERSONAL
PRIVATE
SENSITIVE
CONFIDENTIAL
SAFETY_CRITICAL
SECURITY_CRITICAL
CONTROLLED
RESTRICTED

The classification is attached to artifacts and fields.

Example:

{
  "classification": "PRIVATE"
}

---

22. Data minimization

The UI should ask:

«Is this information actually necessary?»

Examples of information that should normally not be requested:

- home address
- phone number
- personal identification number
- precise location
- biometric data
- private family information
- unnecessary demographic information
- passwords
- access tokens
- private keys

If location is required for a legitimate engineering purpose, explain why.

Do not collect it merely because the platform can.

---

23. Secrets protection

The UI must actively detect likely secrets.

Examples:

API keys
GitHub tokens
SSH private keys
cloud credentials
passwords
certificate private keys
database credentials
signing keys
wallet keys

If detected:

POTENTIAL SECRET DETECTED

This file appears to contain a credential.

Do not publish this file to GitHub.

[Remove Secret]
[Keep Local]
[Cancel Upload]

The application must never place secrets into generated issues.

---

24. GitHub token handling

If GitHub integration requires authentication:

- request the minimum necessary permission;
- do not persist tokens in project files;
- do not write tokens into URLs;
- do not include tokens in issue bodies;
- do not place tokens in exported archives;
- do not log tokens;
- clear temporary credentials when the session ends where appropriate.

Display:

GitHub Access

Connected for:
  repository: read/write
  issues: read/write

[Disconnect]

Do not display the credential itself.

---

25. Privacy classification before GitHub publication

Before publishing:

PUBLISH TO GITHUB

This project contains:

PUBLIC
  14 files

PRIVATE
  3 files

POTENTIAL PERSONAL DATA
  2 files

POTENTIAL SECRET
  1 file

UNLICENSED THIRD-PARTY CONTENT
  4 files

[Review]
[Publish Safe Files]
[Cancel]

The user must make the final publication decision.

---

26. Public versus private repository warning

Before pushing:

Repository visibility:
PUBLIC

Everything committed here may become publicly accessible.

Review:
- personal information
- credentials
- proprietary information
- private research
- customer information
- unpublished inventions
- restricted technical information
- controlled technical data
- regulated information

For private repositories:

PRIVATE

Repository access is controlled by GitHub repository permissions.

The platform does not guarantee the confidentiality of the external service.

---

27. Intellectual property protection

The UI should distinguish:

PUBLIC
OPEN SOURCE
PATENT PENDING
CONFIDENTIAL
TRADE SECRET
PROPRIETARY
UNPUBLISHED RESEARCH
THIRD-PARTY LICENSED
CONTROLLED

Before public publication of an invention:

IP REVIEW

This project contains:
  3 potentially novel components
  1 invention disclosure
  2 unpublished experimental results

Public release may affect intellectual-property strategy.

[Review IP]
[Publish]
[Cancel]

This is a warning, not legal advice.

---

28. Privacy-aware AI interface

The AI Guide must explicitly show what will be sent to an external AI.

Before transmission:

EXTERNAL AI REQUEST

Destination:
  External AI provider

Data selected:
  project architecture
  3 requirements
  simulation result

Not included:
  local credentials
  private files
  GitHub token

[Review Prompt]
[Remove Files]
[Send]
[Cancel]

Default:

«No project file should be transmitted to an external AI provider without an explicit user action.»

---

29. AI privacy modes

Provide:

LOCAL ONLY
NO EXTERNAL AI

ASK WITH SELECTED TEXT

ASK WITH SELECTED FILES

ASK WITH PROJECT SUMMARY

ASK WITH COMPLETE PROJECT

CUSTOM

"Complete project" must require an explicit confirmation.

---

30. AI provenance

Every AI-generated artifact should optionally record:

{
  "generated_by": "external_ai",
  "provider": "user-selected",
  "model": "user-selected",
  "timestamp": "...",
  "input_scope": [
    "requirements/REQ-001.json"
  ],
  "human_review": "pending"
}

Never claim that AI-generated material is verified merely because it was generated.

---

31. Privacy-aware project sharing

Sharing should be artifact-based.

Options:

SHARE PROJECT
SHARE SIMULATION
SHARE MODEL
SHARE PAPER
SHARE DATASET
SHARE ARCHITECTURE
SHARE PUBLIC DEMO
SHARE README ONLY

The user should not have to expose the complete repository merely to share a simulation.

---

32. Redaction engine

Before export/publication:

REDACTION

Detected:
  email addresses: 2
  phone numbers: 1
  API-like tokens: 1
  local filesystem paths: 14
  private hostnames: 3

[Review Each]
[Redact]
[Keep]
[Cancel]

Redaction must be reversible only through the user's original local copy.

Do not silently modify the source project.

---

33. Local filesystem privacy

Do not scan the user's entire computer.

The user must explicitly choose:

Select file
Select folder
Import project

The application should access only the selected resources.

Do not silently crawl:

Desktop
Documents
Downloads
home directory
browser profile
SSH directory
Git credentials

---

34. Browser permissions

Every sensitive browser capability should be preceded by a clear explanation.

Example:

FILE ACCESS REQUEST

This allows the project editor to read files you explicitly select.

It does not grant access to your entire computer.

[Allow]
[Cancel]

Same principle for:

- clipboard
- microphone
- camera
- serial devices
- USB
- Bluetooth
- filesystem
- GitHub
- external AI

---

35. Simulation privacy

Simulation should run locally whenever technically possible.

Telemetry generated by simulation should remain local by default.

Do not automatically upload:

- simulation trajectories
- sensor logs
- environment models
- robot designs
- failure data
- benchmark results

---

36. Local telemetry

Provide:

Telemetry

Storage:
  LOCAL

Retention:
  UNTIL PROJECT DELETED

Export:
  JSON
  CSV
  Parquet

Upload:
  OFF

If the user chooses GitHub persistence, make that explicit.

---

37. Privacy-aware logs

Application logs should never contain:

passwords
tokens
private keys
full personal data
private project contents

Prefer:

project_id
operation_id
timestamp
component_id
event_type
result
error_code

---

38. User control

The user must always have:

VIEW DATA
EXPORT DATA
DELETE LOCAL DATA
CLEAR CACHE
DISCONNECT GITHUB
REVOKE ACCESS
DELETE PROJECT
RESET WORKSPACE

"Reset workspace" must clearly distinguish:

Clear browser cache
from
Delete local project
from
Delete GitHub project

These are completely different operations.

---

39. No destructive ambiguity

Never use:

Delete

without specifying the target.

Prefer:

Delete local draft
Delete project file
Remove from workspace
Delete GitHub issue
Delete GitHub repository
Delete cached copy

For irreversible actions:

This action cannot be undone from this application.

[Cancel]
[Confirm]

---

40. Project lifecycle UI

The project header should show:

Mobile Inspection Robot

CONCEPT
  ↓
SIMULATION
  ↓
EXPERIMENT
  ↓
MVP
  ↓
PROTOTYPE
  ↓
VERIFIED
  ↓
MANUFACTURED
  ↓
DEPLOYED
  ↓
OPERATED
  ↓
SERVICE

Current state is visible.

The system should not allow a user to mistake:

simulation success

for:

physical validation

---

41. Evidence state

Every major result should display:

PROPOSED
UNVERIFIED
OBSERVED
REPLICATED
VALIDATED
VERIFIED
CERTIFIED
SUPERSEDED
REJECTED

For example:

Motor model

Simulation:
  VALIDATED

Physical prototype:
  OBSERVED

Certification:
  NOT ASSESSED

This prevents UI-level epistemic flattening.

---

42. Requirements UI

Requirements should be first-class objects.

Display:

REQ-001

Requirement:
Robot shall stop within X ms after emergency-stop command.

Source:
Safety specification

Verification:
Test

Status:
UNVERIFIED

Linked design:
Controller
Motor driver

Linked test:
TEST-014

Evidence:
None

Users should be able to navigate:

Requirement
    ↓
Architecture
    ↓
Component
    ↓
Implementation
    ↓
Test
    ↓
Evidence

---

43. Privacy and safety intersection

The UI must recognize that privacy can become a physical safety issue.

Examples:

- camera feeds
- microphone recordings
- operator identity
- location
- teleoperation commands
- customer premises
- biometric systems
- vehicle telemetry

These must have explicit data-handling policies.

---

44. Internationalization

The UI architecture must separate:

language
script
locale
regional variety
measurement system
currency
timezone
date format
legal jurisdiction
standards jurisdiction

Do not equate language with nationality.

Do not infer:

nationality
religion
ethnicity
politics
gender
social status

from:

language
script
name
location
accent
appearance

---

45. Accessibility

Accessibility must be structural.

Support:

- keyboard navigation
- screen readers
- high contrast
- scalable text
- reduced motion
- focus indicators
- semantic HTML
- accessible diagrams
- captions
- transcripts
- non-color status indicators
- alternative text
- accessible simulation controls

Do not encode:

PASS = green only
FAIL = red only

Use:

PASS
FAIL
BLOCKED
UNKNOWN

with visual indicators as secondary information.

---

46. Safety-critical UI

Safety controls must be visually and semantically separated from ordinary application controls.

For a robot:

[MISSION]
[CONTROL]
[TELEMETRY]

---------------------

SAFETY

E-STOP
SAFE STATE
LOCAL AUTHORITY
REMOTE AUTHORITY
FAULT

The UI must clearly identify:

LOCAL SAFETY AUTHORITY
REMOTE OPERATOR
SYSTEM
AI

AI must never appear visually equivalent to the human authority responsible for physical safety.

---

47. Teleoperation privacy

Before remote operation:

REMOTE OPERATION

Robot:
  Robot-014

Robot location:
  Site A

Remote operator:
  User X

Local safety authority:
  Site Operator Y

Jurisdiction:
  ...

Data:
  telemetry
  video
  audio
  commands

Recording:
  OFF

[Review Authorization]
[Request Control]

The local safety authority must retain the ability to stop the physical system independently of the remote connection.

---

48. GitHub issue privacy warning

Issues are not private scratch space.

Before creating an issue:

CREATE ISSUE

Repository:
  PUBLIC

Issue type:
  Experiment

WARNING:
This information will be stored in the selected GitHub repository.

Do not include:
- passwords
- private keys
- credentials
- unnecessary personal information
- confidential customer information
- restricted technical information

[Review]
[Create Issue]
[Cancel]

---

49. Issue content architecture

Issue bodies should contain structured metadata:

## Record

Record ID: EXP-001
Record Type: Experiment
Project: ROBOT-001
Version: 0.3.0
Configuration: CFG-014
Status: OBSERVED

## Objective

...

## Inputs

...

## Procedure

...

## Results

...

## Evidence

...

## Provenance

...

## Related Files

...

## Related Records

...

## Review

...

The application can generate this automatically.

---

50. Issue labels

Use machine-readable labels:

record:project
record:requirement
record:experiment
record:test
record:risk
record:decision
record:change
record:incident
record:research

state:draft
state:review
state:approved
state:baselined
state:released
state:deprecated

privacy:public
privacy:private
privacy:restricted

safety:review
safety:critical

compliance:review
compliance:hold

Do not use labels as the sole source of truth.

The structured record remains authoritative.

---

51. GitHub Issue synchronization architecture

The application should have a GitHub adapter:

GitHubAdapter
 |
 +-- authenticate()
 +-- repositories()
 +-- branches()
 +-- issues()
 +-- createIssue()
 +-- updateIssue()
 +-- comments()
 +-- labels()
 +-- pullRequests()
 +-- releases()
 +-- files()
 +-- commits()

The core application must not directly depend on GitHub.

Use:

PersistenceProvider

with:

LocalProvider
GitHubProvider
FileProvider

Future:

GitLabProvider
ForgejoProvider
GiteaProvider
SelfHostedProvider

The architecture therefore remains sovereign.

---

52. Project persistence abstraction

Canonical interface:

class ProjectPersistenceProvider {
  async loadProject(projectId) {}
  async saveProject(project) {}
  async listProjects() {}
  async deleteProject(projectId) {}
  async exportProject(projectId) {}
  async importProject(bundle) {}
  async sync(projectId) {}
  async getStatus(projectId) {}
}

GitHub is an implementation.

It is not the semantic architecture.

---

53. Offline-first behaviour

If GitHub is unavailable:

GITHUB OFFLINE

Your local project remains available.

You can:
  edit
  simulate
  research
  build
  validate
  export

Synchronization will be available later.

[Continue Offline]

Never make the application unusable merely because GitHub is unavailable.

---

54. Offline queue

Changes can be represented locally as:

LOCAL CHANGESET

CS-001
  add requirement

CS-002
  modify controller

CS-003
  add simulation result

CS-004
  update architecture

When GitHub returns:

4 local changes pending synchronization

[Review and Sync]

---

55. Privacy dashboard

Every project should have:

PRIVACY & DATA

Local files:
  42

GitHub files:
  37

External AI transmissions:
  3

Public artifacts:
  12

Private artifacts:
  18

Restricted artifacts:
  7

Potential personal data:
  2

Potential secrets:
  0

External services:
  GitHub
  AI Provider X

This should be understandable to a non-expert.

---

56. Provenance dashboard

Provide:

PROJECT PROVENANCE

Created:
  Local

Imported:
  CAD package

Modified:
  User

Simulated:
  Local simulator

AI-assisted:
  External AI

Published:
  GitHub repository

Verified:
  TEST-014

Every transformation should have a provenance event.

---

57. "What leaves my machine?" view

This is especially important for a static application.

Provide:

DATA FLOW

LOCAL ONLY
  project files
  simulation
  drafts

GITHUB
  selected files
  selected issues
  selected comments

EXTERNAL AI
  selected prompt
  selected files

NOT TRANSMITTED
  credentials
  browser storage
  unrelated files

This is one of the most important privacy UX features.

---

58. No hidden telemetry

The application should state clearly:

Telemetry:
OFF by default

Analytics:
OFF by default

Crash reporting:
OFF by default

Project synchronization:
User controlled

External AI:
User initiated

If any optional telemetry is introduced later, it must be:

- documented;
- opt-in where appropriate;
- minimized;
- separately controllable;
- never mixed with project content.

---

59. Security boundary

The architecture should have:

Browser
 |
 +-- UI
 |
 +-- Local Workspace
 |
 +-- Project Model
 |
 +-- Simulation
 |
 +-- Persistence Adapter
 |      |
 |      +-- Local
 |      +-- GitHub
 |
 +-- External AI Adapter
 |
 +-- Export

There must be no implicit:

Browser -> hidden server -> database

architecture.

---

60. GitHub persistence does not equal platform custody

This distinction must be explicit.

The platform provides:

project structure
schemas
validation
UI
simulation
knowledge graph
workflow
export
GitHub adapter

GitHub provides:

repository hosting
version history
issue persistence
collaboration
access control

The platform must not claim that it controls or guarantees GitHub's data practices.

---

61. User-facing privacy statement

The application should contain a concise statement:

«This application is designed as a static-first, user-controlled workspace. Project data is processed locally unless you explicitly choose to save, synchronize, publish, or transmit it through an external service such as GitHub or an AI provider. The application does not require a proprietary project database. You remain responsible for selecting appropriate repositories, access permissions, licenses, privacy settings, and publication decisions.»

Then provide a detailed policy.

---

62. Compliance distinction

Do not describe the architecture as automatically "GDPR compliant", "DPDP compliant", "COPPA compliant", "HIPAA compliant", etc.

Instead:

PRIVACY CONTROLS IMPLEMENTED

and separately:

JURISDICTIONAL COMPLIANCE REVIEW

Compliance depends on:

- jurisdiction
- controller/processor roles
- data categories
- purposes
- legal basis
- age
- organization
- retention
- transfers
- contractual arrangements
- external service providers

The application can provide compliance tooling.

It cannot manufacture legal compliance merely through UI controls.

---

63. Children's data

Because the platform includes preschool through postdoc education, the architecture must assume that minors may use it.

The UI should therefore avoid unnecessary collection of:

student full name
home address
personal phone
biometrics
precise location
private family information

Prefer:

student project ID
class/cohort ID
teacher-managed identity
pseudonymous identifiers

Where institutional student information systems are used, integration should be explicit and separately authorized.

Do not build an unnecessary central student database.

---

64. Parent/teacher/admin separation

The same project graph should expose different views.

Student

My Projects
My Skills
My Experiments
My Evidence
My Next Challenge

Teacher

Class
Curriculum
Projects
Safety
Assessment
Mastery
Lab Access

Parent

Learning
Projects
Skills
Upcoming Activities
Safety Information

Administration

Curriculum
Resources
Safety
Facilities
Teachers
Projects
Research
Compliance

A parent must not automatically see another student's project.

A student must not automatically see private teacher/admin information.

---

65. Project permissions

At minimum:

OWNER
EDITOR
CONTRIBUTOR
REVIEWER
VIEWER
SAFETY_AUTHORITY
COMPLIANCE_REVIEWER
TEACHER
STUDENT
PARENT
ADMINISTRATOR

Permissions should be capability-based.

Example:

VIEW
EDIT
SIMULATE
EXPORT
PUBLISH
DELETE
APPROVE
CERTIFY
OPERATE
COMMAND
AUTHORIZE

---

66. Architectural rule for GitHub Issues

Issues are a persistence mechanism, not an ontology.

The ontology remains:

Project
Requirement
Experiment
Test
Evidence
Decision
Risk
Change
...

GitHub merely stores representations of those objects.

This is critical for future migration.

---

67. Exportability

Every project must have:

EXPORT PROJECT

[ZIP]
[JSON bundle]
[Markdown]
[Git repository]
[Research package]
[Simulation package]
[Manufacturing package]
[Compliance package]
[Educational package]

A project must remain useful outside the website.

---

68. Complete project archive

The archive should contain:

project.json
manifest.json
schemas/
provenance/
architecture/
requirements/
components/
simulation/
experiments/
tests/
research/
manufacturing/
compliance/
safety/
docs/
assets/

Include:

README
LICENSE
VERSION
CHANGELOG
PROVENANCE

---

69. Project integrity

Every archive should include hashes where appropriate:

{
  "file": "simulation/results/run-001.json",
  "sha256": "...",
  "size": 18273
}

This allows:

integrity checking
change detection
reproducibility
evidence verification

---

70. UI state versus project state

These must never be conflated.

UI state:

selected tab
expanded tree
zoom level
theme
panel width
last viewport

Project state:

requirements
components
architecture
simulation
results
configuration
evidence

GitHub persistence should normally persist project state, not arbitrary UI state.

---

71. Undo/redo

Undo/redo should operate on semantic project operations.

Example:

ADD COMPONENT
CONNECT PORT
CHANGE PARAMETER
ADD REQUIREMENT
MODIFY ARCHITECTURE
RUN SIMULATION

Avoid treating every DOM mutation as an undo operation.

---

72. Autosave

Autosave should mean:

«save to local working storage»

It must not mean:

«silently publish to GitHub.»

Display:

Saved locally 12:43:17

GitHub:
Not synchronized

This distinction is essential.

---

73. Explicit synchronization

Use:

SAVE LOCAL

SYNC GITHUB

PUBLISH GITHUB

as separate actions.

"Save" must never unexpectedly publish.

---

74. Project status bar

A persistent status bar could show:

PROJECT: ROBOT-014
LOCAL: SAVED
GITHUB: SYNCED
VALIDATION: PASS
SIMULATION: PASS
SAFETY: REVIEW REQUIRED
COMPLIANCE: UNKNOWN
PRIVACY: 2 WARNINGS
AI: DISCONNECTED

This gives the user a continuous system state.

---

75. Architecture extensibility

The UI must not hard-code every object type.

Use registries:

ComponentRegistry
ProjectTypeRegistry
ArtifactTypeRegistry
PersistenceProviderRegistry
SimulationEngineRegistry
ImporterRegistry
ExporterRegistry
ViewRegistry
WorkflowRegistry
AIProviderRegistry
StandardProfileRegistry

A new domain should be installable by adding metadata/components rather than rewriting the application.

---

76. Plugin privacy contract

Every plugin must declare:

{
  "plugin_id": "...",
  "version": "...",
  "permissions": [],
  "network_access": false,
  "filesystem_access": false,
  "project_access": "selected",
  "external_services": [],
  "data_collected": [],
  "data_transmitted": [],
  "license": "..."
}

The UI must show these permissions before activation.

---

77. External network policy

Default:

NETWORK ACCESS:
MINIMAL

Network access should be attributable to an explicit provider:

GitHub
AI provider
standards source
package registry
user-selected URL

Do not allow arbitrary background network traffic.

---

78. Compliance and export-control UX

For projects that may contain controlled technology:

COMPLIANCE STATUS

Technical classification:
UNKNOWN

End use:
NOT REVIEWED

End user:
NOT REVIEWED

Destination:
NOT REVIEWED

Transfer:
NOT REVIEWED

Result:
HOLD

Unknown must never become:

ALLOWED

merely because the project is open source or educational.

---

79. Publication gate

Before public publication:

PUBLICATION REVIEW

[ ] Privacy reviewed
[ ] Secrets scan passed
[ ] License reviewed
[ ] Third-party assets reviewed
[ ] IP strategy reviewed
[ ] Safety reviewed
[ ] Compliance reviewed where applicable
[ ] Export-control review where applicable
[ ] Dataset permissions reviewed
[ ] AI-generated material reviewed
[ ] Provenance complete

[PUBLISH]

---

80. Core UI invariant

The interface should continuously answer five questions:

WHAT AM I LOOKING AT?

WHO OWNS IT?

WHERE IS IT STORED?

WHO CAN SEE IT?

WHAT WILL HAPPEN IF I PRESS THIS BUTTON?

For sensitive actions add:

WHAT LEAVES MY MACHINE?

---

81. Recommended repository additions

The existing repository should eventually add:

site/components/
├── workspace/
│   ├── workspace-manager.js
│   ├── project-manager.js
│   ├── file-manager.js
│   ├── file-tree.js
│   ├── import-manager.js
│   ├── export-manager.js
│   └── workspace-status.js
│
├── persistence/
│   ├── persistence-provider.js
│   ├── local-provider.js
│   ├── github-provider.js
│   ├── sync-engine.js
│   ├── conflict-manager.js
│   └── offline-queue.js
│
├── privacy/
│   ├── privacy-engine.js
│   ├── data-classifier.js
│   ├── secret-scanner.js
│   ├── redaction-engine.js
│   ├── transmission-review.js
│   └── privacy-dashboard.js
│
├── security/
│   ├── permission-manager.js
│   ├── capability-manager.js
│   └── trust-boundary.js
│
├── ui/
│   ├── command-palette.js
│   ├── notifications.js
│   ├── modal.js
│   ├── dialogs.js
│   ├── accessibility.js
│   └── progressive-disclosure.js
│
└── github/
    ├── github-adapter.js
    ├── issue-records.js
    ├── issue-sync.js
    ├── repository-manager.js
    └── github-auth.js

---

82. Data schemas to add

schemas/
├── project.schema.json
├── project-manifest.schema.json
├── file.schema.json
├── artifact.schema.json
├── issue-record.schema.json
├── privacy-classification.schema.json
├── permission.schema.json
├── provenance.schema.json
├── sync-state.schema.json
├── export-manifest.schema.json
├── ai-transmission.schema.json
└── github-binding.schema.json

---

83. Mandatory tests

The implementation must test:

Local workspace

create project
open project
save project
rename file
move file
delete file
restore file
multi-file import
directory import
ZIP import
export project

Persistence

local save
GitHub save
GitHub load
offline mode
reconnect
synchronization
conflict
three-way merge

Privacy

secret detection
PII detection
redaction
publication warning
external AI transmission warning
private/public repository warning

Security

permission enforcement
token exclusion
path traversal prevention
unsafe file handling
plugin permission enforcement

Provenance

import provenance
modification provenance
simulation provenance
AI provenance
GitHub publication provenance

UX

keyboard navigation
screen reader semantics
mobile layout
small screen
large screen
novice mode
expert mode
accessibility mode

---

84. Critical acceptance tests

The following must pass before the UI architecture is considered complete.

Test 1

Disconnect network.

Expected:

Project remains usable.

Test 2

Delete browser storage.

Expected:

Only unsynchronized local data is lost.
GitHub project remains intact.

Test 3

Clone GitHub repository on another computer.

Expected:

Project reconstructs successfully.

Test 4

Open exported ZIP without the original application backend.

Expected:

All canonical project information remains accessible.

Test 5

Import 100 files.

Expected:

No silent overwrites.
No arbitrary execution.
Dependency report generated.

Test 6

Put a fake API key in a project.

Expected:

Publication warning.

Test 7

Ask external AI to analyze the project.

Expected:

Explicit data transmission confirmation.

Test 8

Modify the local project while GitHub contains a newer version.

Expected:

CONFLICT

not silent replacement.

Test 9

Create a public GitHub issue containing personal data.

Expected:

Publication warning.

Test 10

Open the project in novice mode.

Expected:

No unnecessary implementation complexity exposed.

Test 11

Open the same project in expert mode.

Expected:

Full engineering graph available.

Test 12

Open the same project in architect mode.

Expected:

Semantic model, contracts, provenance, alternatives and architectural dependencies available.

---

85. Most important architectural rule

Do not build:

Website -> hidden database -> project

Build:

             +------------------+
             |  Knowledge Model |
             +--------+---------+
                      |
          +-----------+-----------+
          |                       |
     Local Workspace        Persistence
          |                       |
       Files/DB*          +--------+--------+
          |               |                 |
       Browser         GitHub           Future Providers
                          |
                       Issues
                       Commits
                       PRs

"*" Browser-local storage is a cache/workspace, not the sole archival authority.

The canonical semantic project must remain exportable.

---

86. Final UX philosophy

The application should feel like:

«An engineering operating environment for the user's projects»

not:

«a website with forms.»

The user should be able to move naturally through:

IDEA
 ↓
PROJECT
 ↓
FILES
 ↓
ARCHITECTURE
 ↓
SIMULATION
 ↓
EXPERIMENT
 ↓
EVIDENCE
 ↓
RESEARCH
 ↓
INVENTION
 ↓
MANUFACTURING
 ↓
COMPLIANCE
 ↓
DEPLOYMENT
 ↓
OPERATION
 ↓
SERVICE
 ↓
NEXT VERSION

And at every stage:

What is it?
Where is it?
What version is it?
Who changed it?
What evidence supports it?
Who can access it?
What data leaves the machine?
What standards apply?
What safety constraints apply?
What can be substituted?
Can I export it?
Can I reproduce it?
Can I move it elsewhere?

That is the correct UX model for a database-less, GitHub-persistent, local-first sovereign engineering platform.

GitHub's existing issue-template and issue-form mechanisms are sufficient to provide a structured persistence interface for many record types, while keeping the actual ontology and project schema independent of GitHub.