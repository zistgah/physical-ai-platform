/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fidelity-ladder.js
 * FILE PURPOSE: Fidelity artifact planning and external execution recording.
 */
/** Fidelity artifact preparation and externally executed run recording. Preparation never fabricates EXECUTED evidence. */
export class FidelityLadder {
 constructor(kernel){this.kernel=kernel;}
 run(projectId,{method='SIL',configurationId,subjectId,scenario={},executionRecord}={}){
  const allowed=['SIMULATION','SIL','HIL','PHIL','RIL'];if(!allowed.includes(method))return {outcome:'HOLD',reason:`Unsupported fidelity method ${method}`};
  if(!projectId||!configurationId||!subjectId)return {outcome:'HOLD',reason:'Project, configuration and subject identities are required'};
  const executed=!!executionRecord&&executionRecord.completed===true&&typeof executionRecord.runId==='string'&&executionRecord.runId.trim()&&executionRecord.configurationId===configurationId&&executionRecord.subjectId===subjectId&&typeof executionRecord.source==='string'&&executionRecord.source.trim();
  if(method==='HIL'&&executed&&(!executionRecord.deviceId||!executionRecord.bus||executionRecord.hardwareAttested!==true))return {outcome:'HOLD',reason:'HIL execution record requires device, bus and hardware attestation'};
  const id=`${method.toLowerCase()}_${Date.now().toString(36)}`,artifact=this.kernel.upsert({id:`art_${id}`,type:'Artifact',name:`${method} run ${executed?'record':'plan'}`,kind:`${method.toLowerCase()}-run`,configurationId,subjectId,scenario,executionRecord:executed?executionRecord:null,provenance:{origin:'fidelity-ladder',method,derivedFrom:configurationId,executionRunId:executed?executionRecord.runId:null}});
  const evidence=this.kernel.upsert({id:`evd_${id}`,type:'Evidence',name:`${method} ${executed?'execution record':'planned run'}`,state:executed?'EXECUTED':'PLANNED',method,subject:subjectId,configurationId,artifact:artifact.id,provenance:{origin:'fidelity-ladder',method,artifact:artifact.id,executionRunId:executed?executionRecord.runId:null,note:executed?'External execution record captured; not independently verified':'Planning artifact only; no execution occurred'}});
  this.kernel.link(projectId,'CONTAINS',artifact.id);this.kernel.link(projectId,'CONTAINS',evidence.id);
  return {outcome:executed?'RECORDED':'PLANNED',artifact,evidence};
 }
 importGeometryManifest(projectId,manifest){if(!manifest||!Array.isArray(manifest.components))return {outcome:'HOLD',reason:'Geometry manifest components are required'};const created=[];for(const item of manifest.components){if(!item?.id||!item.name)return {outcome:'HOLD',reason:'Each geometry component requires id and name'};const comp=this.kernel.upsert({id:item.id,type:'Component',name:item.name,version:item.version||'1.0.0',geometry:item.geometry||null,material:item.material||null,interfaces:item.interfaces||[],source:'CAD',provenance:{origin:'cad-geometry-import',derivedFrom:manifest.id||'manifest',note:'Manifest adapter; not a geometry kernel'}});this.kernel.link(projectId,'CONTAINS',item.id);created.push(comp);}return {outcome:'OK',imported:created.length,components:created};}
}
