/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/cost-model.js
 * FILE PURPOSE: Declared cost model; unknown values remain UNSPECIFIED.
 */
/** Declared-cost rollup. Unknown values remain UNSPECIFIED; complete totals are withheld until every required cost is declared. */
export class CostModel {
  constructor(kernel) { this.kernel = kernel; }
  rollup(projectId) {
    const graph=this.kernel.getProjectGraph(projectId);
    const components=graph.entities.filter(e=>e.type==='Component').sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const fields=['costMaterial','costProcess','costLabor'];
    const lines=components.map(c=>{const line={id:c.id,name:c.name};for(const f of fields)if(typeof c[f]==='number'&&Number.isFinite(c[f])&&c[f]>=0)line[f]=c[f];line.undeclared=fields.filter(f=>!(f in line));return line;});
    const undeclared=lines.flatMap(l=>l.undeclared.map(field=>({componentId:l.id,field,status:'UNSPECIFIED'})));
    const declaredSubtotal=lines.reduce((sum,l)=>sum+fields.reduce((s,f)=>s+(typeof l[f]==='number'?l[f]:0),0),0);
    return {projectId,lines,total:undeclared.length?null:declaredSubtotal,declaredSubtotal,complete:undeclared.length===0,undeclared,provenance:{origin:'business-cost',derivedFrom:projectId,timestamp:this.kernel._now(),note:'Declared numeric costs only; incomplete totals are UNSPECIFIED, not zero; no estimation and not an ERP.'}};
  }
  calculate(projectId){return this.rollup(projectId);}
}
