#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
"""Optional OR-Tools CP-SAT job-shop worker. Install: python -m pip install ortools.
Protocol: one JSON request on stdin, one JSON response on stdout. No graph writes."""
import json, sys, math, traceback

PROTOCOL = "ayeai.manufacturing.backend/v1"

def reply(req, status, result=None, diagnostics=None, version="UNSPECIFIED"):
    return {"protocol": PROTOCOL, "requestId": req.get("requestId"), "backendId": "google-or-tools",
            "backendVersion": version, "status": status, "result": result,
            "diagnostics": diagnostics or []}

def main(req):
    try:
        import ortools
        from ortools.sat.python import cp_model
    except Exception as exc:
        return reply(req, "UNAVAILABLE", diagnostics=[{"code":"DEPENDENCY_MISSING","message":str(exc)}])
    if req.get("operation") != "solve-jobshop":
        return reply(req, "INVALID", diagnostics=[{"code":"OPERATION_UNSUPPORTED","message":"Only solve-jobshop is implemented by this worker"}], version=ortools.__version__)
    model_data = req.get("payload", {}).get("model")
    if not isinstance(model_data, dict) or not model_data.get("operations") or not model_data.get("stations"):
        return reply(req, "INVALID", diagnostics=[{"code":"MODEL_INVALID","message":"A non-empty operations and stations model is required"}], version=ortools.__version__)
    scale = 1000
    ops = model_data["operations"]
    station_rows = model_data["stations"]
    station_ids = [s.get("id") for s in station_rows if isinstance(s,dict)]
    if len(station_ids) != len(station_rows) or any(not isinstance(x,str) or not x for x in station_ids) or len(set(station_ids)) != len(station_ids):
        return reply(req,"INVALID",diagnostics=[{"code":"STATION_IDS_INVALID","message":"Station ids must be unique non-empty strings"}],version=ortools.__version__)
    stations = {s["id"]: s for s in station_rows}
    op_keys = [(o.get("orderId"),o.get("id")) for o in ops if isinstance(o,dict)]
    if len(op_keys) != len(ops) or any(not isinstance(a,str) or not a or not isinstance(b,str) or not b for a,b in op_keys) or len(set(op_keys)) != len(op_keys):
        return reply(req,"INVALID",diagnostics=[{"code":"OPERATION_IDS_INVALID","message":"Operation identities must be unique"}],version=ortools.__version__)
    durations = {}
    for op in ops:
        d = op.get("durationMinutes")
        if not isinstance(d, (int,float)) or not math.isfinite(d) or d <= 0:
            return reply(req, "INVALID", diagnostics=[{"code":"DURATION_INVALID","message":str(op.get("id"))}], version=ortools.__version__)
        durations[op["id"],op["orderId"]] = int(round(d * scale))
        eligible = op.get("eligibleStationIds")
        if not isinstance(eligible,list) or not eligible or any(sid not in stations for sid in eligible):
            return reply(req, "INVALID", diagnostics=[{"code":"ELIGIBLE_STATIONS_INVALID","message":str(op.get("id"))}], version=ortools.__version__)
        if not any(sid in stations for sid in eligible):
            return reply(req, "INFEASIBLE", diagnostics=[{"code":"NO_ELIGIBLE_STATION","message":str(op.get("id"))}], version=ortools.__version__)
        if not isinstance(op.get("sequence"),int) or op["sequence"] < 0:
            return reply(req,"INVALID",diagnostics=[{"code":"SEQUENCE_INVALID","message":str(op.get("id"))}],version=ortools.__version__)
    horizon_minutes = model_data.get("horizonMinutes")
    if not isinstance(horizon_minutes,(int,float)) or not math.isfinite(horizon_minutes) or horizon_minutes <= 0:
        return reply(req,"INVALID",diagnostics=[{"code":"HORIZON_INVALID","message":"horizonMinutes must be positive and finite"}],version=ortools.__version__)
    horizon = int(math.floor(horizon_minutes * scale + 1e-8))
    if horizon <= 0:
        return reply(req,"INVALID",diagnostics=[{"code":"HORIZON_INVALID","message":"horizon is below solver resolution"}],version=ortools.__version__)
    for sid, station in stations.items():
        cap = station.get("availableMinutes")
        if not isinstance(cap,(int,float)) or not math.isfinite(cap) or cap < 0:
            return reply(req,"INVALID",diagnostics=[{"code":"CAPACITY_INVALID","message":sid}],version=ortools.__version__)
    cp = cp_model.CpModel()
    starts, ends, intervals_by_station, presences = {}, {}, {sid: [] for sid in stations}, {}
    for op in ops:
        key = (op["orderId"], op["id"])
        duration = durations[op["id"],op["orderId"]]
        start = cp.NewIntVar(0, horizon, "s_" + op["orderId"] + "_" + op["id"])
        end = cp.NewIntVar(0, horizon, "e_" + op["orderId"] + "_" + op["id"])
        starts[key], ends[key] = start, end
        choices = []
        for sid in op["eligibleStationIds"]:
            if sid not in stations: continue
            present = cp.NewBoolVar("p_" + op["orderId"] + "_" + op["id"] + "_" + sid)
            interval = cp.NewOptionalIntervalVar(start, duration, end, present, "i_" + op["orderId"] + "_" + op["id"] + "_" + sid)
            choices.append(present)
            intervals_by_station[sid].append(interval)
            presences[key,sid] = present
        cp.AddExactlyOne(choices)
    grouped = {}
    for op in ops: grouped.setdefault(op["orderId"], []).append(op)
    for order_id, group in grouped.items():
        group.sort(key=lambda x: x["sequence"])
        for prev, nxt in zip(group, group[1:]):
            cp.Add(ends[order_id,prev["id"]] <= starts[order_id,nxt["id"]])
    for sid, intervals in intervals_by_station.items():
        cp.AddNoOverlap(intervals)
        cap = stations[sid].get("availableMinutes", 0)
        if not isinstance(cap,(int,float)) or not math.isfinite(cap) or cap < 0:
            return reply(req, "INVALID", diagnostics=[{"code":"CAPACITY_INVALID","message":sid}], version=ortools.__version__)
        cap_units = int(math.floor(cap * scale + 1e-8))
        workload = []
        for op in ops:
            if sid in op.get("eligibleStationIds", []):
                present = presences.get(((op["orderId"],op["id"]),sid))
                if present is not None: workload.append(durations[op["id"],op["orderId"]] * present)
        if workload: cp.Add(sum(workload) <= cap_units)
    makespan = cp.NewIntVar(0, horizon, "makespan")
    for end in ends.values(): cp.Add(makespan >= end)
    cp.Minimize(makespan)
    solver = cp_model.CpSolver()
    opts = req.get("payload",{}).get("solverOptions",{})
    solver.parameters.max_time_in_seconds = float(opts.get("timeLimitSeconds",30))
    solver.parameters.num_search_workers = 1 if opts.get("deterministic",True) else max(1,int(opts.get("workers",8)))
    solver.parameters.random_seed = int(opts.get("randomSeed",0))
    status = solver.Solve(cp)
    if status == cp_model.INFEASIBLE:
        return reply(req,"INFEASIBLE",diagnostics=[{"code":"MODEL_INFEASIBLE","message":"CP-SAT proved the model infeasible"}],version=ortools.__version__)
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):
        return reply(req,"UNKNOWN",diagnostics=[{"code":"SOLVER_LIMIT","message":solver.StatusName(status)}],version=ortools.__version__)
    assignments=[]
    for op in ops:
        key=(op["orderId"],op["id"])
        selected=[sid for sid in op["eligibleStationIds"] if (key,sid) in presences and solver.Value(presences[key,sid])]
        if len(selected)!=1:
            return reply(req,"FAILED",diagnostics=[{"code":"ASSIGNMENT_CARDINALITY","message":str(key)}],version=ortools.__version__)
        assignments.append({"orderId":op["orderId"],"operationId":op["id"],"stationId":selected[0],
                            "startMinute":solver.Value(starts[key])/scale,"endMinute":solver.Value(ends[key])/scale})
    return reply(req,"SUCCEEDED",{"assignments":assignments,"makespanMinutes":solver.Value(makespan)/scale,
                                  "optimal":status==cp_model.OPTIMAL,"solverStatus":solver.StatusName(status)},
                 version=ortools.__version__)

if __name__ == "__main__":
    try:
        request=json.load(sys.stdin)
        response=main(request)
    except Exception as exc:
        response={"protocol":PROTOCOL,"requestId":None,"backendId":"google-or-tools","backendVersion":"UNSPECIFIED",
                  "status":"FAILED","result":None,"diagnostics":[{"code":"WORKER_EXCEPTION","message":str(exc)}]}
    sys.stdout.write(json.dumps(response,allow_nan=False,separators=(",",":"))+"\n")
