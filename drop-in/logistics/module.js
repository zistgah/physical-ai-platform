/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/logistics/module.js
 * FILE PURPOSE: Supply-chain planning and logistics domain adapter.
 * License: GPL-3.0-only.
 *
 * Pure, deterministic domain functions. No IO, clocks, network, persistence, or kernel
 * mutation. The caller supplies all data and maps returned projections to canonical
 * entities/relations. HOLD is fail-closed and never silently converted to OK.
 */

const OK = "OK";
const HOLD = "HOLD";
const text = v => typeof v === "string" && v.trim().length > 0;
const finite = v => typeof v === "number" && Number.isFinite(v);
const qty = v => finite(v) && v > 0;
const nonneg = v => finite(v) && v >= 0;
const parsedTime = v => typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) &&
  Number.isFinite(Date.parse(v)) ? Date.parse(v) : null;
const iso = v => parsedTime(v) === null ? null : new Date(parsedTime(v)).toISOString();
const cmp = (a,b) => String(a).localeCompare(String(b));
const resultHold = (reason, details={}) => ({ outcome:HOLD, reason, ...details });
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

const EXPORT_CLEAR = new Set(["CLEAR", "NOT_CONTROLLED"]);
const SUPPLIER_LIFECYCLE = new Set(["ACTIVE", "LAST_TIME_BUY", "OBSOLETE", "UNKNOWN"]);
const BOM_TYPES = new Set(["EBOM","MBOM","SBOM","HBOM","CBOM","ABOM"]);
const SHIPMENT_STATES = new Set(["PLANNED","CONFIRMED","PICKED_UP","IN_TRANSIT","ARRIVED","RECEIVED","QUARANTINED","RELEASED","RETURNED","CANCELLED"]);
const SHIPMENT_TRANSITIONS = {
  PLANNED:["CONFIRMED","CANCELLED"],
  CONFIRMED:["PICKED_UP","CANCELLED"],
  PICKED_UP:["IN_TRANSIT","CANCELLED"],
  IN_TRANSIT:["ARRIVED","CANCELLED"],
  ARRIVED:["RECEIVED","QUARANTINED"],
  RECEIVED:["QUARANTINED","RELEASED","RETURNED"],
  QUARANTINED:["RELEASED","RETURNED"],
  RELEASED:["RETURNED"],
  RETURNED:[],
  CANCELLED:[]
};
const RETURN_STATES = new Set(["REQUESTED","IN_TRANSIT","RECEIVED_QUARANTINE","INSPECTED","DISPOSITION_APPROVED","REPAIRED","RECYCLED","SCRAPPED","RETURNED_TO_SUPPLIER","CANCELLED"]);
const RETURN_TRANSITIONS = {
  REQUESTED:["IN_TRANSIT","CANCELLED"],
  IN_TRANSIT:["RECEIVED_QUARANTINE"],
  RECEIVED_QUARANTINE:["INSPECTED"],
  INSPECTED:["DISPOSITION_APPROVED"],
  DISPOSITION_APPROVED:["REPAIRED","RECYCLED","SCRAPPED","RETURNED_TO_SUPPLIER"],
  REPAIRED:[], RECYCLED:[], SCRAPPED:[], RETURNED_TO_SUPPLIER:[], CANCELLED:[]
};

/** Iteration 47 compatibility. Estimate-only, never asserts physical availability. */
function legacySupply({part, qty:requested, lead}={}) {
  if (!text(part)) return resultHold("Part is UNSPECIFIED");
  if (!qty(requested)) return resultHold("Quantity must be positive");
  if (!nonneg(lead)) return resultHold("Lead time must be non-negative");
  return {outcome:OK, mode:"LEGACY_ESTIMATE", part:part.trim(), qty:requested, lead,
    commitment:"ESTIMATE_ONLY",
    note:"Compatibility estimate only. It does not reserve stock, qualify a supplier, place an order, or assert fulfillment."};
}

function validateOrder(order) {
  if (!order || !text(order.id)) return "Order ID is UNSPECIFIED";
  if (!Array.isArray(order.lines) || !order.lines.length) return "Order lines are UNSPECIFIED";
  if (order.requiredBy != null && parsedTime(order.requiredBy)===null) return "Order requiredBy is invalid";
  for (let i=0;i<order.lines.length;i++) {
    const line=order.lines[i];
    if (!line || !text(line.part)) return `Order line ${i} part is UNSPECIFIED`;
    if (!qty(line.qty)) return `Order line ${i} quantity must be positive`;
    if (line.requiredBy != null && parsedTime(line.requiredBy)===null) return `Order line ${i} requiredBy is invalid`;
    if (line.bomType != null && !BOM_TYPES.has(line.bomType)) return `Order line ${i} BOM type is invalid`;
  }
  return null;
}

/**
 * Expand an explicitly supplied BOM tree into component demand.
 * BOM rows: {id,type,parentPart,revision,status,components:[{part,qty}]}
 * A BOM is used only when an order line names bomType and matching parentPart exists.
 * Missing, ambiguous, cyclic, or unreleased BOM data holds the order.
 */
function explodeDemand(orderLines, boms=[]) {
  const demand = new Map();
  const origins = new Map();
  const dueByPart = new Map();
  const findings = [];
  const bomRows = Array.isArray(boms) ? boms : [];
  function add(part, amount, sourceLine, stack) {
    if (!qty(amount)) { findings.push({code:"INVALID_EXPANSION_QUANTITY",part,amount}); return; }
    const candidates = bomRows.filter(b=>b && b.parentPart===part && b.type===sourceLine.bomType);
    if (sourceLine.bomType && candidates.length !== 1) {
      findings.push({code:candidates.length===0?"BOM_NOT_FOUND":"BOM_AMBIGUOUS",part,bomType:sourceLine.bomType,count:candidates.length});
      return;
    }
    if (!sourceLine.bomType || candidates.length===0) {
      demand.set(part,(demand.get(part)||0)+amount);
      if (sourceLine.requiredBy) {
        const due=parsedTime(sourceLine.requiredBy);
        if (due!==null) dueByPart.set(part,Math.min(dueByPart.get(part)??Infinity,due));
      }
      const arr=origins.get(part)||[];
      arr.push({orderLineId:sourceLine.id??null,requestedPart:sourceLine.part,qty:amount,bomPath:[...stack]});
      origins.set(part,arr);
      return;
    }
    const bom=candidates[0];
    if (!text(bom.id) || bom.status!=="RELEASED" || !Array.isArray(bom.components) || !bom.components.length) {
      findings.push({code:"BOM_NOT_RELEASED_OR_EMPTY",part,bomId:bom.id??null,status:bom.status??"UNKNOWN"});
      return;
    }
    if (stack.includes(bom.id)) { findings.push({code:"BOM_CYCLE",part,bomId:bom.id,path:[...stack,bom.id]}); return; }
    for (const component of bom.components) {
      if (!component || !text(component.part) || !qty(component.qty) ||
          (component.childBomType!=null && !BOM_TYPES.has(component.childBomType))) {
        findings.push({code:"INVALID_BOM_COMPONENT",bomId:bom.id,component:component??null});
        continue;
      }
      // Child component BOM expansion is explicit via childBomType, not guessed.
      add(component.part,amount*component.qty,
        {id:sourceLine.id,part:component.part,bomType:component.childBomType??null,requiredBy:sourceLine.requiredBy??null},
        [...stack,bom.id]);
    }
  }
  for (const line of orderLines) add(line.part,line.qty,line,[]);
  return {demand,origins,findings,dueByPart};
}

function profileFor(profiles, part) {
  if (Array.isArray(profiles)) return profiles.find(p=>p?.part===part) ?? null;
  return profiles && typeof profiles==="object" ? profiles[part] ?? null : null;
}

function validateHandling(part, profile) {
  if (!profile) return [];
  const holds=[];
  const handling=profile.handling ?? {};
  if (profile.hazardous===true) {
    if (handling.status!=="VERIFIED") holds.push({code:"HAZMAT_HANDLING_NOT_VERIFIED",part});
    if (!text(handling.hazardClass)) holds.push({code:"HAZMAT_CLASS_UNSPECIFIED",part});
    if (handling.safetyDataSheetStatus!=="CURRENT") holds.push({code:"SAFETY_DATA_SHEET_NOT_CURRENT",part});
    if (!text(handling.packagingInstruction)) holds.push({code:"PACKAGING_INSTRUCTION_UNSPECIFIED",part});
    if (!text(handling.carrierAuthorization)) holds.push({code:"CARRIER_AUTHORIZATION_UNSPECIFIED",part});
  }
  if (profile.battery===true && handling.un38_3Status!=="VERIFIED") {
    holds.push({code:"BATTERY_UN38_3_NOT_VERIFIED",part});
  }
  if (profile.pressureVessel===true && handling.pressureVesselCertificateStatus!=="VALID") {
    holds.push({code:"PRESSURE_VESSEL_CERTIFICATE_INVALID",part});
  }
  if (profile.temperatureControlled===true && (!finite(handling.minTemperatureC) || !finite(handling.maxTemperatureC) ||
      handling.minTemperatureC>handling.maxTemperatureC)) {
    holds.push({code:"TEMPERATURE_CONTROL_SPECIFICATION_INVALID",part});
  }
  if (profile.avionics===true && handling.airworthinessEvidenceStatus!=="VERIFIED") {
    holds.push({code:"AVIONICS_AIRWORTHINESS_EVIDENCE_NOT_VERIFIED",part});
  }
  if (profile.avionics===true && handling.certificationStatus!=="VERIFIED") {
    holds.push({code:"AVIONICS_CERTIFICATION_NOT_VERIFIED",part});
  }
  if (profile.radioEquipment===true) {
    if (handling.typeApprovalStatus!=="VALID") holds.push({code:"RADIO_TYPE_APPROVAL_INVALID",part});
    if (handling.spectrumAuthorizationStatus!=="VALID") holds.push({code:"RADIO_SPECTRUM_AUTHORIZATION_INVALID",part});
    if (!text(handling.frequencyBand)||!text(handling.jurisdiction)) holds.push({code:"RADIO_FREQUENCY_OR_JURISDICTION_UNSPECIFIED",part});
  }
  return holds;
}

function validateInventoryRow(row, part, nowMs) {
  if (!row || !text(row.id) || !qty(row.onHand) || !nonneg(row.reserved??0) ||
      (row.reserved??0)>row.onHand) return {error:{code:"INVALID_INVENTORY_RECORD",part,recordId:row?.id??null}};
  if (row.qualityStatus!=="RELEASED") return {error:{code:"INVENTORY_QUALITY_HOLD",part,recordId:row.id,status:row.qualityStatus??"UNKNOWN"}};
  if (row.expiresAt != null) {
    const expiry=parsedTime(row.expiresAt);
    if (expiry===null) return {error:{code:"INVALID_LOT_EXPIRY",part,recordId:row.id}};
    if (expiry<=nowMs) return {error:{code:"LOT_EXPIRED",part,recordId:row.id,expiresAt:row.expiresAt}};
  }
  return {available:row.onHand-(row.reserved??0)};
}

function sourceExportAllowed(source) {
  return EXPORT_CLEAR.has(source.exportStatus);
}

function planOrder(input={}) {
  const order=input.order;
  const invalid=validateOrder(order);
  if (invalid) return resultHold(invalid,{orderId:order?.id??null});
  const planningDate=input.planningDate ?? input.now;
  const planningMs=planningDate==null ? null : parsedTime(planningDate);
  if (planningDate!=null && planningMs===null) return resultHold("Planning date is invalid",{orderId:order.id});
  const defaultNow=planningMs;
  const requestedDue=[input.requiredBy,order.requiredBy].filter(Boolean)
    .map(parsedTime);
  if (requestedDue.some(v=>v===null)) return resultHold("Required-by date is invalid",{orderId:order.id});
  const dueMs=requestedDue.length?Math.min(...requestedDue):null;
  const dueIso=dueMs===null?null:new Date(dueMs).toISOString();
  const expanded=explodeDemand(order.lines,input.boms);
  const holds=[...expanded.findings];
  const allocations=[];
  const warnings=[];
  const lineDemand=[...expanded.demand.entries()].sort((a,b)=>cmp(a[0],b[0]));
  const inventoryRows=Array.isArray(input.inventory)?input.inventory:[];
  const shipments=Array.isArray(input.shipments)?input.shipments:[];
  const suppliers=Array.isArray(input.suppliers)?input.suppliers:[];
  const duplicateKeys=(rows,keyFn)=> {
    const seen=new Set(), dup=new Set();
    for (const row of rows) { const key=keyFn(row); if (key==null) continue; if(seen.has(key))dup.add(key); seen.add(key); }
    return dup;
  };
  const duplicateInventory=duplicateKeys(inventoryRows,r=>r?.id?`${r.part}:${r.id}`:null);
  const duplicateShipments=duplicateKeys(shipments,r=>r?.id??null);
  const duplicateSuppliers=duplicateKeys(suppliers,r=>r?.id??null);
  for (const id of duplicateInventory) holds.push({code:"DUPLICATE_INVENTORY_ID",recordKey:id});
  for (const id of duplicateShipments) holds.push({code:"DUPLICATE_SHIPMENT_ID",shipmentId:id});
  for (const id of duplicateSuppliers) holds.push({code:"DUPLICATE_SUPPLIER_ID",supplierId:id});
  const profiles=input.materialProfiles??{};
  const demandSummary=[];
  const graphNodes=[{id:order.id,type:"ORDER"}];
  const graphEdges=[];
  let anyUncovered=false;

  for (const [part,required] of lineDemand) {
    const lineDue=expanded.dueByPart.get(part)??null;
    const dueForPartMs=[dueMs,lineDue].filter(v=>v!==null).reduce((a,b)=>Math.min(a,b),Infinity);
    const partDueMs=Number.isFinite(dueForPartMs)?dueForPartMs:null;
    const profile=profileFor(profiles,part);
    holds.push(...validateHandling(part,profile));
    if (profile?.lifecycleStatus != null) {
      if (!SUPPLIER_LIFECYCLE.has(profile.lifecycleStatus) || profile.lifecycleStatus==="UNKNOWN") {
        holds.push({code:"PART_LIFECYCLE_UNKNOWN",part});
      } else if (profile.lifecycleStatus==="OBSOLETE") {
        holds.push({code:"PART_OBSOLETE",part});
      } else if (profile.lifecycleStatus==="LAST_TIME_BUY") {
        warnings.push({code:"PART_LAST_TIME_BUY",part});
      }
    }
    if (profile?.obsolescenceDate != null && parsedTime(profile.obsolescenceDate)===null) {
      holds.push({code:"INVALID_OBSOLESCENCE_DATE",part});
    }
    let remaining=required;

    // One shared pool per part, across all demand lines, so stock is never double counted.
    const stockCandidates=inventoryRows.filter(r=>r?.part===part && !duplicateInventory.has(`${r.part}:${r.id}`)).map(row=>{
      if (row.expiresAt!=null && planningMs===null) {
        holds.push({code:"AS_OF_DATE_REQUIRED_FOR_EXPIRY",part,recordId:row.id});
        return null;
      }
      const checked=validateInventoryRow(row,part,defaultNow);
      if (checked.error) { holds.push(checked.error); return null; }
      return {...row,available:checked.available};
    }).filter(Boolean).sort((a,b)=>{
      const ea=parsedTime(a.expiresAt??"9999-12-31T00:00:00Z")??Infinity;
      const eb=parsedTime(b.expiresAt??"9999-12-31T00:00:00Z")??Infinity;
      return ea-eb || cmp(a.id,b.id);
    });
    for (const row of stockCandidates) {
      if (remaining<=0) break;
      const take=Math.min(remaining,row.available);
      if (!take) continue;
      allocations.push({part,qty:take,sourceType:"INVENTORY",sourceId:row.id,
        lot:row.lot??null,serials:Array.isArray(row.serials)?[...row.serials]:[],
        origin:row.origin??null,process:row.process??null,location:row.location??null,
        commitment:"AVAILABLE",bomOrigins:clone(expanded.origins.get(part)??[])});
      row.available-=take; remaining-=take;
      graphNodes.push({id:`INVENTORY:${row.id}`,type:"INVENTORY"});
      graphEdges.push({from:`INVENTORY:${row.id}`,to:order.id,relation:"SUPPLIES",part,qty:take});
    }

    const inbound=shipments.filter(s=>s?.part===part).sort((a,b)=>
      cmp(a.eta??"",b.eta??"")||cmp(a.id??"",b.id??""));
    for (const shipment of inbound) {
      if (remaining<=0) break;
      if (!text(shipment.id)||!qty(shipment.qty)||parsedTime(shipment.eta)===null) {
        holds.push({code:"INVALID_SHIPMENT_RECORD",part,shipmentId:shipment.id??null}); continue;
      }
      if (duplicateShipments.has(shipment.id)) continue;
      if (["ARRIVED","RECEIVED","QUARANTINED"].includes(shipment.status)) {
        holds.push({code:"SHIPMENT_AWAITING_INVENTORY_RELEASE",part,shipmentId:shipment.id,status:shipment.status});
        continue;
      }
      if (!["CONFIRMED","PICKED_UP","IN_TRANSIT"].includes(shipment.status)) continue;
      if (!sourceExportAllowed(shipment)) {
        holds.push({code:"SHIPMENT_EXPORT_HOLD",part,shipmentId:shipment.id,exportStatus:shipment.exportStatus??"UNKNOWN"}); continue;
      }
      if (planningMs!==null && parsedTime(shipment.eta)<planningMs) {
        holds.push({code:"SHIPMENT_ETA_IN_PAST",part,shipmentId:shipment.id,eta:shipment.eta}); continue;
      }
      if (partDueMs!==null && parsedTime(shipment.eta)>partDueMs) continue;
      if (shipment.qualityStatus==="REJECTED" || shipment.status==="QUARANTINED") {
        holds.push({code:"SHIPMENT_QUALITY_HOLD",part,shipmentId:shipment.id}); continue;
      }
      const available=shipment.availableQty??shipment.qty;
      if (!qty(available)) continue;
      const take=Math.min(remaining,available);
      allocations.push({part,qty:take,sourceType:"INBOUND_SHIPMENT",sourceId:shipment.id,
        lot:shipment.lot??null,serials:Array.isArray(shipment.serials)?[...shipment.serials]:[],
        origin:shipment.origin??null,process:shipment.process??null,eta:iso(shipment.eta),
        commitment:"INBOUND_COMMITTED",bomOrigins:clone(expanded.origins.get(part)??[])});
      remaining-=take;
      graphNodes.push({id:`SHIPMENT:${shipment.id}`,type:"SHIPMENT"});
      graphEdges.push({from:`SHIPMENT:${shipment.id}`,to:order.id,relation:"SUPPLIES",part,qty:take});
    }

    const candidates=suppliers.filter(s=>s?.part===part && !duplicateSuppliers.has(s.id)).sort((a,b)=>
      (a.leadDays??Infinity)-(b.leadDays??Infinity)||cmp(a.id??"",b.id??""));
    for (const supplier of candidates) {
      if (remaining<=0) break;
      if (!text(supplier.id)||!qty(supplier.availableQty)||!nonneg(supplier.leadDays)) {
        holds.push({code:"INVALID_SUPPLIER_OFFER",part,supplierId:supplier.id??null}); continue;
      }
      if (supplier.approved!==true) {
        holds.push({code:"SUPPLIER_NOT_APPROVED",part,supplierId:supplier.id,approved:supplier.approved??"UNKNOWN"}); continue;
      }
      const lifecycle=supplier.lifecycleStatus??"UNKNOWN";
      if (!SUPPLIER_LIFECYCLE.has(lifecycle)||lifecycle==="UNKNOWN") {
        holds.push({code:"SUPPLIER_LIFECYCLE_UNKNOWN",part,supplierId:supplier.id}); continue;
      }
      if (lifecycle==="OBSOLETE") {
        holds.push({code:"SUPPLIER_ITEM_OBSOLETE",part,supplierId:supplier.id}); continue;
      }
      if (!sourceExportAllowed(supplier)) {
        holds.push({code:"SUPPLIER_EXPORT_HOLD",part,supplierId:supplier.id,exportStatus:supplier.exportStatus??"UNKNOWN"}); continue;
      }
      if (planningMs===null) {
        holds.push({code:"PLANNING_DATE_REQUIRED_FOR_LEAD_TIME",part,supplierId:supplier.id}); continue;
      }
      const etaMs=planningMs+supplier.leadDays*86400000;
      if (partDueMs!==null && etaMs>partDueMs) continue;
      if (lifecycle==="LAST_TIME_BUY") warnings.push({code:"LAST_TIME_BUY_SOURCE",part,supplierId:supplier.id});
      const take=Math.min(remaining,supplier.availableQty);
      allocations.push({part,qty:take,sourceType:"SUPPLIER_PLAN",sourceId:supplier.id,
        origin:supplier.origin??null,process:supplier.process??null,
        eta:new Date(etaMs).toISOString(),leadDays:supplier.leadDays,
        commitment:"SOURCE_PLAN",lifecycleStatus:lifecycle,
        bomOrigins:clone(expanded.origins.get(part)??[])});
      remaining-=take;
      graphNodes.push({id:`SUPPLIER:${supplier.id}`,type:"SUPPLIER"});
      graphEdges.push({from:`SUPPLIER:${supplier.id}`,to:order.id,relation:"SUPPLIES",part,qty:take});
    }
    if (profile?.traceabilityRequired===true) {
      const partAllocations=allocations.filter(a=>a.part===part);
      if (partAllocations.some(a=>!text(a.origin))) holds.push({code:"TRACEABILITY_ORIGIN_UNSPECIFIED",part});
      if (partAllocations.some(a=>!text(a.process))) holds.push({code:"TRACEABILITY_PROCESS_UNSPECIFIED",part});
    }
    demandSummary.push({part,required,allocated:required-remaining,uncovered:remaining});
    if (remaining>0) anyUncovered=true;
  }

  // Aggregate capacity is consumed once above. Duplicate order lines are safely coalesced.
  // Any compliance/handling finding blocks order release even if quantities are covered.
  const uniqueNodes=[...new Map(graphNodes.map(n=>[`${n.type}:${n.id}`,n])).values()].sort((a,b)=>cmp(a.id,b.id));
  const outcome=anyUncovered||holds.length?HOLD:OK;
  return {
    outcome,mode:"ORDER_PLAN",orderId:order.id,
    commitment:outcome===OK?"PLANNED_NOT_PURCHASED":"INCOMPLETE",
    planningDate:planningDate?iso(planningDate):null,requiredBy:dueIso,
    demand:demandSummary,allocations,shortages:demandSummary.filter(x=>x.uncovered>0),
    holds,warnings,
    supplyGraph:{nodes:uniqueNodes,edges:graphEdges},
    note:outcome===OK
      ?"Demand is covered by released inventory, eligible inbound shipments and/or qualified source plans. This is not a purchase order, dispatch, receipt or fulfillment confirmation."
      :"Order remains on HOLD. Resolve shortages and every blocking compliance, quality, material-handling or data-integrity finding before release."
  };
}

/** Create an immutable shipment fact record. Receipt and quality release are separate events. */
function recordShipment(input={}) {
  const s=input.shipment??input;
  if (!s||!text(s.id)) return resultHold("Shipment ID is UNSPECIFIED");
  if (!text(s.part)) return resultHold("Shipment part is UNSPECIFIED",{shipmentId:s.id});
  if (!qty(s.qty)) return resultHold("Shipment quantity must be positive",{shipmentId:s.id});
  if (!text(s.origin)) return resultHold("Shipment origin is UNSPECIFIED",{shipmentId:s.id});
  if (!text(s.process)) return resultHold("Shipment process is UNSPECIFIED",{shipmentId:s.id});
  if (!["PLANNED","CONFIRMED","PICKED_UP","IN_TRANSIT"].includes(s.status)) {
    return resultHold("Shipment record must begin in a pre-receipt lifecycle state",{shipmentId:s.id,status:s.status});
  }
  if (parsedTime(s.eta)===null) return resultHold("Shipment ETA is invalid",{shipmentId:s.id});
  if (!EXPORT_CLEAR.has(s.exportStatus) && !["UNKNOWN","UNDER_REVIEW","CONTROLLED","LICENSE_REQUIRED","PROHIBITED"].includes(s.exportStatus)) {
    return resultHold("Shipment export status is invalid",{shipmentId:s.id});
  }
  if (s.lot!=null&&!text(s.lot)) return resultHold("Shipment lot identifier is invalid",{shipmentId:s.id});
  return {outcome:OK,recordType:"SHIPMENT",shipment:{
    id:s.id,orderId:s.orderId??null,part:s.part,qty:s.qty,eta:iso(s.eta),status:s.status,
    origin:s.origin,process:s.process,lot:s.lot??null,
    serials:Array.isArray(s.serials)?[...s.serials]:[],
    supplierId:s.supplierId??null,exportStatus:s.exportStatus,
    qualityStatus:s.qualityStatus??"UNKNOWN",provenance:clone(s.provenance??null),
    handlingEvidence:clone(s.handlingEvidence??null)
  },note:"Shipment record accepted. Physical receipt and inspection release are not implied."};
}

/** Append one deterministic shipment lifecycle event; invalid transitions HOLD. */
function appendShipmentEvent({shipment, event, events=[]}={}) {
  if (!shipment||!text(shipment.id)||!SHIPMENT_STATES.has(shipment.status)) return resultHold("Valid shipment state is required");
  if (!event||!text(event.id)||!text(event.type)||parsedTime(event.at)===null) return resultHold("Event ID, type and timezone-qualified timestamp are required");
  if (!text(event.location)||!text(event.actor)||!text(event.businessStep)||!text(event.disposition)) {
    return resultHold("Shipment event requires location, actor, businessStep and disposition");
  }
  if (events.some(e=>e?.id===event.id)) return resultHold("Duplicate shipment event ID",{eventId:event.id});
  const ordered=[...events].sort((a,b)=>(parsedTime(a.at)??0)-(parsedTime(b.at)??0));
  const last=ordered.at(-1);
  if (last && parsedTime(event.at)<parsedTime(last.at)) return resultHold("Shipment event timestamp regresses",{eventId:event.id});
  if (!SHIPMENT_TRANSITIONS[shipment.status]?.includes(event.type)) {
    return resultHold("Shipment state transition is not permitted",{from:shipment.status,to:event.type});
  }
  if (event.type==="RELEASED" && event.qualityEvidenceStatus!=="VERIFIED") {
    return resultHold("Quality evidence must be VERIFIED before shipment release",{shipmentId:shipment.id});
  }
  const next={...clone(shipment),status:event.type};
  return {outcome:OK,shipment:next,event:{...clone(event),shipmentId:shipment.id},
    events:[...ordered, {...clone(event),shipmentId:shipment.id}],
    note:"Lifecycle event appended; caller must persist atomically with the shipment update."};
}

/**
 * Reverse-logistics case. Receipt enters quarantine. Disposition requires inspection
 * and explicit approval; repair/recycle/scrap/supplier return are terminal outcomes.
 */
function transitionReturnCase({caseRecord, event}={}) {
  if (!caseRecord||!text(caseRecord.id)||!RETURN_STATES.has(caseRecord.status)) return resultHold("Valid return case is required");
  if (!event||!text(event.id)||parsedTime(event.at)===null||!text(event.to)||!text(event.actor)) return resultHold("Return event ID, target state, actor and timezone-qualified timestamp are required");
  if (caseRecord.events?.some(e=>e?.id===event.id)) return resultHold("Duplicate return event ID",{eventId:event.id});
  const lastReturnEvent=[...(caseRecord.events??[])].sort((a,b)=>(parsedTime(a.at)??0)-(parsedTime(b.at)??0)).at(-1);
  if (lastReturnEvent && parsedTime(event.at)<parsedTime(lastReturnEvent.at)) return resultHold("Return event timestamp regresses",{eventId:event.id});
  if (!RETURN_TRANSITIONS[caseRecord.status]?.includes(event.to)) return resultHold("Return disposition transition is not permitted",{from:caseRecord.status,to:event.to});
  if (event.to==="RECEIVED_QUARANTINE" && event.quarantineLocation==null) return resultHold("Quarantine location is required on receipt");
  if (event.to==="INSPECTED" && event.inspectionEvidenceStatus!=="VERIFIED") return resultHold("Verified inspection evidence is required");
  if (event.to==="DISPOSITION_APPROVED" && (!text(event.approver)||event.authorizationStatus!=="AUTHORIZED")) {
    return resultHold("Authorized disposition approver is required");
  }
  if (["REPAIRED","RECYCLED","SCRAPPED","RETURNED_TO_SUPPLIER"].includes(event.to) &&
      event.to==="SCRAPPED" && event.environmentalDispositionStatus!=="VERIFIED") {
    return resultHold("Verified environmental disposition is required before scrap");
  }
  const next={...clone(caseRecord),status:event.to,events:[...(caseRecord.events??[]),clone(event)]};
  return {outcome:OK,caseRecord:next,note:"Return state updated; physical disposition remains subject to the recorded evidence and local authority."};
}

function assessSourceExposure({part,suppliers=[],criticality="UNKNOWN",irreplaceability="UNKNOWN",externalControl="UNKNOWN"}={}) {
  if (!text(part)) return resultHold("Part is UNSPECIFIED");
  const relevant=suppliers.filter(s=>s?.part===part);
  const qualified=relevant.filter(s=>s.approved===true && EXPORT_CLEAR.has(s.exportStatus) && s.lifecycleStatus!=="OBSOLETE");
  const jurisdictions=[...new Set(qualified.map(s=>s.jurisdiction??s.origin).filter(text))].sort();
  const processes=[...new Set(qualified.map(s=>s.process).filter(text))].sort();
  const supplierIds=[...new Set(qualified.map(s=>s.id).filter(text))].sort();
  const lifecycleRisks=relevant.filter(s=>s.lifecycleStatus==="LAST_TIME_BUY"||s.lifecycleStatus==="OBSOLETE"||!s.lifecycleStatus||s.lifecycleStatus==="UNKNOWN")
    .map(s=>({supplierId:s.id??null,lifecycleStatus:s.lifecycleStatus??"UNKNOWN"}));
  return {outcome:OK,part,criticality,irreplaceability,externalControl,
    qualifiedSupplierCount:supplierIds.length,supplierIds,jurisdictions,processes,
    singleSource:supplierIds.length===1,
    exposure:supplierIds.length===0?"NO_QUALIFIED_SOURCE":supplierIds.length===1?"SINGLE_SOURCE":"MULTI_SOURCE",
    lifecycleRisks,
    explainability:[
      supplierIds.length<=1?"No qualified alternate supplier has been demonstrated.":"More than one qualified supplier is recorded.",
      jurisdictions.length<=1?"Jurisdictional diversity is not demonstrated.":"Qualified sources span multiple recorded jurisdictions.",
      processes.length<=1?"Process diversity is not demonstrated.":"More than one production process is represented."
    ],
    note:"This is an explainable dependency view, not a composite sovereignty percentage or legal determination."};
}

/**
 * Validate and analyze a multi-tier supply network.
 * Edge direction is upstream -> downstream (e.g. tier-2 supplier -> tier-1 supplier
 * -> process/facility -> material/component). This is topology analysis, not route
 * optimization. Unknown external export status and graph integrity defects fail closed.
 */
function assessSupplyNetwork({nodes=[],edges=[]}={}) {
  if (!Array.isArray(nodes)||!Array.isArray(edges)||nodes.length===0) return resultHold("Supply network nodes and edges are required");
  const byId=new Map(), findings=[];
  for (const node of nodes) {
    if (!node||!text(node.id)||!text(node.kind)) {
      findings.push({code:"INVALID_NETWORK_NODE",nodeId:node?.id??null}); continue;
    }
    if (byId.has(node.id)) findings.push({code:"DUPLICATE_NETWORK_NODE",nodeId:node.id});
    else byId.set(node.id,node);
    if (node.kind==="SUPPLIER") {
      if (node.exportStatus!=="CLEAR"&&node.exportStatus!=="NOT_CONTROLLED") {
        findings.push({code:"NETWORK_SUPPLIER_EXPORT_HOLD",nodeId:node.id,exportStatus:node.exportStatus??"UNKNOWN"});
      }
      if (node.lifecycleStatus==null||node.lifecycleStatus==="UNKNOWN") {
        findings.push({code:"NETWORK_SUPPLIER_LIFECYCLE_UNKNOWN",nodeId:node.id});
      } else if (node.lifecycleStatus==="OBSOLETE") {
        findings.push({code:"NETWORK_SUPPLIER_OBSOLETE",nodeId:node.id});
      }
    }
  }
  const outgoing=new Map([...byId.keys()].map(id=>[id,[]]));
  const incoming=new Map([...byId.keys()].map(id=>[id,0]));
  const seenEdges=new Set();
  for (const edge of edges) {
    if (!edge||!text(edge.from)||!text(edge.to)||!byId.has(edge.from)||!byId.has(edge.to)) {
      findings.push({code:"NETWORK_DANGLING_EDGE",from:edge?.from??null,to:edge?.to??null}); continue;
    }
    const key=`${edge.from}->${edge.to}:${edge.part??""}`;
    if (seenEdges.has(key)) { findings.push({code:"DUPLICATE_NETWORK_EDGE",edge:key}); continue; }
    seenEdges.add(key);
    if (edge.leadDays!=null&&!nonneg(edge.leadDays)) {
      findings.push({code:"INVALID_NETWORK_LEAD_TIME",edge:key}); continue;
    }
    outgoing.get(edge.from).push(edge.to);
    incoming.set(edge.to,incoming.get(edge.to)+1);
  }
  const roots=[...byId.keys()].filter(id=>incoming.get(id)===0).sort(cmp);
  const tier=new Map(roots.map(id=>[id,0]));
  const indegree=new Map(incoming);
  const queue=[...roots];
  while(queue.length) {
    const id=queue.shift();
    for (const next of outgoing.get(id)??[]) {
      tier.set(next,Math.max(tier.get(next)??0,(tier.get(id)??0)+1));
      indegree.set(next,indegree.get(next)-1);
      if (indegree.get(next)===0) queue.push(next);
    }
  }
  const cyclic=[...byId.keys()].filter(id=>!tier.has(id)).sort(cmp);
  if (cyclic.length) findings.push({code:"SUPPLY_NETWORK_CYCLE",nodeIds:cyclic});
  const nodesOut=[...byId.values()].map(n=>({...clone(n),tier:tier.get(n.id)??null})).sort((a,b)=>(a.tier??Infinity)-(b.tier??Infinity)||cmp(a.id,b.id));
  return {
    outcome:findings.length?HOLD:OK,
    mode:"SUPPLY_NETWORK_ANALYSIS",
    roots,
    nodes:nodesOut,
    edges:edges.filter(e=>e&&byId.has(e.from)&&byId.has(e.to)).map(clone),
    maxTier:nodesOut.reduce((m,n)=>Math.max(m,n.tier??0),0),
    findings,
    note:"Tier numbering is topological depth from upstream roots. Cycles, dangling edges and unknown external supplier controls are not silently accepted. This is not a transport route or capacity optimizer."
  };
}

/** Deterministic scenario runner used by sample fixtures and regression tests. */
function runLogisticsSimulation({scenarios=[]}={}) {
  if (!Array.isArray(scenarios)||!scenarios.length) return resultHold("At least one simulation scenario is required");
  const results=[];
  for (const scenario of scenarios) {
    if (!scenario||!text(scenario.id)||!scenario.input) return resultHold("Each scenario requires an ID and input");
    const result=supply(scenario.input);
    results.push({id:scenario.id,outcome:result.outcome,result});
  }
  return {outcome:results.every(r=>r.outcome===OK)?OK:HOLD,mode:"DETERMINISTIC_SCENARIO_RUN",
    scenarios:results,summary:{total:results.length,passed:results.filter(r=>r.outcome===OK).length,
      held:results.filter(r=>r.outcome===HOLD).length},
    note:"Deterministic domain simulation only. It does not simulate physical transport, warehouse equipment, carrier networks or real-time events."};
}

/** Public API. Legacy estimate and structured order planning are intentionally distinct. */
export function supply(input={}) {
  if (input && Object.prototype.hasOwnProperty.call(input,"order")) return planOrder(input);
  return legacySupply(input);
}
export {recordShipment, appendShipmentEvent, transitionReturnCase, assessSourceExposure, assessSupplyNetwork, runLogisticsSimulation};


/**
 * Extended lifecycle, trade, routing, service, obsolescence, genealogy and cost APIs.
 * All functions are pure projections. Persistence, authority and execution remain
 * responsibilities of the canonical spine adapter.
 */
const LIFECYCLE_STAGES = [
  "SUPPLIER","PROCUREMENT","INBOUND","WAREHOUSE","KITTING","PRODUCTION",
  "FINISHED_GOODS","REGIONAL_WAREHOUSE","DISTRIBUTOR","CUSTOMER",
  "FIELD_SERVICE","REVERSE_LOGISTICS","REPAIR","REFURBISH","RECYCLE","RETIRED"
];
const LIFECYCLE_NEXT = {
  SUPPLIER:["PROCUREMENT"], PROCUREMENT:["INBOUND"], INBOUND:["WAREHOUSE"],
  WAREHOUSE:["KITTING"], KITTING:["PRODUCTION"], PRODUCTION:["FINISHED_GOODS"],
  FINISHED_GOODS:["REGIONAL_WAREHOUSE","DISTRIBUTOR"],
  REGIONAL_WAREHOUSE:["DISTRIBUTOR","CUSTOMER"], DISTRIBUTOR:["CUSTOMER"],
  CUSTOMER:["FIELD_SERVICE","REVERSE_LOGISTICS"], FIELD_SERVICE:["CUSTOMER","REVERSE_LOGISTICS"],
  REVERSE_LOGISTICS:["REPAIR","REFURBISH","RECYCLE","RETIRED"],
  REPAIR:["WAREHOUSE","CUSTOMER","RETIRED"], REFURBISH:["WAREHOUSE","CUSTOMER","RETIRED"],
  RECYCLE:[], RETIRED:[]
};

function validateLifecycleChain({events=[]}={}) {
  if (!Array.isArray(events)||events.length===0) return resultHold("Lifecycle events are required");
  const seen=new Set(), ordered=[...events];
  const findings=[];
  let previous=null;
  for (const e of ordered) {
    if (!e||!text(e.id)||seen.has(e.id)) { findings.push({code:"LIFECYCLE_EVENT_ID_INVALID_OR_DUPLICATE",id:e?.id??null}); continue; }
    seen.add(e.id);
    if (!LIFECYCLE_STAGES.includes(e.stage)||parsedTime(e.at)===null||!text(e.actor)||!text(e.location)||!text(e.evidenceRef)) {
      findings.push({code:"LIFECYCLE_EVENT_INCOMPLETE",eventId:e.id}); continue;
    }
    if (previous && !LIFECYCLE_NEXT[previous.stage]?.includes(e.stage)) {
      findings.push({code:"LIFECYCLE_TRANSITION_INVALID",from:previous.stage,to:e.stage,eventId:e.id});
    }
    if (previous && parsedTime(e.at)<parsedTime(previous.at)) findings.push({code:"LIFECYCLE_TIME_REGRESSION",eventId:e.id});
    previous=e;
  }
  return {outcome:findings.length?HOLD:OK,mode:"LIFECYCLE_CHAIN",stages:LIFECYCLE_STAGES,
    events:ordered,terminalStage:previous?.stage??null,findings};
}

/** Trade screen is a workflow gate, not a legal classification or customs ruling. */
function assessTradeCompliance(input={}) {
  const required=["itemClassification","origin","destination","endUser","endUse",
    "exportStatus","restrictedPartyScreening","destinationScreening","customsStatus",
    "hsCode","originEvidenceStatus"];
  const missing=required.filter(k=>!text(input[k]));
  const findings=[];
  if (missing.length) findings.push({code:"TRADE_FIELDS_MISSING",fields:missing});
  if (!["CLEAR","NOT_CONTROLLED","CONTROLLED","LICENSE_REQUIRED","PROHIBITED","UNKNOWN","UNDER_REVIEW"].includes(input.exportStatus)) {
    findings.push({code:"EXPORT_STATUS_INVALID"});
  }
  if (input.exportStatus==="PROHIBITED"||input.exportStatus==="UNKNOWN"||input.exportStatus==="UNDER_REVIEW") {
    findings.push({code:"EXPORT_STATUS_NOT_CLEARED",status:input.exportStatus});
  }
  if (input.restrictedPartyScreening!=="CLEAR") findings.push({code:"RESTRICTED_PARTY_SCREEN_NOT_CLEAR",status:input.restrictedPartyScreening??"UNKNOWN"});
  if (input.destinationScreening!=="CLEAR") findings.push({code:"DESTINATION_SCREEN_NOT_CLEAR",status:input.destinationScreening??"UNKNOWN"});
  if (!["CLEARED","NOT_REQUIRED"].includes(input.customsStatus)) findings.push({code:"CUSTOMS_NOT_CLEARED",status:input.customsStatus??"UNKNOWN"});
  if (input.originEvidenceStatus!=="VERIFIED") findings.push({code:"ORIGIN_EVIDENCE_NOT_VERIFIED"});
  if (["CONTROLLED","LICENSE_REQUIRED"].includes(input.exportStatus) && input.licenseStatus!=="VALID") {
    findings.push({code:"EXPORT_LICENSE_NOT_VALID",status:input.licenseStatus??"UNKNOWN"});
  }
  if (input.exportStatus==="CLEAR"||input.exportStatus==="NOT_CONTROLLED") {
    if (input.licenseStatus==="EXPIRED"||input.licenseStatus==="REVOKED") findings.push({code:"INVALID_LICENSE_STATE"});
  }
  if (!/^[0-9]{6,12}$/.test(input.hsCode??"")) findings.push({code:"HS_CODE_FORMAT_INVALID"});
  return {outcome:findings.length?HOLD:OK,mode:"TRADE_COMPLIANCE_GATE",
    decision:findings.length?"HOLD":"ELIGIBLE_FOR_AUTHORIZED_REVIEW",
    findings,scope:"Workflow evidence validation only; not legal advice, tariff classification, customs release or export authorization."};
}

/** Dijkstra route selection with capacity, mode, handling and compliance gates. */
function planTransportRoute({nodes=[],edges=[],origin,destination,shipment={},objective="COST"}={}) {
  if (!text(origin)||!text(destination)||!Array.isArray(nodes)||!Array.isArray(edges)) return resultHold("Route endpoints and graph are required");
  if (!["COST","TIME","BALANCED"].includes(objective)) return resultHold("Route objective must be COST, TIME or BALANCED");
  if (shipment.qty!=null&&!qty(shipment.qty)) return resultHold("Shipment quantity must be positive");
  const ids=new Set(nodes.filter(n=>text(n?.id)).map(n=>n.id));
  if (!ids.has(origin)||!ids.has(destination)) return resultHold("Route endpoint is absent from network");
  const adj=new Map([...ids].map(id=>[id,[]]));
  const blocked=[];
  for (const e of edges) {
    if (!e||!ids.has(e.from)||!ids.has(e.to)) { blocked.push({code:"ROUTE_DANGLING_EDGE"}); continue; }
    const reasons=[];
    if (!qty(e.capacity)) reasons.push("CAPACITY_UNAVAILABLE");
    if (shipment.qty!=null&&e.capacity<shipment.qty) reasons.push("LANE_CAPACITY_BELOW_SHIPMENT_QUANTITY");
    if (!nonneg(e.cost)||!nonneg(e.leadDays)) reasons.push("COST_OR_LEAD_INVALID");
    if (e.status!=="ACTIVE") reasons.push("LANE_NOT_ACTIVE");
    if (e.exportStatus!=="CLEAR"&&e.exportStatus!=="NOT_CONTROLLED") reasons.push("EXPORT_NOT_CLEARED");
    if (shipment.hazardous===true&&e.hazmatAllowed!==true) reasons.push("HAZMAT_NOT_ALLOWED");
    if (shipment.battery===true&&e.batteryAllowed!==true) reasons.push("BATTERY_NOT_ALLOWED");
    if (shipment.pressureVessel===true&&e.pressureVesselAllowed!==true) reasons.push("PRESSURE_VESSEL_NOT_ALLOWED");
    if (reasons.length) { blocked.push({code:"ROUTE_EDGE_BLOCKED",edgeId:e.id??null,reasons}); continue; }
    const weight=objective==="TIME"?e.leadDays:objective==="BALANCED"?e.cost+e.leadDays:e.cost;
    adj.get(e.from).push({...e,weight});
  }
  const dist=new Map([...ids].map(id=>[id,Infinity])), prev=new Map(), visited=new Set();
  dist.set(origin,0);
  while (visited.size<ids.size) {
    let current=null,best=Infinity;
    for (const id of ids) if (!visited.has(id)&&dist.get(id)<best) {best=dist.get(id);current=id;}
    if (current===null||current===destination) break;
    visited.add(current);
    for (const e of adj.get(current)) {
      const next=dist.get(current)+e.weight;
      if (next<dist.get(e.to)) {dist.set(e.to,next);prev.set(e.to,{from:current,edge:e});}
    }
  }
  if (!Number.isFinite(dist.get(destination))) return resultHold("No eligible transport route exists",{blockedEdges:blocked});
  const path=[],routeEdges=[]; let cursor=destination,guard=0;
  while(cursor!==origin&&guard++<=ids.size) {
    const p=prev.get(cursor); if(!p) return resultHold("Route reconstruction failed");
    path.unshift(cursor); routeEdges.unshift(p.edge); cursor=p.from;
  }
  path.unshift(origin);
  return {outcome:OK,mode:"TRANSPORT_ROUTE_PLAN",origin,destination,path,
    totalCost:routeEdges.reduce((s,e)=>s+e.cost,0),
    totalLeadDays:routeEdges.reduce((s,e)=>s+e.leadDays,0),
    bottleneckCapacity:Math.min(...routeEdges.map(e=>e.capacity)),
    edgeIds:routeEdges.map(e=>e.id??`${e.from}->${e.to}`),blockedEdges:blocked,
    commitment:"ROUTE_PLAN_ONLY",note:"No carrier booking, customs clearance, dispatch or real-time ETA is implied."};
}

/** Explainable independent path count using vertex-capacitated max-flow (Edmonds-Karp). */
function countIndependentSupplyPaths({nodes=[],edges=[],sourceId,sinkId}={}) {
  if (!Array.isArray(nodes)||!Array.isArray(edges)||!text(sourceId)||!text(sinkId)||sourceId===sinkId) return resultHold("Valid supply graph and distinct endpoints are required");
  const ids=[...new Set(nodes.filter(n=>text(n?.id)).map(n=>n.id))];
  if (!ids.includes(sourceId)||!ids.includes(sinkId)) return resultHold("Source or sink is absent");
  const cap=new Map(),add=(a,b,c)=>cap.set(`${a}|${b}`,(cap.get(`${a}|${b}`)||0)+c);
  const vin=id=>`${id}:in`,vout=id=>`${id}:out`,INF=1e9;
  for(const id of ids) add(vin(id),vout(id),(id===sourceId||id===sinkId)?INF:1);
  const validEdges=[];
  for(const e of edges) {
    if(!e||!ids.includes(e.from)||!ids.includes(e.to)) return resultHold("Supply graph has dangling edge",{edge:e??null});
    add(vout(e.from),vin(e.to),INF); validEdges.push(e);
  }
  const start=vin(sourceId),finish=vout(sinkId);
  let flow=0;
  while(true) {
    const parent=new Map([[start,null]]),queue=[start];
    while(queue.length&&!parent.has(finish)) {
      const u=queue.shift();
      for(const [key,c] of cap) {
        const [a,b]=key.split("|");
        if(a===u&&c>0&&!parent.has(b)){parent.set(b,u);queue.push(b);}
      }
    }
    if(!parent.has(finish)) break;
    let aug=INF,v=finish;
    while(parent.get(v)!==null){const u=parent.get(v);aug=Math.min(aug,cap.get(`${u}|${v}`)||0);v=u;}
    v=finish;
    while(parent.get(v)!==null){const u=parent.get(v);add(u,v,-aug);add(v,u,aug);v=u;}
    flow+=aug;
  }
  const count=Math.min(flow,ids.length);
  return {outcome:OK,mode:"INDEPENDENT_SUPPLY_PATHS",sourceId,sinkId,
    independentPathCount:count,classification:count===0?"NO_PATH":count===1?"SINGLE_PATH":"MULTIPLE_VERTEX_DISJOINT_PATHS",
    note:"Vertex-disjoint paths do not share internal graph nodes. Model shared jurisdiction, raw material, process, facility and upstream supplier as shared nodes to expose common-mode dependencies."};
}

/** Obsolescence impact traverses typed dependency projections and validates replacement evidence. */
function assessObsolescenceImpact({componentId,nodes=[],edges=[],replacementCandidates=[]}={}) {
  if(!text(componentId)||!Array.isArray(nodes)||!Array.isArray(edges)||!Array.isArray(replacementCandidates)) return resultHold("Obsolescence inputs are invalid");
  const nodeMap=new Map(nodes.filter(n=>text(n?.id)).map(n=>[n.id,n]));
  if(!nodeMap.has(componentId)) return resultHold("Obsolete component is absent from impact graph");
  const outgoing=new Map([...nodeMap.keys()].map(id=>[id,[]]));
  for(const e of edges){if(!e||!nodeMap.has(e.from)||!nodeMap.has(e.to))return resultHold("Obsolescence graph contains dangling edge");outgoing.get(e.from).push(e.to);}
  const visited=new Set([componentId]),queue=[componentId];
  while(queue.length){const id=queue.shift();for(const next of outgoing.get(id)||[])if(!visited.has(next)){visited.add(next);queue.push(next);}}
  const impacted=[...visited].filter(id=>id!==componentId).map(id=>nodeMap.get(id));
  const counts={interfaces:0,tests:0,certifications:0,processes:0,workOrders:0,systems:0};
  for(const n of impacted){if(n.kind==="INTERFACE")counts.interfaces++;if(n.kind==="TEST")counts.tests++;if(n.kind==="CERTIFICATION")counts.certifications++;if(n.kind==="PROCESS")counts.processes++;if(n.kind==="WORK_ORDER")counts.workOrders++;if(n.kind==="SYSTEM")counts.systems++;}
  const assessed=replacementCandidates.map(c=>{
    const required=["mechanical","electrical","thermal","software","safety","regulatory","manufacturing"];
    const unknown=required.filter(k=>c?.compatibility?.[k]===undefined);
    const failed=required.filter(k=>c?.compatibility?.[k]===false);
    const costFields=["redesignCost","qualificationCost","certificationCost"];
    const missingCosts=costFields.filter(k=>!finite(c?.[k])||c[k]<0);
    const eligible=c?.approved===true&&c?.lifecycleStatus==="ACTIVE"&&c?.availabilityStatus==="AVAILABLE"&&
      unknown.length===0&&failed.length===0&&missingCosts.length===0;
    return {id:c?.id??null,eligible,unknownCompatibility:unknown,failedCompatibility:failed,missingCosts,
      totalKnownCost:missingCosts.length?null:costFields.reduce((s,k)=>s+c[k],0)};
  });
  const eligible=assessed.filter(c=>c.eligible);
  return {outcome:eligible.length?OK:HOLD,mode:"OBSOLESCENCE_IMPACT",
    componentId,impactedEntityIds:impacted.map(n=>n.id).sort(),impactCounts:counts,
    replacements:assessed,eligibleReplacementIds:eligible.map(c=>c.id),
    warning:eligible.length?"At least one candidate passed supplied compatibility and evidence checks.":"No replacement candidate has complete evidence.",
    note:"This is a dependency impact projection. Compatibility claims require engineering verification; this function does not certify equivalence."};
}

/** Landed-cost calculation rejects missing values rather than treating them as zero. */
function calculateLandedCost({quantity,currency,costs=[]}={}) {
  if(!qty(quantity)||!text(currency)||!Array.isArray(costs)||!costs.length) return resultHold("Quantity, currency and explicit cost lines are required");
  const findings=[];
  for(let i=0;i<costs.length;i++){
    const c=costs[i];
    if(!c||!text(c.name)||!finite(c.amount)||c.amount<0||c.currency!==currency) findings.push({code:"COST_LINE_INVALID_OR_CURRENCY_MISMATCH",index:i});
  }
  if(findings.length)return resultHold("Landed cost cannot be calculated from incomplete or mixed-currency data",{findings});
  const total=costs.reduce((s,c)=>s+c.amount,0);
  return {outcome:OK,currency,quantity,totalLandedCost:total,unitLandedCost:total/quantity,
    breakdown:costs.map(c=>({...c})),note:"All cost elements, including explicit zero-valued elements, must be supplied. No tax, duty, FX or freight value is inferred."};
}

/** Standard deterministic reorder-point / safety-stock / EOQ policy. */
function calculateInventoryPolicy({meanDailyDemand,dailyDemandStdDev,meanLeadDays,leadTimeStdDev,
  serviceZ,annualDemand,orderCost,annualHoldingCostPerUnit}={}) {
  const vals={meanDailyDemand,dailyDemandStdDev,meanLeadDays,leadTimeStdDev,serviceZ,annualDemand,orderCost,annualHoldingCostPerUnit};
  const invalid=Object.entries(vals).filter(([k,v])=>!finite(v)||v<0).map(([k])=>k);
  if(invalid.length||meanLeadDays<=0||annualHoldingCostPerUnit<=0) return resultHold("Inventory policy inputs are invalid",{invalidFields:invalid});
  const variance=meanLeadDays*dailyDemandStdDev**2+(meanDailyDemand**2)*(leadTimeStdDev**2);
  const safetyStock=serviceZ*Math.sqrt(variance);
  const reorderPoint=meanDailyDemand*meanLeadDays+safetyStock;
  const eoq=Math.sqrt((2*annualDemand*orderCost)/annualHoldingCostPerUnit);
  return {outcome:OK,safetyStock,reorderPoint,economicOrderQuantity:eoq,
    assumptions:["Independent demand and lead-time variance approximation","Normal service-factor approximation",
      "Single-item EOQ; no quantity discounts, capacity or perishability constraints"],
    note:"Planning estimate only. Validate distributional assumptions and operational constraints before execution."};
}

/** Service depot coverage includes spares, calibration and geographic response constraints. */
function assessServiceCoverage({zones=[],depots=[],requiredParts=[],requiredCalibrations=[],maxResponseDays}={}) {
  if(!Array.isArray(zones)||!zones.length||!Array.isArray(depots)||!nonneg(maxResponseDays)) return resultHold("Zones, depots and response target are required");
  const results=zones.map(zone=>{
    const candidates=depots.filter(d=>d?.authorized===true&&d?.zones?.includes(zone)&&
      finite(d.responseDays)&&d.responseDays<=maxResponseDays&&d.status==="ACTIVE");
    const capable=candidates.filter(d=>requiredParts.every(p=>d.spareParts?.includes(p))&&
      requiredCalibrations.every(c=>d.calibrations?.includes(c))&&d.calibrationStatus==="CURRENT");
    return {zone,candidateDepotIds:candidates.map(d=>d.id),covered:capable.length>0,
      capableDepotIds:capable.map(d=>d.id),
      gaps:[
        ...(!capable.length?["NO_AUTHORIZED_CAPABLE_DEPOT"]:[]),
        ...(candidates.length&&!capable.length?["SPARES_OR_CALIBRATION_GAP"]:[])
      ]};
  });
  const gaps=results.filter(r=>!r.covered);
  return {outcome:gaps.length?HOLD:OK,mode:"FIELD_SERVICE_COVERAGE",zones:results,
    uncoveredZones:gaps.map(g=>g.zone),note:"Coverage is based only on supplied depot, authorization, spares, calibration and response evidence."};
}

/** Kitting consumes released, traceable lots and creates an auditable manifest projection. */
function recordKitting({kitId,workOrderId,required=[],picked=[]}={}) {
  if(!text(kitId)||!text(workOrderId)||!Array.isArray(required)||!required.length||!Array.isArray(picked)) return resultHold("Kit, work order, required and picked lines are required");
  const totals=new Map();
  for(const p of picked){
    if(!p||!text(p.part)||!qty(p.qty)||!text(p.lot)||p.qualityStatus!=="RELEASED") return resultHold("Picked kit line must have part, positive quantity, lot and RELEASED quality",{line:p??null});
    totals.set(p.part,(totals.get(p.part)||0)+p.qty);
  }
  const shortages=[],overages=[];
  for(const r of required){
    if(!r||!text(r.part)||!qty(r.qty))return resultHold("Required kit line is invalid");
    const pickedQty=totals.get(r.part)||0;
    const missing=r.qty-pickedQty; if(missing>1e-9)shortages.push({part:r.part,qty:missing});
    if(pickedQty-r.qty>1e-9)overages.push({part:r.part,qty:pickedQty-r.qty});
  }
  const requiredParts=new Set(required.map(r=>r.part));
  const unexpected=picked.filter(p=>!requiredParts.has(p.part));
  if(shortages.length||overages.length||unexpected.length)return resultHold("Kit is incomplete, over-picked or contains unexpected material",{shortages,overages,unexpectedParts:unexpected.map(p=>p.part)});
  const serials=picked.flatMap(p=>p.serials??[]);
  if(new Set(serials).size!==serials.length)return resultHold("Duplicate serials in kit");
  return {outcome:OK,mode:"KIT_MANIFEST",kit:{id:kitId,workOrderId,lines:picked.map(p=>({...p})),
    createdState:"KIT_READY",commitment:"MANIFEST_ONLY"}};
}

/** Production consumption binds component lots/serials to a work order genealogy record. */
function recordProductionConsumption({workOrderId,kit,consumedAt,actor}={}) {
  if(!text(workOrderId)||!kit||kit.createdState!=="KIT_READY"||kit.workOrderId!==workOrderId||
    parsedTime(consumedAt)===null||!text(actor)||!Array.isArray(kit.lines)||!kit.lines.length) {
    return resultHold("Released kit, matching work order, timestamp and actor are required");
  }
  if(kit.lines.some(l=>l.qualityStatus!=="RELEASED"||!text(l.lot))) return resultHold("Consumption genealogy requires released lot traceability");
  return {outcome:OK,mode:"PRODUCTION_GENEALOGY",workOrderId,actor,consumedAt:iso(consumedAt),
    consumed:kit.lines.map(l=>({part:l.part,qty:l.qty,lot:l.lot,serials:l.serials??[]})),
    relationProposal:"CONSUMES",note:"CONSUMES is unresolved in the current spine registry. Persist as an evidence projection until the relation is versioned and registered."};
}

/** Apply deterministic stressors to source availability and run the existing planner. */
function simulateDisruptions({baseline,scenarios=[]}={}) {
  if(!baseline||!baseline.order||!Array.isArray(scenarios)||!scenarios.length)return resultHold("Baseline order and disruption scenarios are required");
  const results=scenarios.map(s=>{
    if(!text(s?.id))return {id:null,outcome:HOLD,reason:"Scenario ID is required"};
    const input=clone(baseline);
    if(s.demandMultiplier!=null){
      if(!finite(s.demandMultiplier)||s.demandMultiplier<=0)return {id:s.id,outcome:HOLD,reason:"Demand multiplier must be positive"};
      input.order.lines=input.order.lines.map(l=>({...l,qty:l.qty*s.demandMultiplier}));
    }
    if(s.supplierId){
      input.suppliers=(input.suppliers??[]).map(sup=>sup.id===s.supplierId?{...sup,
        availableQty:s.availableQty??0,leadDays:s.leadDays??sup.leadDays,
        exportStatus:s.exportStatus??sup.exportStatus}:sup);
    }
    if(s.shipmentId){
      input.shipments=(input.shipments??[]).map(sh=>sh.id===s.shipmentId?{...sh,
        status:s.shipmentStatus??sh.status,eta:s.eta??sh.eta}:sh);
    }
    const plan=supply(input);
    return {id:s.id,outcome:plan.outcome,plan};
  });
  return {outcome:results.every(r=>r.outcome===OK)?OK:HOLD,mode:"DISRUPTION_SCENARIOS",
    summary:{total:results.length,ok:results.filter(r=>r.outcome===OK).length,held:results.filter(r=>r.outcome===HOLD).length},
    results,note:"Deterministic what-if planning. No physical dispatch or procurement is executed."};
}

/** EPCIS 2.0.1-shaped event projection. Candidate mapping only; no conformance claim. */
function toEpcisEventProjection({shipment,event,eventTimeZoneOffset,action="OBSERVE",bizStep,disposition,readPoint,bizLocation}={}) {
  if(!shipment||!text(shipment.id)||!event||parsedTime(event.at)===null||
    !["ADD","OBSERVE","DELETE"].includes(action)||!text(bizStep)||!text(disposition)||
    !text(eventTimeZoneOffset)||!text(readPoint)||!text(bizLocation)) {
    return resultHold("EPCIS projection requires shipment, timezone-qualified event time, action, business step, disposition and locations");
  }
  const identifiers=Array.isArray(shipment.serials)&&shipment.serials.length?shipment.serials:
    (text(shipment.lot)?[shipment.lot]:[]);
  if(!identifiers.length)return resultHold("EPCIS projection requires serial or lot identifiers");
  return {outcome:OK,mode:"EPCIS_2_0_1_EVENT_PROJECTION",
    conformance:"NOT_CLAIMED",
    event:{type:"ObjectEvent",eventTime:iso(event.at),eventTimeZoneOffset,action,
      bizStep,disposition,readPoint:{id:readPoint},bizLocation:{id:bizLocation},
      epcList:identifiers.map(id=>String(id)),sourceList:shipment.origin?[{type:"owning_party",source:shipment.origin}]:[],
      extensions:{shipmentId:shipment.id,part:shipment.part??null,actor:event.actor??null,
        businessStep:event.businessStep??bizStep,provenance:clone(shipment.provenance??null)}},
    note:"Validate against the exact EPCIS/CBV edition and agreed identifier vocabulary before external exchange."};
}

export {
  validateLifecycleChain, assessTradeCompliance, planTransportRoute,
  countIndependentSupplyPaths, assessObsolescenceImpact, calculateLandedCost,
  calculateInventoryPolicy, assessServiceCoverage, recordKitting,
  recordProductionConsumption, simulateDisruptions, toEpcisEventProjection
};
