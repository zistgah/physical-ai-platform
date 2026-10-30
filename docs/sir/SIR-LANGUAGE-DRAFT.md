Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# SIR language – first draft

Iteration 10. A domain language that compiles to the existing PAI-SIR interchange document.

## What it is

A small language for stating a project, its entities, relations, and evidence requirements. It compiles to the SIR document the kernel already validates.

## What it is not

- Not a general-purpose programming language
- Not a control-flow or robotics runtime
- Not a replacement for the canonical graph
- Not complete

## Grammar

```
sir 0.1 "title";

project id {
  name: "string";
}

entity Type id {
  name: "string";
  status: OPEN;
  method: SIMULATION;
  capabilities: [DRIVE, SENSE];
}

relation source ALLOCATED_TO target;

require evidence subjectId {
  method: SIMULATION;
  state: EXECUTED;
  configuration: cfg-id;
}
```

## Semantics

- `project` becomes the SIR header and a Project entity.
- `entity` becomes a graph entity. Type is taken as written.
- `relation` becomes a graph relation. Dangling endpoints fail the compile.
- `require evidence` becomes a constraint. It does not invent evidence.

## Next

Types checked against the kernel entity set, relations checked against the registry, constraints checked against evidence states, and a loader that imports a compiled SIR into the kernel.
