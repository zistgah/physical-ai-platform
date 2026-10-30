# Manufacturing backend integration - stitch instructions

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Integration position

Copy this package as a bounded drop-in under `drop-in/manufacturing/`. Do not replace the canonical kernel, manufacturing-engine, factory, MES, logistics or quality owners. The backend layer is an optional execution/algorithm adapter above canonical projections.

## Files and entry points

- `backend-catalog.json`: curated capability and license catalog.
- `backend-adapters.js`: backend registry, JSON protocol, generic HTTPS transport, read-only Frappe REST transport, job-shop IR lowering and independent schedule validation.
- `node-worker-transport.js`: Node-only subprocess bridge. Do not import this file into the static browser bundle.
- `workers/ortools_jobshop_worker.py`: optional CP-SAT job-shop optimizer.
- `workers/scipy_highs_jobshop_worker.py`: optional job-shop MILP worker using SciPy's HiGHS backend.
- `workers/highs_lp_worker.py`: optional HiGHS LP/MILP worker.
- `workers/simpy_flow_worker.py`: optional SimPy discrete-event worker.
- `module.js`: native deterministic feasibility planner and simulation; retained unchanged.
- `test.mjs`: package acceptance and backend contract suite.

## Minimal host wiring

```js
import { BackendRegistry, optimizeJobshop } from "./backend-adapters.js";
import { createNodeWorkerTransport } from "./node-worker-transport.js";

const transport = createNodeWorkerTransport({
  commands: {
    "google-or-tools": {
      command: "python3",
      args: ["/opt/ayeai/manufacturing/workers/ortools_jobshop_worker.py"]
    },
    "scipy-highs-jobshop": {
      command: "python3",
      args: ["/opt/ayeai/manufacturing/workers/scipy_highs_jobshop_worker.py"]
    },
    "highs": {
      command: "python3",
      args: ["/opt/ayeai/manufacturing/workers/highs_lp_worker.py"]
    },
    "simpy": {
      command: "python3",
      args: ["/opt/ayeai/manufacturing/workers/simpy_flow_worker.py"]
    }
  },
  timeoutMs: 30000
});
const registry = new BackendRegistry({ transport, enabled: ["google-or-tools", "scipy-highs-jobshop"] });
const result = await optimizeJobshop(registry, canonicalSnapshot, {
  requestId: "stable-idempotency-key",
  preferredBackend: "google-or-tools",
  allowFallback: true
});
```

This is a Node/server-side example. Browser/GitHub Pages must call a separately deployed HTTPS backend gateway using `createHttpJsonTransport`; it must never spawn local processes or expose secrets.

## Canonical integration sequence

1. Resolve project, BOM, work orders, operations, stations, quality evidence and materials through the existing canonical owners.
2. Build a read-only snapshot with explicit units, configuration/version and provenance.
3. Run native `route()` gates before invoking an optimizer. `buildJobshopModel()` does this for every order.
4. Call `optimizeJobshop()` with a stable request ID.
5. Independently validate the returned schedule. A solver's `SUCCEEDED` response is not sufficient.
6. Revalidate the canonical resource version and quality/material state.
7. Commit reservations atomically in the existing Factory/MES owner. This package does not reserve.
8. Advance work orders only through existing lifecycle/role/quality gates.
9. Bind actual inspection, calibration, material-lot and machine telemetry evidence to canonical subjects. Backend simulation output remains SIMULATED/PLANNED and unverified.
10. Record backend ID/version/license, protocol, request ID, model hash, solver options, seed, runtime, status, diagnostics and output digest in the platform's existing provenance/evidence model.

## No duplicate ontology

Backend manifests describe software capabilities, not canonical domain entities. Do not create a second `Component`, `WorkOrder`, `Process`, `Material`, `Evidence` or `Project` store. External identifiers must be mapped to canonical IDs through explicit mapping records owned by the integration layer.

## Fallback rules

- Fallback is opt-in and only for `UNAVAILABLE`.
- Never switch solver after `INFEASIBLE`, `UNKNOWN`, `INVALID`, `FAILED`, timeout, malformed output or failed independent validation without a separately recorded policy decision.
- Never combine partial schedules from two backends.
- Record every attempted backend and reason for selection/fallback.
- Compare different solver outputs using the same normalized model and benchmark objective/tolerance policy.

## Safety and operational boundary

`linuxcnc` is catalogued as a physical controller, but `request-execution` is deliberately held by this package. Physical actuation requires a separate deployment-specific gateway, safety case, authorization, machine interlocks, operator confirmation, watchdog, safe-state behavior and HIL/commissioning evidence. No direct CNC command is sent by this drop-in.

ERPNext operations are data exchange/proposal operations. No external ERP write is issued by this package. Use explicit authenticated host connectors and idempotency keys if later approved.

## Verification

Run:
```sh
node --experimental-default-type=module test.mjs
python3 -m py_compile workers/*.py
```

Optional runtime tests require the corresponding dependencies:
```sh
python3 -m pip install ortools
python3 workers/ortools_jobshop_worker.py < request.json
python3 -m pip install highspy numpy
python3 workers/highs_lp_worker.py < request.json
python3 -m pip install simpy
python3 workers/simpy_flow_worker.py < request.json
```

Dependency installation is intentionally not part of the core package test. Pin versions and generate an SBOM in the deployment build.


## Colab notebook

- Notebook: `notebooks/manufacturing_backend_lab.ipynb`.
- Upload through [Google Colab](https://colab.research.google.com/#create=true) → File → Upload notebook.
- After the notebook is committed to the actual platform repository, replace OWNER/REPOSITORY/BRANCH in the URL template in `COLAB-GUIDE.md`.
- This notebook is optional and not a local software dependency. Manufacturing solver workers remain CPU implementations.
