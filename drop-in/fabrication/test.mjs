/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Fabrication package tests: contract, planner, path interpreter, safety, execution, metrology, samples. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FABRICATION_API_VERSION, fabricate, planFabrication, validateToolpath, simulateToolpath, simulateStockRemoval, integrityId, evaluateMeasurement } from "./module.js";

let passed = 0, failed = 0;
const pending = [];
function test(name, fn) {
  pending.push(Promise.resolve().then(fn).then(() => { passed++; console.log(`PASS ${name}`); })
    .catch(e => { failed++; console.error(`FAIL ${name}: ${e.stack || e}`); }));
}
const testAsync = test;
const base = {
  solid: { id: "sample-pocket-01", kind: "rectangular-pocket", units: "mm", dimensions: { x: 40, y: 30, z: 8 }, cornerRadiusMm: 3, originMm: { x: 5, y: 7 } },
  stock: { id: "stock-01", units: "mm", dimensions: { x: 60, y: 50, z: 20 } },
  machine: { id: "mill-01", ready: true, emergencyStopClear: true, doorClosed: true, workholdingVerified: true,
    maxFeedMmMin: 3000, maxSpindleRpm: 12000, travelMm: { x: 500, y: 400, z: 300 } },
  tool: { id: "endmill-6", diameterMm: 6, maxStepdownMm: 3, fluteLengthMm: 12 },
  process: { stepdownMm: 2.5, stepoverMm: 3, feedMmMin: 600, spindleRpm: 8000, safeClearanceMm: 5, maxSegmentLengthMm: 10 },
  material: { id: "AL6061", lotId: "LOT-AL-01", maxCuttingSpeedMMin: 200 },
  fixture: { id: "vise-01", setupId: "setup-01", verified: true, clearanceOutcome: "PASS", clearanceEvidenceId: "FIX-CLEAR-001" },
  surfaceFinish: { maxRaUm: 3.2 },
  inspectionPlan: { id: "IP-01", method: "CMM_AND_PROFILOMETER" },
  tolerance: { x: 0.1, y: 0.1, z: 0.05, cornerRadiusMm: 0.05 },
  measuredPart: { units: "mm", dimensions: { x: 40.02, y: 29.98, z: 8.01 }, cornerRadiusMm: 3.01, surfaceFinishRaUm: 1.6,
    instrument: "CMM-01+PROFILOMETER-01", calibrationId: "CAL-CMM-2026-001+CAL-PROF-2026-001",
    calibrationEvidenceId: "CAL-CERT-001", calibrationStatus: "VALID",
    calibrationValidFrom: "2026-01-01T00:00:00+05:30", calibrationValidUntil: "2027-01-01T00:00:00+05:30",
    evidenceId: "MEAS-0001", method: "CMM_AND_PROFILOMETER", measuredAt: "2026-10-30T10:00:00+05:30",
    operatorId: "OP-01", rawEvidenceRef: "evidence://MEAS-0001",
    uncertaintyMm: { x: 0.01, y: 0.01, z: 0.005, cornerRadiusMm: 0.005 }, uncertaintyUm: { surfaceFinishRaUm: 0.1 } }
};
const adapter = async (toolpath) => ({ completed: true, executionId: "EXEC-0001", machineId: "mill-01", toolpathIntegrityId: toolpath.integrityId });
const readyInput = (overrides = {}) => ({ ...base, machine: { ...base.machine, executeToolpath: adapter }, ...overrides });

// Public API and baseline contract.
test("public fabricate export remains available for Iteration 47", () => assert.equal(typeof fabricate, "function"));
test("breaking async API contract is explicitly versioned", () => assert.equal(FABRICATION_API_VERSION,"2.2.0"));
test("legacy two-field call now correctly HOLDs for missing fabrication evidence", async () => assert.equal((await fabricate({ solid: { id: "s" }, machine: { id: "m" } })).outcome, "HOLD"));
test("empty input HOLDs", async () => assert.equal((await fabricate({})).outcome, "HOLD"));
test("null input FAILs cleanly without throwing", async () => assert.equal((await fabricate(null)).outcome, "FAIL"));

// Planner and deterministic toolpath.
test("plan produces deterministic rounded-pocket path", () => { const a=planFabrication(base), b=planFabrication(base); assert.equal(a.outcome,"PLANNED"); assert.equal(a.toolpath.integrityId,b.toolpath.integrityId); assert.equal(a.toolpath.schema,"PAI-FAB-TOOLPATH/2.1"); });
test("plan does not call a machine adapter", () => { let called=false; const r=planFabrication({ ...base, machine:{...base.machine,executeToolpath:()=>{called=true}} }); assert.equal(r.outcome,"PLANNED"); assert.equal(called,false); });
test("offline planning does not require live machine readiness", () => assert.equal(planFabrication({ ...base, machine:{...base.machine,ready:false} }).outcome,"PLANNED"));
test("feature origin is applied in stock coordinates", () => { const p=planFabrication(base).toolpath; assert.equal(p.moves[0].x,8); assert.equal(p.moves[0].y,10); });
test("toolpath is within stock/feature bounds", () => { const p=planFabrication(base).toolpath; for(const m of p.moves){assert.ok(m.x>=5 && m.x<=45);assert.ok(m.y>=7 && m.y<=37);assert.ok(m.z>=-5 && m.z<=8);} });
test("trajectory interpreter returns safe terminal state", () => { const s=simulateToolpath(planFabrication(base).toolpath); assert.equal(s.outcome,"SIMULATED"); assert.equal(s.finalState,"SAFE_RETRACTED"); assert.ok(s.cutLengthMm>0); });
test("discrete stock-removal simulation covers the complete rounded pocket", () => { const r=planFabrication(base); assert.equal(r.stockSimulation.outcome,"SIMULATED"); assert.equal(r.stockSimulation.residualCells,0); assert.equal(r.stockSimulation.coverageFraction,1); assert.ok(r.stockSimulation.removedVolumeEstimateMm3>0); });
test("stock-removal simulator rejects excessive grid resolution", () => { const p=planFabrication(base).toolpath; assert.equal(simulateStockRemoval(p,{resolutionMm:0.001,maxCells:100}).outcome,"FAIL"); });
test("stock-removal simulator rejects excessive cell-move work", () => { const p=planFabrication(base).toolpath; assert.equal(simulateStockRemoval(p,{maxWork:100}).outcome,"FAIL"); });
test("stock-removal simulator rejects corrupted toolpath", () => { const p=structuredClone(planFabrication(base).toolpath); p.moves[0].x+=1; assert.equal(simulateStockRemoval(p).outcome,"FAIL"); });
test("stock-removal simulation detects missing perimeter contour passes", () => { const p=structuredClone(planFabrication(base).toolpath); const rowBlock=(p.pointsPerRow+2)*p.rowsPerLayer; const layerBlock=rowBlock+p.contourMovesPerLayer; const moves=[]; for(let layer=0;layer<p.layers;layer++) moves.push(...p.moves.slice(layer*layerBlock,layer*layerBlock+rowBlock)); p.moves=moves.map((m,i)=>({...m,sequence:i})); p.moveCount=p.moves.length; p.integrityId=integrityId({...p,integrityId:undefined}); const r=simulateStockRemoval(p); assert.equal(r.outcome,"FAIL"); assert.ok(r.residualCells>0); });
test("toolpath independently validates", () => assert.equal(validateToolpath(planFabrication(base).toolpath).outcome,"PASS"));
test("planner output has deterministic checksum", () => assert.match(planFabrication(base).toolpath.integrityId,/^pai-fab-checksum-v1-/));
test("checksum changes when a move changes", () => { const p=structuredClone(planFabrication(base).toolpath); const id=p.integrityId; p.moves[0].x+=0.01; assert.notEqual(integrityId({...p,integrityId:undefined}),id); });
test("path uses alternating raster direction", () => { const p=planFabrication(base).toolpath; const plunges=p.moves.filter(m=>m.type==="PLUNGE"); assert.ok(plunges.length>2); assert.notEqual(plunges[0].x,plunges[1].x); });
test("path segments do not exceed configured segment length", () => { const p=planFabrication(base).toolpath; const cuts=p.moves.filter(m=>m.type==="LINEAR_CUT"); for(const m of cuts){const i=m.sequence;const prev=p.moves[i-1];assert.ok(Math.abs(m.x-prev.x)<=10.000001);} });
test("toolpath ends every row with a retract", () => { const p=planFabrication(base).toolpath; for(let i=0;i<p.moves.length;i++) if(p.moves[i].type==="RETRACT" && i+1<p.moves.length) assert.equal(p.moves[i+1]?.type,"RAPID"); });
test("single-tool-width pocket is handled without zero-length contour segments", () => { const r=planFabrication({...base,solid:{...base.solid,dimensions:{x:6,y:10,z:2},cornerRadiusMm:3},tool:{...base.tool,fluteLengthMm:5},process:{...base.process,stepdownMm:1}}); assert.equal(r.outcome,"PLANNED"); const cuts=r.toolpath.moves.filter(m=>m.type==="LINEAR_CUT"); assert.ok(cuts.length>0); for(const m of cuts) assert.ok(Math.abs(m.x-r.toolpath.moves[m.sequence-1].x)<1e-6); });
test("pathological tiny stepover rejected before allocation", () => assert.equal(planFabrication({...base,process:{...base.process,stepoverMm:1e-300}}).outcome,"FAIL"));
test("move limit rejects pathological expansion", () => { const r=planFabrication({...base,maxMoves:2}); assert.equal(r.outcome,"FAIL"); assert.match(r.reason,/move/); });
test("machine move limit enforced", () => assert.equal(planFabrication({...base,machine:{...base.machine,maxMoves:2}}).outcome,"FAIL"));
test("non-finite path coordinate rejected", () => { const p=structuredClone(planFabrication(base).toolpath); p.moves[1].x=NaN; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(validateToolpath(p).outcome,"FAIL"); });
test("checksum tampering rejected", () => { const p=structuredClone(planFabrication(base).toolpath); p.moves[0].x+=1; assert.equal(validateToolpath(p).outcome,"FAIL"); });
test("unsafe rapid at positive cutting depth rejected", () => { const p=structuredClone(planFabrication(base).toolpath); p.moves[0].z=1; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(simulateToolpath(p).outcome,"FAIL"); });
test("diagonal plunge rejected", () => { const p=structuredClone(planFabrication(base).toolpath); p.moves[1].x+=0.5; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(simulateToolpath(p).outcome,"FAIL"); });
test("diagonal retract rejected", () => { const p=structuredClone(planFabrication(base).toolpath); const i=p.moves.findIndex(m=>m.type==="RETRACT"); p.moves[i].y+=0.5; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(simulateToolpath(p).outcome,"FAIL"); });
test("cut at changing Z without plunge rejected", () => { const p=structuredClone(planFabrication(base).toolpath); const i=p.moves.findIndex(m=>m.type==="LINEAR_CUT"); p.moves[i].z+=0.2; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(simulateToolpath(p).outcome,"FAIL"); });
test("missing nominal geometry rejected", () => { const p=structuredClone(planFabrication(base).toolpath); delete p.nominal; p.integrityId=integrityId({...p,integrityId:undefined}); assert.equal(validateToolpath(p).outcome,"FAIL"); });
test("empty toolpath rejected", () => assert.equal(validateToolpath({moves:[]}).outcome,"FAIL"));

// Input validation: missing = HOLD, known-invalid = FAIL.
for (const key of ["solid","stock","machine","tool","process","material","fixture","surfaceFinish","inspectionPlan","tolerance"]) {
  test(`missing ${key} is HOLD`, () => { const i={...base}; delete i[key]; assert.equal(planFabrication(i).outcome,"HOLD"); });
}
test("wrong units rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,units:"inch"}}).outcome,"FAIL"));
test("unsupported feature rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,kind:"arbitrary-brep"}}).outcome,"FAIL"));
test("zero feature dimension rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,dimensions:{x:0,y:1,z:1}}}).outcome,"FAIL"));
test("feature outside stock rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,originMm:{x:30,y:7}}}).outcome,"FAIL"));
test("corner radius smaller than tool radius rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,cornerRadiusMm:2}}).outcome,"FAIL"));
test("corner radius larger than supported strategy rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,cornerRadiusMm:4}}).outcome,"FAIL"));
test("tool shorter than pocket rejected", () => assert.equal(planFabrication({...base,tool:{...base.tool,fluteLengthMm:4}}).outcome,"FAIL"));
test("tool stepdown rating enforced", () => assert.equal(planFabrication({...base,process:{...base.process,stepdownMm:4}}).outcome,"FAIL"));
test("tool diameter larger than pocket rejected", () => assert.equal(planFabrication({...base,tool:{...base.tool,diameterMm:50}}).outcome,"FAIL"));
test("stepover larger than cutter rejected", () => assert.equal(planFabrication({...base,process:{...base.process,stepoverMm:7}}).outcome,"FAIL"));
test("feed above machine rating rejected", () => assert.equal(planFabrication({...base,process:{...base.process,feedMmMin:3001}}).outcome,"FAIL"));
test("spindle above machine rating rejected", () => assert.equal(planFabrication({...base,process:{...base.process,spindleRpm:12001}}).outcome,"FAIL"));
test("material cutting speed limit enforced", () => assert.equal(planFabrication({...base,material:{...base.material,maxCuttingSpeedMMin:100}}).outcome,"FAIL"));
test("material lot identity required", () => assert.equal(planFabrication({...base,material:{...base.material,lotId:""}}).outcome,"HOLD"));
test("fixture verification required", () => assert.equal(planFabrication({...base,fixture:{...base.fixture,verified:false}}).outcome,"HOLD"));
test("fixture clearance evidence required", () => assert.equal(planFabrication({...base,fixture:{...base.fixture,clearanceOutcome:"UNKNOWN"}}).outcome,"HOLD"));
test("fixture clearance failure rejects plan", () => assert.equal(planFabrication({...base,fixture:{...base.fixture,clearanceOutcome:"FAIL"}}).outcome,"FAIL"));
test("inspection plan identity required", () => assert.equal(planFabrication({...base,inspectionPlan:{id:"",method:"CMM"}}).outcome,"HOLD"));
test("stock above machine travel rejected", () => assert.equal(planFabrication({...base,machine:{...base.machine,travelMm:{x:20,y:20,z:10}}}).outcome,"FAIL"));
test("invalid maxMoves rejected", () => assert.equal(planFabrication({...base,maxMoves:1.5}).outcome,"FAIL"));
test("negative tolerance rejected", () => assert.equal(planFabrication({...base,tolerance:{...base.tolerance,x:-1}}).outcome,"FAIL"));
test("zero corner radius tolerance rejected", () => assert.equal(planFabrication({...base,tolerance:{...base.tolerance,cornerRadiusMm:0}}).outcome,"FAIL"));
test("invalid safe clearance rejected", () => assert.equal(planFabrication({...base,process:{...base.process,safeClearanceMm:0}}).outcome,"FAIL"));
test("invalid origin rejected", () => assert.equal(planFabrication({...base,solid:{...base.solid,originMm:{x:-1,y:0}}}).outcome,"FAIL"));
test("missing tool flute length HOLDs", () => { const tool={...base.tool}; delete tool.fluteLengthMm; assert.equal(planFabrication({...base,tool}).outcome,"HOLD"); });
test("missing machine travel axis HOLDs", () => { const travel={...base.machine.travelMm}; delete travel.z; assert.equal(planFabrication({...base,machine:{...base.machine,travelMm:travel}}).outcome,"HOLD"); });
test("missing process feed HOLDs", () => { const process={...base.process}; delete process.feedMmMin; assert.equal(planFabrication({...base,process}).outcome,"HOLD"); });
test("invalid material cutting speed FAILs", () => assert.equal(planFabrication({...base,material:{...base.material,maxCuttingSpeedMMin:-2}}).outcome,"FAIL"));

// Execution safety gate.
for (const key of ["ready","emergencyStopClear","doorClosed","workholdingVerified"]) {
  test(`execution missing ${key} is HOLD`, async () => { const m={...base.machine,executeToolpath:adapter}; delete m[key]; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"HOLD"); });
  test(`execution false ${key} is HOLD`, async () => assert.equal((await fabricate(readyInput({machine:{...base.machine,[key]:false,executeToolpath:adapter}}))).outcome,"HOLD"));
}
test("missing execution adapter is HOLD", async () => assert.equal((await fabricate({ ...base, machine:base.machine })).outcome,"HOLD"));
test("missing machine identity is HOLD", async () => { const m={...base.machine,executeToolpath:adapter}; delete m.id; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"HOLD"); });
test("adapter receives frozen path and idempotency key", async () => { let seen; const m={...base.machine,executeToolpath:async(p,c)=>{seen={frozen:Object.isFrozen(p)&&Object.isFrozen(p.moves),key:c.idempotencyKey};return {completed:true,executionId:"E",machineId:"mill-01",toolpathIntegrityId:p.integrityId};}}; const r=await fabricate(readyInput({machine:m})); assert.equal(r.outcome,"OK"); assert.equal(seen.frozen,true); assert.ok(seen.key); });
test("adapter mutation attempt cannot alter path", async () => { const m={...base.machine,executeToolpath:async(p)=>{try{p.moves[0].x=999;}catch{} return {completed:true,executionId:"E",machineId:"mill-01",toolpathIntegrityId:p.integrityId};}}; const r=await fabricate(readyInput({machine:m})); assert.equal(r.outcome,"OK"); assert.notEqual(r.toolpath.moves[0].x,999); });
test("adapter exception returns HOLD", async () => { const m={...base.machine,executeToolpath:async()=>{throw new Error("controller offline");}}; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"HOLD"); });
test("incomplete execution returns HOLD", async () => { const m={...base.machine,executeToolpath:async()=>({completed:false,executionId:"E"})}; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"HOLD"); });
test("missing execution ID returns HOLD", async () => { const m={...base.machine,executeToolpath:async(p)=>({completed:true,machineId:"mill-01",toolpathIntegrityId:p.integrityId})}; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"HOLD"); });
test("execution toolpath checksum mismatch FAILs", async () => { const m={...base.machine,executeToolpath:async()=>({completed:true,executionId:"E",machineId:"mill-01",toolpathIntegrityId:"wrong"})}; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"FAIL"); });
test("execution machine identity mismatch FAILs", async () => { const m={...base.machine,executeToolpath:async(p)=>({completed:true,executionId:"E",machineId:"other",toolpathIntegrityId:p.integrityId})}; assert.equal((await fabricate(readyInput({machine:m}))).outcome,"FAIL"); });
test("timeout aborts adapter and returns HOLD", async () => { let aborted=false; const m={...base.machine,executeToolpath:async(p,{signal})=>new Promise(resolve=>signal.addEventListener("abort",()=>{aborted=true;resolve({completed:false});},{once:true}))}; const r=await fabricate(readyInput({machine:m,executionTimeoutMs:5})); assert.equal(r.outcome,"HOLD"); assert.equal(aborted,true); });
test("empty idempotency key FAILs", async () => assert.equal((await fabricate(readyInput({idempotencyKey:"  "}))).outcome,"FAIL"));
test("missing measurement after execution HOLDs", async () => { const i=readyInput(); delete i.measuredPart; const r=await fabricate(i); assert.equal(r.outcome,"HOLD"); assert.equal(r.execution.state,"COMPLETED"); });
test("measurement method mismatch with inspection plan HOLDs", async () => { const r=await fabricate(readyInput({measuredPart:{...base.measuredPart,method:"UNAPPROVED_METHOD"}})); assert.equal(r.outcome,"HOLD"); });

// Metrology and end-to-end evidence.
test("measurement accepts in-tolerance guarded evidence", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:base.measuredPart,tolerance:base.tolerance}).outcome,"OK"));
test("measurement rejects tolerance exceedance", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,dimensions:{...base.measuredPart.dimensions,x:40.2}},tolerance:base.tolerance}).outcome,"FAIL"));
test("uncertainty guard band rejects nominally close result", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,dimensions:{...base.measuredPart.dimensions,x:40.095},uncertaintyMm:{...base.measuredPart.uncertaintyMm,x:0.01}},tolerance:base.tolerance}).outcome,"FAIL"));
test("corner-radius deviation is independently checked", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,cornerRadiusMm:3.2},tolerance:base.tolerance}).outcome,"FAIL"));
test("missing measurement provenance HOLDs", () => { const m={...base.measuredPart}; delete m.calibrationId; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("missing surface-finish measurement HOLDs", () => { const m={...base.measuredPart}; delete m.surfaceFinishRaUm; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("null measurement input HOLDs", () => assert.equal(evaluateMeasurement(null).outcome,"HOLD"));
test("missing measurement evidence HOLDs", () => { const m={...base.measuredPart}; delete m.evidenceId; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("missing measurement method HOLDs", () => { const m={...base.measuredPart}; delete m.method; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("missing uncertainty budget HOLDs", () => { const m={...base.measuredPart}; delete m.uncertaintyMm; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("missing surface roughness uncertainty HOLDs", () => { const m={...base.measuredPart}; delete m.uncertaintyUm; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("missing calibration evidence reference HOLDs", () => { const m={...base.measuredPart}; delete m.calibrationEvidenceId; assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:m,tolerance:base.tolerance}).outcome,"HOLD"); });
test("expired calibration FAILs", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,calibrationStatus:"EXPIRED"},tolerance:base.tolerance}).outcome,"FAIL"));
test("measurement outside calibration validity window FAILs", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,measuredAt:"2027-02-01T00:00:00Z"},tolerance:base.tolerance}).outcome,"FAIL"));
test("invalid measurement dimensions FAIL", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,dimensions:{x:NaN,y:1,z:1}},tolerance:base.tolerance}).outcome,"FAIL"));
test("negative uncertainty FAIL", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,uncertaintyMm:{...base.measuredPart.uncertaintyMm,z:-1}},tolerance:base.tolerance}).outcome,"FAIL"));
test("surface finish above specified Ra limit FAILs", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,surfaceFinishRaUm:4.1},tolerance:base.tolerance}).outcome,"FAIL"));
test("surface finish uncertainty guard band enforced", () => assert.equal(evaluateMeasurement({nominal:planFabrication(base).toolpath.nominal,measured:{...base.measuredPart,surfaceFinishRaUm:3.15,uncertaintyUm:{surfaceFinishRaUm:0.1}},tolerance:base.tolerance}).outcome,"FAIL"));
test("full lifecycle sample returns measured conforming", async () => { const r=await fabricate(readyInput()); assert.equal(r.outcome,"OK"); assert.equal(r.fabricationEvidence.status,"MEASURED_CONFORMING"); assert.equal(r.fabricationEvidence.physicalMeasurementProvidedExternally,true); assert.equal(r.fabricationEvidence.stockRemovalSimulationPerformed,true); assert.equal(r.stockSimulation.residualCells,0); });
test("full lifecycle out-of-tolerance returns FAIL", async () => { const r=await fabricate(readyInput({measuredPart:{...base.measuredPart,dimensions:{...base.measuredPart.dimensions,y:29.5}}})); assert.equal(r.outcome,"FAIL"); assert.equal(r.fabricationEvidence.status,"MEASURED_NONCONFORMING"); });
test("execution and metrology evidence share exact toolpath checksum", async () => { const r=await fabricate(readyInput()); assert.equal(r.execution.toolpathIntegrityId,r.toolpath.integrityId); assert.equal(r.fabricationEvidence.toolpathIntegrityId,r.toolpath.integrityId); });
test("sample JSON is parseable and executable", async () => { const sample=JSON.parse(readFileSync(new URL("./samples/rectangular-pocket.json",import.meta.url),"utf8")); const r=await fabricate({...sample,machine:{...sample.machine,executeToolpath:adapter}}); assert.equal(r.outcome,"OK"); });

await Promise.all(pending);
console.log(`\nFABRICATION TESTS: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode=1;
