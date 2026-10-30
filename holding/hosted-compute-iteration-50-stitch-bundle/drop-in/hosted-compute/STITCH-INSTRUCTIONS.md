# Stitch Instructions - Hosted Compute (Iteration 50)

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.**  
**SPDX-License-Identifier: GPL-3.0-only**

## Preconditions

- Target the Iteration 49 integrated baseline or a later compatible repository.
- Confirm `drop-in/hil/` still contains the Iteration 48 transaction core and Iteration 49 backend adapters.
- Do not copy this package over `drop-in/hil/`.
- Keep the platform browser-only. The Colab notebook is opened from the browser; no local solver installation is a prerequisite.

## Files

Copy these new paths without renaming:

- `drop-in/hosted-compute/` (entire directory)
- `notebooks/PAP_Hosted_Compute_Backends.ipynb`
- `notebooks/README.md`
- `notebooks/test_notebook.py`
- `tools/conformance-test-hosted-compute-iter50.mjs`
- `BUILD-ANALYSIS-ITERATIONS-47-50.md`
- `TEST-COVERAGE-MATRIX-ITERATION-50.md`
- `HANDOFF-ITERATION-50.md`

The companion `hosted-compute-iteration-50-stitch-bundle.zip` also carries repository-relative unified patches for the registry, README, changelog, traceability and current-handoff pointer under `integration/`. Apply only after confirming the target matches the Iteration 49 baseline.

Apply the additive documentation changes from the full Iteration 50 tree:
- Iteration 50 entry in `CHANGELOG.md`.
- Hosted Compute row in `docs/iterations/MRD-TRACEABILITY.md`.

## Registry integration

In `site/components/core/module-registry.js`, add the import:

```js
import {
  COMPUTE_BACKEND_CATALOG as m_compute_catalog,
  listComputeBackends as m_compute_list,
  createComputePlan as m_compute_plan,
  validateComputeResult as m_compute_validate,
  validateComputeResultAsync as m_compute_validate_async,
  verifyComputeResultDigest as m_compute_verify_digest,
  toCanonicalEvidenceDraft as m_compute_evidence
} from "../../../drop-in/hosted-compute/module.js";
```

Add this property to the existing `REACHABLE` object:

```js
"drop-in/hosted-compute/module.js": {
  catalog: m_compute_catalog,
  listComputeBackends: m_compute_list,
  createComputePlan: m_compute_plan,
  validateComputeResult: m_compute_validate,
  validateComputeResultAsync: m_compute_validate_async,
  verifyComputeResultDigest: m_compute_verify_digest,
  toCanonicalEvidenceDraft: m_compute_evidence
},
```

Do not replace the registry or duplicate the canonical kernel. Preserve the existing Iteration 49 HIL registry entries.

## Browser-to-Colab integration

1. Commit `notebooks/PAP_Hosted_Compute_Backends.ipynb` to the platform repository.
2. Once the repository owner/name and deployment branch are confirmed, create the direct Colab deep link:
   `https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/notebooks/PAP_Hosted_Compute_Backends.ipynb`
3. Do not invent `<OWNER>`, `<REPOSITORY>` or `<BRANCH>`. The Iteration 47 handoff does not specify the GitHub slug.
4. Expose the link from the browser UI as an external execution adapter. Keep a secondary upload route: `https://colab.research.google.com/` then **File → Upload notebook**.
5. Pass canonical project ID, configuration ID, run ID, requirement IDs, input hash, solver ID, selected backend, selected accelerator, tolerance and resource limits into the notebook. The notebook configuration must exactly match the plan; it does not silently substitute SciPy when a requested PyTorch/JAX device is unavailable. For GPU jobs, set a device-memory budget only when the selected runtime can report a trusted peak-device-memory measurement. Replace demo identifiers with canonical graph-bound values.
6. Notebook returns `PAP_Hosted_Compute_Results.zip` containing `compute-result.json`, `compute-input.json` and `compute-output-summary.json`.
7. Import the JSON through `validateComputeResultAsync(result, plan)`. Do not accept a notebook-authored `digestVerified` flag. Recompute the detached SHA-256 in the browser.
8. Only if the validator returns `ACCEPTED`, map `evidenceDraft` into the existing canonical Artifact/Evidence binding. Keep `method=SIMULATION`, `fidelity=UNVERIFIED`, and all physical/HIL/L5 claims false.

## Execution policy

- Colab is a replaceable execution provider, not a canonical data store.
- GPU/TPU selection is optional and runtime availability must be probed.
- Never assume a GPU exists because the user selected a GPU runtime.
- Never let notebook code mutate canonical project records directly.
- Never treat a successful notebook exit as solver validation without numerical checks.
- Native solvers requiring MPI/system libraries should use a separate managed hosted runner adapter, not a local desktop dependency.

## Verification

```bash
node drop-in/hosted-compute/test.mjs
node drop-in/hosted-compute/integration.mjs
node tools/conformance-test-hosted-compute-iter50.mjs
python notebooks/test_notebook.py
node tests/run.mjs
node tests/acceptance.mjs
```

The final two commands are platform regression and acceptance checks. Do not edit acceptance criteria to accommodate this package. Record unavailable Playwright, mutation, GPU or live external-runner tests as unverified.
