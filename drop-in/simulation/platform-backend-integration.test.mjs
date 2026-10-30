/** Run after extracting to drop-in/simulation inside the Iteration 47 platform. */
import assert from 'node:assert/strict';
import { SimComponent, Simulator } from '../../site/components/simulation/simulator.js';
import { createRapierSimulationComponent } from './platform-rapier-adapter.js';

class FakeBody {
  constructor(d){this.p={...d.p};this.v={...d.v};this.r=d.r;this.w=d.w;this.fixed=d.fixed;this.force={x:0,y:0};this.torque=0;}
  addForce(f){this.force.x+=f.x;this.force.y+=f.y;} addTorque(t){this.torque+=t;}
  translation(){return this.p;}linvel(){return this.v;}rotation(){return this.r;}angvel(){return this.w;}
}
function fakeRapier(){
  class Desc{constructor(fixed=false){this.fixed=fixed;this.p={x:0,y:0};this.v={x:0,y:0};this.r=0;this.w=0;}
    setTranslation(x,y){this.p={x,y};return this;}setRotation(r){this.r=r;return this;}setLinvel(x,y){this.v={x,y};return this;}setAngvel(w){this.w=w;return this;}}
  class Collider{static ball(){return new Collider();}static cuboid(){return new Collider();}setRestitution(){return this;}setFriction(){return this;}setDensity(){return this;}setActiveEvents(){return this;}}
  class World{constructor(g){this.g=g;this.bodies=[];this.integrationParameters={};}createRigidBody(d){const b=new FakeBody(d);this.bodies.push(b);return b;}createCollider(){return{};}
    step(){for(const b of this.bodies)if(!b.fixed){b.v.x+=(this.g.x+b.force.x)*this.timestep;b.v.y+=(this.g.y+b.force.y)*this.timestep;b.p.x+=b.v.x*this.timestep;b.p.y+=b.v.y*this.timestep;b.w+=b.torque*this.timestep;b.r+=b.w*this.timestep;b.force={x:0,y:0};b.torque=0;}}free(){}}
  class EventQueue{drainCollisionEvents(){}free(){}}
  return{init:async()=>{},World,EventQueue,ActiveEvents:{COLLISION_EVENTS:1},RigidBodyDesc:{dynamic:()=>new Desc(),fixed:()=>new Desc(true)},ColliderDesc:Collider,version:()=> 'test-double'};
}

const component=await createRapierSimulationComponent(SimComponent,{id:'rapier-platform',state:{bodies:[{id:'robot',x:0,y:2,vx:0,vy:0,mass:1,radius:.2}]},params:{gravity:{x:0,y:-10},floor:null,modelVersion:'model-v1'}},{moduleLoader:async()=>fakeRapier()});
const sim=new Simulator({dt:.1,seed:42});sim.add(component);sim.startReplay({scenario:'rapier-platform-e2e',backend:'rapier2d'});sim.run(3);
assert.equal(component.outputs.status,'OK');assert.equal(component.outputs.simulation.diagnostics.backend,'rapier2d');
assert.equal(component.state.bodies[0].vy,-3);assert.equal(sim.replayManifest().frameCount,3);
assert.ok(sim.telemetry.some(x=>x.metric==='simulation.body_count'));
assert.ok(sim.replayManifest().frames.every(f=>f.components.some(c=>c.id==='rapier-platform')));
const accepted=structuredClone(component.state.bodies),events=[],telemetry=[];
const held=component.step({dt:2,time:sim.time,events,telemetry});assert.equal(held.outcome,'HOLD');
assert.deepEqual(component.state.bodies,accepted);assert.equal(events[0].type,'simulation:held');component.dispose();
console.log('Rapier platform integration PASS: preinitialized WASM session, synchronous tick, state, replay, telemetry, HOLD and disposal');
