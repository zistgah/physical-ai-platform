Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Changelog

## 1.2.0 - 2026-10-30

- Corrected the 1.1.0 Node/Python subprocess deployment mismatch for the browser-only platform.
- Removed `backends/backend-runtime.mjs`, `backends/python/bridge.py` and their Node-hosted execution tests from the emulation runtime package.
- Kept `module.js` as a pure browser-compatible deterministic conformance core; API version now 1.2.0.
- Added separate sibling package `integrations/colab-bridge` for browser job/result exchange, SHA-256 integrity, result validation and Colab URL generation.
- Added six self-contained Colab notebooks: SciPy, FMPy/FMI, PyBaMM, MuJoCo MJX, ngspice and JAX/XLA.
- Embedded a common PAP job/result protocol in every notebook, including copyright/trademark/GPL notices and SIMULATED/UNVERIFIED evidence semantics.
- Added GPU/TPU-aware JAX and MJX paths; notebook records actual device/backend and does not claim GPU use from runtime selection alone.
- Added consolidated build-cycle analysis, browser-only architecture, backend catalog, market assessment, test coverage matrix, code reference, notebook guide and license notices.
- Added 25 boundary/adversarial core tests beyond the 103-case previous core suite.
- Updated Grok stitch instructions for two sibling drop-ins and notebook assets.

## 1.1.0 - 2026-10-30

- Added external solver catalog and optional Node-to-Python backend runtime.
- Added SciPy linear state-space, FMPy and PyBaMM Python adapter code.
- Added backend execution tests and analytical SciPy fixture.
- This runtime was removed in 1.2.0 because it was not suitable for static browser deployment.

## 1.0.0 - 2026-10-30

- Added deterministic stateful/time-series execution, separate clocks, ordered events, typed ports, deterministic fault injection, replay metadata, numerical diagnostics and three synthetic end-to-end samples.
- Added expanded unit/contract tests and spine integration boundary test.
