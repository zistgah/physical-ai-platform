import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { simStep } from './module.js';
const files=(await readdir(new URL('./samples/',import.meta.url))).filter(f=>f.endsWith('.json')).sort();
for(const file of files){
  const sample=JSON.parse(await readFile(new URL(`./samples/${file}`,import.meta.url),'utf8'));
  const result=simStep(sample.input),e=sample.expect;
  assert.equal(result.outcome,e.outcome,`${file}: outcome`);
  assert.equal(result.bodies.length,e.bodyCount,`${file}: body count`);
  if(e.leftVxLessThan!==undefined)assert.ok(result.bodies.find(b=>b.id==='left').vx<e.leftVxLessThan,`${file}: left velocity`);
  if(e.rightVxGreaterThan!==undefined)assert.ok(result.bodies.find(b=>b.id==='right').vx>e.rightVxGreaterThan,`${file}: right velocity`);
  if(e.momentumX!==undefined){const p=result.bodies.reduce((s,b)=>s+b.mass*b.vx,0);assert.ok(Math.abs(p-e.momentumX)<=e.tolerance,`${file}: momentum`);}
  if(e.minimumY!==undefined)assert.ok(result.bodies[0].y>=e.minimumY,`${file}: minimum Y`);
  if(e.maximumAbsVy!==undefined)assert.ok(Math.abs(result.bodies[0].vy)<=e.maximumAbsVy,`${file}: final vertical speed`);
  if(e.maximumFinalPenetration!==undefined)assert.ok(result.diagnostics.finalPenetration<=e.maximumFinalPenetration,`${file}: penetration ${result.diagnostics.finalPenetration}`);
  if(e.finiteAngularState)assert.ok(result.bodies.every(b=>Number.isFinite(b.angle)&&Number.isFinite(b.omega)),`${file}: angular state`);
  if(e.omega!==undefined)assert.ok(Math.abs(result.bodies[0].omega-e.omega)<=e.tolerance,`${file}: omega ${result.bodies[0].omega}`);
  if(e.angle!==undefined)assert.ok(Math.abs(result.bodies[0].angle-e.angle)<=e.tolerance,`${file}: angle ${result.bodies[0].angle}`);
  console.log(`PASS sample ${file} (${result.diagnostics.substeps} substeps, ${result.diagnostics.contactEvents} contact events)`);
}
console.log(`sample suite PASS: ${files.length} end-to-end scenarios`);
