/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
import { createRapier2DSession } from './backends/rapier2d-session.js';

/**
 * Async factory for the synchronous Iteration 47 SimComponent.step(ctx) contract.
 * WASM initialization occurs before registration; each subsequent platform tick
 * advances the persistent engine world synchronously. The canonical Simulator,
 * scheduler, replay recorder and telemetry recorder remain platform-owned.
 */
export async function createRapierSimulationComponent(SimComponentBase, def={}, options={}) {
  if(typeof SimComponentBase!=='function')throw new TypeError('SimComponentBase constructor required');
  const initial=structuredClone(def.state?.bodies??[]);
  const params={gravity:{x:0,y:-9.81},floor:0,solverIterations:16,modelVersion:'unversioned',...(def.params??{})};
  const session=await createRapier2DSession({bodies:initial,gravity:params.gravity,floor:params.floor,solverIterations:params.solverIterations},options);
  class RapierSimulationComponent extends SimComponentBase {
    constructor(){super({...def,name:def.name??'Rapier 2D simulation',state:{...(def.state??{}),bodies:initial},params});this.session=session;this.params={...params,...this.params};}
    step(ctx){
      const result=this.session.step(ctx.dt);this.outputs.simulation=result;this.outputs.status=result.outcome;this.outputs.modelVersion=this.params.modelVersion;
      if(result.outcome==='OK'){
        this.state.bodies=result.bodies;this.state.lastOutcome='OK';
        for(const [metric,value,unit] of [['simulation.body_count',result.bodies.length,'count'],['simulation.contact_events',result.diagnostics.contactStartEvents,'count']])
          ctx.telemetry.push({time:ctx.time,source:this.id,metric,value,unit});
        ctx.events.push({type:'simulation:completed',source:this.id,time:ctx.time,payload:{backend:'rapier2d',modelVersion:this.params.modelVersion,step:result.diagnostics.step}});
      }else{this.state.lastOutcome='HOLD';ctx.events.push({type:'simulation:held',source:this.id,time:ctx.time,payload:{reason:result.reason,backend:'rapier2d'}});}
      return result;
    }
    dispose(){this.session.dispose();}
  }
  return new RapierSimulationComponent();
}
