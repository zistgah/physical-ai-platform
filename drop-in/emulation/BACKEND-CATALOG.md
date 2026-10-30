Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Open-source backend catalog and reuse strategy

## 1. Design rule

PAP should reuse established numerical methods and physics engines rather than cloning them. SIR remains the canonical model. Every external tool is an execution backend selected through a versioned adapter. The backend must not own PAP identity, units, coordinate frames, safety authority, evidence lifecycle or system graph semantics.

## 2. Capability map

| Backend | Domain and algorithm families | Accelerator position | Delivered asset | Verification status in this package |
|---|---|---|---|---|
| SciPy | ODE IVP, sparse/dense numerical linear algebra, optimization, signal processing | Primarily CPU in supplied solve_ivp case | `01_scipy_solver_validation.ipynb` | Notebook executed locally against analytical reference |
| FMI / FMPy | FMI 1.0/2.0/3.0; Co-Simulation and Model Exchange FMUs | Depends on FMU implementation; not inherently GPU | `02_fmi_fmpy_colab.ipynb` | Notebook code/static checks; FMU runtime not executed here |
| PyBaMM | Battery electrochemistry SPM, SPMe, DFN; parameter sets and solvers | Default supplied CasADi example is CPU; separate JAX solver path needs explicit validation | `03_pybamm_battery_colab.ipynb` | Notebook code/static checks; PyBaMM runtime not executed here |
| MuJoCo MJX-JAX | Articulated rigid-body dynamics, contacts within supported feature subset, batched simulation | JAX/XLA CPU, supported NVIDIA/AMD GPU and TPU | `04_mujoco_mjx_gpu_colab.ipynb` | Notebook code/static checks; MuJoCo/MJX runtime not executed here |
| JAX/XLA | JIT, vectorized kernels, autodiff, parameter ensembles | CPU, supported GPU/TPU | `06_jax_gpu_ensemble_colab.ipynb` | Notebook code/static checks; JAX CPU kernel independently executed in local environment where available |
| ngspice | SPICE circuit operating point, transient and AC analysis | Conventional CPU solver | `05_ngspice_circuit_colab.ipynb` | Notebook code/static checks; ngspice binary not executed here |
| SUNDIALS | CVODE/CVODES, IDA/IDAS, KINSOL; stiff/nonstiff ODE, DAE, nonlinear and sensitivity | Primarily CPU; distributed/hardware-specific extensions vary | Plugin specification only | Not implemented as an adapter |
| OpenModelica / OMSimulator | Modelica equation-based systems, SSP and FMI co-simulation | Primarily CPU; solver/compiled model dependent | Plugin specification only | Not implemented as an adapter |
| Project Chrono / PyChrono | Multibody constraints, contact, FEA, vehicle, granular and fluid-solid interaction | CPU and selected parallel modules; capability is module-specific | Plugin specification only | Not implemented as an adapter |
| OpenFOAM | CFD, incompressible/compressible flow, multiphase, turbulence, heat transfer | CPU parallelism; GPU capabilities depend on specific forks/extensions | Plugin specification only | Not implemented as an adapter |

The catalog is a capability map, not a claim that every engine has been integrated. A notebook that invokes an upstream engine is not automatically a production PAP backend adapter; it must still pass model/port mapping, output normalization, failure, convergence and regression tests.

## 3. Backend selection policy

Backend selection must be based on the model's mathematical and physical class, not convenience:

- Nonstiff ODE: explicit Runge-Kutta methods may be suitable.
- Stiff ODE: implicit/stiff solvers such as Radau/BDF or SUNDIALS CVODE variants may be more suitable.
- DAE: use a DAE-capable solver such as IDA/IDAS or a compatible Modelica/FMI runtime; do not silently treat it as an ODE.
- Multibody contact: use an engine with explicit constraint/contact semantics (Chrono or MuJoCo) and validate contact model assumptions.
- Electrical circuits: use a SPICE-class solver and map nodes/branches/units explicitly.
- Battery electrochemistry: use a physics-based battery model and disclose parameter-set assumptions.
- CFD: use a CFD solver with mesh quality, boundary condition, turbulence, convergence and conservation checks.
- GPU ensembles: use JAX/XLA/MJX or another backend with documented accelerator support; do not assume generic Python numerical code is GPU accelerated.

The backend manifest should ultimately declare: model formats; equation classes; domain; solver families; precision; supported events/clocks; parallelism; GPU/TPU support; deterministic/replay guarantees; licensing; binary/platform compatibility; limits; diagnostics; test reference cases; adapter version.

## 4. Interoperability priority

Recommended integration order:

1. **FMI 3.0/FMU exchange:** broadest neutral interchange boundary; support Model Exchange, Co-Simulation and Scheduled Execution only as implemented and tested. Keep FMU lifecycle, variable references, clocks, event mode and state save/restore explicit.
2. **SciPy/SUNDIALS:** numerical solver adapters for ODE/DAE and reference cases.
3. **ngspice:** circuit transient and AC cases, with known analytic/reference circuits.
4. **MuJoCo MJX / Chrono:** robotics and multibody/contact workloads with benchmarked feature subset.
5. **PyBaMM:** battery subsystem and parameter study integration.
6. **OpenFOAM:** CFD cases after mesh/BC/solver/conservation test harness is available.
7. **OpenModelica/OMSimulator:** multi-domain equation-based co-simulation orchestration.

This sequence prioritizes interoperable exchange and testable domain adapters. It is not a claim that one solver is universally superior.

## 5. GPU/TPU opportunities

- JAX/XLA: vectorized parameter sweeps, differentiable kernels and supported GPU/TPU operations.
- MuJoCo MJX-JAX: batched articulated physics on supported XLA devices.
- MuJoCo MJX-Warp: NVIDIA GPU-oriented implementation; its feature and autodiff trade-offs must be checked against MJX-JAX.
- PyBaMM: optional JAX-based solver path is distinct from the default CasADi workflow and requires explicit model/solver validation.
- SciPy, FMPy and ngspice in the included examples should be treated as CPU paths unless the exact backend implementation documents and demonstrates accelerator use.

Colab hardware is dynamic and may be unavailable or throttled. The notebook must record the actual device, not the requested runtime setting.

## 6. License and provenance discipline

No upstream solver source code or binary is bundled into this package. The user installs upstream projects in the Colab runtime. Every backend version and license must be rechecked at the exact pinned release and distribution source before redistributing or embedding artifacts. See `LICENSES-AND-NOTICES.md`.
