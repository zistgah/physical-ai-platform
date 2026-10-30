Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Colab notebooks - execution and handoff

## 1. Notebook inventory

| Notebook | Backend | Workload | GPU/TPU |
|---|---|---|---|
| `01_scipy_solver_validation.ipynb` | SciPy `solve_ivp` | Linear state-space ODE, six solver methods, analytical reference | Not used by supplied example |
| `02_fmi_fmpy_colab.ipynb` | FMPy | FMI 1/2/3 model description and trusted FMU simulation | FMU-dependent; not claimed |
| `03_pybamm_battery_colab.ipynb` | PyBaMM | SPM/SPMe/DFN battery simulation and parameter set | Default CasADi example is CPU; JAX is only probed |
| `04_mujoco_mjx_gpu_colab.ipynb` | MuJoCo MJX-JAX | Batched pendulum dynamics | Supported GPU/TPU via JAX/XLA |
| `05_ngspice_circuit_colab.ipynb` | ngspice | RC transient with analytical validation | CPU example |
| `06_jax_gpu_ensemble_colab.ipynb` | JAX/XLA | Vectorized ODE parameter ensemble with analytical validation | GPU/TPU if detected |

Every notebook is standalone and embeds the common PAP job/result protocol. Each includes the full copyright/trademark notice and GPL-3.0 identifier in notebook metadata, opening Markdown and source cells.

## 2. Colab launch links

The supplied Iteration 47 archive does not identify a canonical public GitHub owner/repository/branch URL. Therefore this package does not invent working Colab links. After the repository is published, Grok must fill the actual `OWNER`, `REPOSITORY` and `BRANCH` values and create links in this form:

```text
https://colab.research.google.com/github/OWNER/REPOSITORY/blob/BRANCH/notebooks/emulation/01_scipy_solver_validation.ipynb
```

Repeat for each notebook. The Colab Bridge exposes `buildColabUrl({owner, repository, branch, notebookPath})` to generate and validate these links. The `COLAB-INDEX.md` under `notebooks/emulation/` contains all six link templates.

Alternative when the repository is not yet public: download the `.ipynb` file from the repository/archive, open https://colab.research.google.com/, choose File > Upload notebook, and upload the file. Do not claim the GitHub URL works until the public repository path has been confirmed.

## 3. Run workflow

1. In the PAP browser UI, select a SIR model and backend operation.
2. Export the job JSON using `integrations/colab-bridge/module.js`.
3. Open the matching Colab notebook.
4. Keep `PAP_USE_DEMO_JOB=True` to run its self-contained reference fixture, or set it to `False` and upload the browser-exported PAP job JSON.
5. Select Runtime > Change runtime type if GPU/TPU is required and supported by that notebook.
6. Run all cells in order. Review model assumptions, solver warnings and actual device detection.
7. Download the result JSON. In demo mode, also download the matching job JSON.
8. Import both through the browser Colab Bridge and validate the result against the exact original job.
9. The platform maps backend outputs to SIR ports and creates its own evidence record. Do not change `SIMULATED`, `UNVERIFIED`, `physicalVerification:false` or the non-promotion claims.

## 4. Job input mapping

The browser job has `schema: pap.emulation.job/1.0`, `jobId`, `digest`, `canonicalPayload`, `target`, `sir`, `inputs`, `observations`, `configuration` and `provenance`.

Notebook-specific `inputs` are documented in the first execution section of each notebook. For SciPy, use `A`, `B`, `u`, `x0`, `C`, optional `D`, `times`, `method`, `rtol`, `atol`. FMPy accepts `startTime`, `stopTime`, `outputInterval`, `outputVariables` and a separately uploaded trusted FMU. PyBaMM accepts `modelName`, `parameterSet`, `stopTimeSeconds`, `sampleCount`. MJX accepts `environmentCount`, `steps`, `dt`, `angleMin`, `angleMax`. ngspice accepts `resistanceOhm`, `capacitanceFarad`, `stopTimeSeconds`, `sampleStepSeconds`. JAX accepts `ensembleSize`, `steps`, `dt`, `kMin`, `kMax`.

A notebook must reject an unsupported backend ID or invalid/missing parameters. It must not silently substitute another solver or model.

## 5. Result envelope

A compatible notebook returns `schema: pap.emulation.result/1.0` with:

- Exact `jobId` and `jobDigest`.
- Backend ID and version.
- `execution.status=EXECUTED` and `execution.runtime=COLAB`.
- Ordered outputs with finite values and time/sequence.
- Solver/model diagnostics.
- `fidelity=SIMULATED`.
- `physicalVerification=false`.
- `evidenceState=UNVERIFIED`.
- `claims.verified=false`, `claims.hil=false`, `claims.physical=false`.
- `canonicalPayload` and SHA-256 `resultDigest`.

FMPy, PyBaMM and ngspice raw variable outputs still require explicit SIR port/unit/frame mapping. A valid digest is not proof of correct engineering semantics.

## 6. GPU and Colab resource rules

Colab GPU/TPU assignment is dynamic; availability, model and quotas vary. A GPU runtime does not guarantee GPU use. JAX notebooks record `jax.devices()` and `jax.default_backend()`. Never replace a preinstalled accelerator-enabled JAX with a CPU-only wheel. If an installation step is required, use the current official JAX compatibility guidance for the runtime's driver/CUDA version.

SciPy `solve_ivp`, standard FMPy, ngspice and the supplied PyBaMM CasADi path are not GPU accelerated in these examples. MJX-JAX and JAX ensemble are the explicit accelerator demonstrations. PyBaMM's optional JAX solver path is a separate future validation target, not silently implied by JAX being installed.

## 7. Grok's repository steps

- Copy `notebooks/emulation/*.ipynb` into the same path in the public repository.
- Keep notebook files in version control; do not convert them into source `.py` files only.
- Confirm repository owner, repository name and default branch.
- Replace link placeholders in `COLAB-INDEX.md` and add links in the emulation workbench UI.
- Use stable tagged/released notebook paths rather than a moving branch for reproducible project records.
- Add the notebook commit hash and notebook file SHA-256 to each simulation run's provenance.
- Preserve the browser-only architecture; do not add Python, Node or native solver dependencies to the static application bundle.

## 8. Notebook validation

Run:

```bash
python notebooks/emulation/validate_notebooks.py
```

This checks notebook schema, metadata, required notices, helper protocol, code-cell syntax and expected backend identifiers. It executes the SciPy notebook locally where `nbclient`, `ipykernel`, NumPy and SciPy are available. It does not claim that the other optional engines have been executed unless the test report lists a completed runtime run.
