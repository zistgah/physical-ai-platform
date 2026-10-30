# CFD drop-in - Iteration 47, package 1.3.0

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
Licensed under GPL-3.0-only.

## 1. Release decision

**Native reference solver status: CLOSED for the explicitly defined 1D steady laminar channel contract.**

This release replaces the placeholder with an executable numerical solver, stable `cfdStep` entry point, reason-coded HOLD outcomes, four runnable samples, analytical verification, adversarial input tests, deterministic replay checks, repository regression integration, and a reproducible handoff.

**Product-level status: not a general-purpose industrial CFD solver.** A one-dimensional laminar channel solver is not a state-of-the-art Fluent/OpenFOAM/STAR-CCM+ alternative. The bounded module is complete; the wider CFD discipline is not contained in this module. This distinction must remain explicit in UI, reports and evidence packages.

## 2. Implemented physics and numerical method

The solver handles fully developed steady plane-channel Couette-Poiseuille flow:

- Newtonian, constant-density, constant-dynamic-viscosity fluid.
- Incompressible, unidirectional, fully developed flow.
- Constant streamwise pressure gradient.
- Prescribed bottom and top wall velocities.
- Uniform or explicitly supplied nonuniform wall-normal mesh.
- Direct tridiagonal finite-volume solution.
- Computed normalized discrete-equation residual.
- Analytical velocity-profile reference.
- Flow rate per unit span, mean velocity, maximum absolute velocity and Reynolds-number diagnostic.

Governing equation:

`mu * d²u/dy² = dp/dx`

Exact profile:

`u(y) = U_bottom + (U_top-U_bottom)*y/H - (dp/dx)*y*(H-y)/(2*mu)`

The implementation uses a vertex-centred conservative finite-volume control-volume formulation in the wall-normal direction. Interior vertex velocities are unknowns; wall velocities are Dirichlet values. The resulting linear system is tridiagonal and solved by the Thomas algorithm in O(N) time and O(N) memory.

This is a direct solve. `iterations: 1` means one direct linear solve, not an iterative convergence history. `steps` is retained as a positive compatibility field for Iteration 47; it is not a physical transient timestep. `maxIterations` is validated as a compatibility/resource bound but does not drive an iterative algorithm.

## 3. Input contract

```js
{
  mesh: { cells: 32, height: 0.01 },
  // Or: mesh: { height: 0.01, yFaces: [0, ... , 0.01] }
  fluid: { density: 998.2, dynamicViscosity: 0.001002 },
  pressureGradient: -0.1, // dp/dx [Pa/m]; negative drives +x flow
  wall: { bottomVelocity: 0, topVelocity: 0 }, // m/s; optional
  tolerance: 1e-10,
  maxIterations: 20000
}
```

Aliases: `mesh.channelHeight`; `fluid.rho`; `fluid.viscosity`; `fluid.mu`; `dpdx`.

Mesh constraints: 3 to 10,000 cells, finite strictly increasing face coordinates, domain endpoints matching `[0,H]` within floating-point tolerance, and maximum/minimum cell-width ratio no greater than 1e6. Density, viscosity and channel height must be finite and positive. Pressure gradient and wall speeds must be finite. Tolerance must be finite and in `(0,1)`. Resource bounds are integer-validated.

## 4. Output and trust semantics

- `outcome: OK` means the bounded discrete equation was solved and its computed algebraic residual meets the requested tolerance.
- `outcome: HOLD` means no result is promoted. `code` and `reason` identify the failed precondition or numerical gate.
- `validationState: SIMULATED_NOT_PHYSICALLY_VALIDATED` is mandatory for every successful solve.
- `evidence.physicalTestEvidence` is always false. Analytical verification is not experimental validation.
- `mesh.cells` reports physical mesh intervals. `mesh.interiorUnknowns` separately reports solved interior velocities.

HOLD codes cover malformed input, mesh, fluid, boundary condition, tolerance/resource bound, assembly overflow, singular system, non-finite solution, diagnostic overflow and residual failure.

## 5. Verification coverage

`test.mjs` covers:
1. Algebraic residual from the assembled discrete operator, not a hard-coded value.
2. Analytical Couette-Poiseuille profile and Poiseuille flow-rate identity.
3. Centreline maximum velocity.
4. Eleven uniform mesh sizes from 3 to 1,000 intervals.
5. Nonuniform mesh.
6. Pure Couette, both moving walls, combined pressure/wall forcing and reversed pressure flow.
7. Zero-pressure/zero-wall solution.
8. Deterministic repeatability and no mutation of caller-owned input.
9. Four JSON samples parsed and executed through the solver.
10. Twenty-three reason-coded invalid/adversarial input cases.
11. Overflow and non-finite derived diagnostics return HOLD.
12. Mutation-sensitive assertions reject a zero field, fake residual or missing flow integral.

Run:

```bash
node drop-in/cfd/test.mjs
```

No runtime dependencies beyond Node.js.

## 6. Samples

All four fixtures in `samples/` are executable:
- `poiseuille-water-channel.json` - pressure-driven stationary-wall channel.
- `couette-channel.json` - moving upper wall, zero pressure gradient.
- `reverse-pressure-flow.json` - positive pressure gradient and negative streamwise flow.
- `zero-pressure-gradient.json` - stationary walls and zero flow.

The tests parse each JSON file and call `solvePoiseuille`. They are regression fixtures and analytical benchmarks, not experimental datasets.

## 7. Repository integration

The original `tools/conformance-test-iter47.mjs` asserted that a one-cell mesh with no viscosity or pressure gradient returned `OK` and residual exactly `1`. That encoded the old placeholder, not valid CFD behaviour.

`integration/iteration-47-conformance.patch` changes only the CFD BIBO fixture to require valid physical input, a converged result, and a finite residual within tolerance.

From repository root:

```bash
patch -p1 < drop-in/cfd/integration/iteration-47-conformance.patch
node drop-in/cfd/test.mjs
node tools/conformance-test-iter47.mjs
node tests/run.mjs
node tests/acceptance.mjs
```

Do not modify the canonical kernel or platform acceptance script to make this module pass. The isolated drop-in does not invent a CFD-specific canonical adapter. Grok must keep the solver behind the platform's typed model and evidence boundary.

## 8. Competitive position

### What an industry leader has

Broad multidimensional physics, mature mesh workflows, validated benchmark suites, scalable parallel execution, uncertainty workflows and supported engineering release processes.

This module is not comparable in breadth, validated use cases, mesh support, parallel performance or physical models to Ansys Fluent, Siemens STAR-CCM+, OpenFOAM, SU2 or Code_Saturne. See `MARKET-COMPARISON.md` for the sourced comparison. It implements one analytically verifiable 1D steady laminar channel problem.

The platform's potential differentiation is canonical system modelling, solver portability, evidence traceability, deterministic run packaging, requirements-to-simulation linkage and simulation-to-HIL/physical lifecycle governance. Those are platform integration advantages, not proof of numerical superiority.

## 9. Explicit product boundary

The following physics are not part of this closed module contract: multidimensional Navier-Stokes, pressure-velocity coupling, transient flow, compressibility, turbulence, energy/species transport, multiphase flow, fluid-structure interaction, complex/unstructured geometry, mesh adaptation, parallel/GPU execution and experimental validation.

They are not silently marked implemented. They require separately specified solver modules, benchmark datasets, independent verification and platform integration. Adding them without suitable discretization, conservation checks, validation references and evidence would reduce rather than improve engineering quality.

## 10. External backends and browser-only execution

The package now includes a versioned candidate catalogue for OpenFOAM, SU2 and Code_Saturne, a CFD job-envelope mapper for external 2D/3D requests, and a Colab notebook for analytical reference checks, runtime/GPU discovery and batched parameter studies. These are adapter and orchestration foundations, not claims that the external solvers are installed or invoked. Each backend remains `CATALOGUED_NOT_EXECUTION_TESTED` until a pinned adapter passes its own executable benchmark suite.

The platform UI remains browser-only. The browser runs the native JavaScript reference solver and can launch a notebook or governed external execution provider. Colab is an optional compute runtime, not the canonical data store. CuPy accelerates the notebook's parameter sweep only when a compatible CUDA runtime is detected. This is not evidence of GPU execution by a CFD solver.

A separate sibling package, `extensions/scientific-backend-orchestration/`, provides a generic injected-adapter registry. It is deliberately outside the ten-package `drop-in/` directory so the Iteration 47 conformance contract remains unchanged. It owns no canonical graph, does no network I/O or dynamic loading, and never promotes evidence.

## 11. Release acceptance and limitations

The bounded module is closed when its nontrivial field, computed residual, analytical comparisons, HOLD matrix, executable samples, deterministic replay, regression integration and documentation all pass. Recorded evidence is in `TEST-RESULTS.md`; requirement mapping is in `TRACEABILITY.md`.

This solver is suitable for numerical software demonstrations, analytical regression and the stated reduced-order channel-flow problem. It is not qualified for design release, safety decisions, regulatory evidence or manufacturing approval without independent engineering review and applicable experimental validation. Reynolds number is diagnostic only; it does not automatically establish laminar validity for a real application.


## Handoff constraints

- Do not flatten the canonical kernel.
- Do not exclude a requirement.
- A HOLD is a HOLD.
- Add a test that fails when the change is removed.
- Carry the copyright line on every file.
- Name no other organization.
- Return a zip named `cfd.zip`.
