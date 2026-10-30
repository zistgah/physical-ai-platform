# Colab Guide - Distributed Compute / GPU Reliability

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Notebook

`notebooks/reliability_monte_carlo_colab.ipynb`

## Open in Colab

- [Open a blank Google Colab notebook](https://colab.research.google.com/#create=true)
- In Colab, choose **File → Upload notebook** and upload the `.ipynb` file from this package.
- Upload `samples/reliability-series-job.json` when the notebook requests it.

After publishing the notebook into the actual platform GitHub repository, use:

`https://colab.research.google.com/github/OWNER/REPOSITORY/blob/BRANCH/drop-in/compute-orchestration/notebooks/reliability_monte_carlo_colab.ipynb`

The provided Iteration 47 ZIP does not contain repository remote metadata, so repository coordinates are left as explicit placeholders rather than guessed.

## GPU runtime

In Colab select **Runtime → Change runtime type → T4 GPU** (or another available accelerator). The notebook checks `torch.cuda.is_available()` and records the actual device. If no GPU is available, it runs NumPy CPU. GPU availability is controlled by Colab and is not guaranteed.

The notebook's GPU algorithm is PyTorch tensor Monte Carlo. It does not accelerate Manufacturing's OR-Tools, HiGHS or SimPy workers.
