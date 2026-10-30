/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { CostModel } from './cost-model.js';
/**
 * FILE: site/components/core/business-closure.js
 * FILE PURPOSE: Business closure and evidence-aware declared cost rollup.
 */
/** Commercial projections over the canonical graph; incomplete declared costs do not produce a false total. */
export class BusinessClosure {
  constructor(kernel){this.kernel=kernel;this.costModel=new CostModel(kernel);}
  rollup(projectId){const r=this.costModel.rollup(projectId);return {projectId,lines:r.lines,total:r.total,declaredSubtotal:r.declaredSubtotal,complete:r.complete,undeclared:r.undeclared,provenance:{origin:'business-rollup',derivedFrom:projectId,note:'Declared-cost rollup; total is UNSPECIFIED until all required fields are declared; not an invoice'}};}
  createOrder(projectId,customerId,meta={}){const id=meta.id||`order_${Date.now().toString(36)}`;const order=this.kernel.upsert({id,type:'ServiceEvent',name:meta.name||'Customer order',customerId,status:'OPEN',provenance:{origin:'business',derivedFrom:customerId}});this.kernel.link(projectId,'CONTAINS',id);return order;}
}
