/** Iteration 47 drop-in package behavior tests. Copyright © 1993-2026 Abhishek Choudhary. Licensed GPL-3.0-only. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { bibo } from '../tests/bibo.mjs';
import { cfdStep } from '../drop-in/cfd/module.js';
import { hilStep } from '../drop-in/hil/module.js';
import { supply } from '../drop-in/logistics/module.js';
const assert=(c,m)=>{if(!c)throw Error(`FAIL: ${m}`)};
const dirs=readdirSync('drop-in').filter(d=>existsSync(join('drop-in',d,'EXPLAINER.md'))&&readFileSync(join('drop-in',d,'EXPLAINER.md'),'utf8').includes('Do not flatten the canonical kernel'));
assert(dirs.length===10,'ten packages retain kernel constraint');
bibo('cfd',{
 below:{fn:()=>cfdStep({}),expect:r=>r.outcome==='HOLD'},
 on:{fn:()=>cfdStep({mesh:{cells:8,length:1},fluid:{diffusivity:1,velocity:0,left:0,right:1},steps:10000}),expect:r=>r.outcome==='OK'&&r.converged},
 within:{fn:()=>cfdStep({mesh:{cells:8,length:1},fluid:{diffusivity:1,velocity:0,left:0,right:1},steps:10000}).residual,expect:r=>Number.isFinite(r)&&r<1e-8},
 above:{fn:()=>cfdStep({mesh:{cells:1,length:1},fluid:{diffusivity:0,velocity:0,left:0,right:1}}),expect:r=>r.outcome==='HOLD'}
});
bibo('logistics',{
 below:{fn:()=>supply({}),expect:r=>r.outcome==='HOLD'},
 on:{fn:()=>supply({part:'bolt',qty:10,lead:2,inventory:10,orderId:'wo-1',supplierStatus:'APPROVED'}),expect:r=>r.outcome==='OK'},
 within:{fn:()=>supply({part:'bolt',qty:10,lead:2,inventory:3,orderId:'wo-2',supplierStatus:'APPROVED'}).shortage,expect:n=>n===7},
 above:{fn:()=>supply({part:'bolt',qty:10,lead:2,inventory:10,orderId:'wo-3',supplierStatus:'UNKNOWN'}),expect:r=>r.outcome==='HOLD'}
});
const mock={read:async()=>0,write:async()=>true};
assert((await hilStep({transport:mock,dt:.001,command:0,limits:{min:-1,max:1},safety:{interlockClosed:true,emergencyStopClear:true},authority:{authorized:true,subject:'op'}})).outcome==='HOLD','software mock never claims HIL');
const hardware=await hilStep({transport:{kind:'hardware',hardwareBacked:true,bus:'CAN',deviceId:'dev-1',read:async()=>({ok:true}),write:async()=>true},dt:.001,command:0,limits:{min:-1,max:1},safety:{interlockClosed:true,emergencyStopClear:true},authority:{authorized:true,verified:true,subject:'op',policyRef:'policy'},verifyAttestation:async x=>({verified:true,bus:x.bus,deviceId:x.deviceId})});
assert(hardware.outcome==='EXECUTED'&&hardware.method==='HIL'&&hardware.qualification==='UNQUALIFIED_ADAPTER_ATTESTATION','bounded hardware exchange remains explicitly unqualified');
for(const d of dirs){const explainer=readFileSync(join('drop-in',d,'EXPLAINER.md'),'utf8');assert(explainer.includes('Do not flatten the canonical kernel'),`${d} documents canonical kernel constraints`);}
console.log('PASS Iteration 47 package contract tests');
