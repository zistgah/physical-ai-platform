/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/replay.js
 * FILE PURPOSE: Replay. Records and replays a seeded run. Same seed, same sequence.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class ReplayRecorder {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){this.reset();}
  /** reset: Performs reset for this module. */
  reset(){this.header=null;this.frames=[];}
  /** start: Enters the initial cockpit state. */
  start(header){this.header=structuredClone(header);this.frames=[];}
  /** record: Performs record for this module. */
  record(frame){if(!this.header)throw new Error("Replay not started");this.frames.push(structuredClone(frame));}
  /** manifest: Performs manifest for this module. */
  manifest(){return {header:structuredClone(this.header),frameCount:this.frames.length,frames:structuredClone(this.frames)};}
  /** verify: Performs verify for this module. */
  verify(other){
    return JSON.stringify(this.manifest())===JSON.stringify(other);
  }
}
