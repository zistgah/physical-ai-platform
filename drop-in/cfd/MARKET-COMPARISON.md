<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# CFD backend market and capability comparison

**Research snapshot:** 2026-10-30. This is a capability and integration comparison, not a performance benchmark. Claims below are limited to official project documentation reviewed for this package.

| Backend | Scope / strength | Deployment / integration implications | Licensing reference | Package status |
|---|---|---|---|---|
| OpenFOAM (OpenCFD v2606) | Broad finite-volume CFD; distribution publishes current v2606 and precompiled Ubuntu packages. | Strong candidate for hosted Linux runtime. Pin the OpenCFD distribution, release and package source. GPU execution must be checked per solver/model; do not infer full GPU support from a release-level infrastructure feature. | GPL-3.0. <https://www.openfoam.com/documentation/licencing> | Catalogued, no adapter executable test |
| SU2 | Multiphysics simulation and design, especially aerodynamics, adjoints and optimization; official docs describe serial and MPI-enabled builds. | CLI invocation is suitable for controlled remote/Colab Linux runtime. Parallel capability depends on MPI-enabled build. | LGPL-2.1. <https://su2code.github.io/> | Catalogued, no adapter executable test |
| Code_Saturne 9.2 | General CFD finite-volume solver supporting varied meshes, turbulence, heat transfer and additional physics. | Installation is a build workflow. CUDA requires explicit build options and NVIDIA SDK/dependencies. Not a drop-in Colab package. | GPL-2.0-or-later. <https://github.com/code-saturne/code_saturne> | Catalogued, no adapter executable test |
| PETSc | Mature sparse numerical linear algebra, Krylov methods and preconditioners used by scientific solvers. | Integrate as solver dependency through solver-specific build and configuration; not a standalone CFD product. | Verify exact PETSc release licence and transitive dependencies at integration. | Candidate only |
| Gmsh | Mesh generation and mesh formats useful before CFD solver invocation. | Browser workflow can prepare/download meshes; quality and physical groups must be validated. | Verify exact release and bundled components. | Candidate only |
| ParaView / VTK | Visualization and post-processing. | Useful for result review and browser/remote visualization pathways; visualization is not numerical verification. | Verify exact component and distribution licences. | Candidate only |

## Official source notes

- [OpenFOAM current release](https://www.openfoam.com/current-release) identifies v2606 and precompiled Linux package availability. [Release announcement](https://www.openfoam.com/news/main-news/openfoam-v2606).
- The official [OpenFOAM Debian package repository](https://dl.openfoam.com/repos/deb/dists/bookworm/main/pool/2606_0/binary-amd64/) lists the `openfoam2606-default` v2606 package; the notebook pins that package and uses the official repository helper. [OpenFOAM licensing](https://www.openfoam.com/documentation/licencing) identifies GPL-3.0 for the OpenCFD distribution.
- [SU2 v7 installation documentation](https://su2code.github.io/docs_v7/Installation/) describes build/runtime dependencies and MPI requirements; the [official SU2 project](https://su2code.github.io/) identifies LGPL-2.1.
- [Code_Saturne 9.2 installation documentation](https://code-saturne.org/doc/code_saturne-9.2/md__i_n_s_t_a_l_l.html) describes explicit CUDA build configuration and required SDK/dependencies.
- [Code_Saturne repository](https://github.com/code-saturne/code_saturne) describes supported CFD domains and GPL-2.0-or-later licence.
- [Google Colab FAQ](https://research.google.com/colaboratory/faq.html) states that GPU availability and resource limits vary and managed runtimes are ephemeral.

## Conclusion

The platform should not attempt to out-implement mature open-source CFD engines in a small module. Its engineering value is a stable canonical job contract, solver replaceability, versioned case generation, result normalization, provenance and evidence gates. The current deliverable creates the orchestration boundary and notebook path, but does not claim external solver execution or parity with commercial CFD suites.
