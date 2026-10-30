# Manufacturing Colab Guide

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Notebook

`notebooks/manufacturing_backend_lab.ipynb`

## Open in Google Colab

1. Open [Google Colab](https://colab.research.google.com/#create=true).
2. Choose **File → Upload notebook**.
3. Upload `manufacturing_backend_lab.ipynb`.
4. Upload the Manufacturing package ZIP when prompted.
5. Run the cells from top to bottom.

After the platform repository is published and its coordinates are confirmed, the direct GitHub link format is:

`https://colab.research.google.com/github/OWNER/REPOSITORY/blob/BRANCH/drop-in/manufacturing/notebooks/manufacturing_backend_lab.ipynb`

The supplied ZIP has no Git remote metadata. Replace the placeholders with the real repository owner, name and branch; do not publish the placeholder URL as a working link.

## Runtime requirements

The notebook installs NumPy, SciPy, SimPy and OR-Tools into the ephemeral Colab runtime. SciPy provides the HiGHS-backed MILP path. A GPU runtime is not required for the Manufacturing workers.

## GPU distinction

OR-Tools CP-SAT, SciPy/HiGHS and SimPy in this package are CPU algorithms. Selecting a Colab GPU does not accelerate them. The separate `compute-orchestration` package contains a real PyTorch CUDA Monte Carlo example with an analytical cross-check. It is a separate capability and must not be merged into Manufacturing.
