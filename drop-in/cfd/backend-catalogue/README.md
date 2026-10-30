<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# External CFD backend catalogue

This is a discovery and planning catalogue, not proof that the listed executables are installed, invoked, or validated by the current package. Each entry remains `CATALOGUED_NOT_EXECUTION_TESTED` until a version-pinned adapter passes installation, invocation, parsing, benchmark and provenance tests in the target runtime.

| Backend | Strong use cases | License (verify exact release) | GPU reality |
|---|---|---|---|
| OpenFOAM | General finite-volume CFD, incompressible/compressible, heat transfer, turbulence and multiphase extensions | GPL-3.0 for OpenCFD distribution; Foundation distribution also GPL-3.0 | GPU capability is solver/release-specific. GPU infrastructure is not equivalent to full GPU execution for every model. |
| SU2 | Aerodynamics, compressible/incompressible flow, adjoint and design optimization | LGPL-2.1 | MPI/parallel builds and GPU features must be verified per build; default binary capability is not assumed. |
| Code_Saturne | General finite-volume CFD, turbulence, heat transfer, combustion, multiphase and coupled workflows | GPL-2.0-or-later | CUDA requires explicit build configuration, NVIDIA SDK and compatible dependencies. |

The platform must not copy third-party source into this package. Adapters invoke separately installed/hosted tools and preserve their own notices, versions and licences. The package licence does not relicense a backend.
