# Third-party backend notices

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

No source code, binary, model, plugin or runtime from the projects listed below is vendored in this package. The package contains only independently authored adapters, protocol definitions, worker scripts and references to upstream projects. Each backend is an optional external dependency.

| Project | Upstream license (verify exact deployed release) | Distribution note |
|---|---|---|
| OR-Tools | Apache-2.0 | Include upstream notices if bundled; worker uses installed package. |
| HiGHS | MIT | Include upstream copyright/license if bundled; worker uses installed package. |
| Timefold Solver Community | Apache-2.0 | Community vs Enterprise features and terms differ. |
| frePPLe Community | MIT | Community edition only; verify edition-specific features and license. |
| SciPy | BSD-3-Clause | Optional fallback interface to its bundled HiGHS implementation. |
| SimPy | MIT | Include upstream notices if bundled; worker uses installed package. |
| FreeCAD | LGPL-2.1 | Verify component and plugin licenses in the exact distribution. |
| OpenCAMLib | LGPL-2.1 | Verify fork, version, bindings and dependency notices. |
| ERPNext | GPL-3.0 | Treat deployment and distribution obligations separately; this package only defines an adapter contract. |
| LinuxCNC | GPL-2.0 and LGPL components | Verify the exact build and component licenses; this package does not link or redistribute it. |

The platform package itself remains GPL-3.0-only. This notice is not a legal compatibility opinion. Before bundling, redistributing, linking, offering a network service, or shipping a backend, create a version-specific SBOM, retain license texts/notices, review transitive dependencies and obtain legal review where required.
