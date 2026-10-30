<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Iteration 47 drop-in engineering packages - v0.3.0

This directory contains ten bounded engineering modules. The accompanying ZIP also contains targeted source patches under `patches/` that close the prior false-HIL, false-fidelity and missing-cost-to-zero regressions. They are **drop-in packages, not runtime-integrated platform capabilities**. The canonical kernel, SIR, entity schemas, routes and application registry remain unchanged.

## Implemented reduced-order vertical slices

| Package | Executable operation | Reference verification | Explicit limit |
|---|---|---|---|
| CAD | Triangulated surface clipping against a plane | Cube half-space clipping, index/normal rejection | Not B-rep Boolean or manifold solid kernel |
| CFD | 1-D steady convection-diffusion iteration | Linear analytical diffusion field and residual convergence | Not general CFD/Navier-Stokes |
| Circuit | Series-RC backward-Euler transient | Analytical exponential response | Not general SPICE/netlist solver |
| Simulation | 1-D multi-body discrete contact | Two-body inelastic collision | Not 3-D rigid-body engine |
| HIL | Guarded read-write-read hardware adapter exchange | Mock rejection, bounded adapter exchange | Adapter attestation is not HIL qualification |
| Fabrication | 2-D closed contour toolpath + inspection | Closed path and dimensional tolerance | Not production CAM/postprocessor |
| Manufacturing | Finite-capacity ordered operation scheduling | Capacity and quality-hold cases | No calendar/setup/ERP/MES execution |
| Logistics | Inventory/lot allocation and shortage hold | Available, shortage, quarantine and supplier-status cases | Not multi-echelon planning |
| Prototyping | Configuration-bound revision creation | Evidence identity/hash/provenance gates | Does not perform physical tests |
| Emulation | Affine device response comparison | Matching and mismatching observed response | Not instruction/cycle-accurate emulation |

## Run tests and samples

From repository root:

```sh
for f in drop-in/*/test.mjs; do node "$f" || exit 1; done
node tools/conformance-test-iter47.mjs
node drop-in/run-samples.mjs
node tests/run.mjs
node tests/acceptance.mjs
```

The sample runner executes ten flows from `samples/engineering-samples.json`. Two samples are expected to HOLD: (1) software-only HIL mock and (2) logistics shortage. A HOLD is the expected correct behavior, not a test failure.

## Result semantics

- `OK`: the bounded operation completed within its stated model.
- `HOLD`: input, authority, quality, evidence, resource or convergence precondition is not satisfied.
- HIL may return `EXECUTED` only after a declared hardware-backed adapter completes read-write-read. It remains `UNQUALIFIED_ADAPTER_ATTESTATION` until independently qualified.
- Every simulation result identifies its model and qualification boundary. Do not promote a reduced-order reference calculation into a validated engineering result.

## Package and platform integration states

1. **Package tested** - module and package tests pass.
2. **Spine compatible** - adapter maps package contracts to canonical entities/ports/units/frames/evidence and compatibility tests pass.
3. **Registered** - package is registered in the platform's module/workbench registry.
4. **Workflow reachable** - a real project graph can invoke it and persist provenance-bearing results.
5. **Integrated** - full acceptance, regression and browser workflows pass on the merged spine.

This archive establishes state 1. It supplies instructions for states 2-5; it does not claim they are complete.
