# Computational notebooks, simulations and classroom integration

## 1. Why notebooks belong in the learning model

Mathematics, physics, chemistry, biology, computing and engineering are learned through a combination of explanation, symbolic work, experiment, data, computation and critique. A notebook should therefore be a structured learning artifact, not simply a code editor.

A notebook may combine:
- explanation and learning intention;
- mathematical notation and derivation;
- code cells;
- data tables and plots;
- interactive parameters;
- CAD/CFD/circuit/control/simulation activities;
- prediction questions before execution;
- measured or simulated outputs;
- interpretation and uncertainty;
- reflection and evidence submission.

## 2. How other tools inform the design

- Jupyter/JupyterLite: browser-native notebook experience and WebAssembly/Pyodide execution are useful reference patterns. JupyterLite has limitations versus server-backed Jupyter and stores browser data locally unless configured otherwise.
- MATLAB Live Editor: demonstrates executable documents combining code, output, equations, narrative and interactive controls.
- Wolfram Notebook/Alpha: demonstrates symbolic mathematics, graphing and dynamic examples for teaching.
- GeoGebra Classroom: demonstrates teacher-led shared interactive mathematical activities.
- PhET: demonstrates research-informed interactive simulations, teaching activities and multilingual distribution.

PAP should not blindly embed every tool. The canonical notebook representation should be independent, with provider adapters for JupyterLite, native PAP solvers, GeoGebra/PhET links or other tools where licensing and technical terms permit.

## 3. Notebook cell execution policy

The package validates notebook structure and dispatches code/simulation cells only to adapters whose runtime attestation is verified by a host-supplied verifier. A boolean or adapter self-assertion is insufficient. The package includes a deterministic allow-listed educational reference runtime for measurement summaries, ordinary least-squares regression and a discrete first-order feedback model. This is a sample computation runtime, not a general notebook sandbox. Production runtime must enforce:
- worker/process isolation;
- no ambient filesystem, credentials or unrestricted network;
- CPU, memory, wall-clock and output quotas;
- cancellation and timeout;
- pinned dependencies and package provenance;
- deterministic seed and environment metadata;
- content security policy and origin isolation;
- audit trail for execution and result;
- safe import/export and malware scanning for contributed notebooks.

The notebook's output is not automatically evidence. For an engineering simulation, the owning solver/validation package must independently attest configuration, solver version, assumptions, convergence and validation status. The educational layer may record learner interaction and interpretation, but may not promote engineering evidence.

## 4. Classroom patterns

### Teacher / projector
- Teacher opens a notebook and selects a cell or simulation.
- Learners predict the outcome before the teacher runs it.
- Teacher varies one parameter and asks learners to explain the change.
- Learners submit an explanation or graph, not merely a final number.
- Teacher sees response distribution and misconception cues.

### Student device
- Each learner forks a versioned activity.
- Learner edits parameters or code in a sandbox.
- The system records notebook revision, environment, run and result separately.
- Learner submits a reproducible notebook and interpretation.

### Lab assistant / physical lab
- Notebook presents approved protocol and safety gates.
- Lab assistant records instrument identity, calibration, raw data and deviations.
- Any hardware-connected action uses the canonical HIL/authority gate. The educational adapter cannot bypass it.

### Parent / independent learner
- A read-only or forkable notebook may be used for safe exploration.
- Physical experiments require explicit age-appropriate supervision and risk controls.
- Parent view focuses on progress and discussion prompts, not surveillance.

## 5. Example notebook flow

`measurement-lab-01` demonstrates measurement, tabular data, uncertainty reflection.
`linear-model-lab-01` demonstrates a constant-speed model and model limitations.
`feedback-control-lab-01` declares a simulation cell that can be connected to a future PAP simulation adapter. It intentionally HOLDs until that adapter is registered.

The sample JSON files are content fixtures. A runtime adapter is needed to execute code/simulation cells; no fake simulation output is embedded as if it had run.

## 6. Bundled educational reference runtime

`reference-education-runtime.mjs` provides three deterministic, allow-listed operations for the sample notebooks:
- `measurement-summary`: mean, sample standard deviation, minimum, maximum and unit label from finite repeated measurements;
- `linear-regression`: ordinary least-squares line, residuals and R-squared for finite two-dimensional points, with a HOLD for zero x variance;
- `first-order-control`: bounded discrete first-order proportional-feedback demonstration with parameter checks, finite-state checks and an educational-only warning.

The sample runner checks expected numerical outputs. These examples are classroom computations, not validated measurement software, general-purpose numerical libraries, control design certification or physical plant models. More capable mathematical, physics, CAD, CFD and circuit engines must register through their own verified adapters when Grok stitches those packages into the current spine. This education package does not assume those packages exist or import them by name.
