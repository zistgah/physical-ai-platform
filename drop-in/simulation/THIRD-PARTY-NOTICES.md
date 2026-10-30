# Third-party software and notices

**Package copyright:** © 1993-2026 Abhishek Choudhary. All rights reserved.  
**Trademarks:** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.  
**Package-authored source and documentation license:** GNU GPL v3.0; see `LICENSE`.

This package does not bundle third-party engine source or binaries. The following are optional external dependencies or separately hosted engine projects. The license notes below are orientation only. Before distribution, pin an exact release and inspect its full license, notices, transitive dependencies, and any separately licensed components.

| Project | Use | License orientation | Current package status |
|---|---|---|---|
| Rapier | Optional JS/WASM 2D engine | Apache-2.0 | Adapter code included; live runtime pending |
| MuJoCo / MJX 3.17.0 | Articulated dynamics and JAX/XLA execution | Apache-2.0 | Remote profile and Colab research notebook; host driver not included |
| NVIDIA Warp 1.18.0 | Custom GPU simulation kernels | Apache-2.0 | Colab research notebook only; no production driver |
| Project Chrono | Multibody, FEA, vehicle, granular and FSI domains | BSD-3-Clause | Remote profile; GPU build is external and untested here |
| ODE | Rigid-body dynamics | BSD-3-Clause OR LGPL-2.1-or-later | Remote profile only |
| Bullet | Rigid-body dynamics/collision | zlib | Remote profile only |
| NVIDIA PhysX | Real-time rigid body/collision | Verify exact release and current repository license | Remote profile only |
| Jolt Physics | Multicore rigid-body dynamics | MIT | Remote profile only |
| Drake | Robotics multibody and optimization | BSD-3-Clause at repository root; review separately licensed portions | Remote profile only |
| DART | Articulated rigid-body dynamics | BSD-2-Clause | Remote profile only |

Official project sources are listed in `backends/catalog.json`. Catalog presence does not imply installation, bundling, runtime testing, integration, or legal approval.
