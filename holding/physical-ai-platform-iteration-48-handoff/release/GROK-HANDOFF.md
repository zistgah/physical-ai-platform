# Grok Integration Brief - Iteration 48

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Do not merge the packages

The ZIP contains:
1. `manufacturing/` - update to an existing Iteration 47 drop-in.
2. `compute-orchestration/` - a new independent sibling drop-in not listed in the original ten-module handoff.
3. `release/` - integration and verification documents.

## Preserve the spine

- Do not change the canonical kernel, SIR, ontology or acceptance script.
- Do not create a second registry or graph.
- Keep external providers replaceable and optional.
- Map all references to canonical source and configuration identities.
- Preserve UNKNOWN -> HOLD.
- Never promote SIMULATED to PHYSICAL_VERIFIED.
- No provider is authorized to actuate equipment.

## Integration order

1. Diff the Manufacturing folder and replace only `drop-in/manufacturing/`.
2. Add `drop-in/compute-orchestration/` as a sibling.
3. Register both manifests using the existing drop-in convention.
4. Add UI entry points to existing workbench/navigation patterns only after registration.
5. Publish the notebooks to the actual Git repository and update the Colab links using the real repository coordinates.
6. Verify the browser Worker asset path and HTTPS remote-worker configuration.
7. Add graph adapters for canonical source/configuration references.
8. Execute package tests and all platform regression suites.

## Commands

```sh
node --experimental-default-type=module drop-in/manufacturing/test.mjs
python3 drop-in/manufacturing/workers/test_workers.py
node --experimental-default-type=module drop-in/compute-orchestration/test.mjs
node --check drop-in/compute-orchestration/module.js
node --check drop-in/compute-orchestration/browser-worker.js
python3 release/test_notebooks.py
node tools/conformance-test-iter47.mjs
node tools/regression-checklist.mjs
```

Run the dedicated acceptance suite separately. If it times out, report NOT COMPLETED. Do not edit the acceptance script to hide a timeout.

## Notebook handoff

- Manufacturing: `drop-in/manufacturing/notebooks/manufacturing_backend_lab.ipynb`
- Distributed compute: `drop-in/compute-orchestration/notebooks/reliability_monte_carlo_colab.ipynb`

The direct Colab links are templates until the actual repository owner/name/branch are confirmed. For immediate use, upload the notebook through [Google Colab](https://colab.research.google.com/#create=true).

## Report these integration states separately

- Package tests pass.
- Package is registered.
- Browser route is reachable.
- Colab link opens the correct published notebook.
- Result imports bind to canonical entities.
- End-to-end workflow and regression pass.

Do not call the packages integrated until all relevant states are proven.
