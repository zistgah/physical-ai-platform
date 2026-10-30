# Copyright © 1993-2026 Abhishek Choudhary. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
"""Worker protocol smoke tests. Optional dependencies may correctly report UNAVAILABLE."""
import json, pathlib, subprocess, sys, py_compile

ROOT=pathlib.Path(__file__).resolve().parent
PROTOCOL="ayeai.manufacturing.backend/v1"
def run(name, backend, operation, payload):
    request={"protocol":PROTOCOL,"requestId":"worker-smoke-"+backend,"operation":operation,"payload":payload}
    p=subprocess.run([sys.executable,str(ROOT/name)],input=json.dumps(request),capture_output=True,text=True,timeout=60)
    assert p.returncode==0, (name,p.stderr)
    out=json.loads(p.stdout)
    assert out.get("protocol")==PROTOCOL and out.get("requestId")==request["requestId"] and out.get("backendId")==backend
    assert out.get("status") in ("SUCCEEDED","UNAVAILABLE"), (name,out)
    if out["status"]=="UNAVAILABLE":
        assert any(x.get("code")=="DEPENDENCY_MISSING" for x in out.get("diagnostics",[]))
    return out

for path in ROOT.glob("*.py"):
    py_compile.compile(str(path),doraise=True)

jobshop={"modelVersion":"1.0.0","timeUnit":"minute","horizonMinutes":20,
 "operations":[{"id":"cut","orderId":"wo1","sequence":0,"process":"CUT","durationMinutes":5,"eligibleStationIds":["laser"]},
               {"id":"mill","orderId":"wo1","sequence":1,"process":"MILL","durationMinutes":5,"eligibleStationIds":["mill"]}],
 "stations":[{"id":"laser","availableMinutes":10},{"id":"mill","availableMinutes":10}],
 "constraints":{"eachOperationExactlyOnce":True,"operationPrecedence":True,"stationNoOverlap":True,"respectExistingBookedCapacity":True}}
ort=run("ortools_jobshop_worker.py","google-or-tools","solve-jobshop",{"model":jobshop,"solverOptions":{"timeLimitSeconds":5,"deterministic":True,"randomSeed":0}})
if ort["status"]=="SUCCEEDED":
    assert len(ort["result"]["assignments"])==2 and ort["result"]["makespanMinutes"]>=10

lp={"variables":[{"id":"units","lower":0,"upper":10,"objective":-1,"integer":True}],
    "constraints":[{"id":"capacity","terms":{"units":1},"upper":4.5}]}
hig=run("highs_lp_worker.py","highs","solve-mip-model",{"model":lp})
if hig["status"]=="SUCCEEDED":
    assert abs(hig["result"]["variables"]["units"]-4)<1e-7

jobshop_model={"modelVersion":"1.0.0","timeUnit":"minute","horizonMinutes":20,
 "operations":[{"id":"cut","orderId":"wo1","sequence":0,"process":"CUT","durationMinutes":5,"eligibleStationIds":["laser"]},
               {"id":"mill","orderId":"wo1","sequence":1,"process":"MILL","durationMinutes":5,"eligibleStationIds":["mill"]}],
 "stations":[{"id":"laser","availableMinutes":10},{"id":"mill","availableMinutes":10}]}
jobshop=run("scipy_highs_jobshop_worker.py","scipy-highs-jobshop","solve-jobshop",{"model":jobshop_model,"solverOptions":{"timeLimitSeconds":10}})
if jobshop["status"]=="SUCCEEDED":
    assignments=jobshop["result"]["assignments"]
    assert len(assignments)==2 and assignments[0]["endMinute"]<=assignments[1]["startMinute"]
    assert jobshop["result"]["makespanMinutes"]==10

flow={"stations":[{"id":"mill","capacity":1}],
      "jobs":[{"id":"a","arrivalMinute":0,"operations":[{"stationId":"mill","durationMinutes":5}]},
              {"id":"b","arrivalMinute":0,"operations":[{"stationId":"mill","durationMinutes":3}]}]}
sim=run("simpy_flow_worker.py","simpy","simulate-flow",flow)
if sim["status"]=="SUCCEEDED":
    assert sim["result"]["completedJobs"]==2
    assert sim["result"]["makespanMinutes"]==8
    assert sim["result"]["verified"] is False


# Deterministic generated cases exercise the actual HiGHS MILP worker.
import importlib.util, random
spec=importlib.util.spec_from_file_location("scipy_highs_jobshop_worker",ROOT/"scipy_highs_jobshop_worker.py")
solver_module=importlib.util.module_from_spec(spec); spec.loader.exec_module(solver_module)
rng=random.Random(4701)
for case in range(20):
    d1=rng.randint(1,12); d2=rng.randint(1,12); total=d1+d2
    model={"modelVersion":"1.0.0","timeUnit":"minute","horizonMinutes":total,
      "operations":[{"id":"a","orderId":"a","sequence":0,"process":"MILL","durationMinutes":d1,"eligibleStationIds":["m"]},
                    {"id":"b","orderId":"b","sequence":0,"process":"MILL","durationMinutes":d2,"eligibleStationIds":["m"]}],
      "stations":[{"id":"m","availableMinutes":total}]}
    req={"protocol":PROTOCOL,"requestId":f"generated-feasible-{case}","operation":"solve-jobshop","payload":{"model":model}}
    out=solver_module.main(req)
    assert out["status"]=="SUCCEEDED", (case,d1,d2,out)
    assignments=out["result"]["assignments"]
    assert len(assignments)==2
    assert assignments[0]["endMinute"]<=assignments[1]["startMinute"]+1e-6 or assignments[1]["endMinute"]<=assignments[0]["startMinute"]+1e-6
    assert abs(out["result"]["makespanMinutes"]-total)<1e-5
    model["stations"][0]["availableMinutes"]=total-0.5
    req["requestId"]=f"generated-infeasible-{case}"
    out=solver_module.main(req)
    assert out["status"]=="INFEASIBLE", (case,d1,d2,out)

print("backend worker smoke PASS: 4 protocol workers; HiGHS MILP job-shop conflict case and 20 feasible/infeasible generated pairs; optional dependency status is explicit")
