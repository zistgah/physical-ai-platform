Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Platform Closure – Iteration 05

## Layers

- Layer A (historical/intellectual lineages): preserved in predecessor corpus. Not flattened into platform entities.
- Layer B (Physical AI Platform architecture): the intended system.
- Layer C (this repository): executable implementation of Layer B.

## One canonical model

All verticals are adapters/projections over the canonical kernel graph. No second semantic store.

## Contracts

`contracts-vertical.js` defines one dialect covering Component, Requirement, Configuration, Evidence, Test, Hazard, ComplianceCase, WorkOrder, Deployment, Curriculum, Experiment, Funding.

## Trust boundary

`import-trust.js`: imported objects carry trust status `IMPORTED`, `verified: false`. Import never auto-promotes to verified evidence.

## Queries

`graph-queries.js`: orphans, circular detection, requirement coverage, stale evidence, readiness. Operates on the kernel.

## Sharing

`sharing-boundary.js`: publication is an explicit action with provenance. No silent export of restricted data.

## Evidence methods

Simulation, HIL, inspection, and other methods remain distinguishable. State `EXECUTED` is not auto-promoted to `VERIFIED`.

## SIR

Structured sections + embedded graph. Round-trip preserves identities, types, relations, and provenance. Not a programming-language compiler.

## What is simulated / mocked / adapted

- Simulator: deterministic reference. Evidence method SIMULATION.
- HIL/CAD: in scope. Geometry CAD kernel is Iteration 14.
- Standards: informational corpus. Not legal determination.
- Manufacturing/factory: in scope.
- Business: in scope.
- Education: in scope.
