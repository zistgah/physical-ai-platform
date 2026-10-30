Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Browser-only and Colab execution architecture

## 1. Deployment constraint

The supplied platform README and MRD specify GitHub Pages, native ES modules, browser APIs, JSON, schemas and Markdown. No mandatory backend, database, proprietary cloud or server is permitted for the public static deployment. The emulation runtime must therefore not depend on Node.js, Python, subprocess execution, local native binaries or a server.

## 2. Responsibility split

| Layer | Runtime | Responsibility | Not responsible for |
|---|---|---|---|
| Platform browser | Browser ES2022 | SIR selection, contract validation, job creation, result intake, visualization, evidence linking | Python/native solver execution |
| Emulation core | Browser ES module | Deterministic model callback, time/event/fault semantics, output comparison, HOLD/MISMATCH/OK | General multiphysics solvers, physical I/O |
| Colab Bridge | Browser ES module | Job/result envelope, SHA-256 binding, structural validation, Colab URL generation | Remote execution, credentials, authority promotion |
| Google Colab notebook | User-selected hosted Python runtime | Install/execute optional numerical/physics packages; optional GPU/TPU | Canonical SIR ownership or evidence promotion |
| Upstream engine | Python/C/C++/CUDA/etc. | Domain-specific numerical algorithm | PAP ontology, SIR authority, lifecycle |

## 3. Data flow

1. User selects canonical system/component and a backend operation in the browser.
2. Platform maps typed SIR ports, units, frames, model artifact references and parameters into a job bundle.
3. Colab Bridge validates the job object and computes a SHA-256 digest over the canonical payload.
4. User downloads the job JSON.
5. User opens the relevant `.ipynb` in Colab and uploads the job JSON. For a public repository, a pinned raw GitHub fetch may be used instead, but the notebook must still verify the digest.
6. Notebook validates the job schema/digest/backend target before execution.
7. Notebook executes the selected solver, records package versions, model identity, solver settings, runtime device, diagnostics and outputs.
8. Notebook emits a result bundle bound to the original job digest, plus SHA-256 result digest.
9. User downloads the result JSON.
10. Browser imports the result; Colab Bridge validates job binding, backend identity/version, finite values, sample order/time and non-promotion flags.
11. Platform maps outputs back to SIR ports and creates its own evidence record. Colab result remains SIMULATED/UNVERIFIED until independent verification gates are satisfied.

## 4. Why not call Colab as an API?

The design does not assume a public unauthenticated Colab execution API. It does not embed user Google credentials, mount Drive automatically, call hidden endpoints or keep an always-on Colab runtime. A manual browser handoff is explicit and compatible with static hosting. A future authenticated execution service, if ever required, must be a separate replaceable connector and must not become a core dependency.

## 5. Job/result integrity

The job and result include a `canonicalPayload` string, SHA-256 digest and deterministic job ID. This allows Python to verify the exact payload bytes without relying on language-specific JSON number formatting. The browser also parses the canonical payload and verifies that it describes the same fields as the envelope. SHA-256 establishes integrity against accidental alteration; it does not authenticate the author or establish trust in a backend binary. A signature/trust system would require a separate key-management and assurance design.

## 6. GPU and accelerator policy

- GPU/TPU selection is a user action in Colab.
- The notebook reports the actual JAX backend/device; it must not claim GPU use from runtime selection alone.
- JAX CUDA wheels must not be blindly overwritten. The notebook preserves a preinstalled Colab accelerator build and reports detected devices.
- MJX-JAX can use supported JAX/XLA devices; MJX-Warp is an alternative NVIDIA-optimized implementation with different feature/autodiff properties.
- SciPy `solve_ivp`, FMPy and standard PyBaMM CasADi workflows are CPU-oriented in the supplied examples. GPU presence does not imply they used a GPU.
- PyBaMM's JAX-based solver path requires separate compatibility checks and explicit configuration; the supplied battery notebook does not claim its default CasADi run used GPU.
- GPU acceleration is only meaningful when the algorithm/library supports it and the workload is large enough to benefit.

## 7. Security

- Never execute arbitrary notebook source received from SIR or a backend result.
- FMUs can contain native code. Only trusted FMUs should be uploaded. Colab is not claimed to sandbox hostile native binaries.
- Do not put secrets or private data in notebook output cells.
- Do not automatically mount Google Drive.
- Do not use `eval`, `exec` or dynamic code loading from job fields.
- Enforce request/output size limits and finite-number checks.
- Keep job/result artifacts versioned and subject-bound in the platform evidence graph.

## 8. Browser-only compliance checks

The delivered core and Colab Bridge contain no Node imports, `process`, `Buffer`, `child_process`, filesystem calls or Python execution. Node is used only to run tests in development. The notebooks are optional user-launched execution assets, not downloaded into the static JS runtime.
