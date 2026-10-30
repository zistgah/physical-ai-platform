Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# Browser-only deployment and Google Colab workbench

## Static platform remains the baseline

The Physical-AI platform is GitHub Pages/static-first. The logistics JavaScript module:
- uses plain JavaScript and JSON-compatible inputs/outputs;
- has no server, database, filesystem, network, Node-only or mandatory package dependency;
- can be called from browser modules and static UI;
- exports JSON projections for local download/import and future adapters.

The Python optimizer is optional. It must not become a required dependency for the browser site.

## Notebook artifact

`additional-modules/supply-optimization/notebooks/supply_chain_optimization.ipynb`

The notebook demonstrates:
1. SciPy HiGHS constrained sourcing (CPU).
2. NetworkX multi-tier resilience graph analysis.
3. deterministic event replay.
4. NumPy Monte Carlo baseline.
5. PyTorch CUDA Monte Carlo acceleration when an available GPU is actually detected.
6. inventory safety-stock approximation.
7. result export as JSON.

The LP solver is CPU-based. GPU is useful for the tensor/Monte Carlo path, not inherently for a small LP. A Colab GPU is optional, may be unavailable, and may be subject to quotas. The notebook reports the device it actually uses. It does not claim GPU acceleration when running on CPU.

## Open in Colab

After the repository owner, repository name and branch are confirmed, Grok should publish this link in the relevant README and platform workbench:

```text
https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/additional-modules/supply-optimization/notebooks/supply_chain_optimization.ipynb
```

Do not invent owner/repository/branch values. The repo identity was not included in the supplied Iteration 47 archive. Until it is known, users can open [Google Colab](https://colab.research.google.com/) and upload the notebook file.

## Notebook setup

- Select Runtime → Change runtime type → T4 GPU only when needed and available.
- Run all cells in order.
- Upload `optimizer.py` when prompted.
- Use synthetic or explicitly approved non-sensitive data.
- Download the resulting JSON artifact.
- Do not place API keys, supplier credentials, controlled technical data, restricted-party lists or private customer records in a public notebook.

## Grok notebook integration steps

1. Copy `additional-modules/supply-optimization/` into repository `additional-modules/supply-optimization/`.
2. Preserve `optimizer.py`, `test_optimizer.py`, samples and notebook paths.
3. Add `notebooks/supply_chain_optimization.ipynb` to the project notebook index or workbench catalog.
4. Add the Colab URL after confirming the repository URL and branch.
5. Add a browser UI action that opens the notebook externally; do not embed notebook execution into the static site.
6. Keep notebook outputs as proposal artifacts with solver version, input snapshot, seed, weights and timestamp.
7. Require human authorization before importing optimized allocations into canonical procurement or execution workflows.
8. Run Python tests and existing regression tests after overlay.

## Reproducibility

Record Python version, SciPy version, HiGHS solver version, NetworkX version, PyTorch version, CUDA version/device, random seed and optimization weights. Do not compare solver results without recording these settings.
