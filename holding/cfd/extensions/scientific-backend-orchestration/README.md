<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Scientific Backend Orchestration

Version 1.0.0. GPL-3.0-only.

A generic, injected-adapter registry for scientific and engineering execution providers. It is a separate package from CFD and is intended to be reusable by CAD, simulation, circuit, optimization and other scientific workflows.

## Deliberate non-goals

- Does not own or replicate the canonical kernel, SIR, project graph or evidence store.
- Does not perform network I/O, shell execution or dynamic code loading.
- Does not install or bundle third-party solvers.
- Does not convert solver success into verified/validated evidence.

## Minimal use

```js
import { createBackendRegistry } from "./module.js";
const registry = createBackendRegistry();
registry.register(manifest, injectedAdapter);
const candidates = await registry.discover({ domain: "incompressible-flow", dimensions: 2 });
const result = await registry.execute(job, { backendId: "solver.id", executionMode: "COLAB" });
// result.executionState is EXECUTED_UNVERIFIED; promotionAllowed is false.
```

A manifest is descriptive metadata, not proof. The host must authenticate, authorize and govern the injected adapter. Execution performs a fresh preflight probe immediately before calling the adapter; discovery results are advisory and may be stale. A concrete process runner must avoid shell interpolation, enforce quotas/timeouts and capture complete logs.

Run `node tests/test.mjs`.
