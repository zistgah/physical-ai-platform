/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/contracts.js
 * FILE PURPOSE: Port and component contracts. Validates typed ports, units, and connection compatibility.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
const TYPES=new Set(["physical","electrical","thermal","fluid","optical","acoustic","data","command","state","event","clock","time","config","diagnostics","power","safety"]);
/** port: Port and component contracts. Validates typed ports, units, and connection compatibility. */
export function port(id,{direction="in",type="data",unit=null,rateHz=null,required=false,multiplicity="one",schema=null,frame=null,domain=null,safetyClass=null,authority=null}={}){
  if(!TYPES.has(type)) throw new Error(`Unknown port type: ${type}`);
  if(!["in","out","inout"].includes(direction)) throw new Error(`Invalid port direction: ${direction}`);
  return {id,direction,type,unit,rateHz,required,multiplicity,schema,frame,domain,safetyClass,authority};
}
/** validatePortConnection: Port and component contracts. Validates typed ports, units, and connection compatibility. */
export function validatePortConnection(a,b,{allowAdapter=false}={}){
  if(!a || !b) return "missing port";
  if(a.direction==="out" && !["in","inout"].includes(b.direction)) return "source/target direction mismatch";
  if(b.direction==="out" && !["in","inout"].includes(a.direction)) return "target/source direction mismatch";
  if(a.type!==b.type) return `port type mismatch: ${a.type} -> ${b.type}`;
  if(a.unit && b.unit && a.unit!==b.unit) return `unit mismatch: ${a.unit} != ${b.unit}`;
  if(a.frame && b.frame && a.frame!==b.frame) return `frame mismatch: ${a.frame} != ${b.frame}`;
  if(a.domain && b.domain && a.domain!==b.domain) return `domain mismatch: ${a.domain} != ${b.domain}`;
  if(a.safetyClass && b.safetyClass && a.safetyClass !== b.safetyClass && !allowAdapter) return `safety class mismatch`;
  if(a.authority && b.authority && a.authority !== b.authority) return `authority mismatch`;
  return null;
}
/** componentContract: Port and component contracts. Validates typed ports, units, and connection compatibility. */
export function componentContract(def={}){
  return {
    id:def.id, type:def.type||"Component", version:def.version||"1.0.0",
    interfaceVersion:def.interfaceVersion||"1.0.0",
    capabilities:[...(def.capabilities||[])],
    ports:Object.fromEntries((def.ports||[]).map(p=>[p.id,p])),
    parameters:def.parameters||{}, states:def.states||{}, events:def.events||{},
    dependencies:def.dependencies||[], safety:def.safety||{}, compliance:def.compliance||{},
    simulation:def.simulation||null, manufacturing:def.manufacturing||null,
    provenance:def.provenance||null, substitutions:def.substitutions||[],
    units:def.units||{}, frames:def.frames||{}, rates:def.rates||{}, timing:def.timing||{},
    resources:def.resources||{}, authority:def.authority||{}, compatibility:def.compatibility||{}
  };
}
