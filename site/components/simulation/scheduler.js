/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/scheduler.js
 * FILE PURPOSE: Deterministic scheduler. Logical time advances only by the step.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class DeterministicScheduler {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor({dt=0.02}={}){this.dt=dt;this.time=0;this.queue=[];this.sequence=0;}
  /** schedule: Performs schedule for this module. */
  schedule(at,callback,meta={}){if(at<this.time)throw new Error("Cannot schedule in the past");const item={at,sequence:this.sequence++,callback,meta};this.queue.push(item);this.queue.sort((a,b)=>a.at-b.at||a.sequence-b.sequence);return item.sequence;}
  /** runUntil: Performs run until for this module. */
  runUntil(end){
    const executed=[];
    while(this.queue.length && this.queue[0].at<=end){
      const item=this.queue.shift();this.time=item.at;item.callback({time:this.time,dt:this.dt,meta:item.meta});executed.push(item);
    }
    this.time=end;return executed;
  }
}
