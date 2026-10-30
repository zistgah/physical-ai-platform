// Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cadClipRobust } from './module.js';
import { selectCadBackend, discoverCadBackends, registerCadBackend } from './backends/registry.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const assert=(v,m)=>{if(!v)throw new Error('FAIL: '+m)};
const discovered=await discoverCadBackends();
const occt=discovered.find(x=>x.name==='OCCT');
assert(occt?.available===true,'OCCT backend probe must find installed OCP');
const automatic=await selectCadBackend({preferred:'auto'});
assert(automatic.selectedName==='OCCT','auto selection prefers the installed highest-priority available native engine');
const unregister=registerCadBackend({name:'TEST-EXTENSION',kind:'mesh',capabilities:['intersection'],probe:()=>true,intersect:()=>({outcome:'HOLD',reason:'test extension'})},{priority:1});
const extension=await selectCadBackend({preferred:'TEST-EXTENSION'});
assert(extension.selectedName==='TEST-EXTENSION','third-party backend registration is replaceable');
unregister();
const missing=await selectCadBackend({preferred:'NOT-INSTALLED'});
assert(!missing.selected&&missing.reason,'explicit missing backend does not silently downgrade');
const choice=await selectCadBackend({preferred:'OCCT'});
assert(choice.selectedName==='OCCT'&&choice.selected,'explicit backend selection');
for(const file of ['box-overlap.json','nonconvex-l-prism.json','rotated-box.json']){
 const sample=JSON.parse(fs.readFileSync(path.join(here,'samples',file),'utf8'));
 const result=await cadClipRobust(sample.base,sample.cutter,{backend:choice.selected,tolerance:1e-7,deflection:1e-3,volumeRelativeTolerance:2e-5});
 assert(result.outcome==='OK',`${sample.name} must execute: ${result.reason||'unknown failure'}`);
 assert(result.topology?.watertight===true,`${sample.name} watertight result`);
 assert(Number.isFinite(result.volume)&&result.volume>0,`${sample.name} finite positive volume`);
 if(sample.expectedIntersectionVolume!==null) assert(Math.abs(result.volume-sample.expectedIntersectionVolume)<=sample.volumeTolerance,`${sample.name} analytical volume oracle`);
 console.log(`PASS ${sample.name}: volume=${result.volume} triangles=${result.triangleCount} engine=${result.engine}`);
}
// Browser-safe JS fallback is convex-only and must HOLD on the real non-convex sample.
const nonconvexSample=JSON.parse(fs.readFileSync(path.join(here,'samples','nonconvex-l-prism.json'),'utf8'));
const browserOnly=await cadClipRobust(nonconvexSample.base,nonconvexSample.cutter);
assert(browserOnly.outcome==='HOLD','JS-only fallback must not mislabel non-convex geometry as successful');

// A broken backend must not be hidden by a fallback to convex clipping.
const broken={name:'broken',async intersect(){return {outcome:'HOLD',reason:'injected backend failure'}}};
const hold=await cadClipRobust(JSON.parse(fs.readFileSync(path.join(here,'samples','box-overlap.json'))).base,JSON.parse(fs.readFileSync(path.join(here,'samples','box-overlap.json'))).cutter,{backend:broken});
assert(hold.outcome==='HOLD'&&hold.reason==='injected backend failure','backend HOLD propagation');
console.log('CAD backend integration PASS: discovery, selection, OCCT samples, analytic oracles, HOLD propagation');
