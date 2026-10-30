<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Iteration 47 - package depth update

## Scope and non-scope

This update improves the ten `drop-in/` packages only, strengthens `tools/conformance-test-iter47.mjs`, and adds shared sample execution and integration documentation. It does not modify the canonical kernel, SIR schemas, app routes, runtime registry or `tests/acceptance.mjs`.

## Depth delivered

| Package | Implementation | Validation | Remaining gap |
|---|---|---|---|
| CAD | Triangle polygon clipping against a normalized plane | Cube clip, finite/index/normal checks | Exact robust predicates, B-rep boolean, watertightness |
| CFD | 1-D steady scalar convection-diffusion Gauss-Seidel solver | Analytical linear diffusion profile, residual tolerance and non-convergence | Navier-Stokes, turbulence, multidimensional mesh, mesh convergence study |
| Circuit | Series-RC backward Euler | Analytical exponential comparison, monotonic transient, invalid R/C | General netlist MNA, nonlinear devices, switching and SPICE model library |
| Simulation | 1-D multi-body contact impulses | Two-body inelastic contact, invalid/missing state | 3-D rigid-body, friction, joints, broad-phase, energy/momentum suite |
| HIL | Bounded hardware-adapter read/write/read exchange | Software mock rejected, authority/interlock/limits required | Independently authenticated bus, deterministic deadlines, E-stop circuit and physical bench qualification |
| Fabrication | Closed 2-D contour path and dimensional inspection | Closed path, travel/feed limits, tolerance HOLD | Cutter compensation, collision checking, machine-specific postprocessor and execution |
| Manufacturing | Ordered operations, compatible finite-capacity stations | Capacity scheduling and quality HOLD | Calendar/setup/resource constraints, batch split, dispatch/MES |
| Logistics | Inventory/lot availability and shortage hold | Supplier status, quarantined lot, shortage and allocation | Multi-tier supply network, lead-time uncertainty, procurement/shipment |
| Prototyping | Evidence-bound revision | Exact subject/config hash, accepted state and provenance | Cryptographic evidence verification, canonical graph persistence, physical build/test execution |
| Emulation | Static affine response model | Predicted vs observed tolerance and mismatch HOLD | ISA/device-specific semantics, timing, interrupts, peripherals, firmware differential tests |

## Test policy

A package test must exercise its exported function and assert a meaningful output. Presence-only input tests are insufficient. The sample runner loads one shared JSON fixture and executes all ten package paths. The expected outcomes include two intentional HOLD results (HIL mock and logistics shortage), demonstrating that safety and supply constraints are active.

## Integration status

The packages are drop-in tested but not registered or invoked from the platform UI. The integration adapter described in `drop-in/STITCH-INSTRUCTIONS.md` is still required. Do not claim platform end-to-end integration until that adapter is implemented and tested against the current canonical graph and full browser workflow.

## Regression fixes to existing spine components

Three previously identified defects were corrected in targeted non-kernel components:

1. **Cost completeness:** `CostModel`, `BusinessEngine.aggregateCost()` and `BusinessClosure.rollup()` now expose `total: null` when any required component cost is undeclared. `declaredSubtotal` remains separately available. Explicit zero is retained as a declared value.
2. **HIL identity:** `runLoop`, `HilRealtime`, and `HilTransport` reject transport labels, arbitrary `step()`/`tick()` mocks and unverified bindings. Hardware exchange requires a read/write transport, device/bus identity, closed interlocks, clear E-stop, verified subject/policy authority and a platform-provided identity-attestation verifier. Timing uses measured wall-clock elapsed time. Output is explicitly unqualified.
3. **Fidelity evidence:** `FidelityLadder` creates PLANNED evidence unless it receives a completed, configuration-/subject-bound external execution record. `FidelityLevels` only references pre-existing accepted/verified evidence for each preceding level. `CadHilAdapter` cannot create HIL evidence without an external hardware-attested execution record.

Historical tests that asserted the weaker behavior were updated. `tools/conformance-test-WP-ITER47-GUARDRAILS.mjs` directly tests all three defect classes. The canonical kernel, SIR schemas and `tests/acceptance.mjs` were not modified.
