Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Emulation 1.2.0 - market and state-of-the-art assessment

## 1. Executive assessment

The PAP emulation package is a deterministic device-response conformance and result-intake layer. It is not a full digital-twin suite, general multiphysics solver, real-time HIL system or industrial certification environment. Its differentiator is its role within a broader canonical SIR-driven lifecycle platform: one semantic model can be dispatched to replaceable engines and its results returned through a common provenance and conformance boundary.

**Current position:** strong bounded conformance core and browser/Colab interchange foundation; early stage in domain solver integration; not equivalent to mature industrial simulation products. No claim of “holy grail” or industry certification is made.

## 2. Comparable commercial environments

| Product | Primary strength | Comparable to PAP | Gap relative to PAP's intended architecture |
|---|---|---|---|
| Ansys Twin Builder | System-level digital twins, reduced-order models, multidomain simulation, FMI workflows and integration with Ansys solvers | System model execution, reduced-order model and solver exchange | PAP's target is a wider lifecycle/sovereignty graph spanning requirements, manufacturing, operations, education and evidence, not a replacement for Ansys solvers |
| Siemens Simcenter Amesim | 1D multi-domain physical system simulation, controls and system integration | Multi-domain dynamic simulation and co-simulation | PAP must reuse domain engines rather than recreate Amesim's mature component library and validated models |
| MATLAB Simulink / Simscape | Model-based design, physical modelling, control design, code generation, test and XIL workflows | Model execution, control/system modelling and validation | PAP's static-first, vendor-replaceable canonical model is a different architectural objective; Simulink remains deeper in its own modelling/codegen ecosystem |
| NI VeriStand | Real-time test, hardware I/O, model integration, stimulus, fault insertion and HIL | Real-time/HIL evidence and hardware execution | PAP's current emulation core does not provide real-time guarantees, I/O drivers or HIL certification |
| Dassault Dymola / Modelica ecosystem | Equation-based physical system modelling and FMI model exchange | Modelica/FMI and multi-domain equation systems | PAP should integrate via FMI/SSP rather than duplicate a Modelica compiler and model library |
| Altair Twin Activate | System simulation, digital twin workflows, control/physical modelling and model integration | System-level simulation and model exchange | PAP's value is canonical SIR and lifecycle thread; domain solver maturity remains lower |

The commercial products above have deep, validated domain functionality. The present PAP emulation module does not match them in solver breadth, calibration, libraries, realtime operation, workflow maturity or qualification.

## 3. Comparable open-source ecosystem

| Project | Strong capability | PAP reuse path |
|---|---|---|
| SciPy | ODE solvers, numerical linear algebra, optimization and signal processing | First reference ODE backend; analytical test cases |
| SUNDIALS | ODE/DAE/nonlinear and sensitivity solver families | Stiff and DAE solver adapter; preserve method diagnostics |
| FMI / FMPy | Portable FMU exchange and simulation | Neutral model exchange/co-simulation boundary |
| OpenModelica / OMSimulator | Modelica equation-based modelling and co-simulation | Modelica/SSP adapter; do not create a parallel SIR |
| ngspice | Circuit simulation | Circuit transient/AC backend with analytical circuits |
| Project Chrono | Multibody, contact, FEA, vehicle and FSI | Robotics/mechanical simulation adapter |
| MuJoCo / MJX | Articulated robotics/contact dynamics and batched simulation | Robotics backend; JAX/XLA accelerator option |
| PyBaMM | Electrochemical battery modelling | Battery subsystem simulation and parameter studies |
| OpenFOAM | CFD and multiphysics | Fluid/thermal backend; require mesh and conservation validation |
| JAX / XLA | Accelerated array kernels, autodiff and vectorized execution | Parameter ensembles, differentiable models and accelerator workloads |

## 4. Where PAP stands

| Dimension | Emulation 1.2.0 status | Maturity assessment |
|---|---|---|
| Deterministic model execution | Implemented in browser core | Functional |
| Stateful/time-series comparison | Implemented | Functional |
| Fault injection | Six deterministic input fault types | Functional model-level injection only |
| Typed port validation | Basic type/range/required/path checks | Foundation; unit/frame ontology mapping remains in SIR adapter |
| Numerical comparison | Absolute/relative/path tolerance, mismatch diagnostics | Functional; acceptance tolerances are model-owner responsibility |
| Replay metadata | Seed, initial state and fingerprints | Functional correlation; FNV fingerprints are not cryptographic evidence |
| SciPy backend | Notebook and analytical ODE reference | Reference execution path |
| FMI/FMPy | Notebook, FMU inspection and output export | Adapter prototype; FMU lifecycle coverage not qualified |
| PyBaMM | SPM/SPMe/DFN notebook | Reference notebook; runtime and physical calibration unverified |
| MuJoCo MJX | GPU/TPU-capable notebook | Reference workload; runtime and feature parity unverified here |
| ngspice | RC transient notebook | Reference notebook; runtime not executed here |
| SUNDIALS/OMSimulator/Chrono/OpenFOAM | Catalog and plugin specification | Not implemented adapters |
| Browser deployment | No mandatory backend; Colab manual handoff | Aligned with static-first MRD |
| HIL/real-time/physical verification | Not in emulation core | Separate modules/qualification required |

## 5. What would constitute state-of-the-art PAP emulation

A future industrial-grade system should combine:

1. SIR-native component and interface semantics with explicit units, coordinate frames, clock domains and safety classes.
2. Capability-based backend discovery and version-pinned adapters.
3. FMI 3.0 Model Exchange, Co-Simulation and Scheduled Execution as supported and tested, with event mode, clocks, early return and state save/restore.
4. Solver-specific validation: convergence, residuals, conservation, stability, timestep/mesh refinement, conditioning and error estimates.
5. Multi-domain co-simulation with deterministic scheduler, synchronization policy and explicit algebraic-loop handling.
6. Parameter calibration, uncertainty quantification, model discrepancy and sensitivity analysis against independently sourced measurements.
7. GPU/TPU execution with reproducible environment and backend/device provenance, not just GPU selection.
8. Hardware transport and real-time/HIL integration with deadline, jitter, overrun and safe-state evidence.
9. Fault campaign coverage, fault propagation, safety case linkage and controlled simulation-to-reality promotion.
10. Content-addressed artifacts, signatures/attestation where required, SBOM/license records and complete audit trails.
11. Automated regression corpus of analytical, reference FMU, circuit, multibody/contact, battery and CFD benchmark cases.
12. Cross-backend equivalence and discrepancy tests, including documented tolerances and numerical-method differences.

## 6. Strategic position

The platform should not try to beat every vendor by rewriting their engines. It should make multiple proven engines usable under one SIR and evidence contract. This offers an architectural path to broad engineering optionality and technological sovereignty. It is only realized when the adapters, test cases, model mappings and lifecycle propagation are complete.

The current package is a meaningful enabling layer, not the completed state-of-the-art destination.

## 7. Primary references

- [Ansys Twin Builder](https://www.ansys.com/products/digital-twin/ansys-twin-builder)
- [Siemens Simcenter Amesim](https://plm.sw.siemens.com/en-US/simcenter/systems-simulation/amesim/)
- [MATLAB Simulink](https://www.mathworks.com/products/simulink.html)
- [Simscape](https://www.mathworks.com/products/simscape.html)
- [NI VeriStand](https://www.ni.com/en/shop/software/products/veristand.html)
- [FMI standard and tool ecosystem](https://fmi-standard.org/)
- [FMPy](https://pypi.org/project/FMPy/)
- [SciPy solve_ivp](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html)
- [SUNDIALS](https://computing.llnl.gov/projects/sundials)
- [Project Chrono](https://projectchrono.org/)
- [MuJoCo MJX](https://mujoco.readthedocs.io/en/latest/mjx.html)
- [PyBaMM](https://pybamm.org/learn/)
- [OpenFOAM documentation](https://www.openfoam.com/documentation/)
- [JAX installation and accelerator support](https://docs.jax.dev/en/latest/installation.html)
- [Google Colab FAQ and resource availability](https://research.google.com/colaboratory/intl/en-GB/faq.html)
