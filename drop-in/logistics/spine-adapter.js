/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/logistics/spine-adapter.js
 * Browser-only canonical adapter. Persists immutable logistics projections as
 * canonical Artifact entities and links them to Project via existing CONTAINS.
 * It intentionally does not invent Shipment/InventoryLot/ReturnCase entity types
 * or unresolved relations such as CONSUMES/HAS_EVENT/SUPPLIED_BY.
 */
const COPYRIGHT = "Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.";
export class LogisticsSpineAdapter {
  constructor(kernel) {
    if (!kernel?.store?.get || typeof kernel.upsert!=="function" || typeof kernel.link!=="function") {
      throw new Error("LogisticsSpineAdapter requires the canonical kernel API");
    }
    this.kernel=kernel;
  }
  persistProjection({projectId,id,kind,result,sourceVersion="1.0.0"}={}) {
    if (!projectId||!id||!kind||!result||!["OK","HOLD"].includes(result.outcome)) {
      return {outcome:"HOLD",reason:"Project, ID, kind and valid domain result are required"};
    }
    const project=this.kernel.store.get(projectId);
    if (!project||project.type!=="Project") return {outcome:"HOLD",reason:"Canonical Project is missing"};
    const artifactId=`logistics:${id}`;
    const artifact=this.kernel.upsert({
      id:artifactId,type:"Artifact",name:`Logistics ${kind} ${id}`,
      artifactKind:"LOGISTICS_PROJECTION",logisticsKind:kind,
      projectionVersion:sourceVersion,decision:result.outcome,
      payload:structuredClone(result),
      provenance:{origin:"drop-in/logistics",derivedFrom:projectId,
        copyright:COPYRIGHT,authority:"PROJECTION_ONLY"}
    },"system");
    const exists=this.kernel.store.relations.some(r=>r.source===projectId&&r.relation==="CONTAINS"&&r.target===artifactId);
    if(!exists)this.kernel.link(projectId,"CONTAINS",artifactId,{domain:"logistics",projectionOnly:true});
    return {outcome:"OK",artifact,relation:"CONTAINS",projectionOnly:true,
      note:"Canonical Artifact projection persisted. No procurement, dispatch, receipt, release or unresolved logistics relation was asserted."};
  }
  persistMany({projectId,records=[]}={}) {
    if(!Array.isArray(records)||!records.length)return {outcome:"HOLD",reason:"Projection records are required"};
    const results=records.map(r=>this.persistProjection({...r,projectId}));
    return {outcome:results.every(r=>r.outcome==="OK")?"OK":"HOLD",results,
      persisted:results.filter(r=>r.outcome==="OK").length,held:results.filter(r=>r.outcome!=="OK").length};
  }
}
