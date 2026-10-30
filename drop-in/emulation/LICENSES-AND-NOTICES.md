Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Copyright, license and third-party notices

## Platform package

The Physical AI Platform MRD and supplied repository declare GNU GPL v3.0. This package uses `GPL-3.0-only` for its own code and documentation, subject to the canonical repository's authoritative licensing files.

Every source file and notebook carries the copyright/trademark notice where the format permits. Every notebook includes a visible opening notice, a source-cell notice and metadata identifying GPL-3.0-only for the PAP-authored notebook. The notebook does not relicense upstream Python packages.

## Third-party libraries

No third-party source code or native binaries are vendored in this handoff. Notebooks install upstream packages into the user's temporary Colab runtime. Upstream license identifiers below are indicative and must be rechecked against the exact pinned release and distribution before redistribution or commercial deployment.

| Project | Indicative upstream license | Distribution caution |
|---|---|---|
| NumPy | BSD-3-Clause | Preserve upstream notices if redistributed |
| SciPy | BSD-3-Clause | Preserve upstream notices if redistributed |
| FMPy | BSD-2-Clause | FMI FMU and model licenses are separate from FMPy |
| PyBaMM | BSD-3-Clause | Parameter sets and imported models may carry additional provenance/terms |
| JAX | Apache-2.0 | CUDA/cuDNN components and accelerator wheels have their own notices/terms |
| MuJoCo / MJX | Apache-2.0 | Verify exact package components and any Warp dependency separately |
| Project Chrono | BSD-3-Clause | Optional modules and third-party dependencies may have distinct licenses |
| SUNDIALS | BSD-3-Clause | Verify optional solver dependencies |
| ngspice | GPL-2.0-or-later (distribution-specific) | Verify exact upstream/fork and binary packaging license |
| OpenFOAM Foundation | GPL-3.0-or-later | OpenFOAM forks/distributions may differ; identify the exact one |
| OpenModelica / OMSimulator | OSMC Public License (verify exact release) | Check component and dependency license obligations |

## FMI and model artifacts

FMI is a standard/specification, not a blanket license for every FMU. Each FMU may contain proprietary, restricted, research-only or otherwise separately licensed model content. PAP must retain source, license, version, author, hash, distribution rights and permitted-use metadata. Do not upload or redistribute an FMU unless its license and permissions allow it.

## Colab and hosted runtime

Google Colab is an optional hosted service with its own terms, quotas and privacy rules. The PAP browser package does not bundle Colab, grant Colab access or promise a particular GPU. User data submitted to Colab is subject to the user's choice of service and its applicable terms. Sensitive or export-controlled models/data must not be uploaded without authorization.

## Recheck policy

Before pinning a backend into a public release, record:

- Exact upstream repository and release tag/commit.
- Package and transitive dependency versions.
- SPDX identifier and license text URL.
- Binary/wheel source and platform constraints.
- Patent/export/data restrictions relevant to the model or deployment.
- Required notices and attribution.
- Whether any optional module is dual-licensed or separately licensed.
