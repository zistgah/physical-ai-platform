/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/mobile-robot.js
 * FILE PURPOSE: Mobile robot plant. Simple kinematic model for the functional simulation.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { SimComponent } from "./simulator.js";

export class Battery extends SimComponent {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(def={}){super({id:def.id,name:"Battery",state:{soc:def.soc??1,voltage:def.voltage??48},params:{capacityWh:def.capacityWh??500,...def.params}})}
  /** step: Performs step for this module. */
  step(ctx){
    const load=ctx.get(this.params.loadComponentId);
    const power=Math.max(0,load?.state?.powerW||0);
    this.state.soc=Math.max(0,this.state.soc-power*ctx.dt/3600/this.params.capacityWh);
    this.outputs.power={voltage:this.state.voltage,powerW:power};
    this.outputs.safety={low:this.state.soc<0.1,critical:this.state.soc<0.03};
    ctx.telemetry.push({time:ctx.time,id:this.id,soc:this.state.soc,powerW:power});
  }
}

export class Motor extends SimComponent {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(def={}){super({id:def.id,name:"Drive Motor",state:{speed:0,position:0,powerW:0},params:{maxSpeed:def.maxSpeed??3,maxAccel:def.maxAccel??1,maxPowerW:def.maxPowerW??400}})}
  /** step: Performs step for this module. */
  step(ctx){
    const command=this.inputs.command||0;
    const fault=ctx.faults.some(f=>f.target===this.id || (f.type==="EMERGENCY_STOP" && !f.target));
    const target=fault ? 0 : Math.max(-1,Math.min(1,command))*this.params.maxSpeed;
    const delta=Math.max(-this.params.maxAccel*ctx.dt,Math.min(this.params.maxAccel*ctx.dt,target-this.state.speed));
    this.state.speed+=delta;this.state.position+=this.state.speed*ctx.dt;
    this.state.powerW=Math.abs(this.state.speed)*100;
    this.outputs.speed=this.state.speed;this.outputs.position=this.state.position;
  }
}

export class Controller extends SimComponent {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(def={}){super({id:def.id,name:"Motion Controller",state:{command:0},params:{targetSpeed:def.targetSpeed??1}})}
  /** step: Performs step for this module. */
  step(ctx){
    const stop=ctx.faults.some(f=>f.type==="EMERGENCY_STOP");
    const battery=ctx.get(this.params.batteryId);
    this.state.command=stop||battery?.state?.soc<0.03?0:Math.max(-1,Math.min(1,(this.params.targetSpeed-(ctx.get(this.params.motorId)?.state.speed||0))));
    this.outputs.command=this.state.command;
  }
}

export class EmergencyStop extends SimComponent {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(def={}){super({id:def.id,name:"Emergency Stop",state:{engaged:false}})}
  /** step: Performs step for this module. */
  step(ctx){
    this.state.engaged=ctx.faults.some(f=>f.type==="EMERGENCY_STOP");
    this.outputs.safety={engaged:this.state.engaged};
  }
}

/** createMobileRobotSimulation: Mobile robot plant. Simple kinematic model for the functional simulation. */
export function createMobileRobotSimulation(){
  const {Simulator}=Object.getPrototypeOf(this)?.constructor ? {} : {};
  const sim = new (globalThis.__PhysicalAISimulatorClass || (awaitImportSimulator()))();
  return sim;
}
function awaitImportSimulator(){throw new Error("Use createMobileRobotSimulation from scenario.js")}
