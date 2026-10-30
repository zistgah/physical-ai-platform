# Contract

Iteration 45. This is the contract. Honor the contract.

## Authority

The MRD is the authority. An external note does not add a requirement and does not remove one.

## Rules

1. Everything is a target. Do not exclude a requirement.
2. Do not give a boilerplate implementation. A function that returns a status without doing the work is not an implementation.
3. A row is PASS only when a test calls the function and fails when the function is removed. PRESENT is not a status.
4. A HOLD is a HOLD. Do not return OK for a missing input.
5. The graph is the semantics. A view, a simulator, an AI provider, and a language text are replaceable.
6. Do not claim a depth that is not there. A shallow implementation is named as shallow and is a target to deepen, not a reason to stop.

## Copyright and license

Every file carries: Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

The license is GPL-3.0-only. The license text is the one exception that names its author. No other organization is named. No other party's property is copied.

## Sample projects

Every iteration updates the sample projects. A sample is a project on the graph. A test loads it. A sample that does not load is a failure.

## Every iteration produces

- A diff against the previous iteration, from `diff -ruN`.
- A traceability matrix correlated to the MRD, naming the file, the function, and a status of PASS or the reason it is not.
- The acceptance script run, with the verdict pasted.
- A gap analysis naming what is open and why.
- A roadmap status.
- A handoff note and a packager that emits a self-contained prompt for one component, with the expected zip name.
- Updated sample projects.

## Handoff

A package for another AI names the component, the gap, the current depth, the constraints, and the expected zip name. The constraints are: do not flatten the kernel, do not exclude a requirement, a HOLD is a HOLD, add a test that fails when the change is removed, carry the copyright line, name no other organization.

## What this contract does not do

It does not authorize a claim that is not true. It does not authorize a PASS for a function that was not tested.
