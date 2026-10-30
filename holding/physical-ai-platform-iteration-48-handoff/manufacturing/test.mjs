/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { route, simulateManufacturing, planOrders } from "./module.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BACKEND_CATALOG, BackendRegistry, buildJobshopModel, validateJobshopSchedule, optimizeJobshop, createHttpJsonTransport, createFrappeRestTransport } from "./backend-adapters.js";
import { createNodeWorkerTransport } from "./node-worker-transport.js";
let checks=0;
function ok(condition,message){assert.ok(condition,message);checks++;}
function hold(input,code){const r=route(input);ok(r.outcome==="HOLD",`expected HOLD${code?` (${code})`:""}`);if(code)ok(r.issues.some(x=>x.code===code),`expected issue ${code}`);return r;}
const quality={status:"RELEASED",requiredInspections:[],inspections:[],nonconformances:[],exportStatus:"NOT_APPLICABLE"};
const stations=[
 {id:"mill-01",processes:["MILL"],capabilities:["3AXIS"],status:"READY",capacityMinutes:500,bookedMinutes:50,calibration:{status:"VALID"}},
 {id:"inspect-01",processes:["INSPECT"],capabilities:["CMM"],status:"READY",capacityMinutes:200,bookedMinutes:0,calibration:{status:"VALID"}}
];
const order={id:"WO-1001",quantity:10,routing:[
 {id:"op10",process:"MILL",cycleTimeMinutes:12,setupMinutes:20,requiredCapabilities:["3AXIS"]},
 {id:"op20",process:"INSPECT",cycleTimeMinutes:3,inspectionRequired:true}
]};
const goodQuality={...quality,requiredInspections:["op20"],inspections:[{stepId:"op20",outcome:"PASS",verified:true}]};
const goodInput={order,stations,quality:goodQuality};

// Baseline, explicit route and deterministic assignment.
const baseline=route(goodInput);
ok(baseline.outcome==="OK","complete route is feasible");
ok(baseline.route.length===2,"all operations routed");
ok(baseline.route[0].stationId==="mill-01"&&baseline.route[1].stationId==="inspect-01","process-to-station mapping");
ok(baseline.metrics.totalRequiredMinutes===170,"setup plus run-time accounting");
ok(baseline.semantics.capacityReserved===false,"planning does not reserve capacity");
ok(route(goodInput).route.map(x=>x.stationId).join()===baseline.route.map(x=>x.stationId).join(),"deterministic assignment");

// Required HOLD conditions and malformed input.
hold(null,"INPUT_INVALID");hold({},"ORDER_UNSPECIFIED");hold({order:{quantity:1},stations,quality},"ORDER_ID_MISSING");
hold({order:{id:"x",quantity:0,routing:[]},stations,quality},"ORDER_QUANTITY_INVALID");
hold({order:{id:"x",quantity:1},stations,quality},"ROUTING_UNSPECIFIED");
hold({order,quality},"STATIONS_UNSPECIFIED");
hold({order,stations,quality:{status:"HOLD"}},"QUALITY_HOLD");
hold({order,stations,quality:{status:"UNKNOWN",exportStatus:"NOT_APPLICABLE"}},"QUALITY_RELEASE_UNSPECIFIED");
hold({order,stations,quality:{status:"RELEASED",exportStatus:"NOT_APPLICABLE",nonconformances:{id:"NCR"}}},"QUALITY_RECORDS_INVALID");
hold({order,stations,quality:{status:"RELEASED",nonconformances:[{id:"NCR-1",status:"OPEN"}]}},"OPEN_NONCONFORMANCE");
hold({order,stations,quality:{status:"RELEASED",requiredInspections:["missing"],inspections:[]}},"INSPECTION_NOT_VERIFIED");
hold({order,stations,quality},"STEP_INSPECTION_NOT_VERIFIED");
hold({order,stations,quality:{...goodQuality,exportStatus:"UNKNOWN"}},"EXPORT_STATUS_NOT_CLEARED");

// Station/resource gates.
hold({order,stations:[{...stations[0],capacityMinutes:1},stations[1]],quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],status:"OFFLINE",available:false},stations[1]],quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],status:"OFFLINE",available:true},stations[1]],quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],status:"READY",available:false},stations[1]],quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],status:undefined,available:undefined},stations[1]],quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],jurisdiction:"IN"},stations[1]],quality:goodQuality},"STATION_EXPORT_STATUS_UNSPECIFIED");
hold({order,stations:[{...stations[0],calibration:{status:"EXPIRED"}},stations[1]],quality:goodQuality},"CALIBRATION_INVALID");
hold({order,stations:[{...stations[0],calibration:{status:"VALID",validUntil:"not-a-date"}},stations[1]],quality:goodQuality},"CALIBRATION_DATE_INVALID");
hold({order,stations:[{...stations[0],maintenanceDue:true},stations[1]],quality:goodQuality},"MAINTENANCE_DUE");
hold({order,stations:[...stations,{...stations[0]}],quality:goodQuality},"DUPLICATE_STATION_ID");
hold({order:{...order,routing:[{...order.routing[0],stationId:"no-such-station"},order.routing[1]]},stations,quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order:{...order,routing:[{...order.routing[0],requiredCapabilities:["5AXIS"]},order.routing[1]]},stations,quality:goodQuality},"NO_FEASIBLE_STATION");
hold({order,stations:[{...stations[0],capacityMinutes:100,bookedMinutes:120},stations[1]],quality:goodQuality},"BOOKED_CAPACITY_EXCEEDED");

// Material gates and quantity accounting.
const materialOrder={...order,materialRequirements:[{materialId:"AL-6061",quantity:12}]};
hold({order:materialOrder,stations,quality:goodQuality},"MATERIAL_AVAILABILITY_UNSPECIFIED");
hold({order:materialOrder,stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:11,status:"AVAILABLE"}]},"MATERIAL_SHORTAGE");
hold({order:materialOrder,stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:20,status:"QUARANTINED"}]},"MATERIAL_QUALITY_HOLD");
hold({order:materialOrder,stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:20}]},"MATERIAL_QUALITY_HOLD");
hold({order:{...materialOrder,materialRequirements:[{materialId:"AL-6061",quantity:7},{materialId:"AL-6061",quantity:7}]},stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:10,status:"RELEASED"}]},"MATERIAL_SHORTAGE");
hold({order:materialOrder,stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:20,status:"RELEASED"},{materialId:"AL-6061",availableQuantity:20,status:"RELEASED"}]},"DUPLICATE_MATERIAL_STOCK");
ok(route({order:materialOrder,stations,quality:goodQuality,materials:[{materialId:"AL-6061",availableQuantity:20,status:"RELEASED"}]}).outcome==="OK","released material satisfies requirement");

// Capacity is cumulative across repeated operations on one station.
const repeated={id:"WO-2",quantity:10,routing:[{id:"a",process:"MILL",cycleTimeMinutes:20},{id:"b",process:"MILL",cycleTimeMinutes:20}]};
hold({order:repeated,stations:[{...stations[0],capacityMinutes:449,bookedMinutes:50}],quality},"NO_FEASIBLE_STATION");
const split=route({order:repeated,stations:[{...stations[0],id:"m1",capacityMinutes:300,bookedMinutes:0},{...stations[0],id:"m2",capacityMinutes:300,bookedMinutes:0}],quality});
ok(split.outcome==="OK","route distributes operations over finite capacity");

// Simulation end-to-end: pass, yield, scrap, genealogy, failure and invalid yield.
const sim=simulateManufacturing({...goodInput,order:{...order,expectedYield:0.9}});
ok(sim.outcome==="OK"&&sim.simulation.executed,"feasible sample simulates");
ok(sim.metrics.goodQuantity===9&&sim.metrics.scrapQuantity===1,"yield and scrap arithmetic");
ok(sim.genealogy.length===2&&sim.evidence[0].verified===false,"genealogy and honest simulation evidence");
ok(sim.simulation.physicalExecution===false,"simulation is not physical execution");
const failSim=simulateManufacturing({...goodInput,quality:{...goodQuality,inspections:[{stepId:"op20",outcome:"FAIL",verified:true}]}});
ok(failSim.outcome==="HOLD"&&failSim.simulation.executed===false,"verified failed inspection blocks simulated release");
const badYield=simulateManufacturing({...goodInput,order:{...order,expectedYield:1.2}});
ok(badYield.outcome==="HOLD"&&badYield.issues[0].code==="YIELD_INVALID","invalid yield rejected");
const heldSim=simulateManufacturing({...goodInput,quality:{status:"HOLD"}});
ok(heldSim.simulation.executed===false,"held route cannot simulate execution");

// Input immutability: adapter must not mutate canonical projections.
const snapshot=JSON.stringify(goodInput);route(goodInput);simulateManufacturing(goodInput);
ok(JSON.stringify(goodInput)===snapshot,"input snapshots remain unchanged");

// Adversarial numeric fuzz: non-finite, zero and negative values never return OK.
for(const v of [NaN,Infinity,-Infinity,-1,0,"10",null]){
 const r=route({order:{id:"fuzz",quantity:v,routing:[{process:"MILL",cycleTimeMinutes:1}]},stations,quality});
 ok(r.outcome==="HOLD",`invalid quantity ${String(v)} held`);
}
for(let i=0;i<100;i++){
 const qty=1+(i%20), cycle=1+(i%7), cap=(qty*cycle)+(i%3===0?-1:10);
 const r=route({order:{id:`F-${i}`,quantity:qty,routing:[{process:"MILL",cycleTimeMinutes:cycle}]},stations:[{id:"m",processes:["MILL"],status:"READY",capacityMinutes:cap,bookedMinutes:0,calibration:{status:"VALID"}}],quality});
 ok((r.outcome==="OK")===(cap>=qty*cycle),`capacity boundary property ${i}`);
}
// Multi-order finite-capacity dispatch: shared station capacity is consumed
// only by successful proposals, priority/due-date ordering is deterministic.
const dispatchStation=[{id:"dispatch-mill",processes:["MILL"],status:"READY",capacityMinutes:100,bookedMinutes:0,calibration:{status:"VALID"}}];
const dispatchQuality={status:"RELEASED",requiredInspections:[],inspections:[],nonconformances:[],exportStatus:"NOT_APPLICABLE"};
const makeOrder=(id,priority,dueDate)=>({order:{id,quantity:6,routing:[{id:`${id}-op`,process:"MILL",cycleTimeMinutes:10}]},quality:dispatchQuality,priority,dueDate});
const dispatchInput={orders:[makeOrder("WO-LOW",1,"2026-11-02"),makeOrder("WO-HIGH",9,"2026-11-04")],stations:dispatchStation};
const dispatchBefore=JSON.stringify(dispatchInput);
const dispatch=planOrders(dispatchInput);
ok(dispatch.outcome==="HOLD"&&dispatch.metrics.scheduledOrders===1&&dispatch.metrics.heldOrders===1,"multi-order planner enforces shared finite capacity");
ok(dispatch.schedule[0].orderId==="WO-HIGH"&&dispatch.schedule[0].outcome==="OK","priority controls dispatch order");
ok(dispatch.schedule[1].outcome==="HOLD"&&dispatch.schedule[1].issues.some(x=>x.code==="NO_FEASIBLE_STATION"),"later order held when shared capacity is exhausted");
ok(JSON.stringify(dispatchInput)===dispatchBefore,"multi-order planner does not mutate supplied snapshots");
const enough=planOrders({orders:[makeOrder("WO-A",1,"2026-11-02"),makeOrder("WO-B",1,"2026-11-01")],stations:[{...dispatchStation[0],capacityMinutes:120}]});
ok(enough.outcome==="OK"&&enough.metrics.scheduledOrders===2,"multi-order planner schedules all feasible orders");
ok(enough.schedule[0].orderId==="WO-B","due date breaks equal-priority tie");
const duplicateOrders=planOrders({orders:[makeOrder("DUP",1),makeOrder("DUP",2)],stations:dispatchStation});
ok(duplicateOrders.outcome==="HOLD"&&duplicateOrders.issues.some(x=>x.code==="DUPLICATE_ORDER_ID"),"duplicate order identities fail closed");
const emptySchedule=planOrders({orders:[],stations:dispatchStation});
ok(emptySchedule.outcome==="HOLD"&&emptySchedule.issues[0].code==="ORDERS_UNSPECIFIED","empty production schedule fails closed");

// Packaged sample fixtures are executable, not documentation-only examples.
const sampleGood=JSON.parse(readFileSync(new URL("./samples/route-feasible.json",import.meta.url),"utf8"));
const sampleHold=JSON.parse(readFileSync(new URL("./samples/route-quality-hold.json",import.meta.url),"utf8"));
const sampleSchedule=JSON.parse(readFileSync(new URL("./samples/schedule-multi-order.json",import.meta.url),"utf8"));
const sampleScheduleResult=planOrders(sampleSchedule);
ok(sampleScheduleResult.outcome==="HOLD"&&sampleScheduleResult.metrics.scheduledOrders===1&&sampleScheduleResult.metrics.heldOrders===1,"multi-order packaged sample executes end-to-end");
const sampleResult=simulateManufacturing(sampleGood);
ok(sampleResult.outcome==="OK"&&sampleResult.metrics.inputQuantity===10,"feasible packaged sample executes end-to-end");
ok(route(sampleHold).outcome==="HOLD","quality-hold packaged sample blocks");


// Optional backend ecosystem: catalog, protocol, fail-closed selection and
// independent schedule validation. External packages are not required.
ok(BACKEND_CATALOG.backends.length===9,"curated open-source backend catalog is present");
ok(BACKEND_CATALOG.backends.every(b=>b.defaultEnabled===false),"external backends are opt-in and disabled by default");
ok(BACKEND_CATALOG.backends.find(b=>b.id==="google-or-tools").license==="Apache-2.0","OR-Tools license metadata");
ok(BACKEND_CATALOG.backends.find(b=>b.id==="highs").operations.includes("solve-mip-model"),"HiGHS LP/MILP capability metadata");
const disabledRegistry=new BackendRegistry({transport:{invoke:async()=>{throw new Error("must not call");}}});
const disabledCall=await disabledRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{model:{}},requestId:"disabled-1"});
ok(disabledCall.outcome==="HOLD"&&disabledCall.status==="UNAVAILABLE","no backend enabled means HOLD");
const disabledDiscovery=await disabledRegistry.discover();
ok(disabledDiscovery.every(x=>x.status==="DISABLED"),"backend discovery distinguishes disabled backends");
const noRequestId=await disabledRegistry.invoke({capability:"x",operation:"y",payload:{},requestId:""});
ok(noRequestId.status==="INVALID","stable request id is mandatory");
const nanPayload=await disabledRegistry.invoke({capability:"x",operation:"y",payload:{x:NaN},requestId:"nan-1"});
ok(nanPayload.status==="INVALID","non-finite payload values rejected");
const smallRegistry=new BackendRegistry({transport:{invoke:async()=>({})},enabled:[],maxPayloadBytes:8});
const oversized=await smallRegistry.invoke({capability:"x",operation:"y",payload:{text:"this payload is too large"},requestId:"large-1"});
ok(oversized.status==="INVALID"&&oversized.reason.includes("size limit"),"backend payload size limit enforced");
let unknownEnable=false;
try { disabledRegistry.enable("not-registered"); } catch(e) { unknownEnable=e.code==="BACKEND_UNKNOWN"; }
ok(unknownEnable,"unknown backend cannot be enabled");
let duplicateManifest=false;
try { disabledRegistry.register(BACKEND_CATALOG.backends[0]); } catch(e) { duplicateManifest=e.code==="BACKEND_DUPLICATE"; }
ok(duplicateManifest,"duplicate backend registration rejected");
const actuation=await disabledRegistry.invoke({capability:"manufacturing.cnc.execution.request",operation:"request-execution",payload:{gcode:"M3"},requestId:"cnc-1",executionClass:"physical-actuation"});
ok(actuation.outcome==="HOLD"&&actuation.status==="UNAVAILABLE","physical actuation remains blocked");

const jobshopInput={orders:[{order,quality:goodQuality}],stations};
const jobshopModel=buildJobshopModel(jobshopInput);
ok(jobshopModel.operations.length===2,"canonical route snapshot lowers into backend-neutral job-shop model");
ok(jobshopModel.operations[0].eligibleStationIds[0]==="mill-01","job-shop model preserves station capability constraints");
ok(jobshopModel.horizonMinutes===450,"job-shop model carries explicit planning horizon");
let duplicateStationRejected=false;
try { buildJobshopModel({...jobshopInput,stations:[stations[0],stations[0]]}); } catch(e) { duplicateStationRejected=e.code==="STATION_ID_INVALID"; }
ok(duplicateStationRejected,"duplicate station identities rejected before backend dispatch");
let duplicateOrderRejected=false;
try { buildJobshopModel({...jobshopInput,orders:[jobshopInput.orders[0],jobshopInput.orders[0]]}); } catch(e) { duplicateOrderRejected=e.code==="ORDER_ID_INVALID"; }
ok(duplicateOrderRejected,"duplicate order identities rejected before backend dispatch");
const validSchedule={assignments:[
 {orderId:"WO-1001",operationId:"op10",stationId:"mill-01",startMinute:0,endMinute:140},
 {orderId:"WO-1001",operationId:"op20",stationId:"inspect-01",startMinute:140,endMinute:170}
],makespanMinutes:170,optimal:true};
const validScheduleCheck=validateJobshopSchedule(jobshopModel,validSchedule);
ok(validScheduleCheck.valid,"independent schedule validator accepts feasible result");
const overlapSchedule={assignments:[
 {orderId:"WO-1001",operationId:"op10",stationId:"mill-01",startMinute:0,endMinute:140},
 {orderId:"WO-1001",operationId:"op20",stationId:"mill-01",startMinute:10,endMinute:40}
]};
const overlapCheck=validateJobshopSchedule(jobshopModel,overlapSchedule);
ok(!overlapCheck.valid&&overlapCheck.errors.some(x=>x.startsWith("INELIGIBLE_STATION")),"independent validator rejects ineligible station");
const precedenceSchedule={assignments:[
 {orderId:"WO-1001",operationId:"op10",stationId:"mill-01",startMinute:100,endMinute:240},
 {orderId:"WO-1001",operationId:"op20",stationId:"inspect-01",startMinute:0,endMinute:30}
]};
ok(validateJobshopSchedule(jobshopModel,precedenceSchedule).errors.some(x=>x.startsWith("PRECEDENCE_VIOLATION")),"independent validator rejects precedence violation");
const outOfHorizon={assignments:[
 {orderId:"WO-1001",operationId:"op10",stationId:"mill-01",startMinute:400,endMinute:540},
 {orderId:"WO-1001",operationId:"op20",stationId:"inspect-01",startMinute:540,endMinute:570}
]};
ok(validateJobshopSchedule(jobshopModel,outOfHorizon).errors.some(x=>x.startsWith("HORIZON_EXCEEDED")),"independent validator rejects schedule beyond planning horizon");
const duplicateSchedule={assignments:[...validSchedule.assignments,validSchedule.assignments[0]]};
ok(validateJobshopSchedule(jobshopModel,duplicateSchedule).errors.some(x=>x.startsWith("DUPLICATE_OPERATION")),"independent validator rejects duplicate operations");
const missingSchedule={assignments:[validSchedule.assignments[0]]};
ok(validateJobshopSchedule(jobshopModel,missingSchedule).errors.some(x=>x.startsWith("MISSING_OPERATION")),"independent validator rejects omitted operations");

const responseFor=(manifest,request,status="SUCCEEDED",result=validSchedule)=>({
 protocol:request.protocol,requestId:request.requestId,backendId:manifest.id,backendVersion:"test-1",status,result,diagnostics:[]
});
const solverTransport={
 probe:async manifest=>({available:manifest.id!=="google-or-tools"}),
 invoke:async (manifest,request)=>responseFor(manifest,request)
};
const fallbackRegistry=new BackendRegistry({transport:solverTransport,enabled:["google-or-tools","timefold-solver"]});
const discovered=await fallbackRegistry.discover();
ok(discovered.find(x=>x.id==="google-or-tools").status==="UNAVAILABLE"&&discovered.find(x=>x.id==="timefold-solver").status==="AVAILABLE","backend discovery reports health per configured adapter");
const noFallback=await fallbackRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{},requestId:"fallback-no"});
ok(noFallback.status==="UNAVAILABLE","backend outage does not silently fallback");
const fallbackRun=await optimizeJobshop(fallbackRegistry,jobshopInput,{requestId:"fallback-yes",preferredBackend:"google-or-tools",allowFallback:true});
ok(fallbackRun.outcome==="OK"&&fallbackRun.backend.id==="timefold-solver","explicit fallback selects alternate optimizer after UNAVAILABLE");
let infeasibleCalls=0;
const infeasibleRegistry=new BackendRegistry({transport:{
 probe:async()=>({available:true}),
 invoke:async (manifest,request)=>{infeasibleCalls++;return responseFor(manifest,request,"INFEASIBLE",null);}
},enabled:["google-or-tools","timefold-solver"]});
const infeasible=await infeasibleRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{},requestId:"infeasible",preferredBackend:"google-or-tools",allowFallback:true});
ok(infeasible.status==="INFEASIBLE"&&infeasibleCalls===1,"INFEASIBLE does not trigger fallback");
const badResultRegistry=new BackendRegistry({transport:{
 probe:async()=>({available:true}),
 invoke:async (manifest,request)=>responseFor(manifest,request,"SUCCEEDED",{assignments:[]})
},enabled:["google-or-tools"]});
const badOptimized=await optimizeJobshop(badResultRegistry,jobshopInput,{requestId:"bad-schedule"});
ok(badOptimized.outcome==="HOLD"&&badOptimized.status==="INVALID","solver success with invalid schedule is rejected");
const mismatchedRegistry=new BackendRegistry({transport:{
 probe:async()=>({available:true}),
 invoke:async (manifest,request)=>({...responseFor(manifest,request),requestId:"wrong-id"})
},enabled:["google-or-tools"]});
const mismatch=await mismatchedRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{},requestId:"right-id"});
ok(mismatch.outcome==="HOLD"&&mismatch.code==="REQUEST_ID_MISMATCH","mismatched backend request correlation rejected");
const nonFiniteResponseRegistry=new BackendRegistry({transport:{
 probe:async()=>({available:true}),
 invoke:async (manifest,request)=>responseFor(manifest,request,"SUCCEEDED",{value:Infinity})
},enabled:["google-or-tools"]});
const nonFiniteResponse=await nonFiniteResponseRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{},requestId:"infinite-response"});
ok(nonFiniteResponse.outcome==="HOLD"&&nonFiniteResponse.code==="NON_FINITE_NUMBER","non-finite solver output rejected");

const httpCalls=[];
const httpTransport=createHttpJsonTransport({endpoints:{"google-or-tools":"https://solver.example"},fetchImpl:async(url,opts)=>{
 httpCalls.push({url,method:opts.method});
 return {ok:true,status:200,json:async()=>opts.method==="GET"?{status:"OK"}:responseFor({id:"google-or-tools"},JSON.parse(opts.body))};
}});
const httpRegistry=new BackendRegistry({transport:httpTransport,enabled:["google-or-tools"]});
const httpResult=await httpRegistry.invoke({capability:"manufacturing.jobshop.optimize",operation:"solve-jobshop",payload:{model:{}},requestId:"http-1"});
ok(httpResult.outcome==="OK"&&httpCalls.some(c=>c.url.endsWith("/health"))&&httpCalls.some(c=>c.url.endsWith("/v1/execute")),"HTTPS gateway health and execute protocol");
const insecureTransport=createHttpJsonTransport({endpoints:{"google-or-tools":"http://solver.example"},fetchImpl:async()=>({ok:true,status:200,json:async()=>({status:"OK"})})});
const insecureHealth=await insecureTransport.probe({id:"google-or-tools"});
ok(insecureHealth.available===false,"non-loopback cleartext HTTP endpoint rejected");

const frappeCalls=[];
const frappeTransport=createFrappeRestTransport({
 baseUrl:"https://erp.example",apiKey:"test-key",apiSecret:"test-secret",
 fetchImpl:async(url,opts)=>{
  frappeCalls.push({url,method:opts.method,authorization:opts.headers.authorization});
  return {ok:true,status:200,headers:{get:()=> "16.0-test"},json:async()=>({data:{name:"WO-ERP-1",status:"Not Started",qty:12}})};
 }
});
const frappeRegistry=new BackendRegistry({transport:frappeTransport,enabled:["erpnext"]});
const erpRead=await frappeRegistry.invoke({capability:"manufacturing.workorder.exchange",operation:"read-workorder",payload:{name:"WO-ERP-1"},requestId:"erp-read-1"});
ok(erpRead.outcome==="OK"&&erpRead.result.data.name==="WO-ERP-1","ERPNext read-only work-order REST adapter");
ok(frappeCalls[0].method==="GET"&&frappeCalls[0].url.includes("/api/resource/Work%20Order/WO-ERP-1"),"ERPNext resource mapping uses GET only");
ok(frappeCalls[0].authorization==="token test-key:test-secret","ERPNext token injected at transport boundary");
const frappeProposal=await frappeRegistry.invoke({capability:"manufacturing.workorder.exchange",operation:"propose-workorder-update",payload:{name:"WO-ERP-1",changes:{qty:14}},requestId:"erp-proposal-1"});
ok(frappeProposal.outcome==="OK"&&frappeProposal.result.proposalOnly===true&&frappeProposal.result.externalWritePerformed===false,"ERPNext update is proposal-only, never a remote write");
ok(frappeCalls.length===1&&!JSON.stringify(frappeProposal).includes("test-secret"),"ERP credentials are not emitted in results");
let missingFrappeCreds=false;
try { createFrappeRestTransport({baseUrl:"https://erp.example",fetchImpl:async()=>({})}); } catch(e) { missingFrappeCreds=e.code==="FRAPPE_CREDENTIALS_REQUIRED"; }
ok(missingFrappeCreds,"ERPNext connector requires host-injected credentials");

const nodeTransport=createNodeWorkerTransport({commands:{mock:{
 command:process.execPath,
 args:["-e",'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const r=JSON.parse(s);process.stdout.write(JSON.stringify({protocol:r.protocol,requestId:r.requestId,backendId:"mock",backendVersion:"1",status:"SUCCEEDED",result:{echo:r.payload.value},diagnostics:[]}));});']
}}});
const nodeManifest={id:"mock",name:"Mock",license:"MIT",capabilities:["test.echo"],operations:["echo"]};
const nodeResponse=await nodeTransport.invoke(nodeManifest,{protocol:"ayeai.manufacturing.backend/v1",requestId:"node-1",payload:{value:42}});
ok(nodeResponse.status==="SUCCEEDED"&&nodeResponse.result.echo===42,"Node process transport executes allowlisted no-shell JSON worker");
const timeoutTransport=createNodeWorkerTransport({timeoutMs:25,commands:{slow:{command:process.execPath,args:["-e","setTimeout(()=>process.stdout.write('{}'),500)"]}}});
let workerTimeout=false;
try { await timeoutTransport.invoke({id:"slow"},{protocol:"ayeai.manufacturing.backend/v1",requestId:"slow-1"}); } catch(e) { workerTimeout=e.code==="WORKER_TIMEOUT"; }
ok(workerTimeout,"Node worker timeout kills a hung backend process");

const realPython=process.env.PYTHON || "python3";
const realWorkerTransport=createNodeWorkerTransport({timeoutMs:60000,commands:{
 "google-or-tools":{command:realPython,args:[fileURLToPath(new URL("./workers/ortools_jobshop_worker.py",import.meta.url))]},
 "scipy-highs-jobshop":{command:realPython,args:[fileURLToPath(new URL("./workers/scipy_highs_jobshop_worker.py",import.meta.url))]}
}});
const realBackendRegistry=new BackendRegistry({transport:realWorkerTransport,enabled:["google-or-tools","scipy-highs-jobshop"]});
const realBackendResult=await optimizeJobshop(realBackendRegistry,jobshopInput,{requestId:"real-worker-jobshop-001",preferredBackend:"google-or-tools",allowFallback:true});
if(realBackendResult.outcome==="OK") {
 ok(["google-or-tools","scipy-highs-jobshop"].includes(realBackendResult.backend.id)&&realBackendResult.result.validation.valid,
    "real optional solver worker produces independently validated job-shop schedule");
} else {
 ok(realBackendResult.status==="UNAVAILABLE","real solver workers report UNAVAILABLE when optional numerical dependencies are absent");
}

console.log(`manufacturing PASS: ${checks} assertions; route, quality, capacity, materials, calibration, simulation, immutability, fuzz.`);
