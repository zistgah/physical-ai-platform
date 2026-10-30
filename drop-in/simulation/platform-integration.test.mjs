/** Run from platform repository root after extracting this folder to drop-in/simulation. */
import assert from 'node:assert/strict';
import { SimComponent, Simulator } from '../../site/components/simulation/simulator.js';
import { createSimulationComponent } from './platform-adapter.js';
const DiscComponent=createSimulationComponent(SimComponent);
const sim=new Simulator({dt:.01,seed:77});
const plant=sim.add(new DiscComponent({id:'disc-plant',state:{bodies:[
  {id:'payload',x:0,y:1,vx:0,vy:0,mass:1,radius:.25,restitution:0,friction:.5}
]},params:{gravity:{x:0,y:-9.81},floor:0,modelVersion:'sample-v2'}}));
sim.startReplay({scenario:'simulation-drop-in-e2e',componentVersion:'sample-v2',algorithmVersion:'2.0.0'});
let scheduled=false;
sim.scheduler.schedule(0,()=>{scheduled=true;},{kind:'integration-smoke'});
sim.run(3);
assert.equal(scheduled,true,'platform scheduler event executes');
assert.equal(plant.outputs.status,'OK','drop-in solver invoked through SimComponent');
assert.equal(plant.outputs.simulation.algorithmVersion,'2.0.0','algorithm version exposed');
assert.equal(plant.outputs.simulation.verification.physicalVerification,false,'simulation is not physical verification');
assert.equal(plant.outputs.modelVersion,'sample-v2','model version propagated');
assert.equal(plant.state.bodies.length,1,'canonical component state updated');
assert.equal(sim.replayManifest().frameCount,3,'replay records every platform tick');
assert.ok(sim.telemetry.some(x=>x.metric==='simulation.body_count'),'telemetry metrics emitted');
assert.ok(sim.telemetry.some(x=>x.metric==='simulation.final_penetration'),'contact telemetry emitted');
assert.ok(sim.replayManifest().frames.every(f=>f.components.some(c=>c.id==='disc-plant')),'component state is replayed');

const held=new DiscComponent({id:'held-plant',state:{bodies:[
  {id:'preserve',x:0,y:2,vx:1,vy:0,mass:1,radius:.25}
]},params:{gravity:{x:0,y:-9.81},floor:0,modelVersion:'held-v1'}});
const holdSim=new Simulator({dt:.01});holdSim.add(held);
const lastAccepted=structuredClone(held.state.bodies);
held.params.gravity={x:NaN,y:0};
holdSim.step();
assert.equal(held.outputs.status,'HOLD','invalid solver input remains HOLD');
assert.equal(held.state.lastOutcome,'HOLD','HOLD state retained');
assert.deepEqual(held.state.bodies,lastAccepted,'last accepted body state is not overwritten on HOLD');
assert.ok(holdSim.events.some(e=>e.type==='simulation:held'),'HOLD event emitted');
console.log('platform integration PASS: scheduler, component state, replay, telemetry, events, algorithm provenance, and HOLD preservation');
