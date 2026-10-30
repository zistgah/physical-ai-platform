/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
import { cadClip } from './module.js';
const assert=(v,m)=>{if(!v)throw Error(`FAIL ${m}`)};
const cube={vertices:[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:1,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1},{x:1,y:0,z:1},{x:1,y:1,z:1},{x:0,y:1,z:1}],faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]};
const r=cadClip(cube,{normal:{x:1,y:0,z:0},offset:.5});assert(r.outcome==='OK'&&r.faces.length>0,'clips mesh');assert(r.vertices.every(p=>p.x>=.5-1e-8),'keeps positive half-space');assert(cadClip(cube,{normal:{x:0,y:0,z:0},offset:0}).outcome==='HOLD','rejects zero normal');assert(cadClip({...cube,faces:[[99,1,2]]},{normal:{x:1,y:0,z:0},offset:0}).outcome==='HOLD','rejects invalid indices');console.log('cad PASS');
