# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# License: GPL-3.0-only
"""Optional optimization companion for the browser-first logistics domain.

The platform's JavaScript module remains the deterministic, no-backend baseline.
This module is invoked explicitly from Google Colab for constrained sourcing LP
and stochastic disruption analysis. It never writes to the canonical spine.
"""
from __future__ import annotations
from math import isfinite
from typing import Any

def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value)

def _hold(reason: str, **extra: Any) -> dict:
    return {"outcome": "HOLD", "reason": reason, **extra}

def available_backends() -> dict:
    """Report optional open-source solver availability without importing a backend eagerly."""
    import importlib.util
    scipy_ok=importlib.util.find_spec("scipy") is not None and importlib.util.find_spec("numpy") is not None
    ortools_ok=importlib.util.find_spec("ortools") is not None
    pyomo_ok=importlib.util.find_spec("pyomo") is not None and importlib.util.find_spec("highspy") is not None
    return {
        "SCIPY_HIGHS":{"available":scipy_ok,"role":"CPU linear programming"},
        "ORTOOLS_GLOP":{"available":ortools_ok,"role":"optional CPU linear programming"},
        "PYOMO_HIGHS":{"available":pyomo_ok,"role":"optional algebraic modeling with HiGHS"}
    }

def optimize_sourcing(problem: dict) -> dict:
    """Minimize weighted cost/lead-time/carbon while exactly satisfying each demand.

    Inputs:
      demand: [{part, quantity, due_days, currency}]
      offers: [{id, supplier_id, part, capacity, unit_cost, lead_days, carbon_kg,
                currency, approved, export_status, lifecycle_status}]
      weights: {cost, lead_time, carbon}; max_supplier_share optional in [0,1]
      carbon_cap_kg optional.
    Unknown/unapproved/obsolete/late/export-uncleared offers are excluded, never
    silently relaxed. Select SCIPY_HIGHS (default), ORTOOLS_GLOP or PYOMO_HIGHS.
    Optional backends are explicit and never silently substituted. This is a plan, not a PO.
    """
    if not isinstance(problem, dict):
        return _hold("Problem must be an object")
    backend=problem.get("backend","SCIPY_HIGHS")
    if backend not in ("SCIPY_HIGHS","ORTOOLS_GLOP","PYOMO_HIGHS"):
        return _hold("Unknown optimization backend",backend=backend)
    demand = problem.get("demand")
    offers = problem.get("offers")
    if not isinstance(demand, list) or not demand or not isinstance(offers, list) or not offers:
        return _hold("Non-empty demand and offer arrays are required")
    parts = {}
    currency = None
    for i, d in enumerate(demand):
        if not isinstance(d, dict) or not isinstance(d.get("part"), str) or not d["part"].strip():
            return _hold("Demand part is missing", index=i)
        q = d.get("quantity")
        due = d.get("due_days")
        cur = d.get("currency")
        if not _finite(q) or q <= 0 or not _finite(due) or due < 0 or not isinstance(cur, str) or not cur:
            return _hold("Demand quantity, due_days and currency must be explicit", index=i)
        if d["part"] in parts:
            return _hold("Duplicate demand part rows must be coalesced explicitly", part=d["part"])
        parts[d["part"]] = d
        currency = currency or cur
        if cur != currency:
            return _hold("Mixed demand currencies are unsupported")
    eligible, excluded = [], []
    seen_ids = set()
    for i, o in enumerate(offers):
        if not isinstance(o, dict) or not isinstance(o.get("id"), str) or not o["id"]:
            return _hold("Every offer requires a stable ID", index=i)
        if o["id"] in seen_ids:
            return _hold("Duplicate offer ID", offer_id=o["id"])
        seen_ids.add(o["id"])
        required = ["supplier_id", "part", "capacity", "unit_cost", "lead_days", "carbon_kg", "currency"]
        if any(k not in o for k in required):
            return _hold("Offer fields must be explicit", offer_id=o["id"])
        if not all(_finite(o[k]) for k in ["capacity", "unit_cost", "lead_days", "carbon_kg"]):
            return _hold("Offer numeric fields must be finite", offer_id=o["id"])
        if o["capacity"] < 0 or o["unit_cost"] < 0 or o["lead_days"] < 0 or o["carbon_kg"] < 0:
            return _hold("Offer numeric fields cannot be negative", offer_id=o["id"])
        if o["currency"] != currency:
            return _hold("Offer currency differs from demand currency", offer_id=o["id"])
        reason = None
        if o["part"] not in parts: reason = "PART_NOT_DEMANDED"
        elif o.get("approved") is not True: reason = "SUPPLIER_NOT_APPROVED"
        elif o.get("export_status") not in ("CLEAR", "NOT_CONTROLLED"): reason = "EXPORT_NOT_CLEARED"
        elif o.get("lifecycle_status") not in ("ACTIVE", "LAST_TIME_BUY"): reason = "LIFECYCLE_NOT_ELIGIBLE"
        elif o["lead_days"] > parts[o["part"]]["due_days"]: reason = "MISSES_DUE_DATE"
        elif o["capacity"] <= 0: reason = "NO_CAPACITY"
        if reason: excluded.append({"offer_id": o["id"], "reason": reason})
        else: eligible.append(o)
    if not eligible:
        return _hold("No eligible offers remain after qualification", excluded_offers=excluded)
    weights = problem.get("weights", {})
    if not isinstance(weights, dict):
        return _hold("Weights must be an object")
    w = {"cost": weights.get("cost", 1.0), "lead_time": weights.get("lead_time", 0.0),
         "carbon": weights.get("carbon", 0.0)}
    if not all(_finite(v) and v >= 0 for v in w.values()) or sum(w.values()) <= 0:
        return _hold("Objective weights must be finite, non-negative and not all zero")
    max_share = problem.get("max_supplier_share")
    if max_share is not None and (not _finite(max_share) or not 0 < max_share <= 1):
        return _hold("max_supplier_share must be in (0,1]")
    carbon_cap = problem.get("carbon_cap_kg")
    if carbon_cap is not None and (not _finite(carbon_cap) or carbon_cap < 0):
        return _hold("carbon_cap_kg must be non-negative")
    n = len(eligible)
    objective = [
        w["cost"] * o["unit_cost"] + w["lead_time"] * o["lead_days"] +
        w["carbon"] * o["carbon_kg"] for o in eligible
    ]
    A_ub, b_ub, A_eq, b_eq = [], [], [], []
    # Each offer has an explicit upper bound.
    bounds = [(0.0, float(o["capacity"])) for o in eligible]
    # Exactly meet each demand part; no overbuy hidden in the objective.
    for part, d in parts.items():
        row = [1.0 if o["part"] == part else 0.0 for o in eligible]
        A_eq.append(row); b_eq.append(float(d["quantity"]))
    # Supplier share caps prevent an optimizer from concentrating supply beyond policy.
    if max_share is not None:
        for part, d in parts.items():
            for supplier in sorted({o["supplier_id"] for o in eligible if o["part"] == part}):
                row = [1.0 if o["part"] == part and o["supplier_id"] == supplier else 0.0 for o in eligible]
                A_ub.append(row); b_ub.append(float(d["quantity"]) * max_share)
    if carbon_cap is not None:
        A_ub.append([float(o["carbon_kg"]) for o in eligible]); b_ub.append(float(carbon_cap))
    solution=None
    objective_value=None
    solver_name=backend
    if backend=="SCIPY_HIGHS":
        try:
            import numpy as np
            from scipy.optimize import linprog
        except Exception as exc:
            return _hold("SciPy and NumPy are required for SCIPY_HIGHS",dependency_error=type(exc).__name__)
        solved=linprog(np.array(objective,dtype=float),
            A_ub=np.array(A_ub,dtype=float) if A_ub else None,
            b_ub=np.array(b_ub,dtype=float) if b_ub else None,
            A_eq=np.array(A_eq,dtype=float),b_eq=np.array(b_eq,dtype=float),
            bounds=bounds,method="highs")
        if not solved.success:
            return _hold("Constrained sourcing problem is infeasible or solver did not converge",
                solver_status=int(solved.status),solver_message=str(solved.message),
                eligible_offer_ids=[o["id"] for o in eligible],excluded_offers=excluded)
        solution=[float(x) for x in solved.x]
        objective_value=float(solved.fun)
        solver_name="SciPy HiGHS"
    elif backend=="ORTOOLS_GLOP":
        try:
            from ortools.linear_solver import pywraplp
        except Exception as exc:
            return _hold("Optional OR-Tools backend is not installed",backend=backend,dependency_error=type(exc).__name__)
        solver=pywraplp.Solver.CreateSolver("GLOP")
        if solver is None:return _hold("OR-Tools GLOP solver is unavailable",backend=backend)
        variables=[solver.NumVar(0.0,float(bounds[i][1]),f"x_{i}") for i in range(n)]
        for row,rhs in zip(A_eq,b_eq):
            c=solver.RowConstraint(float(rhs),float(rhs),"demand")
            for i,v in enumerate(row):
                if v:c.SetCoefficient(variables[i],float(v))
        for row,rhs in zip(A_ub,b_ub):
            c=solver.RowConstraint(-solver.infinity(),float(rhs),"upper")
            for i,v in enumerate(row):
                if v:c.SetCoefficient(variables[i],float(v))
        obj=solver.Objective()
        for i,v in enumerate(objective):obj.SetCoefficient(variables[i],float(v))
        obj.SetMinimization()
        status=solver.Solve()
        if status!=pywraplp.Solver.OPTIMAL:
            return _hold("OR-Tools GLOP did not find an optimal feasible plan",backend=backend,solver_status=int(status),excluded_offers=excluded)
        solution=[v.solution_value() for v in variables]
        objective_value=obj.Value()
        solver_name="OR-Tools GLOP"
    else:
        try:
            import pyomo.environ as pyo
            from pyomo.opt import TerminationCondition
        except Exception as exc:
            return _hold("Optional Pyomo backend is not installed",backend=backend,dependency_error=type(exc).__name__)
        model=pyo.ConcreteModel()
        model.I=pyo.RangeSet(0,n-1)
        model.x=pyo.Var(model.I,domain=pyo.NonNegativeReals,
                        bounds=lambda m,i:(0.0,float(bounds[i][1])))
        model.eq=pyo.ConstraintList()
        for row,rhs in zip(A_eq,b_eq):
            model.eq.add(sum(float(row[i])*model.x[i] for i in range(n))==float(rhs))
        model.ub=pyo.ConstraintList()
        for row,rhs in zip(A_ub,b_ub):
            model.ub.add(sum(float(row[i])*model.x[i] for i in range(n))<=float(rhs))
        model.obj=pyo.Objective(expr=sum(float(objective[i])*model.x[i] for i in range(n)),sense=pyo.minimize)
        solver=pyo.SolverFactory("highs")
        if solver is None or not solver.available(exception_flag=False):
            return _hold("Pyomo HiGHS solver executable is unavailable",backend=backend)
        solved=solver.solve(model,tee=False)
        if solved.solver.termination_condition!=TerminationCondition.optimal:
            return _hold("Pyomo HiGHS did not find an optimal feasible plan",backend=backend,
                         solver_status=str(solved.solver.termination_condition),excluded_offers=excluded)
        solution=[float(pyo.value(model.x[i])) for i in range(n)]
        objective_value=float(pyo.value(model.obj))
        solver_name="Pyomo + HiGHS"
    allocations = []
    for o, x in zip(eligible, solution):
        if x > 1e-8:
            allocations.append({"offer_id": o["id"], "supplier_id": o["supplier_id"],
                "part": o["part"], "quantity": float(x), "unit_cost": o["unit_cost"],
                "lead_days": o["lead_days"], "carbon_kg": o["carbon_kg"],
                "extended_cost": float(x) * o["unit_cost"], "currency": currency})
    return {"outcome": "OK", "mode": "CONSTRAINED_SOURCING_LP",
        "solver": solver_name, "backend": backend, "objective_value": float(objective_value),
        "currency": currency, "allocations": allocations, "excluded_offers": excluded,
        "total_quantity": sum(a["quantity"] for a in allocations),
        "total_cost": sum(a["extended_cost"] for a in allocations),
        "total_carbon_kg": sum(a["quantity"] * a["carbon_kg"] for a in allocations),
        "commitment": "OPTIMIZED_PLAN_NOT_PURCHASED",
        "limitations": ["Deterministic LP, not stochastic multi-echelon inventory optimization",
          "No procurement, reservation, customs filing or dispatch is executed",
          "Weights encode trade-offs; use explicit policy approval before acting"]}

def safety_stock(mean_daily_demand: float, demand_std: float, mean_lead_days: float,
                 lead_std_days: float, service_level: float) -> dict:
    """Normal-approximation safety stock with explicit service-level validation."""
    values = [mean_daily_demand, demand_std, mean_lead_days, lead_std_days, service_level]
    if not all(_finite(v) for v in values) or min(values[:4]) < 0 or mean_lead_days <= 0 or not 0 < service_level < 1:
        return _hold("Safety-stock inputs are outside the valid domain")
    try:
        from statistics import NormalDist
        z = NormalDist().inv_cdf(service_level)
        variance = mean_lead_days * demand_std**2 + mean_daily_demand**2 * lead_std_days**2
        ss = max(0.0, z * variance**0.5)
        return {"outcome":"OK","z":z,"safety_stock":ss,
                "reorder_point":mean_daily_demand*mean_lead_days+ss,
                "assumption":"Independent normal demand and lead-time approximation"}
    except Exception as exc:
        return _hold("Safety-stock calculation failed", error=type(exc).__name__)

def simulate_uncertainty(*, mean_daily_demand: float, demand_std: float,
                         mean_lead_days: float, lead_std_days: float,
                         supply_quantity: float, iterations: int = 10000,
                         seed: int = 47, use_gpu: bool = False) -> dict:
    """Monte Carlo stockout/fill-rate simulation; optional PyTorch CUDA execution.

    GPU is used only for the Monte Carlo tensor workload when CUDA is available.
    LP sourcing remains CPU-based. A GPU runtime is optional and never required.
    """
    vals=[mean_daily_demand,demand_std,mean_lead_days,lead_std_days,supply_quantity]
    if not all(_finite(v) for v in vals) or min(vals)<0 or mean_lead_days<=0:
        return _hold("Monte Carlo parameters are invalid")
    if not isinstance(iterations,int) or iterations<100 or iterations>2_000_000:
        return _hold("iterations must be between 100 and 2,000,000")
    try:
        import numpy as np
    except Exception as exc:
        return _hold("NumPy is required for Monte Carlo simulation", dependency_error=type(exc).__name__)
    device="cpu"
    try:
        import torch
        if use_gpu and torch.cuda.is_available():
            device="cuda"
            gen=torch.Generator(device="cuda").manual_seed(seed)
            demand=torch.clamp(torch.normal(mean_daily_demand, max(demand_std,1e-9), (iterations,), generator=gen, device="cuda"), min=0)
            lead=torch.clamp(torch.normal(mean_lead_days, max(lead_std_days,1e-9), (iterations,), generator=gen, device="cuda"), min=0)
            consumption=demand*lead
            fill=torch.clamp(float(supply_quantity)/(consumption+1e-9), max=1.0)
            demand_np=demand.cpu().numpy(); lead_np=lead.cpu().numpy(); fill_np=fill.cpu().numpy()
        else:
            rng=np.random.default_rng(seed)
            demand_np=np.maximum(0,rng.normal(mean_daily_demand,max(demand_std,1e-9),iterations))
            lead_np=np.maximum(0,rng.normal(mean_lead_days,max(lead_std_days,1e-9),iterations))
            fill_np=np.minimum(1,float(supply_quantity)/(demand_np*lead_np+1e-9))
    except ImportError:
        rng=np.random.default_rng(seed)
        demand_np=np.maximum(0,rng.normal(mean_daily_demand,max(demand_std,1e-9),iterations))
        lead_np=np.maximum(0,rng.normal(mean_lead_days,max(lead_std_days,1e-9),iterations))
        fill_np=np.minimum(1,float(supply_quantity)/(demand_np*lead_np+1e-9))
    return {"outcome":"OK","mode":"MONTE_CARLO_SERVICE_RISK","device":device,
        "iterations":iterations,"seed":seed,
        "stockout_probability":float(np.mean(fill_np<0.999999)),
        "mean_fill_rate":float(np.mean(fill_np)),
        "p05_fill_rate":float(np.quantile(fill_np,0.05)),
        "p95_lead_days":float(np.quantile(lead_np,0.95)),
        "note":"Statistical planning estimate, not a service-level guarantee."}


def analyze_network_resilience(nodes: list, edges: list, source: str, sink: str) -> dict:
    """Use NetworkX vertex-disjoint paths and cut sets to expose common-mode failures."""
    try:
        import networkx as nx
    except Exception as exc:
        return _hold("NetworkX is required for graph resilience analysis", dependency_error=type(exc).__name__)
    if not isinstance(nodes,list) or not nodes or not isinstance(edges,list) or not source or not sink or source==sink:
        return _hold("Valid graph nodes, edges and distinct source/sink are required")
    graph=nx.DiGraph()
    for n in nodes:
        if not isinstance(n,dict) or not isinstance(n.get("id"),str) or not n["id"]:
            return _hold("Every network node requires a stable ID")
        if n["id"] in graph:
            return _hold("Duplicate network node ID",node_id=n["id"])
        graph.add_node(n["id"],**{k:v for k,v in n.items() if k!="id"})
    for e in edges:
        if not isinstance(e,dict) or e.get("from") not in graph or e.get("to") not in graph:
            return _hold("Network edge has missing endpoint",edge=e)
        graph.add_edge(e["from"],e["to"])
    if source not in graph or sink not in graph:
        return _hold("Source or sink is not in the network")
    paths=list(nx.node_disjoint_paths(graph,source,sink))
    cut=list(nx.minimum_node_cut(graph,source,sink)) if nx.has_path(graph,source,sink) else []
    return {"outcome":"OK","mode":"NETWORKX_RESILIENCE",
        "vertex_disjoint_path_count":len(paths),"paths":paths,"minimum_node_cut":sorted(cut),
        "articulation_points":sorted(nx.articulation_points(graph.to_undirected())),
        "note":"Node-disjoint paths count independence only at the supplied graph granularity. Model common raw materials, process sites, ownership and jurisdictions as shared nodes."}

def simulate_event_timeline(events: list) -> dict:
    """Replay timestamped logistics events deterministically; no wall-clock or IO."""
    import heapq
    if not isinstance(events,list) or not events:
        return _hold("At least one event is required")
    queue=[]
    seen=set()
    for e in events:
        if not isinstance(e,dict) or not isinstance(e.get("id"),str) or not e["id"] or not _finite(e.get("time_days")) or e["time_days"]<0:
            return _hold("Each event needs unique ID and non-negative time_days")
        if e["id"] in seen:
            return _hold("Duplicate event ID",event_id=e["id"])
        seen.add(e["id"])
        heapq.heappush(queue,(float(e["time_days"]),e["id"],e))
    timeline=[]
    while queue:
        t,_,e=heapq.heappop(queue)
        timeline.append({"id":e["id"],"time_days":t,"kind":e.get("kind","UNSPECIFIED"),
                         "entity_id":e.get("entity_id"),"state":e.get("state")})
    return {"outcome":"OK","mode":"DISCRETE_EVENT_REPLAY","timeline":timeline,
            "makespan_days":timeline[-1]["time_days"],"event_count":len(timeline),
            "note":"Deterministic event replay; this does not claim real carrier or warehouse telemetry."}

__all__ = ['optimize_sourcing','available_backends','safety_stock','simulate_uncertainty','analyze_network_resilience','simulate_event_timeline']
