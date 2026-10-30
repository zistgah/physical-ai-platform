# Browser-only and Google Colab execution guide

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## User workflow

1. Open [Google Colab](https://colab.research.google.com/).
2. Choose **File → Upload notebook** and select `notebooks/simulation-gpu-qualification.ipynb` from this package ZIP after extracting it in the browser's file manager, or upload the `.ipynb` directly.
3. Choose **Runtime → Change runtime type → GPU**.
4. Run the notebook from top to bottom. Device detection records the actual selected device; it does not assume that selecting GPU guarantees a GPU.
5. Download `simulation-gpu-qualification-evidence.json` from the Colab Files panel.

No local compiler, IDE, Docker daemon, or local GPU is required for the notebook path. The platform UI remains browser-native. Colab supplies a remote Python runtime.

## Direct Colab link policy

A direct repository-backed Colab URL is valid only after this exact notebook is committed to the target repository. Grok must then replace the template in the notebook and docs with:

`https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/main/drop-in/simulation/notebooks/simulation-gpu-qualification.ipynb`

Until that commit exists, use the Colab home page and the upload instructions above. Do not invent an owner/repository path or claim the notebook is hosted.

## Runtime options

- NVIDIA Warp: `warp-lang==1.18.0`, CUDA where available, CPU fallback otherwise. The current stable wheel requires an R580-series or newer NVIDIA driver and Turing-class or newer GPU for CUDA.
- MuJoCo MJX: `mujoco==3.17.0`, `mujoco-mjx==3.17.0`, JAX/XLA device execution.

These are pinned candidate versions selected from the current upstream release/documentation state. The notebook has not been run in Colab in this build environment; Grok must run it and archive the actual runtime result before marking either engine qualified.
- Project Chrono GPU modules: CUDA/HIP build route, not currently installed or exercised in this notebook.

The notebook reports `PASS` only for its actual code checks. Missing dependencies or device incompatibility are `SKIP` with a reason. GPU kernel execution is not physical validation.

## Why Colab is not the production engine service

Colab sessions are ephemeral, quota-controlled and user-controlled. They are not a trusted long-lived server. Production execution should use a managed isolated worker or job service, with authenticated requests, origin allowlisting, quotas, deadlines, cancellation, resource limits, request correlation, normalized results and complete provenance. Never expose an unauthenticated native engine process or notebook runtime to the public internet.
