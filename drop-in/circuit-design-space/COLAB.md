<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Colab entry point and browser-only operation

Open [Google Colab](https://colab.research.google.com/) in the browser and upload `notebooks/circuit-design-space-lab.ipynb` from this package. After Grok commits the notebook into the canonical GitHub repository, the direct link must be updated to:

```text
https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/drop-in/circuit-design-space/notebooks/circuit-design-space-lab.ipynb
```

The supplied Iteration 47 archive does not include a Git remote/owner/repository/branch. The placeholder must be replaced by Grok using the actual repository metadata; do not invent a repository URL.

The module runs in Colab's optional cloud runtime, not in the static browser bundle and not on the user's local machine. JAX reports the actual runtime device. A GPU is not assumed or guaranteed. No GPU claim is made unless `jax.devices()` exposes a GPU and the module returns `engine: jax:gpu`.

The notebook and package carry the same project copyright and GPL-3.0-only notice. NumPy, SciPy, JAX and any uploaded third-party content retain their own licenses. Data uploaded to Colab is processed by Google-hosted infrastructure; apply the project's privacy, confidentiality, IP, export-control and jurisdiction rules before upload.
