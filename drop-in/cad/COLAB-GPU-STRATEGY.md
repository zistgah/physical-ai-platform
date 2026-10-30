# Browser-only CAD execution and GPU strategy

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
> GPL-3.0-only for this package; see third-party license obligations.

## 1. Product constraint

The Physical AI Platform remains browser-only. Do not make a local CAD application, local Python installation, local compiler or workstation GPU mandatory. Google Colab is an optional remote notebook runtime launched through the browser. It is a reproducible engineering workbench and accelerator environment, not the canonical platform store or a permanent production service.

## 2. Notebook contents

`COLAB_CAD_WORKBENCH.ipynb` provides:

1. Copyright, license, project attribution and execution disclaimer.
2. Browser upload of the CAD ZIP.
3. Package extraction and manifest verification.
4. Python/Node/runtime diagnostics.
5. Optional OCCT/OCP install and sample execution.
6. Package test execution.
7. Optional Manifold3D installation and adapter probe.
8. Optional CGAL C++ build path (requires Colab apt packages and a compiler).
9. GPU detection and a PyTorch GPU broad-phase demonstration using batched AABB tests.
10. Optional NVIDIA Warp kernel execution for geometry-bound AABB candidate filtering, with CPU fallback.
10. A report of installed/available backends and unverified ones.
11. Download of generated verification reports.

## 3. What GPU can and cannot accelerate

### Useful GPU workloads

- NVIDIA Warp kernels for GPU/CPU geometry queries and broad-phase processing (subject to compatible Colab CUDA runtime).
- Broad-phase AABB overlap for large candidate-pair sets.
- Batched point transforms and coordinate normalization.
- Point-cloud distance and registration workloads.
- Voxelization and signed-distance-field experiments.
- GPU-based remeshing or reconstruction algorithms where a validated implementation exists.
- Neural implicit surface reconstruction as a proposal stage, followed by independent geometric validation.
- Large-scale parameter sweeps and surrogate-model exploration.

### Not automatically GPU accelerated

- OCCT's standard B-rep Boolean operations.
- CGAL's standard CPU exact-kernel operations.
- Manifold3D's standard CPU API unless the selected build explicitly provides a GPU implementation.
- Any operation merely because a CUDA runtime is visible.

The notebook's PyTorch and optional Warp examples are broad-phase candidate filtering, not a GPU Boolean kernel. It must not be represented as exact intersection. GPU approximations can prioritize candidates or propose geometry, but only the selected validated backend can return an `OK` intersection for canonical persistence.

## 4. Notebook opening instructions

1. Download `COLAB_CAD_WORKBENCH.ipynb` from this package.
2. Open https://colab.research.google.com/ in a browser.
3. Choose **File → Upload notebook** and select the downloaded `.ipynb`.
4. In Colab, choose **Runtime → Change runtime type**. CPU is sufficient for the package tests and OCCT sample checks. Select a GPU only for the optional GPU cells.
5. Run cells from top to bottom. When prompted, upload the same `cad.zip` package.
6. Save or download the final report before the Colab session ends; runtime storage is ephemeral.

A direct one-click notebook URL cannot be supplied until the notebook is committed to a public or authorized GitHub repository at a stable path. Do not invent a repository URL. Once published, Grok can add the standard Colab badge targeting the exact notebook path.

## 5. Grok integration requirements

- Keep notebook outside the browser app's critical runtime bundle; expose it as a workbench resource/link.
- Add a `CAD Colab Workbench` entry in the CAD workbench help/resources area, not a second geometry engine or duplicate CAD entity model.
- Link the notebook and this guide from the package manifest/docs index.
- Provide the exact package ZIP or immutable release URL as the notebook's upload input.
- Preserve package version and SHA-256 in the notebook run metadata.
- Do not treat Colab output as canonical evidence until the platform verifies input IDs/revisions, environment, output hash, tolerances and validation report.
- Keep user data in private sessions or approved storage. Do not publish proprietary geometry to public notebooks.
- Keep Colab optional. The browser-native convex engine remains the fallback for supported convex solids; unsupported non-convex operations return HOLD unless a permitted backend service is configured.

## 6. GPU result promotion gate

A GPU-generated mesh or SDF proposal can only be promoted after:

1. It is converted into the package's explicit mesh contract.
2. It passes closed-manifold, orientation, self-intersection and finite-coordinate checks.
3. It is compared against a trusted reference or validated error bound.
4. It passes an independent backend check where applicable.
5. It is attached to the exact canonical source revisions and run provenance.
6. The platform's safety, authority and approval gates pass.

Simulation and GPU execution do not constitute physical verification or HIL.
