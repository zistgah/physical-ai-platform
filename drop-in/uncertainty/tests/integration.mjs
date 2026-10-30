import assert from 'node:assert/strict';
import { uncertaintyStudy } from '../module.js';
import { simStep } from '../../simulation/module.js';
const spec={parameters:[{name:'mass',distribution:'uniform',min:0.9,max:1.1}],samples:20,seed:47002,metrics:['finalY','finalSpeed']};
const result=await uncertaintyStudy(spec,{runner:p=>{
  const sim=simStep({bodies:[{id:'drop',x:0,y:2,vx:0,vy:0,mass:p.mass,radius:0.1}],dt:1/120,steps:120,gravity:{x:0,y:-9.81},floor:0,recordHistory:false});
  if(sim.outcome!=='OK')return sim;
  const b=sim.bodies[0]; return {outcome:'OK',metrics:{finalY:b.y,finalSpeed:Math.hypot(b.vx,b.vy)}};
}});
assert.equal(result.outcome,'OK'); assert.equal(result.study.samples,20);
assert.ok(result.study.metrics.finalY.min>=0.099);
assert.equal(result.verification.physicalVerification,false);
console.log('uncertainty + simulation integration: PASS');
