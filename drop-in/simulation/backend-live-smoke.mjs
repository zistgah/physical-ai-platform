/** Optional real Rapier runtime smoke test. Requires an explicitly installed package. */
import { createSimulationBackends } from './backends/index.js';
import { simStepWithBackend } from './module.js';
const registry=createSimulationBackends();
const result=await simStepWithBackend({bodies:[{id:'drop',x:0,y:2,vx:0,vy:0,mass:1,radius:.25}],dt:1/120,steps:240,gravity:{x:0,y:-9.81},floor:0},{backend:'rapier2d',registry});
if(result.outcome!=='OK'){
  if(/optional dependency is not installed/.test(result.reason)){console.log('SKIP live Rapier smoke: optional @dimforge/rapier2d-compat is not installed');process.exitCode=0;}
  else {console.error(result);process.exitCode=1;}
}else{
  const b=result.bodies[0];if(!Number.isFinite(b.y)||b.y<.20||b.y>.40)throw new Error(`Unexpected floor settling result y=${b.y}`);
  console.log(`PASS live Rapier smoke: engine=${result.diagnostics.engineVersion}, final y=${b.y}, contact events=${result.diagnostics.contactStartEvents}`);
}
