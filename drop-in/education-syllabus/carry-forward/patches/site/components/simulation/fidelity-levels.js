/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fidelity-levels.js
 * FILE PURPOSE: Evidence-gated fidelity level claims.
 */
/** Fidelity claims reference existing accepted, subject- and configuration-bound evidence. Claims do not create evidence. */
export const LEVELS=['L0','L1','L2','L3','L4','L5','L6','L7'];
const METHODS={L0:'CONCEPTUAL_REVIEW',L1:'SIMULATION',L2:'KINEMATIC_TEST',L3:'DYNAMIC_TEST',L4:'PHYSICS_TEST',L5:'HIL',L6:'PHYSICAL_TEST',L7:'FIELD_TEST'};
const ACCEPTED=new Set(['VERIFIED','ACCEPTED','PROMOTED']);
export class FidelityLevels {
 constructor(kernel){this.kernel=kernel;this.rank=new Map();}
 claim(projectId,subjectId,level,configurationId){const idx=LEVELS.indexOf(level);if(idx<0||!projectId||!subjectId||!configurationId)return {outcome:'HOLD',reason:'Project, subject and valid fidelity level are required'};const graph=this.kernel.getProjectGraph(projectId),evidence=graph.entities.filter(e=>e.type==='Evidence'&&e.subject===subjectId&&e.configurationId===configurationId&&ACCEPTED.has(e.state));
  for(let i=0;i<=idx;i++){const required=LEVELS[i],found=evidence.find(e=>e.level===required&&e.method===METHODS[required]);if(!found)return {outcome:'HOLD',reason:`${required} requires pre-existing accepted evidence for this subject/configuration`,missingLevel:required};if(required==='L5'&&found.hardwareAttested!==true)return {outcome:'HOLD',reason:'L5 requires hardware-attested HIL evidence'};if(required==='L6'&&found.method!=='PHYSICAL_TEST')return {outcome:'HOLD',reason:'L6 requires physical-test evidence'};if(required==='L7'&&found.method!=='FIELD_TEST')return {outcome:'HOLD',reason:'L7 requires field evidence'};}
  this.rank.set(subjectId,Math.max(this.rank.get(subjectId)??-1,idx));const target=evidence.find(e=>e.level===level&&e.method===METHODS[level]);return {outcome:'OK',level,evidenceId:target.id,method:target.method,state:target.state};}
}
