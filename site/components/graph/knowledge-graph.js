/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/graph/knowledge-graph.js
 * FILE PURPOSE: Knowledge graph projection. Reads the canonical store and presents a traversable view.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class KnowledgeGraph {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(store){this.store=store}
  /** add: Performs add for this module. */
  add(entity){return this.store.add(entity)}
  /** link: Adds a typed relation. */
  link(a,relation,b,metadata={}){return this.store.relate(a,relation,b,metadata)}
  /** queryType: Performs query type for this module. */
  queryType(type){return this.store.all(type)}
  /** neighborhood: Performs neighborhood for this module. */
  neighborhood(id,depth=1){
    let frontier=[id],seen=new Set([id]);
    for(let d=0;d<depth;d++){const next=[];for(const n of frontier){for(const x of this.store.neighbors(n)){if(!seen.has(x.id)){seen.add(x.id);next.push(x.id)}}}frontier=next}
    return [...seen].map(x=>this.store.get(x)).filter(Boolean)
  }
}
