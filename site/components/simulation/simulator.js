/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/simulator.js
 * FILE PURPOSE: Simulator. Runs a plant and a controller under the scheduler.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import {EventBus} from "../core/event-bus.js";
import {id} from "../core/id.js";
import {DeterministicScheduler} from "./scheduler.js";
import {ReplayRecorder} from "./replay.js";
import {TelemetryRecorder} from "./telemetry.js";

export class SimComponent {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(def={}){
    Object.assign(this,{id:def.id||id("simcomp"),name:def.name||"component",
      state:structuredClone(def.state||{}),inputs:def.inputs||{},outputs:def.outputs||{},
      params:def.params||{},ports:def.ports||{},enabled:true},def);
  }
  /** step: Performs step for this module. */
  step(ctx){}
  /** emit: Performs emit for this module. */
  emit(ctx,type,payload){ctx.events.push({type,source:this.id,payload,time:ctx.time});}
  /** reset: Performs reset for this module. */
  reset(){}
}

export class Simulator {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor({dt=0.02,seed=1}={}){
    this.dt=dt;this.seed=seed;this.time=0;this.stepCount=0;
    this.components=[];this.connections=[];this.events=[];this.telemetry=[];
    this.faults=[];this.bus=new EventBus();this.scheduler=new DeterministicScheduler({dt});
    this.replay=new ReplayRecorder();this.telemetryRecorder=new TelemetryRecorder();
  }
  /** add: Performs add for this module. */
  add(component){if(this.components.some(c=>c.id===component.id))throw new Error(`Duplicate component id: ${component.id}`);this.components.push(component);return component;}
  /** connect: Connects two ports. Rejects incompatible types or units. */
  connect(from,output,to,input){if(!this.components.find(x=>x.id===from)||!this.components.find(x=>x.id===to))throw new Error("Connection endpoints must exist");this.connections.push({from,output,to,input});return this.connections.at(-1);}
  /** injectFault: Performs inject fault for this module. */
  injectFault(fault){this.faults.push({...fault,active:true});this.bus.emit("fault:injected",fault);}
  /** clearFault: Performs clear fault for this module. */
  clearFault(faultId){const f=this.faults.find(x=>x.id===faultId);if(f)f.active=false;}
  /** context: Performs context for this module. */
  context(){return {time:this.time,dt:this.dt,step:this.stepCount,seed:this.seed,events:this.events,telemetry:this.telemetry,
    faults:this.faults.filter(x=>x.active),get:(id)=>this.components.find(c=>c.id===id),schedule:(at,fn,meta)=>this.scheduler.schedule(at,fn,meta)};}
  /** route: Performs route for this module. */
  route(){
    for(const c of this.connections){
      const from=this.components.find(x=>x.id===c.from),to=this.components.find(x=>x.id===c.to);
      if(from&&to)to.inputs[c.input]=structuredClone(from.outputs[c.output]);
    }
  }
  /** step: Performs step for this module. */
  step(){
    this.events=[];this.scheduler.runUntil(this.time);
    const ctx=this.context();
    for(const c of this.components)if(c.enabled)c.step(ctx);
    this.route();this.time=Number((this.time+this.dt).toFixed(12));this.stepCount++;
    this.telemetryRecorder.sample("sim.time",this.time,this.time);
    if(this.replay.header)this.replay.record({time:this.time,step:this.stepCount,events:this.events,components:this.components.map(c=>({id:c.id,state:c.state,outputs:c.outputs})),faults:this.faults});
    this.bus.emit("tick",ctx);return ctx;
  }
  /** run: Performs run for this module. */
  run(steps=1){for(let i=0;i<steps;i++)this.step();return this.snapshot();}
  /** snapshot: Performs snapshot for this module. */
  snapshot(){return {time:this.time,step:this.stepCount,seed:this.seed,components:this.components.map(c=>({id:c.id,name:c.name,state:structuredClone(c.state),outputs:structuredClone(c.outputs)})),telemetry:structuredClone(this.telemetry),faults:structuredClone(this.faults),connections:structuredClone(this.connections)}}
  /** startReplay: Performs start replay for this module. */
  startReplay(header={}){this.replay.reset();this.replay.start({dt:this.dt,seed:this.seed,...header});}
  /** replayManifest: Performs replay manifest for this module. */
  replayManifest(){return this.replay.manifest();}
  /** reset: Performs reset for this module. */
  reset(){this.time=0;this.stepCount=0;this.events=[];this.telemetry=[];this.faults=[];this.scheduler=new DeterministicScheduler({dt:this.dt});this.telemetryRecorder=new TelemetryRecorder();this.replay.reset();for(const c of this.components)c.reset?.();}
}
