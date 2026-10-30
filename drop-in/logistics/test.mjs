/**
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import {
  supply, recordShipment, appendShipmentEvent, transitionReturnCase,
  assessSourceExposure, assessSupplyNetwork, runLogisticsSimulation,
  validateLifecycleChain, assessTradeCompliance, planTransportRoute,
  countIndependentSupplyPaths, assessObsolescenceImpact, calculateLandedCost,
  calculateInventoryPolicy, assessServiceCoverage, recordKitting,
  recordProductionConsumption, simulateDisruptions, toEpcisEventProjection
} from "./module.js";
import fs from "node:fs";

let assertions=0;
function assert(v,m){assertions++;if(!v)throw new Error("FAIL: "+m);}
function eq(a,b,m){assert(JSON.stringify(a)===JSON.stringify(b),`${m}; expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);}
const date="2026-10-30T00:00:00.000Z";
const baseOrder={id:"WO-100",requiredBy:"2026-11-10T00:00:00Z",lines:[{id:"L1",part:"BOLT",qty:10}]};

// Compatibility / input validation
assert(supply({}).outcome==="HOLD","missing legacy input holds");
assert(supply({part:"bolt",qty:10,lead:2}).outcome==="OK","legacy estimate remains compatible");
assert(supply({part:" ",qty:1,lead:0}).outcome==="HOLD","blank part holds");
assert(supply({part:"bolt",qty:0,lead:0}).outcome==="HOLD","zero quantity holds");
assert(supply({part:"bolt",qty:1,lead:-1}).outcome==="HOLD","negative lead holds");
assert(supply({order:{id:"",lines:[{part:"X",qty:1}]}}).outcome==="HOLD","missing order ID holds");
assert(supply({order:{id:"WO",lines:[]}}).outcome==="HOLD","empty order holds");
assert(supply({order:{id:"WO",lines:[{part:"X",qty:0}]}}).outcome==="HOLD","invalid demand holds");

// Inventory reservations, quality, FEFO and duplicate-line anti-double-counting
const inv=supply({order:{id:"WO-1",lines:[{part:"BOLT",qty:8}]},
  inventory:[
    {id:"LOT-B",part:"BOLT",onHand:10,reserved:8,qualityStatus:"RELEASED",lot:"B",expiresAt:"2027-01-01T00:00:00Z"},
    {id:"LOT-A",part:"BOLT",onHand:6,reserved:0,qualityStatus:"RELEASED",lot:"A",expiresAt:"2026-12-01T00:00:00Z"}
  ],planningDate:date});
assert(inv.outcome==="OK","released unreserved stock covers order");
eq(inv.allocations[0].sourceId,"LOT-A","FEFO selects earliest expiry");
eq(inv.allocations[0].qty,6,"FEFO allocation quantity");
eq(inv.allocations[1].qty,2,"remaining stock allocation");
assert(inv.supplyGraph.edges.length===2,"source graph edges emitted");
const reserved=supply({order:{id:"WO-2",lines:[{part:"X",qty:4}]},
  inventory:[{id:"I",part:"X",onHand:10,reserved:8,qualityStatus:"RELEASED"}]});
assert(reserved.outcome==="HOLD"&&reserved.shortages[0].uncovered===2,"reserved inventory unavailable");
const quality=supply({order:{id:"WO-3",lines:[{part:"X",qty:1}]},
  inventory:[{id:"I",part:"X",onHand:10,qualityStatus:"UNKNOWN"}]});
assert(quality.outcome==="HOLD"&&quality.holds.some(x=>x.code==="INVENTORY_QUALITY_HOLD"),"unknown quality inventory holds");
const duplicates=supply({order:{id:"WO-4",lines:[{part:"PIN",qty:4},{part:"PIN",qty:4}]},
  inventory:[{id:"PIN-LOT",part:"PIN",onHand:5,qualityStatus:"RELEASED"}]});
assert(duplicates.outcome==="HOLD","duplicate demand lines do not double-count inventory");
eq(duplicates.shortages[0].uncovered,3,"duplicate line shortage exact");

// Expiry date requires explicit planning date; expired lots are excluded.
const expiry=supply({order:{id:"WO-5",lines:[{part:"FOOD",qty:1}]},planningDate:date,
  inventory:[{id:"OLD",part:"FOOD",onHand:1,qualityStatus:"RELEASED",expiresAt:"2026-10-01T00:00:00Z"}]});
assert(expiry.outcome==="HOLD"&&expiry.holds.some(x=>x.code==="LOT_EXPIRED"),"expired lot is blocked");

// Inbound shipment and supplier qualification / ETA / lifecycle / export
const inbound=supply({order:baseOrder,planningDate:date,
  shipments:[{id:"S1",part:"BOLT",qty:10,eta:"2026-11-02T00:00:00Z",status:"IN_TRANSIT",
    exportStatus:"CLEAR",origin:"IN",process:"turning",lot:"LOT-9"}]});
assert(inbound.outcome==="OK"&&inbound.allocations[0].sourceType==="INBOUND_SHIPMENT","inbound shipment supplies order");
assert(inbound.allocations[0].lot==="LOT-9","shipment lot carried to allocation");
const supplier=supply({order:{id:"WO-6",requiredBy:"2026-11-05T00:00:00Z",lines:[{part:"MOTOR",qty:3}]},
  planningDate:date,suppliers:[
    {id:"SLOW",part:"MOTOR",availableQty:3,leadDays:9,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"},
    {id:"FAST",part:"MOTOR",availableQty:3,leadDays:2,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE",origin:"IN"}
  ]});
assert(supplier.outcome==="OK"&&supplier.allocations[0].sourceId==="FAST","shortest eligible supplier selected deterministically");
assert(supplier.commitment==="PLANNED_NOT_PURCHASED","supplier plan is not a purchase order");
const unknownExport=supply({order:{id:"WO-7",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[{id:"U",part:"X",availableQty:1,leadDays:1,approved:true,lifecycleStatus:"ACTIVE",exportStatus:"UNKNOWN"}]});
assert(unknownExport.outcome==="HOLD"&&unknownExport.holds.some(x=>x.code==="SUPPLIER_EXPORT_HOLD"),"unknown export status holds");
const unknownLife=supply({order:{id:"WO-8",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[{id:"U",part:"X",availableQty:1,leadDays:1,approved:true,exportStatus:"CLEAR"}]});
assert(unknownLife.outcome==="HOLD","unknown supplier lifecycle holds");
const obsolete=supply({order:{id:"WO-9",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[{id:"O",part:"X",availableQty:1,leadDays:1,approved:true,exportStatus:"CLEAR",lifecycleStatus:"OBSOLETE"}]});
assert(obsolete.outcome==="HOLD","obsolete source blocked");
const ltb=supply({order:{id:"WO-10",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[{id:"LTB",part:"X",availableQty:1,leadDays:1,approved:true,exportStatus:"CLEAR",lifecycleStatus:"LAST_TIME_BUY"}]});
assert(ltb.outcome==="OK"&&ltb.warnings.some(x=>x.code==="LAST_TIME_BUY_SOURCE"),"last-time-buy source accepted with warning");
const late=supply({order:{id:"WO-11",requiredBy:"2026-11-01T00:00:00Z",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[{id:"LATE",part:"X",availableQty:1,leadDays:5,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"}]});
assert(late.outcome==="HOLD","supplier ETA beyond due date does not cover demand");
const pastEta=supply({order:{id:"WO-12",lines:[{part:"X",qty:1}]},planningDate:date,
  shipments:[{id:"PAST",part:"X",qty:1,eta:"2026-10-01T00:00:00Z",status:"IN_TRANSIT",exportStatus:"CLEAR"}]});
assert(pastEta.outcome==="HOLD"&&pastEta.holds.some(x=>x.code==="SHIPMENT_ETA_IN_PAST"),"past inbound ETA held");

const partSpecificDue=supply({order:{id:"WO-PART-DUE",lines:[
  {part:"EARLY",qty:1,requiredBy:"2026-11-01T00:00:00Z"},
  {part:"LATER",qty:1,requiredBy:"2026-11-10T00:00:00Z"}
]},planningDate:date,suppliers:[
  {id:"EARLY-SUP",part:"EARLY",availableQty:1,leadDays:3,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"},
  {id:"LATER-SUP",part:"LATER",availableQty:1,leadDays:5,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"}
]});
assert(partSpecificDue.outcome==="HOLD"&&partSpecificDue.shortages.some(x=>x.part==="EARLY")&&
  partSpecificDue.demand.some(x=>x.part==="LATER"&&x.uncovered===0),
  "line-specific due dates are applied per part, not globally");

assert(supply({order:{id:"WO-BOM-TYPE",lines:[{part:"X",qty:1,bomType:"UNKNOWN-BOM"}]}}).outcome==="HOLD",
  "unsupported BOM type holds");
for (const bomType of ["EBOM","MBOM","SBOM","HBOM","CBOM","ABOM"]) {
  const typed=supply({order:{id:`WO-${bomType}`,lines:[{part:"X",qty:1,bomType}]},
    boms:[{id:`B-${bomType}`,type:bomType,parentPart:"X",status:"RELEASED",components:[{part:"Y",qty:1}]}],
    inventory:[{id:`I-${bomType}`,part:"Y",onHand:1,qualityStatus:"RELEASED"}]});
  assert(typed.outcome==="OK",`${bomType} explicit BOM view can be expanded`);
}
const noAsOf=supply({order:{id:"WO-NO-ASOF",lines:[{part:"DATED",qty:1}]},
  inventory:[{id:"DATED-LOT",part:"DATED",onHand:1,qualityStatus:"RELEASED",expiresAt:"2027-01-01T00:00:00Z"}]});
assert(noAsOf.outcome==="HOLD"&&noAsOf.holds.some(x=>x.code==="AS_OF_DATE_REQUIRED_FOR_EXPIRY"),
  "expiry-dated stock requires an explicit as-of date");
assert(recordShipment({shipment:{id:"S-RELEASED",part:"P",qty:1,origin:"IN",process:"assembly",
  status:"RELEASED",eta:"2026-11-01T00:00:00Z",exportStatus:"CLEAR",qualityStatus:"VERIFIED"}}).outcome==="HOLD",
  "shipment cannot bypass lifecycle evidence by being imported directly as released");

// BOM explosion, missing, unreleased and cyclic BOM
const bom=supply({order:{id:"WO-BOM",lines:[{id:"L",part:"ROBOT",qty:2,bomType:"MBOM"}]},
  boms:[{id:"BOM-1",type:"MBOM",parentPart:"ROBOT",status:"RELEASED",
    components:[{part:"MOTOR",qty:2},{part:"BOLT",qty:4}]}],
  inventory:[
    {id:"M",part:"MOTOR",onHand:4,qualityStatus:"RELEASED"},
    {id:"B",part:"BOLT",onHand:8,qualityStatus:"RELEASED"}
  ]});
assert(bom.outcome==="OK","released MBOM explodes to component demand");
eq(bom.demand.map(x=>[x.part,x.required]),[["BOLT",8],["MOTOR",4]],"BOM demand quantities");
const missingBom=supply({order:{id:"WO-M",lines:[{part:"ROBOT",qty:1,bomType:"EBOM"}]}});
assert(missingBom.outcome==="HOLD"&&missingBom.holds.some(x=>x.code==="BOM_NOT_FOUND"),"missing BOM holds");
const unreleased=supply({order:{id:"WO-U",lines:[{part:"ROBOT",qty:1,bomType:"EBOM"}]},
  boms:[{id:"B",type:"EBOM",parentPart:"ROBOT",status:"DRAFT",components:[{part:"X",qty:1}]}]});
assert(unreleased.outcome==="HOLD","unreleased BOM holds");

// Special material handling is fail-closed.
const haz=supply({order:{id:"WO-H",lines:[{part:"SOLVENT",qty:1}]},
  materialProfiles:{SOLVENT:{hazardous:true,handling:{status:"UNVERIFIED"}}}});
assert(haz.outcome==="HOLD"&&haz.holds.some(x=>x.code==="HAZMAT_HANDLING_NOT_VERIFIED"),"hazmat handling incomplete holds");
const battery=supply({order:{id:"WO-B",lines:[{part:"CELL",qty:1}]},
  materialProfiles:{CELL:{battery:true,handling:{un38_3Status:"UNKNOWN"}}}});
assert(battery.outcome==="HOLD"&&battery.holds.some(x=>x.code==="BATTERY_UN38_3_NOT_VERIFIED"),"battery documentation unknown holds");
const pressure=supply({order:{id:"WO-P",lines:[{part:"VESSEL",qty:1}]},
  materialProfiles:{VESSEL:{pressureVessel:true,handling:{pressureVesselCertificateStatus:"EXPIRED"}}}});
assert(pressure.outcome==="HOLD","pressure vessel certificate invalid holds");
const hazClear=supply({order:{id:"WO-H2",lines:[{part:"SOLVENT",qty:1}]},
  inventory:[{id:"I",part:"SOLVENT",onHand:1,qualityStatus:"RELEASED"}],
  materialProfiles:{SOLVENT:{hazardous:true,handling:{status:"VERIFIED",hazardClass:"3",
    safetyDataSheetStatus:"CURRENT",packagingInstruction:"P001",carrierAuthorization:"AUTH-1"}}}});
assert(hazClear.outcome==="OK","complete hazardous handling evidence permits planning");

// Shipment record and event lifecycle
assert(recordShipment({shipment:{id:"S",part:"P",qty:2,origin:"IN",process:"assembly",
  status:"IN_TRANSIT",eta:"2026-11-01T00:00:00Z",exportStatus:"CLEAR"}}).outcome==="OK","complete shipment record accepted");
assert(recordShipment({shipment:{id:"S",part:"P",qty:0}}).outcome==="HOLD","invalid shipment qty holds");
const sh={id:"S",part:"P",qty:1,status:"ARRIVED"};
const ev=appendShipmentEvent({shipment:sh,event:{id:"E1",type:"RECEIVED",at:"2026-11-01T00:00:00Z",location:"WH-1",actor:"RECEIVER-1",businessStep:"receiving",disposition:"in_progress"},events:[]});
assert(ev.outcome==="OK"&&ev.shipment.status==="RECEIVED","shipment received transition accepted");
assert(appendShipmentEvent({shipment:sh,event:{id:"E2",type:"RELEASED",at:"2026-11-01T00:00:00Z",location:"WH-1",actor:"QA-1",businessStep:"inspection",disposition:"released"},events:[]}).outcome==="HOLD","cannot release without quality evidence");
assert(appendShipmentEvent({shipment:sh,event:{id:"E3",type:"IN_TRANSIT",at:"2026-11-01T00:00:00Z",location:"ROAD-1",actor:"CARRIER-1",businessStep:"shipping",disposition:"in_transit"},events:[]}).outcome==="HOLD","illegal shipment transition holds");
assert(appendShipmentEvent({shipment:sh,event:{id:"E1",type:"RECEIVED",at:"2026-11-01T00:00:00Z",location:"WH-1",actor:"RECEIVER-1",businessStep:"receiving",disposition:"in_progress"},events:[{id:"E1",at:"2026-10-31T00:00:00Z"}]}).outcome==="HOLD","duplicate event ID holds");

// Reverse logistics quarantine, evidence, authorization and terminal disposition.
const rc={id:"RMA-1",status:"REQUESTED",events:[]};
let rr=transitionReturnCase({caseRecord:rc,event:{id:"R1",to:"IN_TRANSIT",at:"2026-11-01T00:00:00Z",actor:"TEST-ACTOR"}});
assert(rr.outcome==="OK","return enters transit");
rr=transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R2",to:"RECEIVED_QUARANTINE",at:"2026-11-02T00:00:00Z",actor:"TEST-ACTOR",quarantineLocation:"Q-01"}});
assert(rr.outcome==="OK","return receipt requires quarantine location");
assert(transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R3",to:"INSPECTED",at:"2026-11-03T00:00:00Z",actor:"TEST-ACTOR",inspectionEvidenceStatus:"DRAFT"}}).outcome==="HOLD","inspection evidence must be verified");
rr=transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R3",to:"INSPECTED",at:"2026-11-03T00:00:00Z",actor:"TEST-ACTOR",inspectionEvidenceStatus:"VERIFIED"}});
rr=transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R4",to:"DISPOSITION_APPROVED",at:"2026-11-04T00:00:00Z",actor:"TEST-ACTOR",approver:"QA-1",authorizationStatus:"AUTHORIZED"}});
assert(rr.outcome==="OK","authorized disposition accepted");
assert(transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R5",to:"SCRAPPED",at:"2026-11-05T00:00:00Z",actor:"TEST-ACTOR"}}).outcome==="HOLD","scrap requires environmental evidence");
rr=transitionReturnCase({caseRecord:rr.caseRecord,event:{id:"R5",to:"SCRAPPED",at:"2026-11-05T00:00:00Z",actor:"TEST-ACTOR",environmentalDispositionStatus:"VERIFIED"}});
assert(rr.outcome==="OK"&&rr.caseRecord.status==="SCRAPPED","verified scrap disposition accepted");

// Explainable sovereignty / concentration, no scalar percentage.
const exposure=assessSourceExposure({part:"CHIP",criticality:"HIGH",irreplaceability:"HIGH",externalControl:"HIGH",
  suppliers:[
    {id:"A",part:"CHIP",approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE",origin:"IN",process:"28nm"},
    {id:"B",part:"CHIP",approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE",origin:"IN",process:"28nm"},
    {id:"C",part:"CHIP",approved:false,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE",origin:"US",process:"7nm"}
  ]});
assert(exposure.qualifiedSupplierCount===2&&exposure.exposure==="MULTI_SOURCE","only qualified suppliers counted");
assert(exposure.jurisdictions.length===1,"jurisdiction diversity not overstated");
assert(exposure.explainability.length===3,"explainability factors returned");

// Additional adversarial data-integrity and lifecycle checks.
assert(supply({order:{id:"WO-DATE",requiredBy:"invalid",lines:[{part:"X",qty:1}]}}).outcome==="HOLD",
  "invalid order due date holds");
const dupInv=supply({order:{id:"WO-DI",lines:[{part:"X",qty:2}]},
  inventory:[
    {id:"DUP",part:"X",onHand:2,qualityStatus:"RELEASED"},
    {id:"DUP",part:"X",onHand:2,qualityStatus:"RELEASED"}
  ]});
assert(dupInv.outcome==="HOLD"&&dupInv.holds.some(x=>x.code==="DUPLICATE_INVENTORY_ID"),
  "duplicate inventory identity holds instead of double counting");
const dupShip=supply({order:{id:"WO-DS",lines:[{part:"X",qty:2}]},
  shipments:[
    {id:"DUP-S",part:"X",qty:2,eta:"2026-11-01T00:00:00Z",status:"IN_TRANSIT",exportStatus:"CLEAR"},
    {id:"DUP-S",part:"X",qty:2,eta:"2026-11-01T00:00:00Z",status:"IN_TRANSIT",exportStatus:"CLEAR"}
  ]});
assert(dupShip.outcome==="HOLD"&&dupShip.holds.some(x=>x.code==="DUPLICATE_SHIPMENT_ID"),
  "duplicate shipment identity holds");
const dupSup=supply({order:{id:"WO-DP",lines:[{part:"X",qty:1}]},planningDate:date,
  suppliers:[
    {id:"DUP-P",part:"X",availableQty:1,leadDays:1,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"},
    {id:"DUP-P",part:"X",availableQty:1,leadDays:1,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"}
  ]});
assert(dupSup.outcome==="HOLD"&&dupSup.holds.some(x=>x.code==="DUPLICATE_SUPPLIER_ID"),
  "duplicate supplier identity holds");
const arrived=supply({order:{id:"WO-ARR",lines:[{part:"X",qty:1}]},
  shipments:[{id:"ARR",part:"X",qty:1,eta:"2026-11-01T00:00:00Z",status:"ARRIVED",exportStatus:"CLEAR"}]});
assert(arrived.outcome==="HOLD"&&arrived.holds.some(x=>x.code==="SHIPMENT_AWAITING_INVENTORY_RELEASE"),
  "arrived shipment is not silently treated as released inventory");
const cycle=supply({order:{id:"WO-CYCLE",lines:[{part:"A",qty:1,bomType:"MBOM"}]},
  boms:[
    {id:"BOM-A",type:"MBOM",parentPart:"A",status:"RELEASED",components:[{part:"B",qty:1,childBomType:"MBOM"}]},
    {id:"BOM-B",type:"MBOM",parentPart:"B",status:"RELEASED",components:[{part:"A",qty:1,childBomType:"MBOM"}]}
  ]});
assert(cycle.outcome==="HOLD"&&cycle.holds.some(x=>x.code==="BOM_CYCLE"),
  "cyclic BOM graph holds");
const trace=supply({order:{id:"WO-TRACE",lines:[{part:"TRACE",qty:1}]},
  inventory:[{id:"TI",part:"TRACE",onHand:1,qualityStatus:"RELEASED"}],
  materialProfiles:{TRACE:{traceabilityRequired:true}}});
assert(trace.outcome==="HOLD"&&trace.holds.some(x=>x.code==="TRACEABILITY_ORIGIN_UNSPECIFIED"),
  "required origin traceability cannot be omitted");
const temperature=supply({order:{id:"WO-TEMP",lines:[{part:"BIO",qty:1}]},
  materialProfiles:{BIO:{temperatureControlled:true,handling:{minTemperatureC:8,maxTemperatureC:2}}}});
assert(temperature.outcome==="HOLD"&&temperature.holds.some(x=>x.code==="TEMPERATURE_CONTROL_SPECIFICATION_INVALID"),
  "invalid temperature range holds");
const regressReturn=transitionReturnCase({
  caseRecord:{id:"RMA-T",status:"IN_TRANSIT",events:[{id:"old",at:"2026-11-05T00:00:00Z"}]},
  event:{id:"new",to:"RECEIVED_QUARANTINE",at:"2026-11-04T00:00:00Z",actor:"TEST-ACTOR",quarantineLocation:"Q"}
});
assert(regressReturn.outcome==="HOLD","return event time cannot regress");
const regressShipment=appendShipmentEvent({
  shipment:{id:"S-T",status:"ARRIVED"},
  events:[{id:"old",at:"2026-11-05T00:00:00Z"}],
  event:{id:"new",type:"RECEIVED",at:"2026-11-04T00:00:00Z",actor:"TEST-ACTOR",location:"WH-1",actor:"R1",businessStep:"receiving",disposition:"in_progress"}
});
assert(regressShipment.outcome==="HOLD","shipment event time cannot regress");

const partObsolete=supply({order:{id:"WO-OBSOLETE",lines:[{part:"P",qty:1}]},
  inventory:[{id:"I",part:"P",onHand:1,qualityStatus:"RELEASED"}],
  materialProfiles:{P:{lifecycleStatus:"OBSOLETE"}}});
assert(partObsolete.outcome==="HOLD"&&partObsolete.holds.some(x=>x.code==="PART_OBSOLETE"),
  "obsolete component lifecycle holds even when stock exists");
const partLtb=supply({order:{id:"WO-PART-LTB",lines:[{part:"P",qty:1}]},
  inventory:[{id:"I",part:"P",onHand:1,qualityStatus:"RELEASED"}],
  materialProfiles:{P:{lifecycleStatus:"LAST_TIME_BUY"}}});
assert(partLtb.outcome==="OK"&&partLtb.warnings.some(x=>x.code==="PART_LAST_TIME_BUY"),
  "component last-time-buy is a warning");
const networkFixture=JSON.parse(fs.readFileSync(new URL("./samples/logistics-network.json",import.meta.url),"utf8"));
const network=assessSupplyNetwork(networkFixture);
assert(network.outcome===networkFixture.expected.outcome&&network.maxTier===networkFixture.expected.maxTier,
  "multi-tier supply chain sample topology is evaluated");
assert(network.nodes.find(n=>n.id==="PART-1").tier===3,"tier depth is deterministic");
const networkCycle=assessSupplyNetwork({nodes:[
  {id:"A",kind:"SUPPLIER",exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"},
  {id:"B",kind:"PROCESS"}
],edges:[{from:"A",to:"B"},{from:"B",to:"A"}]});
assert(networkCycle.outcome==="HOLD"&&networkCycle.findings.some(x=>x.code==="SUPPLY_NETWORK_CYCLE"),
  "cyclic supply network holds");
const networkDangling=assessSupplyNetwork({nodes:[{id:"A",kind:"SUPPLIER",exportStatus:"UNKNOWN",lifecycleStatus:"ACTIVE"}],
  edges:[{from:"A",to:"MISSING"}]});
assert(networkDangling.outcome==="HOLD"&&networkDangling.findings.some(x=>x.code==="NETWORK_DANGLING_EDGE"),
  "dangling supply network edge holds");

// Scenario runner + shipped sample fixtures.
const fixture=JSON.parse(fs.readFileSync(new URL("./samples/logistics-scenarios.json",import.meta.url),"utf8"));
const sim=runLogisticsSimulation({scenarios:fixture.scenarios});
eq(sim.summary,{total:3,passed:2,held:1},"scenario sample summary");
assert(sim.outcome==="HOLD","scenario batch reports any held scenario");
assert(runLogisticsSimulation({scenarios:[]}).outcome==="HOLD","empty simulation holds");

// Basic determinism: same input produces byte-equivalent data.
const deterministicInput={order:{id:"D",lines:[{part:"P",qty:1}]},inventory:[{id:"I",part:"P",onHand:1,qualityStatus:"RELEASED"}]};
eq(supply(deterministicInput),supply(deterministicInput),"planner deterministic");



// Full lifecycle chain: supplier to customer and field-service return.
const chainStages=["SUPPLIER","PROCUREMENT","INBOUND","WAREHOUSE","KITTING","PRODUCTION",
  "FINISHED_GOODS","REGIONAL_WAREHOUSE","DISTRIBUTOR","CUSTOMER"];
const chain=validateLifecycleChain({events:chainStages.map((stage,i)=>({
  id:`LC-${i}`,stage,at:`2026-10-${String(1+i).padStart(2,"0")}T00:00:00Z`,
  actor:"ACTOR-1",location:`LOC-${i}`,evidenceRef:`EVID-${i}`
}))});
assert(chain.outcome==="OK"&&chain.terminalStage==="CUSTOMER","full forward logistics lifecycle accepted");
assert(validateLifecycleChain({events:[{id:"1",stage:"SUPPLIER",at:"2026-10-01T00:00:00Z",actor:"A",location:"L",evidenceRef:"E"} ,
{id:"2",stage:"CUSTOMER",at:"2026-10-02T00:00:00Z",actor:"A",location:"L",evidenceRef:"E"}]}).outcome==="HOLD",
"lifecycle cannot skip unapproved stages");

// Trade compliance: every mandatory screen must be explicit and clear.
const tradeBase={itemClassification:"EAR99-EXAMPLE",origin:"IN",destination:"IN",endUser:"CUSTOMER-1",
  endUse:"CIVIL-INDUSTRIAL",exportStatus:"CLEAR",restrictedPartyScreening:"CLEAR",
  destinationScreening:"CLEAR",customsStatus:"CLEARED",hsCode:"85044090",originEvidenceStatus:"VERIFIED"};
assert(assessTradeCompliance(tradeBase).outcome==="OK","fully evidenced trade workflow passes");
assert(assessTradeCompliance({...tradeBase,exportStatus:"UNKNOWN"}).outcome==="HOLD","unknown export status holds");
assert(assessTradeCompliance({...tradeBase,customsStatus:"UNKNOWN"}).outcome==="HOLD","unknown customs state holds");
assert(assessTradeCompliance({...tradeBase,exportStatus:"LICENSE_REQUIRED",licenseStatus:"VALID"}).outcome==="OK",
"controlled item with verified valid license can proceed to authorized review");
assert(assessTradeCompliance({...tradeBase,exportStatus:"LICENSE_REQUIRED"}).outcome==="HOLD",
"license-required without valid license holds");

// Route planning: cost/time objectives, capacity, special cargo and no-route.
const routeNodes=[{id:"A"},{id:"B"},{id:"C"},{id:"D"}];
const routeEdges=[
  {id:"AB",from:"A",to:"B",capacity:10,cost:2,leadDays:2,status:"ACTIVE",exportStatus:"CLEAR",hazmatAllowed:true,batteryAllowed:true,pressureVesselAllowed:true},
  {id:"BD",from:"B",to:"D",capacity:10,cost:2,leadDays:2,status:"ACTIVE",exportStatus:"CLEAR",hazmatAllowed:true,batteryAllowed:true,pressureVesselAllowed:true},
  {id:"AC",from:"A",to:"C",capacity:10,cost:8,leadDays:1,status:"ACTIVE",exportStatus:"CLEAR",hazmatAllowed:false,batteryAllowed:true,pressureVesselAllowed:true},
  {id:"CD",from:"C",to:"D",capacity:10,cost:8,leadDays:1,status:"ACTIVE",exportStatus:"CLEAR",hazmatAllowed:true,batteryAllowed:true,pressureVesselAllowed:true}
];
const route=planTransportRoute({nodes:routeNodes,edges:routeEdges,origin:"A",destination:"D"});
assert(route.outcome==="OK"&&route.path.join(",")==="A,B,D"&&route.totalCost===4,"least-cost route selected");
const fastRoute=planTransportRoute({nodes:routeNodes,edges:routeEdges,origin:"A",destination:"D",objective:"TIME"});
assert(fastRoute.outcome==="OK"&&fastRoute.totalLeadDays===2,"least-time route selected");
assert(planTransportRoute({nodes:routeNodes,edges:routeEdges,origin:"A",destination:"D",shipment:{hazardous:true}}).path.join(",")==="A,B,D",
"hazmat routing excludes lanes without hazmat permission");

// Independence must expose shared upstream nodes, not count supplier names.
const independent=countIndependentSupplyPaths({nodes:[
  {id:"S"},{id:"A"},{id:"B"},{id:"RAW"},{id:"T"}
],edges:[{from:"S",to:"A"},{from:"S",to:"B"},{from:"A",to:"RAW"},{from:"B",to:"RAW"},{from:"RAW",to:"T"}],
sourceId:"S",sinkId:"T"});
assert(independent.outcome==="OK"&&independent.independentPathCount===1,
"shared upstream raw material collapses apparent alternate paths");
const twoPaths=countIndependentSupplyPaths({nodes:[{id:"S"},{id:"A"},{id:"B"},{id:"T"}],
edges:[{from:"S",to:"A"},{from:"A",to:"T"},{from:"S",to:"B"},{from:"B",to:"T"}],sourceId:"S",sinkId:"T"});
assert(twoPaths.independentPathCount===2,"internally vertex-disjoint paths counted");

// Obsolescence propagation and candidate completeness.
const ob=assessObsolescenceImpact({componentId:"C1",nodes:[
  {id:"C1",kind:"COMPONENT"},{id:"I1",kind:"INTERFACE"},{id:"T1",kind:"TEST"},
  {id:"CERT1",kind:"CERTIFICATION"},{id:"P1",kind:"PROCESS"},{id:"SYS1",kind:"SYSTEM"}
],edges:[{from:"C1",to:"I1"},{from:"I1",to:"T1"},{from:"T1",to:"CERT1"},{from:"C1",to:"P1"},{from:"P1",to:"SYS1"}],
replacementCandidates:[{id:"R1",approved:true,lifecycleStatus:"ACTIVE",availabilityStatus:"AVAILABLE",
  compatibility:{mechanical:true,electrical:true,thermal:true,software:true,safety:true,regulatory:true,manufacturing:true},
  redesignCost:100,qualificationCost:200,certificationCost:300}]});
assert(ob.outcome==="OK"&&ob.impactCounts.interfaces===1&&ob.impactCounts.tests===1&&ob.impactCounts.certifications===1,
"obsolescence propagates to interfaces, tests and certifications");
assert(ob.replacements[0].totalKnownCost===600,"replacement lifecycle cost aggregated");
assert(assessObsolescenceImpact({componentId:"C1",nodes:[{id:"C1",kind:"COMPONENT"}],edges:[],
  replacementCandidates:[{id:"R",approved:true,lifecycleStatus:"ACTIVE",availabilityStatus:"AVAILABLE"}]}).outcome==="HOLD",
"unknown replacement compatibility and costs hold");

// Landed cost must not turn unknown costs into zero.
assert(calculateLandedCost({quantity:2,currency:"INR",costs:[
  {name:"goods",amount:100,currency:"INR"},{name:"freight",amount:20,currency:"INR"},
  {name:"duty",amount:0,currency:"INR"}]}).unitLandedCost===60,"landed cost sums explicit cost lines");
assert(calculateLandedCost({quantity:1,currency:"INR",costs:[{name:"goods",amount:100,currency:"INR"}]}).outcome==="OK",
"explicit one-line cost model accepted");
assert(calculateLandedCost({quantity:1,currency:"INR",costs:[{name:"goods",amount:100,currency:"USD"}]}).outcome==="HOLD",
"mixed currency costs hold");

// Inventory policy boundaries.
const policy=calculateInventoryPolicy({meanDailyDemand:10,dailyDemandStdDev:2,meanLeadDays:5,
  leadTimeStdDev:1,serviceZ:1.645,annualDemand:3650,orderCost:100,annualHoldingCostPerUnit:20});
assert(policy.outcome==="OK"&&policy.reorderPoint>policy.safetyStock,"reorder policy calculated");
assert(calculateInventoryPolicy({meanDailyDemand:10,meanLeadDays:0,annualHoldingCostPerUnit:0}).outcome==="HOLD",
"invalid lead time and holding cost hold");

// Service depot: spares and calibration infrastructure are first-class.
const service=assessServiceCoverage({zones:["ZONE-A","ZONE-B"],depots:[
  {id:"D1",zones:["ZONE-A"],authorized:true,status:"ACTIVE",responseDays:2,spareParts:["MOTOR"],calibrations:["TORQUE"],calibrationStatus:"CURRENT"}
],requiredParts:["MOTOR"],requiredCalibrations:["TORQUE"],maxResponseDays:3});
assert(service.outcome==="HOLD"&&service.uncoveredZones[0]==="ZONE-B","unserved geography remains visible");
assert(assessServiceCoverage({zones:["ZONE-A"],depots:[
  {id:"D1",zones:["ZONE-A"],authorized:true,status:"ACTIVE",responseDays:2,spareParts:["MOTOR"],calibrations:["TORQUE"],calibrationStatus:"CURRENT"}
],requiredParts:["MOTOR"],requiredCalibrations:["TORQUE"],maxResponseDays:3}).outcome==="OK",
"service zone with authorized depot, spares and calibration is covered");

// Kitting and genealogy.
const kit=recordKitting({kitId:"KIT-1",workOrderId:"WO-1",required:[{part:"MOTOR",qty:1},{part:"BOLT",qty:4}],
picked:[{part:"MOTOR",qty:1,lot:"M-LOT",qualityStatus:"RELEASED",serials:["M-1"]},
{part:"BOLT",qty:4,lot:"B-LOT",qualityStatus:"RELEASED"}]});
assert(kit.outcome==="OK","complete released kit accepted");
assert(recordKitting({kitId:"KIT-2",workOrderId:"WO-1",required:[{part:"MOTOR",qty:1}],
picked:[{part:"MOTOR",qty:1,lot:"M",qualityStatus:"QUARANTINE"}]}).outcome==="HOLD",
"quarantined stock cannot be kitted");
const consumption=recordProductionConsumption({workOrderId:"WO-1",kit:kit.kit,
consumedAt:"2026-10-30T12:00:00Z",actor:"OP-1"});
assert(consumption.outcome==="OK"&&consumption.consumed.length===2,"production consumption genealogy recorded");
assert(consumption.relationProposal==="CONSUMES","unresolved canonical relation is explicitly identified");

// Disruption what-if scenarios.
const disruption=simulateDisruptions({baseline:{order:{id:"WO-D",lines:[{part:"P",qty:2}]},
planningDate:"2026-10-30T00:00:00Z",
suppliers:[{id:"SUP",part:"P",availableQty:2,leadDays:1,approved:true,exportStatus:"CLEAR",lifecycleStatus:"ACTIVE"}]},
scenarios:[{id:"normal"},{id:"supplier-loss",supplierId:"SUP",availableQty:0}]});
assert(disruption.summary.total===2&&disruption.summary.ok===1&&disruption.summary.held===1,
"disruption scenario runner distinguishes normal and supplier loss");



const avionicsHold=supply({order:{id:"WO-AV",lines:[{part:"AVIONICS",qty:1}]},
  materialProfiles:{AVIONICS:{avionics:true,handling:{certificationStatus:"UNKNOWN",airworthinessEvidenceStatus:"UNKNOWN"}}}});
assert(avionicsHold.outcome==="HOLD"&&avionicsHold.holds.some(x=>x.code==="AVIONICS_AIRWORTHINESS_EVIDENCE_NOT_VERIFIED"),
  "avionics requires airworthiness evidence");
const radioHold=supply({order:{id:"WO-RAD",lines:[{part:"RADIO",qty:1}]},
  materialProfiles:{RADIO:{radioEquipment:true,handling:{typeApprovalStatus:"UNKNOWN"}}}});
assert(radioHold.outcome==="HOLD"&&radioHold.holds.some(x=>x.code==="RADIO_TYPE_APPROVAL_INVALID"),
  "radio equipment requires type approval and spectrum authorization");
const epcis=toEpcisEventProjection({shipment:{id:"SHIP-1",part:"MOTOR",lot:"LOT-1",origin:"IN"},
  event:{at:"2026-10-30T12:00:00Z",actor:"WAREHOUSE-1"},eventTimeZoneOffset:"+05:30",
  action:"OBSERVE",bizStep:"receiving",disposition:"in_progress",readPoint:"urn:location:wh1",bizLocation:"urn:location:wh1"});
assert(epcis.outcome==="OK"&&epcis.event.type==="ObjectEvent"&&epcis.conformance==="NOT_CLAIMED",
  "EPCIS candidate projection preserves explicit non-conformance status");
assert(toEpcisEventProjection({shipment:{id:"S"},event:{at:"2026-10-30T12:00:00Z"}}).outcome==="HOLD",
  "EPCIS projection without identifiers and required semantics holds");

assert(validateLifecycleChain({events:[
  {id:"L1",stage:"SUPPLIER",at:"2026-10-02T00:00:00Z",actor:"A",location:"L",evidenceRef:"E"},
  {id:"L2",stage:"PROCUREMENT",at:"2026-10-01T00:00:00Z",actor:"A",location:"L",evidenceRef:"E"}
]}).outcome==="HOLD","lifecycle events must be chronological and cannot be silently reordered");
assert(planTransportRoute({nodes:routeNodes,edges:routeEdges,origin:"A",destination:"D",shipment:{qty:11}}).outcome==="HOLD",
"route lane capacity below shipment quantity holds");
assert(planTransportRoute({nodes:routeNodes,edges:routeEdges,origin:"A",destination:"D",objective:"MAGIC"}).outcome==="HOLD",
"unknown route objective holds");
assert(recordKitting({kitId:"KIT-OVER",workOrderId:"WO-1",required:[{part:"MOTOR",qty:1}],
picked:[{part:"MOTOR",qty:2,lot:"M",qualityStatus:"RELEASED"}]}).outcome==="HOLD",
"kit over-picking is not silently accepted");


const extendedFixture=JSON.parse(fs.readFileSync(new URL("./samples/extended-scenarios.json",import.meta.url),"utf8"));
const lifeSample=extendedFixture.scenarios.find(x=>x.kind==="lifecycle");
assert(validateLifecycleChain({events:lifeSample.events}).outcome==="OK","shipped full-lifecycle sample executes");
const routeSample=extendedFixture.scenarios.find(x=>x.kind==="route");
assert(planTransportRoute(routeSample).outcome==="OK","shipped hazmat route sample executes");
const tradeSample=extendedFixture.scenarios.find(x=>x.kind==="trade");
assert(assessTradeCompliance(tradeSample.input).outcome==="OK","shipped trade compliance sample executes");


const moduleSource=fs.readFileSync(new URL("./module.js",import.meta.url),"utf8");
assert(!/require\s*\(|process\.(env|cwd|argv)|Buffer\.|from\s+["\']node:/.test(moduleSource),
  "browser domain module contains no Node-only runtime dependency");

console.log(`logistics tests PASS (${assertions} assertions)`);
