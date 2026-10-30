<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD notebooks

## Notebook inventory

| Notebook | ID | Purpose | Colab status |
|---|---|---|---|
| `CFD_Backend_Colab.ipynb` | `pap-cfd-backend-colab` | Analytical benchmark, runtime/GPU discovery, GPU parameter sweep, external solver discovery, provenance manifest | Ready to publish; immutable repository URL not yet available |

## Open in Google Colab publication procedure for Grok

1. Copy this package's `notebooks/` directory into the canonical repository location `drop-in/cfd/notebooks/` without changing notebook identity or copyright metadata.
2. Run `node drop-in/cfd/tests/notebook-structure.test.mjs` and validate the notebook with `python -m json.tool` (or an equivalent notebook validator).
3. Commit the notebook. Resolve the full 40-character commit SHA.
4. Create the immutable launch URL:

   `https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<COMMIT_SHA>/drop-in/cfd/notebooks/CFD_Backend_Colab.ipynb`

5. Replace the placeholder URL in the platform notebook catalogue/UI with that exact URL. Do not link to a mutable branch for a released curriculum baseline.
6. Verify the link opens the committed notebook in Colab, run the CPU path, and if a GPU runtime is available run the CuPy path. Record actual accelerator name and execution outcome.
7. Export the run manifest and artifacts. Ensure the platform importer maps them to canonical subject/configuration refs and leaves trust `UNVERIFIED` until independent verification.
8. Preserve the notebook's author/copyright/trademark/license metadata and all third-party notices. Never paste third-party solver source into the notebook without reviewing its licence and retaining notices.

The notebook includes opt-in OpenFOAM v2606 installation and pitzDaily/simpleFoam smoke-run cells. Both are disabled by default; when activated, the installer uses the official Debian/Ubuntu repository helper and refuses to substitute a different distribution or version. The smoke run copies the official tutorial, bounds it to 200 iterations and labels the output EXECUTED_UNVERIFIED. SU2 and Code_Saturne require separate pinned builds and are not auto-installed by this notebook.

The notebook is stored in Git and opened in Colab; Colab is not the source of truth. Do not assume a notebook can be linked before its repository path and commit exist.
