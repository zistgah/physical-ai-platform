#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
"""HiGHS LP/MILP worker. Uses highspy when installed; otherwise SciPy milp/HiGHS.
Install highspy, or scipy>=1.12. The worker never substitutes a non-HiGHS solver."""
import json, sys, math
PROTOCOL="ayeai.manufacturing.backend/v1"

def reply(req,status,result=None,diagnostics=None,version="UNSPECIFIED"):
    return {"protocol":PROTOCOL,"requestId":req.get("requestId"),"backendId":"highs","backendVersion":version,
            "status":status,"result":result,"diagnostics":diagnostics or []}

def main(req):
    try:
        import numpy as np
    except Exception as exc:
        return reply(req,"UNAVAILABLE",diagnostics=[{"code":"DEPENDENCY_MISSING","message":"numpy: "+str(exc)}])
    try:
        import highspy
        engine="highspy"
        version="highspy-"+str(highspy.Highs().version())
    except Exception:
        try:
            import scipy
            from scipy.optimize import Bounds, LinearConstraint, milp
            from scipy.sparse import coo_matrix
            engine="scipy"
            version="scipy-"+str(scipy.__version__)+"-HiGHS-linked"
        except Exception as exc:
            return reply(req,"UNAVAILABLE",diagnostics=[{"code":"DEPENDENCY_MISSING","message":"Install highspy or scipy with its HiGHS backend: "+str(exc)}])
    if req.get("operation") not in ("solve-linear-model","solve-mip-model"):
        return reply(req,"INVALID",diagnostics=[{"code":"OPERATION_UNSUPPORTED","message":"Only LP and MILP operations are implemented"}],version=version)
    model=req.get("payload",{}).get("model",{})
    variables=model.get("variables"); constraints=model.get("constraints")
    if not isinstance(variables,list) or not variables or not isinstance(constraints,list):
        return reply(req,"INVALID",diagnostics=[{"code":"MODEL_INVALID","message":"variables and constraints arrays are required"}],version=version)
    ids=[v.get("id") for v in variables if isinstance(v,dict)]
    if len(ids)!=len(variables) or any(not isinstance(x,str) or not x for x in ids) or len(set(ids))!=len(ids):
        return reply(req,"INVALID",diagnostics=[{"code":"VARIABLE_IDS_INVALID","message":"Variable ids must be unique non-empty strings"}],version=version)
    index={name:i for i,name in enumerate(ids)}
    lower=[]; upper=[]; costs=[]; integrality=[]
    for v in variables:
        lo=v.get("lower",0); hi=v.get("upper",math.inf); cost=v.get("objective",0)
        if not isinstance(lo,(int,float)) or not math.isfinite(lo) or not isinstance(cost,(int,float)) or not math.isfinite(cost):
            return reply(req,"INVALID",diagnostics=[{"code":"VARIABLE_BOUNDS_INVALID","message":v["id"]}],version=version)
        if not isinstance(hi,(int,float)) or math.isnan(hi) or lo>hi:
            return reply(req,"INVALID",diagnostics=[{"code":"VARIABLE_BOUNDS_INVALID","message":v["id"]}],version=version)
        lower.append(float(lo)); upper.append(float(hi)); costs.append(float(cost))
        integrality.append(1 if v.get("integer",False) else 0)
    row_lower=[]; row_upper=[]; row_idx=[]; col_idx=[]; values=[]
    for ri,c in enumerate(constraints):
        terms=c.get("terms",{})
        if not isinstance(terms,dict): return reply(req,"INVALID",diagnostics=[{"code":"CONSTRAINT_TERMS_INVALID","message":str(c.get("id"))}],version=version)
        for var,coef in sorted(terms.items()):
            if var not in index or not isinstance(coef,(int,float)) or not math.isfinite(coef):
                return reply(req,"INVALID",diagnostics=[{"code":"CONSTRAINT_TERM_INVALID","message":str(var)}],version=version)
            row_idx.append(ri); col_idx.append(index[var]); values.append(float(coef))
        lo=c.get("lower",-math.inf); hi=c.get("upper",math.inf)
        if not isinstance(lo,(int,float)) or math.isnan(lo) or not isinstance(hi,(int,float)) or math.isnan(hi) or lo>hi:
            return reply(req,"INVALID",diagnostics=[{"code":"CONSTRAINT_BOUNDS_INVALID","message":str(c.get("id"))}],version=version)
        row_lower.append(float(lo)); row_upper.append(float(hi))
    try:
        if engine=="highspy":
            h=highspy.Highs()
            h.setOptionValue("output_flag",False)
            h.addVars(len(variables),np.array(lower),np.array(upper))
            h.changeColsCost(len(variables),np.arange(len(variables),dtype=np.int32),np.array(costs))
            kinds=[highspy.HighsVarType.kInteger if x else highspy.HighsVarType.kContinuous for x in integrality]
            h.changeColsIntegrality(len(variables),np.arange(len(variables),dtype=np.int32),kinds)
            if constraints:
                starts=[0]
                for ri in range(len(constraints)):
                    starts.append(sum(1 for x in row_idx[:len(row_idx)] if x<=ri))
                h.addRows(len(constraints),np.array(row_lower),np.array(row_upper),len(values),
                          np.array(starts,dtype=np.int32),np.array(col_idx,dtype=np.int32),np.array(values))
            h.run()
            model_status=str(h.getModelStatus()).split(".")[-1]
            if "Infeasible" in model_status:
                return reply(req,"INFEASIBLE",diagnostics=[{"code":"MODEL_INFEASIBLE","message":model_status}],version=version)
            if model_status!="kOptimal":
                return reply(req,"UNKNOWN",diagnostics=[{"code":"SOLVER_STATUS","message":model_status}],version=version)
            sol=h.getSolution(); info=h.getInfo()
            result={"variables":{name:float(sol.col_value[i]) for i,name in enumerate(ids)},
                    "objectiveValue":float(info.objective_function_value),"solverStatus":model_status,"optimal":True}
        else:
            A=coo_matrix((np.array(values,dtype=float),(np.array(row_idx,dtype=np.int32),np.array(col_idx,dtype=np.int32))),
                         shape=(len(constraints),len(variables))).tocsr()
            linear_constraints=LinearConstraint(A,np.array(row_lower),np.array(row_upper)) if constraints else None
            res=milp(c=np.array(costs),integrality=np.array(integrality,dtype=np.int32),
                     bounds=Bounds(np.array(lower),np.array(upper)),
                     constraints=linear_constraints,options={"disp":False})
            if res.status==2:
                return reply(req,"INFEASIBLE",diagnostics=[{"code":"MODEL_INFEASIBLE","message":str(res.message)}],version=version)
            if res.status==3:
                return reply(req,"UNKNOWN",diagnostics=[{"code":"MODEL_UNBOUNDED","message":str(res.message)}],version=version)
            if res.status!=0 or res.x is None:
                return reply(req,"UNKNOWN",diagnostics=[{"code":"SOLVER_STATUS","message":str(res.message)}],version=version)
            result={"variables":{name:float(res.x[i]) for i,name in enumerate(ids)},
                    "objectiveValue":float(res.fun),"solverStatus":str(res.message),"optimal":True}
        if any(not math.isfinite(x) for x in result["variables"].values()) or not math.isfinite(result["objectiveValue"]):
            return reply(req,"FAILED",diagnostics=[{"code":"NONFINITE_SOLUTION","message":"Solver returned a non-finite result"}],version=version)
        return reply(req,"SUCCEEDED",result,version=version)
    except Exception as exc:
        return reply(req,"FAILED",diagnostics=[{"code":"SOLVER_EXCEPTION","message":str(exc)}],version=version)

if __name__=="__main__":
    try: req=json.load(sys.stdin); out=main(req)
    except Exception as exc: out={"protocol":PROTOCOL,"requestId":None,"backendId":"highs","backendVersion":"UNSPECIFIED","status":"FAILED","result":None,"diagnostics":[{"code":"WORKER_EXCEPTION","message":str(exc)}]}
    sys.stdout.write(json.dumps(out,allow_nan=False,separators=(",",":"))+"\n")
