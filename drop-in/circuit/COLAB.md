<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Google Colab notebooks - circuit simulation and verification

## Notebooks

- `notebooks/circuit-backend-lab.ipynb` - native tests, ngspice installation, backend execution, real-engine sample checks, result/evidence export.
- `notebooks/circuit-design-space-lab.ipynb` - companion design-space package, parameter sweeps, RC identification, optional JAX GPU execution.

## Open in Google Colab

The source Iteration 47 ZIP does not identify a GitHub owner/repository/branch. Do not publish an invented Colab deep link. After Grok commits the notebooks into the canonical repository, replace `<OWNER>`, `<REPOSITORY>` and `<BRANCH>` below with the actual repository coordinates.

```text
https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/drop-in/circuit/notebooks/circuit-backend-lab.ipynb
https://colab.research.google.com/github/<OWNER>/<REPOSITORY>/blob/<BRANCH>/drop-in/circuit-design-space/notebooks/circuit-design-space-lab.ipynb
```

Until those values are known, users can open [Google Colab](https://colab.research.google.com/) and upload the `.ipynb` file from this package ZIP. This is the honest direct route; the repository deep link becomes available after integration.

## Browser-only operating rule

The public platform remains static-first and browser-only. No local simulator, Python distribution, office suite, desktop EDA package or local command-line tool is a prerequisite for browsing the platform. Colab is an optional user-initiated cloud execution environment. A notebook does not turn a static GitHub Pages page into a backend service.

## What Colab executes

- Native JavaScript tests in Node.js.
- Adapter contract tests using deterministic fake process runners.
- Real ngspice tests if the Colab VM installs ngspice successfully.
- Real Xyce tests only if a supported, approved Xyce binary is made available in the runtime.
- NumPy/SciPy design-space sweeps and parameter fitting.
- Optional JAX GPU vectorization when a GPU runtime is explicitly selected and JAX reports a GPU device.

**Important:** ngspice and Xyce runs are not made GPU accelerated by running them inside a GPU Colab VM. GPU use in the supplied companion module applies to vectorized analytical parameter sweeps and surrogate calculations. The notebook reports actual devices and never relabels CPU work as GPU work.

## Grok stitching instructions

1. Preserve `site/` static/browser-only behavior and do not import Node adapter code into browser bundles.
2. Commit notebook files at the paths shown above.
3. Replace the Colab link placeholders with the actual GitHub owner, repository and default branch.
4. Add “Open in Colab” links to the circuit workbench/help surface as external links with clear disclosure that data is uploaded to a Google-hosted runtime.
5. Add a separate link for the `circuit-design-space` notebook; do not fold that module into `drop-in/circuit/`.
6. Add an execution request/response adapter in the trusted platform execution boundary if platform-hosted runs are desired. The public static deployment must remain functional without it.
7. Bind notebook output manifests to canonical project ID, component IDs, configuration hash, solver/backend version, model-pack hashes, run timestamp and evidence state.
8. Do not allow a notebook result to promote fidelity automatically. Promotion remains a platform-owned evidence gate.
9. Add a policy step before upload for privacy, confidential IP, PDK/model license, export-control and jurisdiction restrictions.
10. Add CI checks for notebook JSON validity, cell execution on a CPU runner, copyright/license headers, and Colab link validity after repository coordinates are known.

## Copyright and licensing

Each notebook contains the same copyright attribution and GPL-3.0-only notice as the package. Third-party packages and simulator/model libraries retain their own licenses. Do not imply that a foundry PDK or third-party model library is relicensed under the platform GPL. Check each library's actual terms before upload, redistribution or Colab execution.
