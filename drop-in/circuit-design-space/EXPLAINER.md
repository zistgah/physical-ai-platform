<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Circuit Design-Space - implementation and engineering notes

## Problem addressed

A transient solver answers “what does this circuit do for this configuration?” Engineering design exploration asks “which parameter combinations meet response, current and energy constraints?” Parameter identification asks “which parameter can be inferred from measured response?” Those are distinct responsibilities and should not be hidden inside the circuit execution engine.

## Scope

The module implements analytical first-order RC and series-RLC step models. It provides RC parameter identification and R×C/R×L×C design-space sweeps, including underdamped, critically damped and overdamped regimes. It does not claim arbitrary nonlinear circuit optimization. The output is explicitly marked `solver_execution: false` and `physical_verification: false`.

## Numerical model

For a step from `V0` to `V1` across a series R feeding C:

`Vout(t) = V0 + (V1 - V0) * (1 - exp(-t/(R*C)))`

`tau = R*C`

`tr(10-90) = ln(9)*tau ≈ 2.1972245773362196*tau`

`I(0+) = |V1 - V0|/R`

`E_C = 0.5*C*V1^2` for an initially uncharged capacitor charged to V1. The present energy metric is defined against ground and the supplied final step voltage; use it only for that model convention.

## Optimization and identifiability

The fitter uses SciPy `least_squares` over log(tau), enforcing positive bounded tau. It returns residuals, RMSE, R² where defined, iteration count, optimality, a local standard-error estimate when degrees of freedom permit, and rank status.

A single ideal RC step identifies only the product R*C. A two-variable R/C fit from one trace is structurally unidentifiable. The module intentionally does not produce separate R and C estimates unless one is independently known.

## JAX/GPU

The R×C candidate grid is vectorized. JAX is optional. The selected device is reported in `engine`. A requested GPU that is not visible to JAX produces HOLD. A Colab GPU runtime does not make ngspice/Xyce GPU accelerated; this JAX path accelerates the analytical parameter grid only.

## Limits and HOLD semantics

Inputs are checked for finite positive R/C, strictly increasing non-negative times, finite voltage levels, valid backend selection, supported constraints and bounded candidate/output counts. Invalid or over-limit requests return HOLD. No clipping, silent truncation or silent CPU fallback occurs when GPU is explicitly required.

## Integration boundary

The circuit module owns circuit graph lowering and solver execution. This module owns design-space evaluation on normalized scalar parameters and measured traces. Grok should register it as a separate workbench capability and bind its inputs/outputs through typed contracts. It must not create a second circuit ontology or promote evidence. Its results are analytical design exploration and parameter-estimation evidence only.


## Series-RLC model

For a series R-L-C circuit with output measured across C, zero initial inductor current and initial capacitor voltage `V0`, the module evaluates the closed-form second-order step response. It classifies damping using `zeta = (R/2)*sqrt(C/L)`: underdamped for zeta below one, critically damped near one (within the documented numerical classification tolerance), and overdamped above one. The implementation is cross-checked against an independent SciPy `solve_ivp` integration of the underlying state equations in the unit tests. The RLC grid reports natural frequency, sampled peak voltage, sampled overshoot, capacitor stored energy and explicit constraint feasibility. Overshoot is based on the supplied time samples; select a sufficiently fine time grid to capture fast transients.
