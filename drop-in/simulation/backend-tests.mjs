/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
import assert from 'node:assert/strict';
import { createSimulationBackends, createRemoteBackend, createExternalEngineBackend, EXTERNAL_ENGINE_PROFILES } from './backends/index.js';
import { simStepWithBackend } from './module.js';

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const body = (id, x, extra = {}) => ({ id, x, y:2, vx:0, vy:0, mass:1, radius:.5, ...extra });

class FakeBody {
  constructor(desc) { this.p={x:desc.p.x,y:desc.p.y}; this.v={x:desc.v.x,y:desc.v.y}; this.r=desc.r; this.w=desc.w; this.fixed=desc.fixed; this.force={x:0,y:0}; this.torque=0; }
  setForce(f) { this.force=f; }
  addForce(f) { this.force.x+=f.x; this.force.y+=f.y; }
  addTorque(t) { this.torque+=t; }
  translation(){return this.p;} linvel(){return this.v;} rotation(){return this.r;} angvel(){return this.w;}
}
function fakeRapier() {
  class Desc {
    constructor(fixed=false){this.fixed=fixed;this.p={x:0,y:0};this.v={x:0,y:0};this.r=0;this.w=0;}
    setTranslation(x,y){this.p={x,y};return this;} setRotation(r){this.r=r;return this;}
    setLinvel(x,y){this.v={x,y};return this;} setAngvel(w){this.w=w;return this;}
  }
  class World {
    constructor(g){this.g=g;this.bodies=[];this.integrationParameters={};}
    createRigidBody(d){const b=new FakeBody(d);this.bodies.push(b);return b;}
    createCollider(){return {};}
    step(q){for(const b of this.bodies)if(!b.fixed){b.v.x+=(this.g.x+b.force.x)*this.timestep;b.v.y+=(this.g.y+b.force.y)*this.timestep;b.p.x+=b.v.x*this.timestep;b.p.y+=b.v.y*this.timestep;b.w+=b.torque*this.timestep;b.r+=b.w*this.timestep;b.force={x:0,y:0};b.torque=0;}q?.drainCollisionEvents?.(()=>{});}
    free(){this.freed=true;}
  }
  class EventQueue { constructor(){} drainCollisionEvents(){} free(){} }
  class Collider { static ball(r){return new Collider(r);} static cuboid(x,y){return new Collider({x,y});}
    setRestitution(){return this;} setFriction(){return this;} setDensity(){return this;} setActiveEvents(){return this;} }
  return { init:async()=>{}, World, EventQueue, ActiveEvents:{COLLISION_EVENTS:1},
    RigidBodyDesc:{dynamic:()=>new Desc(false),fixed:()=>new Desc(true)}, ColliderDesc:Collider, version:()=> 'fake-1.0' };
}

await test('default native backend remains backwards compatible', async()=>{
  const r=await simStepWithBackend({bodies:[body('a',0)],dt:.001,gravity:{x:0,y:0},floor:null});
  assert.equal(r.outcome,'OK'); assert.equal(r.fidelity,'L3_PLANAR_RIGID_DISC_CONTACT');
});
await test('explicit unregistered backend fails closed without native fallback', async()=>{
  const registry=createSimulationBackends({includeRapier:false});
  const r=await simStepWithBackend({bodies:[body('a',0)],dt:.001},{backend:'not-installed',registry});
  assert.equal(r.outcome,'HOLD'); assert.match(r.reason,/not registered/);
});
await test('Rapier adapter maps state, gravity, force, torque, and metadata', async()=>{
  const registry=createSimulationBackends({rapierModuleLoader:async()=>fakeRapier()});
  const r=await simStepWithBackend({bodies:[body('a',0,{fx:2,torque:1})],dt:.1,steps:2,gravity:{x:0,y:-10},floor:null},
    {backend:'rapier2d',registry});
  assert.equal(r.outcome,'OK'); assert.equal(r.backend.id,'rapier2d');
  assert.equal(r.diagnostics.engineVersion,'fake-1.0');
  assert.ok(r.bodies[0].x>0); assert.ok(r.bodies[0].omega>0); assert.equal(r.verification.physicalVerification,false);
});
await test('Rapier optional dependency missing produces actionable HOLD', async()=>{
  const registry=createSimulationBackends({rapierModuleLoader:async()=>{const e=new Error("Cannot find package '@dimforge/rapier2d-compat'");e.code='ERR_MODULE_NOT_FOUND';throw e;}});
  const r=await simStepWithBackend({bodies:[body('a',0)],dt:.01},{backend:'rapier2d',registry});
  assert.equal(r.outcome,'HOLD'); assert.match(r.reason,/optional dependency/);
});
await test('Rapier rejects malformed input before loading engine', async()=>{
  let loaded=false; const registry=createSimulationBackends({rapierModuleLoader:async()=>{loaded=true;return fakeRapier();}});
  const r=await simStepWithBackend({bodies:[body('a',0,{mass:NaN})],dt:.01},{backend:'rapier2d',registry});
  assert.equal(r.outcome,'HOLD'); assert.equal(loaded,false);
});
await test('remote backend uses JSON-RPC handshake and preserves engine identity', async()=>{
  const calls=[];
  const transport={request:async(req)=>{calls.push(req);return {jsonrpc:'2.0',id:req.id,result:req.method==='simulation.backend.hello'?{protocolVersion:'1.0',engine:'test-engine',ready:true}:{schemaVersion:'1.0',result:{outcome:'OK',bodies:[{id:'x',x:0,y:0,vx:0,vy:0,angle:0,omega:0}]}}};}};
  const registry=createSimulationBackends({includeRapier:false,remote:[{id:'test.remote',engine:'test-engine',transport}]});
  const r=await registry.execute('test.remote',{scene:{}});
  assert.equal(r.outcome,'OK'); assert.equal(r.backend.id,'test.remote'); assert.deepEqual(calls.map(x=>x.method),['simulation.backend.hello','simulation.run']);
});
await test('remote handshake mismatch fails closed', async()=>{
  const transport={request:async(req)=>({jsonrpc:'2.0',id:req.id,result:{protocolVersion:'99',engine:'wrong',ready:true}})};
  const registry=createSimulationBackends({includeRapier:false,remote:[{id:'test.bad',engine:'expected',transport}]});
  const r=await registry.execute('test.bad',{}); assert.equal(r.outcome,'HOLD'); assert.match(r.reason,/handshake mismatch/);
});
await test('remote JSON-RPC response id mismatch fails closed', async()=>{
  const transport={request:async(req)=>({jsonrpc:'2.0',id:req.id+10,result:{protocolVersion:'1.0',engine:'test',ready:true}})};
  const registry=createSimulationBackends({includeRapier:false,remote:[{id:'test.id',engine:'test',transport}]});
  const r=await registry.execute('test.id',{}); assert.equal(r.outcome,'HOLD'); assert.match(r.reason,/Invalid JSON-RPC/);
});
await test('remote result rejects non-finite physical state', async()=>{
  const transport={request:async(req)=>({jsonrpc:'2.0',id:req.id,result:req.method.endsWith('.hello')?{protocolVersion:'1.0',engine:'bad',ready:true}:{schemaVersion:'1.0',result:{outcome:'OK',bodies:[{id:'x',x:NaN,y:0,vx:0,vy:0,angle:0,omega:0}]}}})};
  const registry=createSimulationBackends({includeRapier:false,remote:[{id:'test.nan',engine:'bad',transport}]});
  const r=await registry.execute('test.nan',{}); assert.equal(r.outcome,'HOLD'); assert.match(r.reason,/malformed or non-finite/);
});
await test('capability resolver chooses a declared compatible backend only', async()=>{
  const registry=createSimulationBackends({rapierModuleLoader:async()=>fakeRapier(),remote:[{profile:'chrono',transport:{request:async req=>({jsonrpc:'2.0',id:req.id,result:{protocolVersion:'1.0',engine:'project-chrono',ready:true}})}}]});
  assert.equal(registry.resolve({requiredCapabilities:['fea']}).id,'chrono');
  assert.equal(registry.resolve({requiredCapabilities:['unsupported-feature']}),null);
});
await test('Drake and DART profiles expose distinct articulated/optimization methods', async()=>{
  const t={request:async req=>({jsonrpc:'2.0',id:req.id,result:{protocolVersion:'1.0',engine:req.params.engine,ready:true}})};
  const drake=createExternalEngineBackend('drake',{transport:t});const dart=createExternalEngineBackend('dart',{transport:t});
  assert.ok(drake.capabilities.includes('optimization'));assert.ok(drake.capabilities.includes('multibody'));
  assert.ok(dart.capabilities.includes('featherstone-aba'));assert.ok(dart.capabilities.includes('lcp-contact'));
});
await test('backend catalog exposes all named engine profiles without claiming installation', async()=>{
  for(const id of ['mujoco','chrono','ode','bullet','physx','jolt','drake','dart'])assert.ok(EXTERNAL_ENGINE_PROFILES[id],`missing profile ${id}`);
});
await test('named Chrono profile exposes capabilities and requires an explicit host', async()=>{
  assert.throws(()=>createExternalEngineBackend('chrono',{}),/transport is required/);
  const backend=createExternalEngineBackend('chrono',{transport:{request:async req=>({jsonrpc:'2.0',id:req.id,result:{protocolVersion:'1.0',engine:'project-chrono',ready:true}})}});
  assert.equal(backend.id,'chrono');assert.ok(backend.capabilities.includes('fea'));assert.equal(backend.license,'BSD-3-Clause');
});
await test('remote backend enforces timeout even if host ignores AbortSignal', async()=>{
  const transport={request:()=>new Promise(()=>{})};
  const registry=createSimulationBackends({includeRapier:false,remote:[{id:'test.timeout',engine:'test',transport,timeoutMs:5}]});
  const r=await registry.execute('test.timeout',{});assert.equal(r.outcome,'HOLD');assert.match(r.reason,/timeout/);
});
await test('registry rejects duplicate backend registration', async()=>{
  const registry=createSimulationBackends({includeRapier:false});
  registry.register({id:'x.backend',run:async()=>({outcome:'HOLD'})});
  assert.throws(()=>registry.register({id:'x.backend',run:async()=>({outcome:'HOLD'})}),/already registered/);
});
console.log(`\n${passed}/${passed} backend tests passed`);
