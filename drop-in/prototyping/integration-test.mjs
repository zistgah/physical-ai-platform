/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** E2E: prototype evaluator + canonical kernel + evidence binding + G4 gate + lifecycle engine. */
import { prototype } from "./module.js";
import { createKernel } from "../../site/components/core/canonical-kernel.js";
import { EvidenceBinding } from "../../site/components/core/evidence-binding.js";
import { GateSchemaEngine } from "../../site/components/core/gate-schemas.js";
import { LifecycleEngine } from "../../site/components/core/lifecycle-engine.js";
function assert(c,m){if(!c)throw new Error(`FAIL: ${m}`);}
const k=createKernel();
const p=k.createProject({id:"proto-e2e-project",name:"Prototype E2E"});
const cfg=k.upsert({id:"proto-e2e-config",type:"Configuration",name:"Prototype baseline",status:"FROZEN",fingerprint:"sha256:proto-e2e-config"});
const parent=k.upsert({id:"proto-e2e-revision-1",type:"Baseline",name:"Prototype revision 1",configurationId:cfg.id,changes:["Initial baseline"]});
const rev=k.upsert({id:"proto-e2e-revision-2",type:"Baseline",name:"Prototype revision 2",configurationId:cfg.id,parentRevisionId:parent.id,changes:["Revised bracket geometry"]});
const req=k.upsert({id:"proto-e2e-req",type:"Requirement",name:"Bracket fit",status:"VERIFIED"});
const gate=k.upsert({id:"G4",type:"Gate",name:"Prototype",status:"OPEN"});
k.upsert({id:"proto-e2e-hazard",type:"Hazard",name:"Pinch point",status:"ASSESSED"});
const test=k.upsert({id:"proto-e2e-test",type:"Test",name:"Bracket fit test",status:"PASS",outcome:"PASS",result:{fit:true},configurationId:cfg.id,revisionId:rev.id,requirementIds:[req.id]});
const ev=k.upsert({id:"proto-e2e-evidence",type:"Evidence",name:"Bracket inspection",method:"PHYSICAL_TEST",state:"TESTED",status:"ACCEPTED",outcome:"PASS",result:{fit:"within tolerance"},configurationId:cfg.id,revisionId:rev.id,realization:"REAL",fidelityLevel:"L6"});
for(const entity of [cfg,parent,rev,req,gate,k.store.get("proto-e2e-hazard"),test,ev]) k.link(p.id,"CONTAINS",entity.id);
k.link(gate.id,"REQUIRES",req.id); k.addVerification(req.id,test.id); k.addEvidence(test.id,ev.id);
new EvidenceBinding(k).bind(ev.id,cfg.id);
const revision={id:rev.id,parentRevisionId:parent.id,parentRevision:parent,configurationId:cfg.id,changes:rev.changes};
const testView=[{...test,configurationId:cfg.id,revisionId:rev.id,requirementIds:[req.id]}];
const evidenceView=[{...k.store.get(ev.id),configurationId:cfg.id,configurationFingerprint:cfg.fingerprint,revisionId:rev.id,testId:test.id,realization:"REAL",fidelityLevel:"L6"}];
const result=prototype({config:cfg,revision,requirements:[req],tests:testView,evidence:evidenceView,relations:k.store.relations});
assert(result.outcome==="OK",`evaluator accepts canonical kernel records: ${result.reason||JSON.stringify(result.missing)}`);
assert(result.prototype.requirementIds.includes(req.id),"requirement remains traceable");
assert(result.prototype.evidenceIds.includes(ev.id),"bound evidence remains traceable");
const gateResult=new GateSchemaEngine(k).evaluateGate(p.id,gate.id,{configurationId:cfg.id,authority:"prototype-review-board"});
assert(gateResult.outcome==="PASS",`G4 gate accepts complete graph fixture: ${gateResult.reasons.join("; ")}`);
const noAuthority=new GateSchemaEngine(k).evaluateGate(p.id,gate.id,{configurationId:cfg.id,authority:null});
assert(noAuthority.outcome==="HOLD","G4 remains HOLD without authority");
const lifecycle=new LifecycleEngine(k).evaluateGate(p.id,gate.id,{configurationId:cfg.id,authority:"prototype-review-board"});
assert(lifecycle.outcome==="PASS",`LifecycleEngine accepts complete G4 fixture: ${lifecycle.reasons.join("; ")}`);
console.log("prototyping integration PASS (5 end-to-end assertions)");

// Full numerical backend -> candidate -> canonical graph -> G4 -> lifecycle path.
import { createBackendAdapter, toSimulationEvidenceCandidate } from "./backend-runtime.js";
import { createBenchmarkValidator, createSha256Digest } from "./benchmark-validation.js";
import { webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const scipyProbe=spawnSync("python3",["-c","import scipy; print(scipy.__version__)"],{encoding:"utf8",timeout:10000});
if (!scipyProbe.error && scipyProbe.status===0) {
  const scipyVersion=scipyProbe.stdout.trim();
  const sampleJob=JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)),"samples/scipy-rc-step-job.json"),"utf8"));
  const k2=createKernel();
  const p2=k2.createProject({id:"proto-scipy-e2e-project",name:"SciPy backend G4 integration"});
  const cfg2=k2.upsert({id:"proto-scipy-e2e-config",type:"Configuration",name:"SciPy RC configuration",status:"FROZEN",fingerprint:"sha256:proto-scipy-e2e-config"});
  const parent2=k2.upsert({id:"proto-scipy-e2e-rev-1",type:"Baseline",name:"Revision 1",configurationId:cfg2.id,changes:["Initial RC model"]});
  const rev2=k2.upsert({id:"proto-scipy-e2e-rev-2",type:"Baseline",name:"Revision 2",configurationId:cfg2.id,parentRevisionId:parent2.id,changes:["Refined solver tolerances"]});
  const req2=k2.upsert({id:"proto-scipy-e2e-req",type:"Requirement",name:"RC output at one time constant",status:"VERIFIED"});
  const gate2=k2.upsert({id:"G4",type:"Gate",name:"Prototype",status:"OPEN"});
  const hazard2=k2.upsert({id:"proto-scipy-e2e-hazard",type:"Hazard",name:"Electrical overvoltage",status:"ASSESSED"});
  const test2=k2.upsert({id:"proto-scipy-e2e-test",type:"Test",name:"RC transient analytical benchmark",status:"PASS",outcome:"PASS",result:{voutAtTauV:0.63212},configurationId:cfg2.id,revisionId:rev2.id,requirementIds:[req2.id]});
  for(const entity of [cfg2,parent2,rev2,req2,gate2,hazard2,test2]) k2.link(p2.id,"CONTAINS",entity.id);
  k2.link(gate2.id,"REQUIRES",req2.id);
  k2.addVerification(req2.id,test2.id);
  sampleJob.projectId=p2.id; sampleJob.configurationId=cfg2.id; sampleJob.configurationFingerprint=cfg2.fingerprint; sampleJob.revisionId=rev2.id; sampleJob.testId=test2.id; sampleJob.backendVersion=scipyVersion;
  const sha256=createSha256Digest(webcrypto.subtle);
  const adapter2=createBackendAdapter({backendId:"scipy",transport:{execute:async envelope=>{
    const worker=join(dirname(fileURLToPath(import.meta.url)),"workers/scipy_reference_worker.py");
    const child=spawnSync("python3",[worker],{input:JSON.stringify(envelope),encoding:"utf8",timeout:20000});
    if(child.error)throw child.error;
    if(!child.stdout)throw new Error(child.stderr||`SciPy worker exited ${child.status}`);
    return JSON.parse(child.stdout);
  }},validator:createBenchmarkValidator("rc-lowpass-step-tau",sha256)});
  const backendRun=await adapter2.execute(sampleJob);
  assert(backendRun.outcome==="OK",`SciPy worker and benchmark pass: ${backendRun.reason||JSON.stringify(backendRun.missing)}`);
  const candidate2=toSimulationEvidenceCandidate({run:backendRun,evidenceId:"proto-scipy-e2e-evidence",configurationId:cfg2.id,configurationFingerprint:cfg2.fingerprint,revisionId:rev2.id,testId:test2.id,result:backendRun.result});
  assert(candidate2.outcome==="OK","verified backend run converts to simulation evidence candidate");
  const ev2=k2.upsert({...candidate2.evidence,type:"Evidence",name:"Verified SciPy RC transient",status:"ACCEPTED",outcome:"PASS"});
  k2.link(p2.id,"CONTAINS",ev2.id);
  k2.addEvidence(test2.id,ev2.id);
  new EvidenceBinding(k2).bind(ev2.id,cfg2.id);
  const view2=prototype({config:cfg2,revision:{id:rev2.id,parentRevisionId:parent2.id,parentRevision:parent2,configurationId:cfg2.id,changes:rev2.changes},requirements:[req2],tests:[{...test2,configurationId:cfg2.id,revisionId:rev2.id,requirementIds:[req2.id]}],evidence:[{...k2.store.get(ev2.id),configurationId:cfg2.id,configurationFingerprint:cfg2.fingerprint,revisionId:rev2.id,testId:test2.id}],relations:k2.store.relations});
  assert(view2.outcome==="OK","SciPy result is accepted by prototype evaluator with canonical graph bindings");
  const g4=new GateSchemaEngine(k2).evaluateGate(p2.id,gate2.id,{configurationId:cfg2.id,authority:"prototype-review-board"});
  assert(g4.outcome==="PASS","G4 gate accepts bound, benchmark-verified simulation evidence with authority");
  const noAuth=new GateSchemaEngine(k2).evaluateGate(p2.id,gate2.id,{configurationId:cfg2.id,authority:null});
  assert(noAuth.outcome==="HOLD","G4 gate holds the same evidence without authority");
  const life=new LifecycleEngine(k2).evaluateGate(p2.id,gate2.id,{configurationId:cfg2.id,authority:"prototype-review-board"});
  assert(life.outcome==="PASS","LifecycleEngine receives the canonical G4 result");
  console.log("SciPy-to-kernel-to-G4 integration PASS (7 additional assertions)");
} else {
  console.log("SKIP: SciPy-to-kernel integration requires Python 3 and SciPy");
}
