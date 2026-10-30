# Simulation code reference

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

| File | Responsibility | Important contract |
|---|---|---|
| `module.js` | Native deterministic 2D disc solver and async backend dispatch | `simStep()` remains sync/backward compatible; `simStepWithBackend()` returns HOLD on explicit backend failure |
| `platform-adapter.js` | Existing platform component adapter | Preserves platform `SimComponent` interface and HOLD |
| `backends/registry.js` | Engine registry, capability selection, result validation, JSON-RPC host transport | No silent fallback; bounded timeout; request-ID and schema checks |
| `backends/rapier2d.js` | Rapier 2D batch adapter | Optional dependency; exact runtime needs live smoke |
| `backends/rapier2d-session.js` | Persistent Rapier world | Initialization is async; each subsequent local session step is sync |
| `platform-rapier-adapter.js` | Factory for persistent Rapier platform component | Must initialize before adding to synchronous Simulator |
| `backends/profiles.js` | Remote engine profile constructors | Profiles are metadata, not drivers |
| `backends/catalog.json` | Machine-readable engine catalog and qualification states | Keep status accurate; no profile-as-integration inference |
| `schemas/*.json` | Request/result/protocol contracts | Versioned schemas; update adapter and tests together |
| `notebooks/simulation-gpu-qualification.ipynb` | Colab Warp/MJX research and runtime qualification | External Python execution; not a live platform adapter |
| `notebook-check.mjs` | Notebook structure and required metadata regression test | Fails on missing notebook copyright/version/engine cells |
| `test.mjs` | Native solver unit/invariant suite | Numerical and input boundary tests |
| `backend-tests.mjs` | Registry/protocol/adapter suite | Test doubles do not qualify live engines |
| `platform-integration.test.mjs` | Native platform integration | Uses actual Iteration 47 simulator lifecycle |
| `platform-backend-integration.test.mjs` | Rapier component platform integration | Deterministic API test double; live Rapier pending |
| `run-samples.mjs`, `samples/*.json` | Reproducible sample scenarios | Each scenario must remain deterministic and documented |

## Commenting standard

Public functions and non-obvious numerical operations are documented inline. Preserve explanatory comments for integrator choice, contact impulse accumulation, friction clamping, deterministic ordering, timeouts, async/sync lifecycle boundaries, and HOLD semantics. Do not add comments that claim unsupported physical fidelity.
