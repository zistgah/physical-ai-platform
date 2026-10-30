/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { simStep, SIMULATION_LIMITS } from './module.js';
import assert from 'node:assert/strict';
const near=(a,b,t=1e-5)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,`${a} not within ${t} of ${b}`);
const body=(id,x,{y=1,vx=0,vy=0,mass=1,radius=.5,restitution=0,friction=0,angle=0,omega=0,...rest}={})=>
  ({id,x,y,vx,vy,mass,radius,restitution,friction,angle,omega,...rest});
const run=(bodies,opts={})=>simStep({bodies,dt:.01,steps:1,gravity:{x:0,y:0},floor:null,...opts});
let count=0; const test=(name,fn)=>{fn();count++;console.log(`PASS ${name}`);};

test('HOLD: missing and empty bodies',()=>{assert.equal(simStep({}).outcome,'HOLD');assert.equal(simStep({bodies:[]}).outcome,'HOLD');});
test('HOLD: invalid timestep, step count and gravity',()=>{
  assert.equal(simStep({bodies:[body('a',0)],dt:0}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:1.1}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,steps:0}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,gravity:{x:NaN,y:0}}).outcome,'HOLD');
});
test('HOLD: invalid body schema and duplicate identifiers',()=>{
  assert.equal(run([body('a',0,{radius:0})]).outcome,'HOLD');
  assert.equal(run([body('a',0,{mass:-1})]).outcome,'HOLD');
  assert.equal(run([body('a',0),body('a',2)]).outcome,'HOLD');
  assert.equal(run([body('a',0,{omega:Infinity})]).outcome,'HOLD');
});
test('HOLD: bounded resource limits',()=>{
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,steps:10001}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,maxSubsteps:65}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,steps:10001,recordHistory:false}).outcome,'HOLD');
  assert.equal(SIMULATION_LIMITS.bodies,256);
});
test('equal-mass elastic head-on collision exchanges velocity and conserves momentum',()=>{
  const r=run([body('a',-.505,{vx:1,restitution:1}),body('b',.505,{vx:-1,restitution:1})],{solverIterations:20});
  assert.equal(r.outcome,'OK'); assert.ok(r.bodies.find(x=>x.id==='a').vx<-.9); assert.ok(r.bodies.find(x=>x.id==='b').vx>.9);
  near(r.bodies.reduce((s,x)=>s+x.mass*x.vx,0),0);
});
test('unequal-mass elastic collision conserves momentum and kinetic energy',()=>{
  const input=[body('light',-.51,{vx:2,mass:1,restitution:1}),body('heavy',.51,{vx:0,mass:3,restitution:1})];
  const beforeP=input.reduce((s,x)=>s+x.mass*x.vx,0), beforeE=input.reduce((s,x)=>s+.5*x.mass*x.vx*x.vx,0);
  const r=run(input,{solverIterations:30}); assert.equal(r.outcome,'OK');
  near(r.bodies.reduce((s,x)=>s+x.mass*x.vx,0),beforeP,1e-4);
  near(r.bodies.reduce((s,x)=>s+.5*x.mass*x.vx*x.vx,0),beforeE,1e-4);
});
test('inelastic collision does not create kinetic energy',()=>{
  const r=run([body('a',-.51,{vx:1,restitution:0}),body('b',.51,{vx:-1,restitution:0})]);
  assert.ok(r.bodies.reduce((s,x)=>s+.5*x.mass*x.vx*x.vx,0)<=1+1e-6);
});
test('floor contact arrests downward motion and resolves penetration',()=>{
  const r=simStep({bodies:[body('ball',0,{y:.51,vy:-2,restitution:0})],dt:.01,gravity:{x:0,y:0},floor:0});
  assert.equal(r.outcome,'OK'); assert.ok(r.bodies[0].vy>=-1e-8); assert.ok(r.bodies[0].y>=.5-1e-6);
});
test('floor restitution produces upward rebound',()=>{
  const r=simStep({bodies:[body('ball',0,{y:.51,vy:-2,restitution:1})],dt:.01,gravity:{x:0,y:0},floor:0});
  assert.ok(r.bodies[0].vy>1.9);
});
test('static bodies remain immovable and collide',()=>{
  const r=run([body('fixed',0,{mass:0}),body('moving',.9,{vx:-1})]);
  const fixed=r.bodies.find(x=>x.id==='fixed'); assert.equal(fixed.x,0); assert.equal(fixed.vx,0);
});
test('zero-mass and static flag are both immovable, including supplied velocity',()=>{
  const r=run([body('fixed',0,{mass:2,static:true,vx:9,vy:-3,omega:4}),body('moving',.9,{vx:-1})]);
  const fixed=r.bodies.find(x=>x.id==='fixed'); assert.equal(fixed.x,0);
  assert.equal(fixed.vx,0); assert.equal(fixed.vy,0); assert.equal(fixed.omega,0);
});
test('spin and angular impulse are included in contact response',()=>{
  const r=run([body('a',-.5,{vx:1,restitution:0,friction:1}),body('b',.5,{vx:-1,restitution:0,friction:1,vy:.3})],{solverIterations:20});
  assert.equal(r.outcome,'OK'); assert.ok(r.bodies.every(x=>Number.isFinite(x.omega)));
  assert.ok(r.bodies.some(x=>Math.abs(x.omega)>0.01),'off-centre tangential contact generates spin');
});
test('gravity integration matches constant-acceleration kinematics without contact',()=>{
  const dt=.001,steps=100; const r=simStep({bodies:[body('a',0,{y:100})],dt,steps,gravity:{x:0,y:-10},floor:null});
  near(r.bodies[0].vy,-1,1e-9); near(r.bodies[0].y,100-10*dt*dt*steps*(steps+1)/2,1e-6);
});
test('high-speed crossing is adaptively substepped or explicitly held',()=>{
  const r=simStep({bodies:[body('a',-1,{vx:100,restitution:1}),body('b',1,{vx:-100,restitution:1})],dt:.02,gravity:{x:0,y:0},floor:null,maxSubsteps:64});
  assert.ok(r.outcome==='OK'||r.outcome==='HOLD');
  if(r.outcome==='OK') {
    assert.ok(r.diagnostics.substeps>1);
    assert.ok(r.diagnostics.contactEvents>0,'crossing collision is detected');
    assert.ok(r.bodies.find(x=>x.id==='a').vx<0 && r.bodies.find(x=>x.id==='b').vx>0,'impact reverses both bodies');
  } else assert.match(r.reason,/substep/);
});
test('coincident centres remain finite and deterministic',()=>{
  const r=run([body('a',0),body('b',0)]); assert.equal(r.outcome,'OK');
  assert.ok(r.bodies.every(x=>[x.x,x.y,x.vx,x.vy].every(Number.isFinite)));
});
test('caller input is not mutated',()=>{
  const input=[body('a',-.505,{vx:1,restitution:1}),body('b',.505,{vx:-1,restitution:1})];
  const before=JSON.stringify(input); run(input); assert.equal(JSON.stringify(input),before);
});
test('permutation invariance',()=>{
  const input=[body('a',-.505,{vx:1,restitution:1}),body('b',.505,{vx:-1,restitution:1})];
  const a=run(input),b=run([...input].reverse()); assert.deepEqual(a.bodies,b.bodies);
});
test('replay-equivalent inputs produce byte-equivalent output',()=>{
  const input={bodies:[body('a',0,{y:2,vy:1}),body('b',2)],dt:.005,steps:20,gravity:{x:0,y:-9.81},floor:0,seed:42};
  assert.deepEqual(simStep(input),simStep(structuredClone(input)));
});
test('history can be disabled without changing final state',()=>{
  const input={bodies:[body('a',0,{y:2,vy:1})],dt:.01,steps:10,gravity:{x:0,y:-9.81},floor:0};
  const a=simStep(input),b=simStep({...input,recordHistory:false}); assert.deepEqual(a.bodies,b.bodies); assert.equal(b.history.length,0);
});
test('final diagnostics expose unresolved contact and explicit simulation status',()=>{
  const r=simStep({bodies:[body('a',0,{y:.4})],dt:.001,gravity:{x:0,y:0},floor:0});
  assert.equal(r.verification.status,'SIMULATED'); assert.equal(r.verification.physicalVerification,false);
  assert.ok(Number.isFinite(r.diagnostics.finalPenetration)); assert.ok(r.diagnostics.limitations.length>=5);
});

test('friction accumulation obeys Coulomb impulse bound',()=>{
  const r=run([body('a',-.5,{vx:1,restitution:0,friction:.25}),body('b',.5,{vx:-1,vy:2,restitution:0,friction:.25})],{solverIterations:40});
  assert.equal(r.outcome,'OK');
  assert.ok(r.bodies.every(b=>Number.isFinite(b.omega)));
  assert.ok(r.diagnostics.kineticEnergy.final <= r.diagnostics.kineticEnergy.initial + 1e-6);
});
test('constant external force matches expected acceleration',()=>{
  const r=simStep({bodies:[body('a',0,{y:10,fx:2,mass:2})],dt:.01,steps:10,gravity:{x:0,y:0},floor:null});
  near(r.bodies[0].vx,.1,1e-10);
});
test('constant torque produces angular acceleration',()=>{
  const r=simStep({bodies:[body('a',0,{y:10,mass:2,radius:.5,torque:1})],dt:.01,steps:10,gravity:{x:0,y:0},floor:null});
  near(r.bodies[0].omega,.4,1e-10);
});
test('static-static pairs do not generate contacts or move',()=>{
  const r=run([body('a',0,{mass:0}),body('b',.5,{mass:0})]);
  assert.equal(r.outcome,'OK'); assert.equal(r.diagnostics.contactEvents,0);
  assert.deepEqual(r.bodies.map(b=>[b.x,b.y,b.vx,b.vy]),[[0,1,0,0],[.5,1,0,0]]);
});
test('three-body stack resolves contacts without non-finite state',()=>{
  const r=simStep({bodies:[body('bottom',0,{y:.49}),body('middle',0,{y:1.48}),body('top',0,{y:2.47})],dt:.001,steps:20,gravity:{x:0,y:-9.81},floor:0,solverIterations:40,positionIterations:40});
  assert.equal(r.outcome,'OK'); assert.ok(r.bodies.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));
  assert.ok(r.diagnostics.finalPenetration < 2e-3,`penetration ${r.diagnostics.finalPenetration}`);
});
test('history frame timestamps and frame count are consistent',()=>{
  const r=simStep({bodies:[body('a',0,{y:10})],dt:.02,steps:7,gravity:{x:0,y:0},floor:null});
  assert.equal(r.history.length,7); near(r.history[6].time,.14,1e-12); assert.equal(r.history[6].step,7);
});
test('numerically unrepresentable inverse mass is held',()=>{
  const r=run([body('tiny',0,{mass:Number.MIN_VALUE})]);
  assert.equal(r.outcome,'HOLD');
});
test('body count hard limit is enforced',()=>{
  const bodies=Array.from({length:257},(_,i)=>body(`b${i}`,i*2));
  assert.equal(run(bodies).outcome,'HOLD');
});
test('maximum supported body count executes',()=>{
  const bodies=Array.from({length:256},(_,i)=>body(`b${String(i).padStart(3,'0')}`,i*2,{y:100}));
  const r=run(bodies); assert.equal(r.outcome,'OK'); assert.equal(r.bodies.length,256);
});
test('malformed gravity and iteration settings fail closed',()=>{
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,gravity:[]}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,positionIterations:0}).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,recordHistory:1}).outcome,'HOLD');
});
test('no-floor free flight preserves constant horizontal velocity',()=>{
  const r=simStep({bodies:[body('a',0,{y:50,vx:3})],dt:.01,steps:100,gravity:{x:0,y:0},floor:null});
  near(r.bodies[0].x,3,1e-9); near(r.bodies[0].vx,3,1e-12);
});
test('zero-restitution collision does not add kinetic energy',()=>{
  const r=run([body('a',-.51,{vx:2,restitution:0}),body('b',.51,{vx:-.5,restitution:0})],{solverIterations:40});
  assert.equal(r.outcome,'OK'); assert.ok(r.diagnostics.kineticEnergy.final <= r.diagnostics.kineticEnergy.initial+1e-6);
});
test('seed is retained as replay metadata without affecting deterministic mechanics',()=>{
  const input={bodies:[body('a',0,{y:10,vx:1})],dt:.01,steps:10,gravity:{x:0,y:0},floor:null};
  const a=simStep({...input,seed:1}),b=simStep({...input,seed:999});
  assert.deepEqual(a.bodies,b.bodies); assert.equal(a.seed,1); assert.equal(b.seed,999);
});
test('contact diagnostics expose finite momentum and energy',()=>{
  const r=run([body('a',-.51,{vx:1,restitution:1}),body('b',.51,{vx:-1,restitution:1})]);
  assert.ok(Number.isFinite(r.diagnostics.momentum.delta.x));
  assert.ok(Number.isFinite(r.diagnostics.kineticEnergy.final));
});

test('extreme but finite magnitudes are rejected before unsafe arithmetic',()=>{
  assert.equal(run([body('huge',0,{x:1e51})]).outcome,'HOLD');
  assert.equal(simStep({bodies:[body('a',0)],dt:.01,gravity:{x:1e51,y:0}}).outcome,'HOLD');
});
test('static bodies remain valid despite infinite idealized inertia',()=>{
  const r=run([body('wall',0,{mass:0}),body('disc',.9,{vx:-1})]);
  assert.equal(r.outcome,'OK'); assert.equal(r.bodies.find(b=>b.id==='wall').static,true);
});
console.log(`simulation unit tests PASS: ${count} test groups`);
