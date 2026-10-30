# Copyright, attribution and third-party licensing

> Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.  
> AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Package ownership

The Physical AI Platform CAD drop-in source, documentation, test fixtures and notebook are distributed under **GNU General Public License v3.0 only (GPL-3.0-only)**, subject to the terms in the platform's `LICENSE` and any file-specific notices. Preserve this notice in source files, Markdown documents, notebook metadata/first cell, sample data documentation and generated source bundles.

The project citation metadata identifies Abhishek Choudhary, AyeAI and ORCID `0009-0002-0684-8320`. Do not invent additional authors or affiliations.

## Third-party engines

The package does not relicense third-party software. Check the exact version and all transitive dependencies before redistributing binaries or combining libraries.

| Component | Intended role | License note | Release handling |
|---|---|---|---|
| Open CASCADE Technology / OCP | B-rep and Boolean backend | OCCT licensing is LGPL-2.1 with an additional exception for applicable releases; verify exact distribution | Keep separate backend process/module; include exact notices and source obligations |
| CGAL | EPECK and mesh corefinement bridge | CGAL packages have package-specific licensing; Polygon Mesh Processing Boolean/corefinement components have GPL/commercial licensing implications | Do not ship/enable without legal review of selected package and distribution model |
| Manifold3D | Manifold mesh Boolean backend | Project is Apache-2.0; verify exact release and bundled dependencies | Preserve NOTICE/license texts and dependency SBOM |
| libigl | Optional geometry processing integration | Core and copyleft subcomponents differ; CGAL wrappers have additional obligations | Do not treat as an independent kernel or assume one license covers all modules |
| trimesh | Mesh I/O and inspection | Verify current package license and transitive dependencies | Utility only; not a Boolean kernel in this design |
| PyTorch | Optional GPU broad-phase demonstration | BSD-style license; verify exact distribution and CUDA-related components | Notebook optional dependency; not part of browser runtime |

This table is an engineering inventory, not legal advice or a substitute for reviewing the exact release artifacts. The license of a Python binding may differ in packaging details from the native library. A compiled CGAL executable may carry different redistribution obligations from an optional source adapter.

## Notebook and generated outputs

The notebook must retain the project copyright and license statement. Generated test reports should include package version, input sample, engine/version, execution date, runtime, tolerances and package hash. Third-party result files and logs must retain upstream notices where required.

## Distribution checklist

- [ ] Include platform `LICENSE` or GPL-3.0 text in the full repository distribution.
- [ ] Preserve copyright headers in source and docs.
- [ ] Pin backend versions in a release environment file before production use.
- [ ] Generate an SBOM and scan transitive licenses.
- [ ] Review OCCT/OCP license exception and binary distribution method.
- [ ] Review CGAL package-specific GPL/commercial terms before enabling/redistributing.
- [ ] Preserve Manifold3D Apache-2.0 `LICENSE` and `NOTICE` as applicable.
- [ ] Review CUDA/PyTorch runtime and Colab terms separately.
- [ ] Do not imply endorsement by any upstream project.
