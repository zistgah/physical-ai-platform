/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { route, simulateManufacturing, planOrders } from "./module.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

console.log(`manufacturing PASS: ${checks} assertions; route, quality, capacity, materials, calibration, simulation, immutability, fuzz.`);
