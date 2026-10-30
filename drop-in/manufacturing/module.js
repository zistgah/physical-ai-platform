/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Deterministic, side-effect-free manufacturing route feasibility adapter.
 * Consumes canonical-graph projections; does not create a parallel graph,
 * reserve capacity, execute equipment, or claim physical manufacture.
 * License: GPL-3.0-only.
 */
const HOLD = "HOLD", OK = "OK";
const obj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const finite = Number.isFinite;
const pos = v => typeof v === "number" && finite(v) && v > 0;
const nn = v => typeof v === "number" && finite(v) && v >= 0;
const list = v => Array.isArray(v) ? v : [];
const uniq = xs => [...new Set(xs)];
const issue = (code, path, message) => ({ code, path, message, severity: "BLOCK" });
function result(outcome, issues, extra = {}) {
  return {
    outcome, status: outcome, issues, blockers: issues, warnings: [], orderId: null,
    route: [],
    metrics: { operationCount: 0, routedOperationCount: 0, totalRequiredMinutes: 0, stationCount: 0, projectedLoads: {} },
    semantics: { planningOnly: true, capacityReserved: false, workOrderExecuted: false, physicalManufactureProven: false, canonicalGraphMutated: false },
    ...extra
  };
}
function stationNormalize(s, i, issues) {
  const p = `stations[${i}]`;
  if (!obj(s) || typeof s.id !== "string" || !s.id.trim()) {
    issues.push(issue("STATION_INVALID", p, "Station must be an object with a non-empty id.")); return null;
  }
  const capacity = s.capacityMinutes ?? s.availableMinutes;
  const booked = s.bookedMinutes ?? 0;
  if (!nn(capacity)) issues.push(issue("CAPACITY_UNSPECIFIED", `${p}.capacityMinutes`, "Finite non-negative capacityMinutes is required."));
  if (!nn(booked)) issues.push(issue("BOOKED_CAPACITY_INVALID", `${p}.bookedMinutes`, "bookedMinutes must be finite and non-negative."));
  if (nn(capacity) && nn(booked) && booked > capacity) issues.push(issue("BOOKED_CAPACITY_EXCEEDED", p, "Booked minutes exceed station capacity."));
  return { raw:s, id:s.id, name:s.name || s.id, processes:list(s.processes), capabilities:list(s.capabilities), capacity, booked,
    available:s.available === false || ["OFFLINE","MAINTENANCE","DISABLED"].includes(s.status) ? false : (s.available === true || ["AVAILABLE","IDLE","READY"].includes(s.status)),
    calibration:s.calibration, maintenanceDue:s.maintenanceDue === true, jurisdiction:s.jurisdiction, exportStatus:s.exportStatus };
}
function qualityValidate(q, issues) {
  if (!obj(q)) { issues.push(issue("QUALITY_UNSPECIFIED", "quality", "Quality release state is required.")); return; }
  if (q.hold === true || ["HOLD","QUARANTINED","REJECTED"].includes(q.status)) issues.push(issue("QUALITY_HOLD", "quality", "Quality system has an active hold."));
  else if (q.status !== "RELEASED") issues.push(issue("QUALITY_RELEASE_UNSPECIFIED", "quality.status", "Quality status must explicitly be RELEASED."));
  for (const field of ["nonconformances", "requiredInspections", "inspections"]) if (q[field] !== undefined && !Array.isArray(q[field]))
    issues.push(issue("QUALITY_RECORDS_INVALID", `quality.${field}`, `${field} must be an array when supplied.`));
  for (const nc of list(q.nonconformances)) if (!obj(nc) || !["CLOSED","ACCEPTED_AS_IS","VOID"].includes(nc.status))
    issues.push(issue("OPEN_NONCONFORMANCE", "quality.nonconformances", `Nonconformance ${nc?.id || "UNIDENTIFIED"} is not dispositioned.`));
  for (const id of list(q.requiredInspections)) {
    const e = list(q.inspections).find(x => x && (x.id === id || x.stepId === id || x.inspectionId === id));
    if (!e || e.outcome !== "PASS" || e.verified !== true) issues.push(issue("INSPECTION_NOT_VERIFIED", `quality.inspections.${id}`, `Inspection ${id} lacks verified PASS evidence.`));
  }
  if (!["CLEARED","NOT_CONTROLLED","NOT_APPLICABLE"].includes(q.exportStatus))
    issues.push(issue("EXPORT_STATUS_NOT_CLEARED", "quality.exportStatus", "Compliance/export status must be explicitly cleared or not applicable; UNKNOWN/missing must HOLD."));
}
function materialValidate(order, routing, materials, issues) {
  const reqs = [...list(order.materialRequirements), ...routing.flatMap(s => list(s.materialRequirements))];
  if (!reqs.length) return;
  if (!Array.isArray(materials)) { issues.push(issue("MATERIAL_AVAILABILITY_UNSPECIFIED", "materials", "Material requirements exist but no stock snapshot was supplied.")); return; }
  const totals = new Map();
  for (const r of reqs) {
    if (!obj(r) || !r.materialId || !pos(r.quantity)) { issues.push(issue("MATERIAL_REQUIREMENT_INVALID", "materials.requirements", "Requirement needs materialId and positive quantity.")); continue; }
    totals.set(r.materialId, (totals.get(r.materialId) || 0) + r.quantity);
  }
  for (const [materialId, required] of totals) {
    const matching = materials.filter(m => m && m.materialId === materialId);
    if (matching.length > 1) issues.push(issue("DUPLICATE_MATERIAL_STOCK", `materials.${materialId}`, "Multiple stock records match one material id; reconcile the canonical inventory projection."));
    const stock = matching[0];
    if (!stock || !nn(stock.availableQuantity)) issues.push(issue("MATERIAL_STOCK_UNSPECIFIED", `materials.${materialId}`, "Material stock is missing or unspecified."));
    else if (stock.availableQuantity < required) issues.push(issue("MATERIAL_SHORTAGE", `materials.${materialId}`, `Required total ${required}; available ${stock.availableQuantity}.`));
    if (!stock || !["AVAILABLE","RELEASED"].includes(stock.status)) issues.push(issue("MATERIAL_QUALITY_HOLD", `materials.${materialId}.status`, "Material status must explicitly be AVAILABLE or RELEASED."));
  }
}
/**
 * route({order:{id,quantity,routing:[{id,process,cycleTimeMinutes,setupMinutes?,stationId?,requiredCapabilities?,materialRequirements?}]},
 * stations:[{id,processes,capabilities?,capacityMinutes,bookedMinutes?,available?,status?,calibration:{status:"VALID",validUntil?}}],
 * quality:{status:"RELEASED",requiredInspections?,inspections?,nonconformances?,exportStatus?}, materials?:[{materialId,availableQuantity,status?}]})
 *
 * Capacity units are minutes for the supplied planning window. Operation demand
 * = setupMinutes + quantity * cycleTimeMinutes. Candidate assignment minimizes
 * projected utilization, then station id. This is a deterministic heuristic,
 * not a global APS optimizer. A returned route is a proposal, never a reservation.
 */
export function route(input = {}) {
  const issues=[];
  if (!obj(input)) return result(HOLD,[issue("INPUT_INVALID","input","Input must be an object.")]);
  const {order,stations,quality,materials}=input;
  if (!obj(order)) return result(HOLD,[issue("ORDER_UNSPECIFIED","order","Order is required.")]);
  if (typeof order.id !== "string" || !order.id.trim()) issues.push(issue("ORDER_ID_MISSING","order.id","Order id is required."));
  if (!pos(order.quantity)) issues.push(issue("ORDER_QUANTITY_INVALID","order.quantity","Order quantity must be a positive finite number."));
  if (!Array.isArray(order.routing) || !order.routing.length) issues.push(issue("ROUTING_UNSPECIFIED","order.routing","Explicit non-empty routing is required."));
  if (!Array.isArray(stations) || !stations.length) issues.push(issue("STATIONS_UNSPECIFIED","stations","At least one station is required."));
  const ss=list(stations).map((s,i)=>stationNormalize(s,i,issues)).filter(Boolean);
  const seen=new Set(); for(const s of ss){if(seen.has(s.id))issues.push(issue("DUPLICATE_STATION_ID","stations",`Duplicate station id ${s.id}.`));seen.add(s.id);}
  const steps=list(order.routing).map((s,i)=>{
    const p=`order.routing[${i}]`;
    if(!obj(s)){issues.push(issue("ROUTING_STEP_INVALID",p,"Step must be an object."));return null;}
    const process=s.process || s.processName, quantity=s.quantity ?? order.quantity, cycle=s.cycleTimeMinutes ?? s.cycleTimePerUnitMinutes, setup=s.setupMinutes ?? 0;
    if(typeof process!=="string"||!process.trim())issues.push(issue("PROCESS_UNSPECIFIED",`${p}.process`,"Process name is required."));
    if(!pos(quantity))issues.push(issue("STEP_QUANTITY_INVALID",`${p}.quantity`,"Step quantity must be positive."));
    if(!pos(cycle))issues.push(issue("CYCLE_TIME_UNSPECIFIED",`${p}.cycleTimeMinutes`,"Positive cycle time per unit is required."));
    if(!nn(setup))issues.push(issue("SETUP_TIME_INVALID",`${p}.setupMinutes`,"Setup time must be non-negative."));
    return {id:s.id||`step-${i+1}`,process,quantity,cycle,setup,stationId:s.stationId||null,capabilities:list(s.requiredCapabilities),materials:list(s.materialRequirements),inspectionRequired:s.inspectionRequired===true||s.inspection===true};
  }).filter(Boolean);
  qualityValidate(quality,issues);
  if (obj(quality)) for (const step of steps.filter(x => x.inspectionRequired)) {
    const evidence = list(quality.inspections).find(x => x && (x.id === step.id || x.stepId === step.id || x.inspectionId === step.id));
    if (!evidence || evidence.outcome !== "PASS" || evidence.verified !== true)
      issues.push(issue("STEP_INSPECTION_NOT_VERIFIED", `quality.inspections.${step.id}`, `Routing step ${step.id} requires verified PASS inspection evidence.`));
  }
  materialValidate(order,steps,materials,issues);
  const loads=new Map(ss.map(s=>[s.id,s.booked])); const proposal=[];
  for(let i=0;i<steps.length;i++){
    const st=steps[i], demand=st.setup+st.quantity*st.cycle;
    const candidates=ss.filter(s=>s.available&&(!st.stationId||s.id===st.stationId)&&s.processes.includes(st.process)&&st.capabilities.every(c=>s.capabilities.includes(c))&&nn(s.capacity)&&nn(s.booked)&&loads.get(s.id)+demand<=s.capacity)
      .sort((a,b)=>((loads.get(a.id)+demand)/a.capacity)-((loads.get(b.id)+demand)/b.capacity)||a.id.localeCompare(b.id));
    if(!candidates.length){issues.push(issue("NO_FEASIBLE_STATION",`order.routing[${i}]`,st.stationId?`Pinned station ${st.stationId} is unavailable, incompatible or over capacity.`:`No compatible station has sufficient remaining capacity for ${st.process}.`));continue;}
    const s=candidates[0]; loads.set(s.id,loads.get(s.id)+demand);
    const idx=ss.indexOf(s);
    if(!s.calibration||s.calibration.status!=="VALID")issues.push(issue("CALIBRATION_INVALID",`stations[${idx}].calibration`,`Station ${s.id} calibration is not VALID.`));
    else if(s.calibration.validUntil && !finite(Date.parse(s.calibration.validUntil)))issues.push(issue("CALIBRATION_DATE_INVALID",`stations[${idx}].calibration.validUntil`,`Station ${s.id} calibration expiry date is invalid.`));
    else if(s.calibration.validUntil && Date.parse(s.calibration.validUntil)<Date.now())issues.push(issue("CALIBRATION_EXPIRED",`stations[${idx}].calibration.validUntil`,`Station ${s.id} calibration has expired.`));
    if(s.exportStatus !== undefined && !["CLEARED","NOT_CONTROLLED","NOT_APPLICABLE"].includes(s.exportStatus))issues.push(issue("STATION_EXPORT_NOT_CLEARED",`stations[${idx}].exportStatus`,`Station ${s.id} has unresolved jurisdiction/export status.`));
    if(s.jurisdiction && s.exportStatus === undefined)issues.push(issue("STATION_EXPORT_STATUS_UNSPECIFIED",`stations[${idx}].exportStatus`,`Station ${s.id} has a jurisdiction but no export/compliance decision.`));
    if(s.maintenanceDue)issues.push(issue("MAINTENANCE_DUE",`stations[${idx}].maintenanceDue`,`Station ${s.id} is due for maintenance.`));
    proposal.push({sequence:i+1,stepId:st.id,process:st.process,stationId:s.id,quantity:st.quantity,setupMinutes:st.setup,runMinutes:st.quantity*st.cycle,requiredMinutes:demand,projectedBookedMinutes:loads.get(s.id),capacityMinutes:s.capacity,utilization:s.capacity?loads.get(s.id)/s.capacity:null,inspectionRequired:st.inspectionRequired});
  }
  const total=proposal.reduce((n,p)=>n+p.requiredMinutes,0);
  return result(issues.length?HOLD:OK,issues,{orderId:order.id||null,route:proposal,metrics:{operationCount:steps.length,routedOperationCount:proposal.length,totalRequiredMinutes:total,stationCount:uniq(proposal.map(p=>p.stationId)).length,projectedLoads:Object.fromEntries([...loads].sort(([a],[b])=>a.localeCompare(b)))},semantics:{planningOnly:true,capacityReserved:false,workOrderExecuted:false,physicalManufactureProven:false,canonicalGraphMutated:false}});
}
/** In-memory deterministic sample simulator. Not a PLC, MES or physical test. */
export function simulateManufacturing(input={}) {
  const plan=route(input);
  if(plan.outcome!==OK)return {...plan,simulation:{executed:false,reason:"Route is not releasable."}};
  const {order,quality}=input; const qty=order.quantity, fail=list(quality.inspections).some(x=>x?.outcome==="FAIL"&&x.verified===true);
  const y=order.expectedYield;
  if(y!==undefined&&(!finite(y)||y<0||y>1))return result(HOLD,[issue("YIELD_INVALID","order.expectedYield","expectedYield must be between 0 and 1.")],{orderId:order.id,simulation:{executed:false}});
  const good=fail?0:(y===undefined?qty:Math.floor(qty*y));
  return result(fail||good===0?HOLD:OK,fail?[issue("SIMULATED_INSPECTION_FAILURE","quality.inspections","Verified failed inspection prevents simulated release.")]:[],{
    orderId:order.id,route:plan.route,metrics:{...plan.metrics,inputQuantity:qty,goodQuantity:good,scrapQuantity:qty-good,simulatedYield:qty?good/qty:0},
    genealogy:plan.route.map(op=>({orderId:order.id,sequence:op.sequence,stepId:op.stepId,stationId:op.stationId,process:op.process,quantity:op.quantity})),
    evidence:[{type:"SIMULATION_EVIDENCE",method:"VIRTUAL_ROUTE_SIMULATION",state:"SIMULATED",verified:false,note:"Simulation evidence is not physical inspection or proof of manufacture."}],
    simulation:{executed:true,deterministic:true,physicalExecution:false,canonicalGraphMutated:false}
  });
}


/**
 * planOrders({orders, stations})
 *
 * Deterministic finite-capacity multi-order dispatch planner. Each item is
 * {order, quality, materials?}. Orders are sequenced by priority descending,
 * dueDate ascending (missing due dates last), then order.id lexical. A successful
 * route consumes virtual capacity for later proposals in this planning run.
 * A held order consumes no capacity. The returned plan is a snapshot only:
 * no reservation, queue write, inventory issue or canonical graph mutation.
 *
 * This is a deterministic dispatch heuristic, not an optimizer proving global
 * optimality. A real commit must use an atomic reservation transaction in the
 * factory/MES owner and revalidate the resource version at commit time.
 */
export function planOrders(input = {}) {
  const issues = [];
  if (!obj(input)) return result(HOLD, [issue("INPUT_INVALID", "input", "Input must be an object.")]);
  if (!Array.isArray(input.orders) || input.orders.length === 0)
    return result(HOLD, [issue("ORDERS_UNSPECIFIED", "orders", "At least one order proposal is required.")]);
  if (!Array.isArray(input.stations) || input.stations.length === 0)
    return result(HOLD, [issue("STATIONS_UNSPECIFIED", "stations", "At least one station snapshot is required.")]);

  const seen = new Set();
  for (const [i, item] of input.orders.entries()) {
    if (!obj(item) || !obj(item.order) || typeof item.order.id !== "string" || !item.order.id.trim()) {
      issues.push(issue("ORDER_ID_MISSING", `orders[${i}].order.id`, "Every scheduled order needs a stable id."));
      continue;
    }
    if (seen.has(item.order.id)) issues.push(issue("DUPLICATE_ORDER_ID", `orders[${i}].order.id`, `Duplicate order id ${item.order.id}.`));
    seen.add(item.order.id);
  }
  if (issues.length) return result(HOLD, issues, {
    schedule: [], metrics: { proposedOrders: input.orders.length, scheduledOrders: 0, heldOrders: input.orders.length, totalRequiredMinutes: 0, projectedLoads: {} },
    semantics: { planningOnly: true, capacityReserved: false, workOrdersExecuted: false, physicalManufactureProven: false, canonicalGraphMutated: false }
  });

  const ordered = input.orders.map((item, index) => ({ ...item, _index: index }))
    .sort((a, b) => {
      const pa = finite(a.priority) ? a.priority : 0;
      const pb = finite(b.priority) ? b.priority : 0;
      if (pa !== pb) return pb - pa;
      const da = a.dueDate && Number.isFinite(Date.parse(a.dueDate)) ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
      const db = b.dueDate && Number.isFinite(Date.parse(b.dueDate)) ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
      return da - db || a.order.id.localeCompare(b.order.id);
    });

  const virtualStations = input.stations.map(s => ({ ...s }));
  const schedule = [];
  for (const item of ordered) {
    const planned = route({ order: item.order, stations: virtualStations, quality: item.quality, materials: item.materials });
    schedule.push({
      orderId: item.order.id,
      priority: finite(item.priority) ? item.priority : 0,
      dueDate: item.dueDate || null,
      outcome: planned.outcome,
      route: planned.route,
      issues: planned.issues,
      requiredMinutes: planned.metrics.totalRequiredMinutes,
      dispatchSequence: schedule.length + 1
    });
    if (planned.outcome === OK) {
      for (const station of virtualStations) {
        const load = planned.metrics.projectedLoads?.[station.id];
        if (finite(load)) station.bookedMinutes = load;
      }
    }
  }
  const scheduled = schedule.filter(x => x.outcome === OK);
  const held = schedule.filter(x => x.outcome === HOLD);
  const total = scheduled.reduce((sum, x) => sum + x.requiredMinutes, 0);
  const finalLoads = Object.fromEntries(virtualStations
    .map(s => [s.id, s.bookedMinutes ?? 0])
    .sort(([a], [b]) => a.localeCompare(b)));
  return result(held.length ? HOLD : OK, held.flatMap(x => x.issues.map(i => ({ ...i, path: `orders.${x.orderId}.${i.path}` }))), {
    schedule,
    metrics: {
      proposedOrders: input.orders.length,
      scheduledOrders: scheduled.length,
      heldOrders: held.length,
      totalRequiredMinutes: total,
      projectedLoads: finalLoads
    },
    semantics: {
      planningOnly: true, capacityReserved: false, workOrdersExecuted: false,
      physicalManufactureProven: false, canonicalGraphMutated: false,
      dispatchPolicy: "priority-desc,dueDate-asc,orderId-asc",
      globalOptimalityProven: false
    }
  });
}
