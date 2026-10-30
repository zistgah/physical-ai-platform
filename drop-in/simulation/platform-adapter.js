/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { simStep } from './module.js';

/**
 * Dependency-injected adapter for the platform's SimComponent contract.
 * Pass the platform SimComponent constructor; this module does not import or
 * modify the canonical kernel. State contract: state.bodies is the solver input.
 * Params: gravity, floor, solverIterations, maxSubsteps, seed, modelVersion.
 */
export function createSimulationComponent(SimComponentBase) {
  if (typeof SimComponentBase !== 'function') throw new TypeError('SimComponentBase constructor is required');
  return class RigidDiscSimulationComponent extends SimComponentBase {
    constructor(def = {}) {
      super({ name: 'Rigid-disc simulation', ...def });
      this.params = { gravity:{x:0,y:-9.81}, floor:0, solverIterations:16, positionIterations:20,
        maxSubsteps:64, seed:1, modelVersion:'unversioned', ...(this.params || {}), ...(def.params || {}) };
      this.state = { ...(this.state || {}), bodies:structuredClone(def.state?.bodies ?? this.state?.bodies ?? []) };
      this.outputs = this.outputs || {};
    }
    step(ctx) {
      const result = simStep({ bodies:this.state.bodies, dt:ctx.dt, steps:1,
        gravity:this.params.gravity, floor:this.params.floor,
        solverIterations:this.params.solverIterations, positionIterations:this.params.positionIterations,
        maxSubsteps:this.params.maxSubsteps,
        seed:this.params.seed, recordHistory:false });
      this.outputs.simulation = result;
      this.outputs.status = result.outcome;
      this.outputs.modelVersion = this.params.modelVersion;
      if (result.outcome === 'OK') {
        this.state.bodies = result.bodies;
        this.state.lastOutcome = 'OK';
        const metrics = [
          ['simulation.body_count', result.diagnostics.bodyCount, 'count'],
          ['simulation.contact_events', result.diagnostics.contactEvents, 'count'],
          ['simulation.substeps', result.diagnostics.substeps, 'count'],
          ['simulation.max_penetration', result.diagnostics.maxDetectedPenetration, 'm'],
          ['simulation.final_penetration', result.diagnostics.finalPenetration, 'm']
        ];
        for (const [metric,value,unit] of metrics) ctx.telemetry.push({time:ctx.time,source:this.id,metric,value,unit});
        ctx.events.push({type:'simulation:completed',source:this.id,time:ctx.time,
          payload:{modelVersion:this.params.modelVersion,bodyCount:result.diagnostics.bodyCount,
            contacts:result.diagnostics.contactEvents,substeps:result.diagnostics.substeps}});
      } else {
        this.state.lastOutcome = 'HOLD';
        ctx.events.push({type:'simulation:held',source:this.id,time:ctx.time,
          payload:{reason:result.reason,modelVersion:this.params.modelVersion}});
      }
      return result;
    }
  };
}
