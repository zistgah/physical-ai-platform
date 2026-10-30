/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Regression guards for the previously identified false-HIL, false-fidelity and missing-cost-to-zero defects. */
import {createKernel} from '../site/components/core/canonical-kernel.js';
import {BusinessEngine} from '../site/components/core/business-engine.js';
import {BusinessClosure} from '../site/components/core/business-closure.js';
import {FidelityLadder} from '../site/components/simulation/fidelity-ladder.js';
import {FidelityLevels} from '../site/components/simulation/fidelity-levels.js';
import {runLoop} from '../site/components/simulation/hil-loop.js';
import {HilRealtime} from '../site/components/simulation/hil-realtime.js';
import {HilTransport} from '../site/components/simulation/hil-transport.js';
import {CadHilAdapter} from '../site/components/simulation/cad-hil-adapter.js';
const assert=(v,m)=>{if(!v)throw Error(`FAIL ${m}`);console.log(`PASS ${m}`)};
const k=createKernel(),p=k.upsert({id:'guard-p',type:'Project',name:'Guard',provenance:{origin:'guard-test'}});const c=k.upsert({id:'guard-c',type:'Component',name:'Component',costMaterial:0,provenance:{origin:'guard-test'}});k.link(p.id,'CONTAINS',c.id);
const cost=new BusinessEngine(k).aggregateCost(p.id);assert(cost.total===null&&cost.material===null&&cost.complete===false,'business engine does not turn missing costs into zero');assert(cost.declaredSubtotal===0,'explicit zero remains zero');
const closure=new BusinessClosure(k).rollup(p.id);assert(closure.total===null&&closure.undeclared.length===2,'business closure propagates incomplete total and missing fields');
const ladder=new FidelityLadder(k),planned=ladder.run(p.id,{method:'SIL',configurationId:'cfg-1',subjectId:c.id});assert(planned.evidence.state==='PLANNED','fidelity planning does not manufacture execution evidence');
const levels=new FidelityLevels(k);assert(levels.claim(p.id,c.id,'L0','cfg-1').outcome==='HOLD','fidelity claim without accepted evidence holds');
const verified=k.upsert({id:'guard-ev-l0',type:'Evidence',name:'L0 verified',state:'VERIFIED',method:'CONCEPTUAL_REVIEW',subject:c.id,configurationId:'cfg-1',level:'L0',provenance:{origin:'guard-test'}});k.link(p.id,'CONTAINS',verified.id);assert(levels.claim(p.id,c.id,'L0','cfg-1').outcome==='OK','fidelity claim references existing subject/configuration-bound evidence');
const plant={x0:0,step:x=>x};assert(runLoop({plant,controller:()=>0,steps:1,dt:.01,device:{bound:true,transport:'bench'}}).outcome==='HOLD','transport label without hardware I/O is not HIL');
let sensed=0;const live=runLoop({steps:1,dt:.01,controller:x=>x+1,device:{id:'device-1',bound:true,hardwareBacked:true,transport:{kind:'hardware',bus:'CAN',readState:()=>++sensed,writeCommand:()=>true},safety:{interlockClosed:true,emergencyStopClear:true},authority:{verified:true,authorized:true,subject:'op',policyRef:'policy'}},verifyAttestation:({bus,deviceId})=>({verified:true,bus,deviceId})});assert(live.outcome==='OK'&&live.method==='HIL'&&live.qualification==='UNQUALIFIED_ADAPTER_ATTESTATION','HIL requires attested device exchange and remains unqualified');
const rt=new HilRealtime();assert(rt.bind({id:'mock',step:x=>x}).outcome==='HOLD','HilRealtime rejects software step mock');assert(rt.bind({id:'hw',bound:true,hardwareBacked:true,transport:{kind:'hardware',bus:'CAN',readState:()=>0,writeCommand:()=>true},safety:{interlockClosed:true,emergencyStopClear:true},authority:{verified:true,authorized:true,subject:'op',policyRef:'pol'}},({bus,deviceId})=>({verified:true,bus,deviceId})).outcome==='BOUND','HilRealtime requires and accepts verified hardware attestation');
const tr=new HilTransport();assert(tr.bind({tick:()=>1}).outcome==='HOLD','HilTransport rejects tick-only mock');assert(tr.bind({id:'hw',bound:true,hardwareBacked:true,transport:{kind:'hardware',bus:'CAN',readState:()=>0,writeCommand:()=>true},safety:{interlockClosed:true,emergencyStopClear:true},authority:{verified:true,authorized:true,subject:'op',policyRef:'pol'}},({bus,deviceId})=>({verified:true,bus,deviceId})).outcome==='BOUND','HilTransport requires and accepts verified hardware attestation');
const adapter=new CadHilAdapter(k);assert(adapter.runHil(p.id,'cfg-1').outcome==='HOLD','CAD-HIL adapter refuses to fabricate HIL evidence');
const recorded=adapter.runHil(p.id,'cfg-1',{}, {completed:true,runId:'run-1',configurationId:'cfg-1',deviceId:'device-1',bus:'CAN',hardwareAttested:true,source:'verified-bench-adapter',subjectId:c.id});assert(recorded.outcome==='RECORDED'&&recorded.evidence.state==='EXECUTED','CAD-HIL adapter records external execution record with explicit unverified qualification');
console.log('PASS guardrail regression suite');
