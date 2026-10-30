# Optional open-source manufacturing backend ecosystem

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Design principle

The platform owns canonical meaning, identity, provenance, authorization, lifecycle and evidence. External packages supply replaceable algorithms or operational adapters. Their internal object models are translated at the boundary; they do not become a second ontology or system of record.

The catalog is curated, not exhaustive. A backend is usable only when its deployment is installed, pinned, configured, health-checked and mapped to the versioned protocol. Catalog presence is not proof of availability.

## Included integrations

| Backend | Useful manufacturing capability | Included adapter / worker | License reported by upstream | Current package status |
|---|---|---|---|---|
| Google OR-Tools CP-SAT | Job-shop scheduling, machine assignment, precedence and no-overlap constraints | Executable Python worker + registry adapter | Apache-2.0 | Worker implemented; dependency/runtime optional |
| HiGHS | LP/MILP for lot sizing, capacity allocation and material blending | Executable Python worker using highspy or SciPy's HiGHS-backed milp | MIT (HiGHS); BSD-3-Clause (SciPy fallback) | Numerical LP/MILP worker implemented; SciPy fallback tested |
| SciPy MILP (HiGHS) | Job-shop scheduling with assignment, precedence, no-overlap and finite-capacity constraints | Executable Python worker + independent schedule validator | BSD-3-Clause (SciPy) + MIT (HiGHS) | Numerical worker implemented and tested against sample cases |
| Timefold Solver Community | Constraint/heuristic scheduling, workforce and maintenance planning | Generic HTTPS JSON gateway adapter contract | Apache-2.0 | Service adapter contract; deployment required |
| frePPLe Community | APS, MRP, supply-chain planning and forecasting | Generic HTTPS JSON gateway adapter contract | MIT for Community Edition | Service adapter contract; edition/version pin required |
| SimPy | Discrete-event flow, queues, station contention, throughput and shift scenarios | Executable Python worker + registry adapter | MIT | Worker implemented; dependency/runtime optional |
| FreeCAD + OpenCAMLib | Parametric geometry/CAM toolpath generation and validation | Protocol catalog + worker gateway contract | FreeCAD LGPL-2.1; OpenCAMLib LGPL-2.1 | Runtime-specific adapter required; no claim of toolpath validation here |
| ERPNext Manufacturing | BOM, work orders, job cards, material requests, quality records | Protocol catalog + read-only Frappe REST adapter | GPL-3.0 | Read-only REST adapter and proposal-only work-order updates; deployment credentials required |
| LinuxCNC | CNC program interpretation and machine status/control | Protocol catalog + guarded machine-gateway contract | GPL-2.0 / LGPL components; verify deployed build | Physical execution intentionally blocked in this package |

Upstream references:
- OR-Tools: https://github.com/google/or-tools
- HiGHS: https://highs.dev/
- SciPy: https://scipy.org/
- Timefold Solver: https://timefold.ai/solver
- frePPLe: https://github.com/frePPLe/frepple
- SimPy: https://simpy.readthedocs.io/
- FreeCAD: https://github.com/FreeCAD/FreeCAD
- OpenCAMLib: https://github.com/aewallin/opencamlib
- ERPNext: https://github.com/frappe/erpnext
- LinuxCNC: https://github.com/linuxcnc/linuxcnc

## Why these backends

### Scheduling and optimization
- OR-Tools CP-SAT is appropriate for discrete job-shop constraints, machine assignment, operation precedence, and no-overlap scheduling.
- The included SciPy `milp` worker formulates job-shop assignment and disjunctive machine sequencing as a mixed-integer linear program solved by HiGHS. It provides a runnable open numerical backend even where OR-Tools is not installed.
- HiGHS is appropriate for linear and mixed-integer production planning models such as lot sizing, material blending and capacity allocation. It is not a general nonlinear optimizer; the included worker does not expose QP.
- Timefold provides a second, heuristic/constraint-based scheduling family. It is useful as an alternative algorithm and comparative benchmark, not an automatic silent fallback.
- frePPLe provides a broader APS/MRP system. It should be treated as an external planning service, with explicit data synchronization and edition-aware capability checks.

### Discrete-event manufacturing simulation
SimPy models process flows and shared resources. It can answer queue, utilization, lead-time and throughput questions. It is not a continuous-physics or machine-dynamics solver and does not prove a real factory's performance.

### Geometry and CAM
FreeCAD and OpenCAMLib provide a route to reuse established geometry and CAM algorithms. Toolpath generation must be checked against stock, tool, fixture, machine kinematics, collision envelope, postprocessor and machine-specific limits. The catalog does not imply those checks are implemented by this package.

### Enterprise and machine integration
ERPNext provides manufacturing entities and workflow data such as BOMs, work orders, job cards and material requests. LinuxCNC is a machine-control system, not a generic scheduling solver. Both require deployment-specific connectors, authorization and lifecycle integration.

## Protocol

Request:
```json
{
  "protocol": "ayeai.manufacturing.backend/v1",
  "requestId": "stable-idempotency-key",
  "capability": "manufacturing.jobshop.optimize",
  "operation": "solve-jobshop",
  "executionClass": "planning",
  "metadata": {"modelVersion":"1.0.0","timeUnit":"minute","horizonMinutes":480},
  "payload": {"model": {}, "solverOptions": {"timeLimitSeconds":30,"deterministic":true,"randomSeed":0}}
}
```

Response:
```json
{
  "protocol": "ayeai.manufacturing.backend/v1",
  "requestId": "stable-idempotency-key",
  "backendId": "google-or-tools",
  "backendVersion": "pinned-deployment-version",
  "status": "SUCCEEDED",
  "result": {"assignments":[],"makespanMinutes":0,"optimal":false},
  "diagnostics": []
}
```

Statuses:
- `SUCCEEDED`: result is syntactically valid and eligible for independent domain validation.
- `INFEASIBLE`: solver proves no feasible solution under the supplied model.
- `UNKNOWN`: solver cannot establish a result within limits or returns unresolved status.
- `INVALID`: request/model rejected.
- `FAILED`: execution error, numerical failure, malformed output or protocol violation.
- `UNAVAILABLE`: dependency or service is not installed/reachable.

Only `SUCCEEDED` can become an `OK` adapter result. Even then, domain validation is mandatory. `INFEASIBLE`, `UNKNOWN`, `INVALID` and `FAILED` never trigger automatic solver fallback. Fallback is opt-in and only for `UNAVAILABLE`.

## Security and reproducibility

- Pin backend version, build digest, Python/JVM/runtime version, solver parameters and worker image digest.
- Use an allowlisted executable path and argument vector. The Node worker transport uses `spawn` with `shell:false`; it does not accept shell command strings.
- Configure credentials in the host secret store. Never put tokens in package manifests, endpoint URLs, test fixtures or logs.
- Use TLS for remote endpoints. HTTP is accepted only for loopback development endpoints.
- Enforce request/response byte limits and execution timeouts.
- Use stable request IDs and idempotency keys.
- Capture model digest, units, coordinate frame, constraints, random seed, tolerances, runtime, solver status, diagnostics and output digest.
- Treat non-deterministic or parallel solver runs as non-reproducible unless the backend's own determinism guarantees and run configuration are verified.
- Scan backend artifacts and transitive dependencies; record SPDX/CycloneDX SBOM and license notices at deployment.
- The catalog's license string is an upstream summary, not legal advice. Check exact version, optional modules, transitive dependencies, distribution model and license texts before bundling or network deployment.

## Capability maturity

- **Implemented and locally testable:** protocol registry, HTTP transport, Node process transport, OR-Tools CP-SAT worker, SciPy/HiGHS job-shop MILP worker, HiGHS LP/MILP worker, SimPy worker, read-only ERPNext/Frappe transport, independent job-shop schedule validator.
- **Adapter contract only:** Timefold, frePPLe, FreeCAD/OpenCAMLib and LinuxCNC.
- **Implemented read-only REST adapter:** ERPNext/Frappe; remote writes remain proposal-only.
- **Not implemented here:** machine actuation, atomic reservation, live ERP writes, CAD/CAM collision proof, postprocessor certification, physical inspection, real-world HIL and production qualification.

This maturity split is intentional. No connector is labelled operational merely because a manifest exists.
