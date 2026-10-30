<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Grok stitch instructions - CFD package 1.3.0

## 1. Files and scope

Copy `cfd/` into the existing repository's `drop-in/cfd/`. Do not replace the repository, canonical kernel, system graph, SIR, module registry, acceptance script or unrelated drop-ins. Apply the included Iteration 47 conformance patch only if it has not already been applied; inspect current target first to avoid double application.

The ZIP also contains `extensions/scientific-backend-orchestration/` as a **separate sibling package**, not a submodule of CFD. Copy it to `extensions/scientific-backend-orchestration/`. It is an additive package not listed in the original Iteration 47 ten-package handoff. Register it only after reviewing its manifest and tests.

## 2. Preserve the spine

- The canonical kernel and SIR remain the sole source of project/entity identity.
- Use existing canonical subject IDs and configuration revision IDs in job envelopes.
- Do not create a parallel project store, graph, ontology or evidence registry.
- Do not promote an external solver result automatically.
- Keep the native CFD 1D reference solver's model boundary unchanged.

## 3. Integration order

1. Copy both package directories into the stated `drop-in/` locations.
2. Verify `manifest.json` for each package and review `CHANGE-MANIFEST.json`.
3. Run package tests:

   ```bash
   node drop-in/cfd/test.mjs
   node drop-in/cfd/tests/backend-job.test.mjs
   node drop-in/cfd/tests/notebook-structure.test.mjs
   node drop-in/cfd/tests/catalogue.test.mjs
   node drop-in/cfd/tests/package-integrity.test.mjs
   node extensions/scientific-backend-orchestration/tests/test.mjs
   ```

4. Apply `drop-in/cfd/integration/iteration-47-conformance.patch` only if the baseline still has the old placeholder-specific CFD BIBO assertion.
5. Run repository checks:

   ```bash
   node tools/conformance-test-iter47.mjs
   node tests/run.mjs
   node tests/acceptance.mjs
   ```

6. Integrate the generic registry behind the existing workflow boundary. The registry must be instantiated by the host; it must not become a global project store.
7. Connect the CFD workbench to backend discovery only after an adapter has a pinned backend manifest and probe implementation.
8. Add UI states for CATALOGUED, INSTALLED, DISCOVERED, EXECUTION_TESTED, BENCHMARK_VERIFIED and PLATFORM_INTEGRATED. Do not collapse these states into a single “available” badge.
9. Add the notebook entry to the existing curriculum/workbench navigation. Use the immutable Colab URL only after committing the notebook and obtaining the real commit SHA. Follow `notebooks/README.md`.
10. Import Colab artifacts via explicit user-mediated artifact import; map to canonical refs and leave trust `UNVERIFIED` pending independent checks.

## 4. Backend activation sequence

Do not wire OpenFOAM/SU2/Code_Saturne to “execute” merely because they appear in `backend-catalogue/manifest.json`. For each backend separately:

- choose distribution and exact version;
- verify licence and transitive dependency obligations;
- build/install in a controlled Colab or remote runtime;
- create version-pinned case writer and parser;
- implement safe argument-array invocation and time/resource limits;
- run analytical and community benchmark cases;
- validate mesh, conservation, residual histories and field units;
- record output hashes and provenance;
- only then mark the adapter EXECUTION_TESTED or BENCHMARK_VERIFIED.

GPU selection is a separate capability probe. Record accelerator model, driver, CUDA runtime, solver build flags and the specific GPU-enabled solver path. GPU array support for parameter sweeps is not proof of GPU CFD solver execution.

## 5. No-regression gates

- Keep `CFD_CONTRACT` v1.2.0 core behavior and all existing HOLD cases unless an explicitly versioned change is justified.
- Keep the existing four sample files and their copyright metadata.
- Do not weaken the conformance test or acceptance script.
- Re-run full acceptance after integration; report browser and mutation skips explicitly.
- Do not claim the two packages are application-integrated until registered, reachable through a user workflow and covered by platform regression tests.

## 6. Integration status on delivery

- CFD bounded solver: package-level complete for its declared 1D contract.
- External backend catalogue: catalogued only.
- CFD-to-backend job mapper: package-level tested.
- Generic orchestration package: package-level tested; no platform registration.
- Colab notebook: source complete and structurally tested; actual Colab CPU/GPU run requires external runtime.
- External CFD solver execution: not yet tested.
- Full platform integration: not claimed.
