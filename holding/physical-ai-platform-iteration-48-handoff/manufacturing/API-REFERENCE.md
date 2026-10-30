# Manufacturing API Reference

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Native engine - `module.js`

| Export | Purpose | Side effects |
|---|---|---|
| `route(input)` | Validate a work order, routing, materials, quality, resources and capacity; return route decision | None |
| `planOrders(input)` | Plan a finite set of work orders against available stations and constraints | None |
| `simulateManufacturing(input)` | Simulate the proposed route and yield assumptions | None; output is simulation only |

The native engine is the baseline and remains available when no external backend is configured.

## Backend adapter - `backend-adapters.js`

| Export | Purpose |
|---|---|
| `BackendContractError` | Stable machine-readable error code and message |
| `BackendRegistry` | Register, enable, disable, list, discover and invoke optional backends |
| `BACKEND_CATALOG` | Curated metadata; not evidence of installation or availability |
| `createHttpJsonTransport(options)` | HTTPS JSON transport for replaceable service adapters |
| `createFrappeRestTransport(options)` | Read-only ERPNext/Frappe resource reads and proposal-only work-order updates |
| `buildJobshopModel(input)` | Lower native work orders/stations into versioned job-shop IR |
| `validateJobshopSchedule(model,schedule)` | Independent schedule completeness, station, duration, precedence, overlap, capacity and horizon checks |
| `optimizeJobshop(registry,input,options)` | Invoke explicitly enabled solver and independently validate its returned schedule |
| `createWorkerTransport(options)` | Injected worker transport contract |

## Node worker transport

`node-worker-transport.js` exports `createNodeWorkerTransport(options)`. It invokes allowlisted executable/argument arrays with `shell:false`, bounded output, timeout and structured JSON I/O. It is Node-only and must not be imported into the browser bundle.

## Worker protocols

| Worker | Operation | Numerical family |
|---|---|---|
| `workers/ortools_jobshop_worker.py` | `solve-jobshop` | OR-Tools CP-SAT |
| `workers/scipy_highs_jobshop_worker.py` | `solve-jobshop` | SciPy MILP backed by HiGHS |
| `workers/highs_lp_worker.py` | `solve-linear-model`, `solve-mip-model` | HiGHS LP/MILP through highspy or SciPy |
| `workers/simpy_flow_worker.py` | `simulate-flow` | SimPy discrete-event simulation |

All worker requests use `ayeai.manufacturing.backend/v1`. See `BACKENDS.md` and the JSON schemas.

## Result semantics

- `SUCCEEDED` means the worker produced a protocol-valid result.
- `INFEASIBLE` means the solver determined that the model has no feasible solution under its formulation.
- `UNKNOWN` means the solver could not establish a result.
- `INVALID` means request or model validation failed.
- `FAILED` means execution or result processing failed.
- `UNAVAILABLE` means the dependency/service is absent or unreachable.

Only `UNAVAILABLE` is eligible for fallback, and only when the caller explicitly enables fallback. Every successful job-shop schedule is independently validated. Simulation remains `SIMULATED`; planning remains `PLANNED`.
