Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Replaceable numerical and physics backend ecosystem

The backend catalog is descriptive metadata, not a hidden runtime loader. The browser platform does not launch Python, native executables, FMUs or subprocesses. It exports a job through the separate `integrations/colab-bridge` module. A user opens a notebook in Colab, runs an explicitly selected upstream engine and imports a digest-bound result.

See:

- `../BACKEND-CATALOG.md` for domain fit and implementation status.
- `../BROWSER-ONLY-ARCHITECTURE.md` for the browser/Colab data flow.
- `../../../../notebooks/emulation/COLAB-INDEX.md` for the notebook list and launch instructions.
- `../STITCH-INSTRUCTIONS.md` for Grok's integration sequence.

## Registry status values

- `notebook-implemented`: notebook code is included; this does not imply the runtime was executed in this environment.
- `plugin-specification`: extension contract and domain requirements are documented, but no runnable adapter is claimed.
- `runtime-verified`: the backend runtime, sample and reference test were executed in the environment stated by `testedWhere`. This does not imply Colab or GPU/TPU execution unless explicitly recorded.

## Mandatory backend adapter contract

Every future adapter must:

1. Pin engine and adapter versions.
2. Declare supported model formats, equation/physics class and feature subset.
3. Validate input schema, dimensions, units, frames, ranges, clocks and boundary conditions.
4. Reject unsupported capabilities rather than approximating silently.
5. Return one output sample for each requested sample or explicitly declare a documented resampling policy.
6. Preserve sequence and time order.
7. Report solver success, convergence, termination, warnings, step counts and relevant error norms.
8. Return finite JSON-compatible data only.
9. Include backend/model/configuration digests and provenance.
10. Fail closed to HOLD on missing dependency, invalid input, unsupported feature, timeout, divergence, malformed output or numerical failure.
11. Never self-promote to HIL, REAL or VERIFIED.
12. Pass analytical/reference cases, boundary tests, mutation tests and SIR mapping tests.

## Native code security

FMUs and native solver packages may execute arbitrary machine code. Browser-side validation is not a sandbox. Do not auto-download or execute solver binaries from SIR. Only run trusted FMUs and packages in user-selected disposable environments; use stronger OS/container isolation for hostile or third-party native binaries. A Colab runtime is not asserted to provide a security guarantee beyond Google's documented service boundary.

## Why no Python bridge here?

The earlier 1.1.0 `backend-runtime.mjs` and `backends/python/bridge.py` used Node `child_process`. They have been removed because the platform deployment is browser-only. The Python execution path now exists in the `.ipynb` assets and is invoked by the user in Colab. Node.js is used only to run development tests, not to serve the platform.
