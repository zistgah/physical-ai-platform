/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/telemetry.js
 * FILE PURPOSE: Telemetry recorder. Captures the run for replay.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class TelemetryRecorder {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){this.streams=new Map();}
  /** sample: Performs sample for this module. */
  sample(stream,value,time){if(!this.streams.has(stream))this.streams.set(stream,[]);this.streams.get(stream).push({time,value:structuredClone(value)});}
  /** get: Returns one entity by id. */
  get(stream){return structuredClone(this.streams.get(stream)||[]);}
  /** snapshot: Performs snapshot for this module. */
  snapshot(){return Object.fromEntries([...this.streams].map(([k,v])=>[k,structuredClone(v)]));}
}
