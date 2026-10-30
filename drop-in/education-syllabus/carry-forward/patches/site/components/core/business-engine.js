/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { CostModel } from './cost-model.js';
/**
 * FILE: site/components/core/business-engine.js
 * FILE PURPOSE: Business entity operations and canonical cost aggregation.
 */
/** Business entity operations and canonical declared-cost projection. */
export class BusinessEngine {
  constructor(kernel){this.kernel=kernel;this.costModel=new CostModel(kernel);}
  aggregateCost(projectId){
    const r=this.costModel.rollup(projectId),sum=field=>r.complete?r.lines.reduce((n,l)=>n+l[field],0):null;
    return {projectId,material:sum('costMaterial'),process:sum('costProcess'),labor:sum('costLabor'),total:r.total,declaredSubtotal:r.declaredSubtotal,complete:r.complete,undeclared:r.undeclared,lines:r.lines,provenance:{origin:'business',derivedFrom:projectId,note:'Canonical declared-cost rollup; unknown values are not zero and this is not an invoice'}};
  }
  createFunding(projectId,meta={}){const id=meta.id||`fund_${Date.now().toString(36)}`;const f=this.kernel.upsert({id,type:'Funding',name:meta.name||'Funding',amount:meta.amount??0,status:meta.status||'PROPOSED',provenance:{origin:'business',derivedFrom:projectId}});this.kernel.link(projectId,'CONTAINS',id);return f;}
  createCustomer(projectId,meta={}){const id=meta.id||`cust_${Date.now().toString(36)}`;const c=this.kernel.upsert({id,type:'Customer',name:meta.name||'Customer',status:'ACTIVE',provenance:{origin:'business',derivedFrom:projectId}});this.kernel.link(projectId,'CONTAINS',id);return c;}
}
