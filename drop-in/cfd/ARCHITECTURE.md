<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD package architecture

## Architectural invariant

The PAP canonical kernel and SIR remain authoritative. This package owns neither a project graph nor a second ontology. It receives canonical identifiers from the host and returns solver outputs plus provenance. It does not create, authorize or promote canonical evidence.

## Components

1. `module.js`: deterministic 1D analytical-reference solver, retained from package 1.2.0.
2. `integration/backend-job.js`: maps an externally selected 2D/3D CFD request to the generic backend job envelope.
3. `backend-catalogue/manifest.json`: candidate engine metadata, licence references and current integration state.
4. `notebooks/CFD_Backend_Colab.ipynb`: browser-launched hosted computational workflow, analytical reference and GPU-aware parametric sweep.
5. `extensions/scientific-backend-orchestration/`: separate sibling package. It owns provider discovery/execution contracts, not CFD physics or canonical semantics.

## Data flow

`Canonical SIR refs + configuration revision → CFD request → adapter job envelope → selected provider adapter → external solver → normalized result + raw artifacts + logs → independent verification gate → canonical evidence workflow`

The external solver process and its files remain outside the browser runtime. A browser UI may initiate a Colab notebook or a governed remote execution. Notebook import is an explicit user-authorized step.

## Result envelope requirements for future executable adapters

Every backend adapter must provide:

- exact backend ID, distribution, version, build flags, source revision and licence;
- execution environment, CPU/GPU model, driver/runtime versions, MPI and library versions;
- canonical subject IDs, configuration revision, mesh ID/hash, solver input hash;
- physics models, boundary conditions, units, reference frames and material properties;
- process exit code, stdout/stderr, elapsed time, resource consumption and failure state;
- convergence history with documented residual definitions, norms and normalization;
- mesh statistics and quality checks;
- result field names, units, locations, coordinate frames and checksums;
- benchmark case identity, reference source, comparison metrics and tolerances;
- explicit validation/trust state.

Missing critical metadata yields HOLD or `UNVERIFIED`, not a guessed default.

## Browser and compute boundary

The browser is the primary product interface. A notebook is an optional remote compute artifact. The notebook may use a Colab-hosted Linux runtime. Native solvers are not installed in the browser. WebGPU/WebAssembly may be used for compatible kernels, but are not assumed to execute OpenFOAM, SU2 or Code_Saturne natively.

## Failure semantics

- Missing graph/config binding: HOLD before dispatch.
- Backend not installed or probe fails: UNAVAILABLE/HOLD.
- Physics/dimension mismatch: HOLD.
- Runtime unavailable or quota exhausted: HOLD with retryable infrastructure reason.
- Solver nonzero exit: FAILED, no evidence promotion.
- Solver exit zero but no convergence/benchmark proof: EXECUTED_UNVERIFIED.
- Independent numerical benchmark pass: eligible for VERIFIED review, not automatic physical validation.
- Physical validation requires applicable experiment and uncertainty evidence.
