# Physical AI Platform notebooks

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.**  
**AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.**  
**SPDX-License-Identifier: GPL-3.0-only**

## Hosted Compute and Accelerator Workbench

Notebook: [`PAP_Hosted_Compute_Backends.ipynb`](PAP_Hosted_Compute_Backends.ipynb)

### Open in Google Colab

- Colab home: <https://colab.research.google.com/>
- In Colab select **File → Upload notebook** and choose the `.ipynb` file.
- Or, after the platform repository's actual owner/name/branch is known and the notebook is committed, use:
  `https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/notebooks/PAP_Hosted_Compute_Backends.ipynb`

The supplied Iteration 47 handoff did not identify a GitHub repository slug. Do not substitute a guessed slug. Grok should set the real repository values during stitch-in.

### Browser-only operating model

The platform browser is the control plane. Colab is a replaceable hosted compute plane. The notebook detects the actual Python packages, runtime, accelerator and device. It includes executable SciPy, PyTorch, JAX and Numba numerical paths, optional CuPy/PyAMG solvers, and Taichi/Warp, ODE, mesh and rigid-body probes. Set `REQUESTED_BACKEND_ID` and `REQUESTED_ACCELERATOR` in its first configuration cell to match the canonical platform plan. It never silently substitutes another backend or falls back from a requested GPU to CPU. It does not require local Python, CUDA, Docker, an office suite or a locally installed solver. The hosted VM is ephemeral; download the output bundle or persist it through a user-authorized cloud storage connector.

### Notebook copyright and third-party licensing

The notebook repeats the platform copyright and trademark notice and identifies GPL-3.0-only as the licence for original platform code. NumPy/SciPy, PyTorch, JAX, CuPy and other optional libraries retain their own licences. No upstream code is vendored in this notebook. Re-check exact upstream versions and licences before redistributing packages or binaries.

### Test

```bash
python notebooks/test_notebook.py
```

This runs the notebook end-to-end when `nbclient` is installed. It validates the manufactured-solution numerical case, grid-refinement behavior, optional tensor backend parity, result-envelope construction, artifact bundle and detached digest. No GPU is assumed in the local test environment.
