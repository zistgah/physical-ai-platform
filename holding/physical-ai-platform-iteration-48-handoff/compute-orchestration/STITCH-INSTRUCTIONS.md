# Stitch Instructions for Grok - Distributed Compute Orchestration

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Scope

Add this package as a new sibling drop-in:

`drop-in/compute-orchestration/`

Do not place it inside `drop-in/manufacturing/`. Do not duplicate or modify the canonical kernel, SIR, ontology, evidence engine, module registry semantics, or acceptance runner.

## 1. Inspect and copy

1. Confirm the target platform is the supplied Iteration 47 baseline or a later verified descendant.
2. Copy the complete `compute-orchestration/` folder into `drop-in/`.
3. Preserve `manifest.json`, schemas, notebook, tests, copyright and license.
4. Do not rename package IDs or protocol strings without a versioned migration.

## 2. Register as an optional drop-in

Use the existing platform drop-in registry convention. If the registry is not yet capable of registering this class of drop-in, add a narrow adapter/registration entry; do not build a second registry or kernel.

Register:
- Package ID: `ayeai.physical-ai.compute-orchestration`
- Version: `1.0.0`
- Protocol: `ayeai.compute.job/v1`
- Capability set from `manifest.json`

Default state must be disabled or unconfigured until the host supplies provider configuration. Provider availability remains UNKNOWN until health is positively established.

## 3. Bind to canonical references

The host adapter must resolve:
- `provenance.sourceRef` to an existing canonical source/system/mission entity.
- `provenance.configurationRef` to an immutable configuration identity.
- Job ID to a stable artifact identity.

Do not copy an external provider's ontology into the platform. Keep provider-specific metadata in adapter/provenance fields.

## 4. Browser-only route

- Import `module.js` from browser-native ES modules.
- Use `createBrowserWorkerTransport` for same-origin Worker execution.
- Serve `browser-worker.js` as a static module Worker asset.
- Use `createColabLaunchDescriptor` for notebook links.
- The notebook can be opened by upload now. After the notebook is committed to the actual repository, replace the documented `OWNER/REPOSITORY/BRANCH` placeholders with verified coordinates.
- Do not import `node-worker-transport.js` from browser bundles.

## 5. Colab workflow

The user opens the notebook, selects a CPU or GPU runtime, uploads `samples/reliability-series-job.json`, runs cells and downloads `compute-result.json`. The platform imports the result only after:
1. Job ID correlation.
2. Input digest verification.
3. Output digest verification.
4. Provider ID/version capture.
5. Configuration identity check.
6. Domain-specific result validation.
7. Evidence state remains SIMULATED.

Colab session availability is not a platform guarantee. No unattended Colab execution is implied.

## 6. Test sequence

```sh
node --experimental-default-type=module drop-in/compute-orchestration/test.mjs
node --check drop-in/compute-orchestration/module.js
node --check drop-in/compute-orchestration/browser-worker.js
python3 drop-in/compute-orchestration/test_notebooks.py
```

Then run:
```sh
node tools/conformance-test-iter47.mjs
node tools/regression-checklist.mjs
```

Do not modify the acceptance runner to obtain a pass. Run the dedicated acceptance suite separately and report any timeout as NOT RUN / INCOMPLETE, not PASS.

## 7. Integration states

Report separately:
- Package tests passed.
- Package is compatible with the drop-in boundary.
- Package is registered in the spine.
- Browser route is reachable.
- Colab link is published and opens the correct notebook.
- Imported results are bound to canonical graph entities.
- End-to-end integration and regression tests passed.

Copying a folder alone establishes only package availability, not platform integration.

## 8. Security and governance

- Do not store secrets in notebooks, job payloads, GitHub, or manifests.
- Inject remote worker credentials through host-managed configuration.
- Use HTTPS, bounded payloads, timeouts and response correlation.
- SHA-256 digests are integrity checks, not signatures.
- Do not promote simulation to physical evidence.
- Do not let a compute provider grant authority or issue actuation commands.
