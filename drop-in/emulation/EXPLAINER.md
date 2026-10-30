Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Emulation module explainer - 1.2.0

## What this module does

It executes a deterministic model against supplied observations and compares every output. It is a device-response conformance operation, not a presence check. `OK` means the supplied model response matches the supplied observation within the declared tolerance. `MISMATCH` means the model ran and the response differed. `HOLD` means required information or execution validity is missing or failed.

## What changed across build cycles

- 0.2.0: basic model invocation and output comparison.
- 1.0.0: stateful/time-series execution, clocks, events, typed ports, deterministic faults, replay, tolerance metrics and end-to-end synthetic samples.
- 1.1.0: external solver catalog and Node/Python bridge; SciPy execution plus optional FMPy/PyBaMM adapter code.
- 1.2.0: removed Node/Python subprocess runtime to restore browser-only deployment; added six self-contained Colab notebooks and a separate browser-native Colab Bridge with digest-bound job/result exchange; added consolidated analysis and traceable test matrix.

## What is deliberately not claimed

- A numerical match is not physical verification.
- A Colab notebook is not HIL.
- A GPU runtime selection is not proof that a backend used GPU.
- A catalog entry is not a working adapter.
- A digest is not an author signature or a proof of model correctness.
- A notebook reference case is not industrial qualification.

## What an industrial environment adds

Industrial products typically have validated domain model libraries, calibrated parameters, adaptive/DAE solvers, FMI/SSP exchange, multi-domain synchronization, real-time I/O, XIL workflows, model discrepancy analysis and qualification evidence. PAP should reuse upstream capabilities through adapters rather than reimplement every numerical engine.

## Deployment

The platform browser loads the JavaScript core and sibling Colab Bridge only. Heavy engines are launched manually in Colab. The browser exports/imports JSON artifacts; it does not run arbitrary code or contact hidden Colab execution APIs.

## How to iterate

Improve one bounded package at a time. Preserve the canonical kernel, SIR, acceptance script, HOLD semantics and evidence boundaries. Add falsifiable tests and update the coverage matrix and code reference whenever behavior changes.

## What an industry leader has

An industry-leading emulator/simulation environment typically has validated domain model libraries, solver families for stiff ODE/DAE and multiphysics, FMI/SSP exchange, calibration, uncertainty analysis, real-time execution, hardware I/O, fault campaigns and qualified assurance workflows. This package intentionally reuses upstream engines through replaceable Colab adapters rather than claiming to reproduce that full depth.

Do not flatten the canonical kernel, SIR, typed relationships or evidence lifecycle to make an adapter easier to integrate.
