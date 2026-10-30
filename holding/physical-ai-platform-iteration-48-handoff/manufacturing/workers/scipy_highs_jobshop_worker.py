#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
"""Finite-capacity job-shop MILP worker using SciPy's HiGHS-backed milp().
Install: pip install scipy (SciPy links the HiGHS optimization engine).
The worker returns a schedule proposal only; no reservation or machine command."""
import json, sys, math

PROTOCOL="ayeai.manufacturing.backend/v1"
BACKEND="scipy-highs-jobshop"
def reply(req,status,result=None,diagnostics=None,version="UNSPECIFIED"):
    return {"protocol":PROTOCOL,"requestId":req.get("requestId"),"backendId":BACKEND,"backendVersion":version,
            "status":status,"result":result,"diagnostics":diagnostics or []}

def main(req):
    try:
        import scipy
        import numpy as np
        from scipy.optimize import Bounds, LinearConstraint, milp
        from scipy.sparse import coo_matrix
    except Exception as exc:
        return reply(req,"UNAVAILABLE",diagnostics=[{"code":"DEPENDENCY_MISSING","message":"SciPy/NumPy with HiGHS: "+str(exc)}])
    version="scipy-"+scipy.__version__+"-HiGHS-linked"
    if req.get("operation")!="solve-jobshop":
        return reply(req,"INVALID",diagnostics=[{"code":"OPERATION_UNSUPPORTED","message":"Only solve-jobshop is implemented"}],version=version)
    model=req.get("payload",{}).get("model",{})
    ops=model.get("operations"); station_rows=model.get("stations"); horizon=model.get("horizonMinutes")
    if not isinstance(ops,list) or not ops or not isinstance(station_rows,list) or not station_rows:
        return reply(req,"INVALID",diagnostics=[{"code":"MODEL_INVALID","message":"Non-empty operations and stations required"}],version=version)
    if not isinstance(horizon,(int,float)) or not math.isfinite(horizon) or horizon<=0:
        return reply(req,"INVALID",diagnostics=[{"code":"HORIZON_INVALID","message":"horizonMinutes must be positive and finite"}],version=version)
    station_ids=[s.get("id") for s in station_rows if isinstance(s,dict)]
    if len(station_ids)!=len(station_rows) or any(not isinstance(x,str) or not x for x in station_ids) or len(set(station_ids))!=len(station_ids):
        return reply(req,"INVALID",diagnostics=[{"code":"STATION_IDS_INVALID","message":"Station ids must be unique"}],version=version)
    stations={s["id"]:s for s in station_rows}
    for sid,s in stations.items():
        cap=s.get("availableMinutes")
        if not isinstance(cap,(int,float)) or not math.isfinite(cap) or cap<0:
            return reply(req,"INVALID",diagnostics=[{"code":"CAPACITY_INVALID","message":sid}],version=version)
    op_keys=[]
    for op in ops:
        if not isinstance(op,dict) or not isinstance(op.get("id"),str) or not op["id"] or not isinstance(op.get("orderId"),str) or not op["orderId"]:
            return reply(req,"INVALID",diagnostics=[{"code":"OPERATION_ID_INVALID","message":"Each operation requires orderId and id"}],version=version)
        key=(op["orderId"],op["id"])
        op_keys.append(key)
        d=op.get("durationMinutes")
        elig=op.get("eligibleStationIds")
        if not isinstance(d,(int,float)) or not math.isfinite(d) or d<=0 or d>horizon:
            return reply(req,"INVALID",diagnostics=[{"code":"DURATION_INVALID","message":str(key)}],version=version)
        if not isinstance(elig,list) or not elig or any(sid not in stations for sid in elig):
            return reply(req,"INVALID",diagnostics=[{"code":"ELIGIBILITY_INVALID","message":str(key)}],version=version)
        if not isinstance(op.get("sequence"),int) or op["sequence"]<0:
            return reply(req,"INVALID",diagnostics=[{"code":"SEQUENCE_INVALID","message":str(key)}],version=version)
    if len(set(op_keys))!=len(op_keys):
        return reply(req,"INVALID",diagnostics=[{"code":"DUPLICATE_OPERATION","message":"Duplicate operation identity"}],version=version)
    for order_id in set(k[0] for k in op_keys):
        seq=[o["sequence"] for o in ops if o["orderId"]==order_id]
        if len(set(seq))!=len(seq):
            return reply(req,"INVALID",diagnostics=[{"code":"DUPLICATE_SEQUENCE","message":order_id}],version=version)

    # Build a sparse MILP: binary machine assignment and pairwise order,
    # continuous operation start times and makespan. Big-M is the planning horizon.
    lower=[]; upper=[]; cost=[]; integrality=[]; names=[]
    def var(name, lo, hi, c=0.0, integer=0):
        i=len(names); names.append(name); lower.append(float(lo)); upper.append(float(hi)); cost.append(float(c)); integrality.append(int(integer)); return i
    assign={}; starts={}; order_vars={}
    for op in ops:
        k=(op["orderId"],op["id"])
        for sid in op["eligibleStationIds"]:
            assign[k,sid]=var("x:"+k[0]+":"+k[1]+":"+sid,0,1,integer=1)
        starts[k]=var("t:"+k[0]+":"+k[1],0,horizon-op["durationMinutes"])
    for sid in stations:
        eligible=[o for o in ops if sid in o["eligibleStationIds"]]
        for i in range(len(eligible)):
            for j in range(i+1,len(eligible)):
                a,b=eligible[i],eligible[j]
                ka=(a["orderId"],a["id"]); kb=(b["orderId"],b["id"])
                order_vars[ka,kb,sid]=var("z:"+ka[0]+":"+ka[1]+":"+kb[0]+":"+kb[1]+":"+sid,0,1,integer=1)
    makespan=var("makespan",0,horizon,c=1.0)
    row_i=[]; col_i=[]; vals=[]; row_lo=[]; row_hi=[]
    def constraint(terms, lo=-math.inf, hi=math.inf):
        r=len(row_lo)
        for col,coef in terms.items():
            if coef:
                row_i.append(r); col_i.append(col); vals.append(float(coef))
        row_lo.append(float(lo)); row_hi.append(float(hi))
    # Exactly one station per operation.
    for op in ops:
        k=(op["orderId"],op["id"])
        constraint({assign[k,sid]:1 for sid in op["eligibleStationIds"]},1,1)
        d=op["durationMinutes"]
        constraint({starts[k]:1,makespan:-1},-math.inf,-d)
    # Operation precedence within each work order.
    groups={}
    for op in ops: groups.setdefault(op["orderId"],[]).append(op)
    for order_id,group in groups.items():
        group.sort(key=lambda x:x["sequence"])
        for prev,nxt in zip(group,group[1:]):
            kp=(prev["orderId"],prev["id"]); kn=(nxt["orderId"],nxt["id"])
            constraint({starts[kp]:1,starts[kn]:-1},-math.inf,-prev["durationMinutes"])
    # Shared finite capacity and pairwise no-overlap on each station.
    M=float(horizon)
    for sid,station in stations.items():
        eligible=[o for o in ops if sid in o["eligibleStationIds"]]
        load={assign[(o["orderId"],o["id"]),sid]:o["durationMinutes"] for o in eligible}
        if load: constraint(load,-math.inf,station["availableMinutes"])
        for i in range(len(eligible)):
            for j in range(i+1,len(eligible)):
                a,b=eligible[i],eligible[j]
                ka=(a["orderId"],a["id"]); kb=(b["orderId"],b["id"])
                z=order_vars[ka,kb,sid]
                xa=assign[ka,sid]; xb=assign[kb,sid]
                da=a["durationMinutes"]; db=b["durationMinutes"]
                # If both assigned to this station: z=1 means a before b;
                # z=0 means b before a. Otherwise the big-M relaxes both rows.
                constraint({starts[ka]:1,starts[kb]:-1,z:M,xa:M,xb:M},-math.inf,3*M-da)
                constraint({starts[kb]:1,starts[ka]:-1,z:-M,xa:M,xb:M},-math.inf,2*M-db)
    A=coo_matrix((np.array(vals,dtype=float),(np.array(row_i,dtype=np.int32),np.array(col_i,dtype=np.int32))),
                 shape=(len(row_lo),len(names))).tocsr()
    options={"disp":False}
    time_limit=req.get("payload",{}).get("solverOptions",{}).get("timeLimitSeconds",30)
    if not isinstance(time_limit,(int,float)) or not math.isfinite(time_limit) or time_limit<=0:
        return reply(req,"INVALID",diagnostics=[{"code":"TIME_LIMIT_INVALID","message":"timeLimitSeconds must be positive and finite"}],version=version)
    options["time_limit"]=float(time_limit)
    try:
        result=milp(c=np.array(cost),integrality=np.array(integrality,dtype=np.int32),
                    bounds=Bounds(np.array(lower),np.array(upper)),
                    constraints=LinearConstraint(A,np.array(row_lo),np.array(row_hi)),options=options)
    except Exception as exc:
        return reply(req,"FAILED",diagnostics=[{"code":"MILP_EXCEPTION","message":str(exc)}],version=version)
    if result.status==2:
        return reply(req,"INFEASIBLE",diagnostics=[{"code":"MODEL_INFEASIBLE","message":str(result.message)}],version=version)
    if result.status==3:
        return reply(req,"UNKNOWN",diagnostics=[{"code":"MODEL_UNBOUNDED","message":str(result.message)}],version=version)
    if result.status!=0 or result.x is None:
        return reply(req,"UNKNOWN",diagnostics=[{"code":"SOLVER_STATUS","message":str(result.message)}],version=version)
    assignments=[]
    for op in ops:
        k=(op["orderId"],op["id"])
        chosen=[sid for sid in op["eligibleStationIds"] if result.x[assign[k,sid]]>0.5]
        if len(chosen)!=1:
            return reply(req,"FAILED",diagnostics=[{"code":"ASSIGNMENT_INVALID","message":str(k)}],version=version)
        start=float(result.x[starts[k]])
        assignments.append({"orderId":op["orderId"],"operationId":op["id"],"stationId":chosen[0],
                            "startMinute":start,"endMinute":start+float(op["durationMinutes"])})
    makespan_value=max(a["endMinute"] for a in assignments)
    if not math.isfinite(makespan_value):
        return reply(req,"FAILED",diagnostics=[{"code":"NONFINITE_RESULT","message":"Non-finite makespan"}],version=version)
    return reply(req,"SUCCEEDED",{"assignments":assignments,"makespanMinutes":makespan_value,
                                  "optimal":True,"solverStatus":str(result.message),
                                  "objectiveValue":float(result.fun)},version=version)

if __name__=="__main__":
    try: req=json.load(sys.stdin); out=main(req)
    except Exception as exc: out={"protocol":PROTOCOL,"requestId":None,"backendId":BACKEND,"backendVersion":"UNSPECIFIED","status":"FAILED","result":None,"diagnostics":[{"code":"WORKER_EXCEPTION","message":str(exc)}]}
    sys.stdout.write(json.dumps(out,allow_nan=False,separators=(",",":"))+"\n")
