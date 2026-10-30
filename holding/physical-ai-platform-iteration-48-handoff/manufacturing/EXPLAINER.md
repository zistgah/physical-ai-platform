# Manufacturing drop-in - Iteration 47 hardening release

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Release intent

This package closes the Iteration 47 manufacturing drop-in contract at the planning and simulation boundary. It replaces the original presence-only stub with deterministic route feasibility, finite-capacity accounting, fail-closed quality/material/resource gates, multi-order dispatch planning, a virtual sample simulator, executable fixtures, machine-readable schemas, and a repeatable test suite.

It does not claim that software-only tests have commissioned a factory, connected a PLC, verified a physical part, or established regulatory conformity.

## What an industry leader has

A mature manufacturing operations platform combines finite-horizon multi-resource scheduling, MES dispatch and execution, workforce and tooling constraints, material genealogy, validated quality workflows, maintenance, industrial connectivity, cybersecurity, auditability, and closed-loop production analytics. This drop-in implements the deterministic planning and virtual-simulation slice described below; it does not claim the entire plant execution stack.

## Iteration 47 integration constraints

- Do not flatten the canonical kernel.
- Do not exclude a requirement.
- A HOLD is a HOLD; missing release-critical information must never return OK.
- Add tests that fail when the behavior is removed.
- Preserve copyright and license notices.
- Do not introduce external organization names into this drop-in.
- Grok stitches this package into the platform; this package does not modify the kernel or acceptance script.

## Relationship to the platform MRD and spine

The platform MRD §8 calls for BOM hierarchy and manufacturing operations including DFM/DFA, routing, work instructions, serial/lot/batch traceability, inspection, calibration, nonconformance, rework and yield. The current architecture note `docs/architecture/manufacturing.md` explicitly says that BOM views are projections over canonical components, that work-order/routing/inspection slices exist, and that factory execution and proof of physical manufacture do not exist.

This drop-in respects that boundary. It is a pure adapter over supplied canonical projections. It must not create a parallel entity store or write directly into the kernel.

Existing owners that Grok must preserve and connect:
- `site/components/manufacturing/manufacturing-engine.js`: canonical graph BOM projections and process-plan projection.
- `site/components/manufacturing/product-structure.js`: product structure and BOM relationships.
- `site/components/manufacturing/factory-resolution.js`: `MANUFACTURED_BY` resolution; `WorkOrder` remains the producer of the component.
- `site/components/manufacturing/factory-execution.js`: work-order state and inspection evidence.
- `site/components/manufacturing/factory-closure.js`: process plan, quality record, yield/scrap projection.
- `site/components/manufacturing/factory.js`: existing in-memory machine capacity and work-order progression.
- `site/components/manufacturing/mes.js`: machine queues and gated routing.
- `site/components/manufacturing/logistics.js`: material/hazmat/reverse-logistics classification.
- `site/components/manufacturing/package-export.js`: shared cost/package projection.
- `site/components/manufacturing/sovereignty-risk.js` and `sovereignty-view.js`: explainable dependency and jurisdiction views.

The adapter consumes data from those owners and returns a proposal. Grok's integration layer owns graph resolution, canonical identity mapping, atomic reservation, persistence, work-order mutation, evidence linkage, event transport and rollback.

## Exports

### `route({ order, stations, quality, materials? })`

Plans one order against one resource snapshot.

Required order:
```js
{
  id: "WO-1001",
  quantity: 10,
  routing: [
    {
      id: "op10",
      process: "MILL",
      cycleTimeMinutes: 12,
      setupMinutes: 20,
      requiredCapabilities: ["3AXIS"],
      stationId: null,
      inspectionRequired: false,
      materialRequirements: []
    }
  ],
  materialRequirements: []
}
```

Required station snapshot:
```js
{
  id: "mill-01",
  processes: ["MILL"],
  capabilities: ["3AXIS"],
  status: "READY",
  capacityMinutes: 500,
  bookedMinutes: 50,
  calibration: { status: "VALID", validUntil: "2027-01-01T00:00:00Z" },
  maintenanceDue: false,
  jurisdiction: "IN",
  exportStatus: "NOT_APPLICABLE"
}
```

Required quality release state:
```js
{
  status: "RELEASED",
  exportStatus: "NOT_APPLICABLE",
  requiredInspections: ["op10"],
  inspections: [{ stepId: "op10", outcome: "PASS", verified: true }],
  nonconformances: []
}
```

Material stock records, when material requirements are declared:
```js
[{ materialId: "AL-6061", availableQuantity: 25, status: "RELEASED" }]
```

Capacity values are minutes in the same caller-defined planning window. The adapter does not infer a shift calendar or combine unlike windows. Demand per operation is `setupMinutes + quantity * cycleTimeMinutes`. Every required operation must resolve to an available compatible station with enough remaining capacity. A pinned `stationId` must match exactly.

The deterministic single-order heuristic chooses the feasible station with the lowest projected utilization, then lexical station id. It is not a proof of globally optimal routing. Missing or unknown release-critical inputs fail closed.

### `planOrders({ orders, stations })`

Plans multiple order proposals against one shared station-capacity snapshot. Each order entry is:
```js
{
  order: { /* same order contract as route */ },
  quality: { /* same quality contract as route */ },
  materials: [ /* optional material snapshot */ ],
  priority: 10,
  dueDate: "2026-11-15T00:00:00Z"
}
```

Dispatch order is priority descending, due date ascending, then order id ascending. A successful proposal consumes virtual capacity for subsequent proposals in the same planning run. A held order consumes no capacity. Duplicate order identities fail closed. This is a deterministic dispatch heuristic, not a global optimizer, and it does not reserve capacity.

### `simulateManufacturing(input)`

Runs the route proposal through a deterministic in-memory scenario and reports input, good, scrap and simulated-yield quantities plus operation genealogy. The evidence record is explicitly `SIMULATED` and `verified:false`. It is not physical inspection evidence, PLC feedback, MES execution, or proof of manufacture.

## Fail-closed invariants

1. Missing order identity, quantity, routing, station, quality release, calibration, or required material stock cannot produce `OK`.
2. Quality must explicitly be `RELEASED`; export/compliance must explicitly be cleared, not controlled, or not applicable.
3. Open/unknown nonconformances and required inspections without verified PASS evidence cause HOLD.
4. Material requirements are summed by material id before stock comparison. Duplicate stock records are held for reconciliation rather than double-counted.
5. Station capacity and booked load must be finite and non-negative. Existing overbooking is a blocker.
6. Stations must explicitly be available (`available:true` or status `AVAILABLE`, `IDLE`, `READY`); offline, maintenance, disabled and unspecified states are not schedulable.
7. Calibration must be VALID and not expired. A malformed expiry date is a blocker.
8. A maintenance-due station and unresolved jurisdiction/export state cause HOLD.
9. A multi-order schedule consumes capacity only for fully feasible orders. A partially feasible order does not reserve a partial route.
10. Input projections are never mutated. Planning and simulation never reserve capacity, change inventory, advance a work order, write kernel entities or control equipment.
11. `OK` means feasible against the supplied snapshot only. It does not authorize physical execution.

## Output contract

All route results include:
- `outcome` and `status`: `OK` or `HOLD`.
- `issues` / `blockers`: stable machine-readable code, path, message and severity.
- `route`: ordered operation-to-station proposal.
- `metrics`: operation counts, minutes, station count and projected station loads.
- `semantics`: explicit flags that distinguish proposal, reservation, execution, physical proof and graph mutation.

`planOrders` additionally returns the ordered `schedule`, per-order outcome and aggregate scheduled/held counts. `simulateManufacturing` additionally returns simulated yield/scrap, genealogy and explicitly unverified simulation evidence.

## Integration protocol for Grok

1. Read `HANDOFF.md`, this explainer, `docs/MRD.md` §8 and `docs/architecture/manufacturing.md`.
2. Resolve canonical component identity and BOM projections through `ManufacturingEngine`; do not reconstruct BOMs inside this package.
3. Resolve process plans, work orders, factory resources, quality evidence and materials through their existing owners.
4. Build a normalized snapshot in the input shape. Preserve canonical IDs, source references, revision/version, provenance and measurement units in the integration envelope.
5. Invoke `route` for one order or `planOrders` for a shared planning batch.
6. Before commit, compare the factory/resource snapshot version used for planning with the current version. If it changed, discard and re-plan.
7. Reserve capacity atomically in the factory/MES owner. A successful pure planning result is not a reservation. If atomic reservation fails, return HOLD and do not release the work order.
8. Only after reservation and all lifecycle/role/quality gates pass may the existing execution owner advance the canonical work order.
9. Link actual inspection, calibration, material-lot, serial/batch and nonconformance evidence to canonical entities through existing provenance/evidence mechanisms. Never mark simulation evidence as verified physical evidence.
10. On cancellation, failed operation, NCR, material substitution or station fault, release or reconcile reservations transactionally and retain an auditable event history.
11. Keep this package side-effect-free. Do not import the kernel or add browser/PLC/database dependencies here.
12. Run the module suite, Iteration 47 acceptance, regression checklist and all conformance suites after integration.

### Concurrency requirement

The package deliberately does not implement a process-local mutex or pretend that an in-memory lock is a distributed transaction. The owning factory service must provide an atomic compare-and-reserve operation using a resource version, serializable transaction, or equivalent concurrency control. Two planners may produce the same proposal from the same snapshot; only one may commit if capacity is contested.

### Idempotency requirement

The integration owner must assign stable work-order and operation IDs and use an idempotency key for reservation and execution commands. Retrying a command must not double-book a station, issue material twice, duplicate a completion event, or create duplicate evidence.

## Standards alignment and claims

The adapter's concepts are intended to map into the platform's manufacturing operations model. ISA-95 / IEC 62264 is the relevant enterprise-control integration reference family. No conformance claim is made by this package. Grok should create an explicit mapping table from canonical entities and events to the adopted edition and applicable parts, then verify it against licensed normative texts and the target plant's profile. OPC UA information models and companion specifications may be used at the integration boundary where the actual device/MES stack supports them.

The package does not claim ISO 9001, ISO/IEC 17025, sector-regulatory, safety, export-control, or ISA-95 certification. A software status field is not a compliance determination.

## Verification

Run from this directory:
```sh
node --experimental-default-type=module test.mjs
```

The suite uses Node's built-in assertion library only. It includes positive/negative route cases, resource and quality gates, material aggregation, calibration and jurisdiction checks, multi-operation cumulative capacity, multi-order shared capacity and dispatch ordering, input immutability, deterministic simulation, yield/scrap arithmetic, genealogy, malformed numeric inputs, 100 generated capacity-boundary cases, and both packaged sample fixtures.

The two route samples are executable fixtures:
- `samples/route-feasible.json`: valid two-operation route with material availability and verified inspection; simulator must complete.
- `samples/route-quality-hold.json`: active quality hold; route must HOLD.

The multi-order sample:
- `samples/schedule-multi-order.json`: priority dispatch with shared capacity; one order schedules and the lower-priority order is held.

## Package boundary: what is closed here

Closed within this drop-in:
- deterministic single-order route feasibility;
- finite capacity and cumulative operation loading;
- compatible station assignment and pinned station constraints;
- explicit quality, inspection, NCR, material, calibration, maintenance and jurisdiction gates;
- multi-order dispatch against shared finite capacity;
- deterministic virtual simulation, yield/scrap arithmetic and route genealogy;
- executable positive, negative and multi-order sample fixtures;
- machine-readable route input/output schemas;
- documented contracts, invariants, integration sequence and test commands.

The platform's MRD and current architecture explicitly distinguish planning projections from physical factory execution. Therefore live PLC/OPC UA connectivity, actual equipment dispatch, atomic persistent reservations, physical metrology, real material issue, serial/lot genealogy from shop-floor events, regulated validation and factory commissioning remain responsibilities of the existing platform owners and target deployment. They are not represented as completed by a drop-in planning adapter.

## Files

- `module.js`: implementation; exports `route`, `planOrders`, `simulateManufacturing`.
- `test.mjs`: standalone regression and scenario suite.
- `input.schema.json`, `output.schema.json`: route JSON contracts.
- `samples/`: executable JSON scenarios.


## Open-source backend ecosystem

This module is not limited to native algorithms. It includes an optional, replaceable backend registry and a versioned JSON protocol so established external algorithms can be called without importing their object models into the canonical graph.

See `BACKENDS.md`, `backend-catalog.json`, `manifest.json` and `STITCH-INSTRUCTIONS.md`.

Included backend families:
- OR-Tools CP-SAT: executable job-shop worker with optional intervals, station no-overlap, operation precedence, makespan objective and finite station capacity.
- HiGHS: executable LP/MILP worker for linear production planning models, using `highspy` or SciPy's HiGHS-backed `milp`.
- SimPy: executable discrete-event flow worker for queueing, resource contention and throughput scenarios.
- Timefold Solver: common job-shop protocol adapter contract for an alternative heuristic/constraint solver.
- frePPLe Community: APS/MRP service adapter contract.
- FreeCAD + OpenCAMLib: CAM/geometry adapter contract.
- ERPNext Manufacturing: BOM/work-order/material/quality exchange contract.
- LinuxCNC: guarded machine gateway contract; physical actuation is explicitly blocked by this package.

External code is not vendored. Optional backends are disabled by default. The package does not download or install external dependencies. Backend presence, license and capabilities must be verified against the pinned deployment version.

### Backend safety and correctness

- The host must explicitly enable a backend.
- Every call requires a stable request ID.
- Payloads must be JSON-safe and finite; payload size is bounded.
- Remote calls use HTTPS, except HTTP on loopback development endpoints.
- Node worker execution uses an allowlisted command/argument array and `shell:false`.
- Fallback is opt-in and permitted only when a backend reports `UNAVAILABLE`.
- Infeasible, unknown, invalid, failed, timed-out or malformed results do not silently fall through to another solver.
- OR-Tools and SciPy/HiGHS job-shop output is independently checked for operation completeness, duplicate assignment, station eligibility, duration, precedence, station overlap, total available capacity and planning horizon.
- External solver output remains PLANNED; simulation output remains SIMULATED. Neither is verified physical evidence.
- LinuxCNC physical execution requests are held. A separate safety-qualified gateway and commissioning case are required.

### What is actually executable in this package

The OR-Tools CP-SAT, SciPy/HiGHS job-shop MILP, HiGHS LP/MILP and SimPy Python workers are included. SciPy/HiGHS job-shop and LP/MILP numerical execution was tested successfully in this environment. OR-Tools and SimPy were not installed; their workers returned `UNAVAILABLE` rather than fabricating results. Their Python syntax and request/response protocol were tested. Their numerical algorithms require a deployment with the relevant pinned dependencies before runtime acceptance.

Timefold and frePPLe are catalogued behind the generic HTTPS gateway; FreeCAD/OpenCAMLib and LinuxCNC require deployment-specific workers/gateways. ERPNext has a read-only Frappe REST adapter and proposal-only updates, exercised against a mocked transport but not a live instance.


## Iteration 48 documentation and browser execution

The complete three-cycle analysis is in `BUILD-ANALYSIS.md`. Public exports and worker behavior are indexed in `API-REFERENCE.md`; boundary-oriented coverage is mapped in `TEST-MATRIX.md`. `COLAB-GUIDE.md` explains the browser-only notebook workflow. The notebook is an optional cloud lab, not a mandatory runtime dependency.

The separate `compute-orchestration` package handles the MRD's distributed execution / remote worker extension point. It is deliberately outside this Manufacturing package.
