#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
"""Optional SimPy discrete-event manufacturing flow worker. Install: pip install simpy."""
import json, sys, math

PROTOCOL="ayeai.manufacturing.backend/v1"
def response(req,status,result=None,diagnostics=None,version="UNSPECIFIED"):
    return {"protocol":PROTOCOL,"requestId":req.get("requestId"),"backendId":"simpy","backendVersion":version,
            "status":status,"result":result,"diagnostics":diagnostics or []}

def main(req):
    try:
        import simpy
    except Exception as exc:
        return response(req,"UNAVAILABLE",diagnostics=[{"code":"DEPENDENCY_MISSING","message":str(exc)}])
    if req.get("operation") not in ("simulate-flow","simulate-shift","simulate-fault"):
        return response(req,"INVALID",diagnostics=[{"code":"OPERATION_UNSUPPORTED","message":"Unsupported SimPy operation"}],version=simpy.__version__)
    payload=req.get("payload",{})
    jobs=payload.get("jobs"); stations=payload.get("stations")
    if not isinstance(jobs,list) or not jobs or not isinstance(stations,list) or not stations:
        return response(req,"INVALID",diagnostics=[{"code":"INPUT_INVALID","message":"Non-empty jobs and stations required"}],version=simpy.__version__)
    station_map={}
    for s in stations:
        cap=s.get("capacity")
        if not isinstance(cap,int) or cap<1 or not s.get("id") or s["id"] in station_map:
            return response(req,"INVALID",diagnostics=[{"code":"STATION_INVALID","message":str(s)}],version=simpy.__version__)
    env=simpy.Environment()
    station_map={s["id"]:simpy.Resource(env,capacity=s["capacity"]) for s in stations}
    job_ids=[j.get("id") for j in jobs if isinstance(j,dict)]
    if len(job_ids)!=len(jobs) or any(not isinstance(x,str) or not x for x in job_ids) or len(set(job_ids))!=len(job_ids):
        return response(req,"INVALID",diagnostics=[{"code":"JOB_IDS_INVALID","message":"Job ids must be unique non-empty strings"}],version=simpy.__version__)
    completions=[]; waits=[]
    def process(job):
        arrival=job.get("arrivalMinute",0)
        if not isinstance(arrival,(int,float)) or not math.isfinite(arrival) or arrival<0:
            raise ValueError("invalid arrivalMinute for "+str(job.get("id")))
        if arrival: yield env.timeout(arrival)
        for step in job.get("operations",[]):
            sid=step.get("stationId"); duration=step.get("durationMinutes")
            if sid not in station_map or not isinstance(duration,(int,float)) or not math.isfinite(duration) or duration<=0:
                raise ValueError("invalid station/duration in job "+str(job.get("id")))
            queued=env.now
            with station_map[sid].request() as req_token:
                yield req_token
                waits.append(env.now-queued)
                yield env.timeout(duration)
        completions.append({"jobId":job["id"],"completedAtMinute":env.now})
    try:
        for job in jobs:
            if not isinstance(job,dict) or not job.get("id") or not isinstance(job.get("operations"),list) or not job["operations"]:
                raise ValueError("job requires id and non-empty operations")
            env.process(process(job))
        env.run()
    except Exception as exc:
        return response(req,"INVALID",diagnostics=[{"code":"SIMULATION_INPUT_INVALID","message":str(exc)}],version=simpy.__version__)
    return response(req,"SUCCEEDED",{"completedJobs":len(completions),"completions":completions,
                   "makespanMinutes":max((x["completedAtMinute"] for x in completions),default=0),
                   "meanQueueWaitMinutes":sum(waits)/len(waits) if waits else 0,
                   "evidenceState":"SIMULATED","verified":False},version=simpy.__version__)

if __name__=="__main__":
    try: req=json.load(sys.stdin); out=main(req)
    except Exception as exc: out={"protocol":PROTOCOL,"requestId":None,"backendId":"simpy","backendVersion":"UNSPECIFIED","status":"FAILED","result":None,"diagnostics":[{"code":"WORKER_EXCEPTION","message":str(exc)}]}
    sys.stdout.write(json.dumps(out,allow_nan=False,separators=(",",":"))+"\n")
