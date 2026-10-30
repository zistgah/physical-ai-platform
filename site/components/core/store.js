/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/store.js
 * FILE PURPOSE: Entity store. Add, get, all, relate. The single store behind the kernel.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class EntityStore {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){this.entities=new Map();this.relations=[]}
  /** add: Performs add for this module. */
  add(entity){if(!entity.id)throw new Error("Entity requires id");this.entities.set(entity.id,structuredClone(entity));return this.get(entity.id)}
  /** upsert: Inserts or updates an entity in the canonical store. */
  upsert(entity){return this.add(entity)}
  /** get: Returns one entity by id. */
  get(id){return this.entities.get(id)||null}
  /** all: Returns every entity of a type. */
  all(type=null){const a=[...this.entities.values()];return type?a.filter(x=>x.type===type):a}
  /** remove: Performs remove for this module. */
  remove(id){return this.entities.delete(id)}
  /** link: Adds a typed relation. */
  link(source,relation,target,metadata={}){return this.relate(source,relation,target,metadata)}
  /** relate: Adds a typed relation. */
  relate(source,relation,target,metadata={}){if(!this.get(source)||!this.get(target))throw new Error("Relation endpoints must exist");this.relations.push({source,relation,target,metadata});return this.relations.at(-1)}
  /** neighbors: Performs neighbors for this module. */
  neighbors(id){const ids=new Set();for(const r of this.relations){if(r.source===id)ids.add(r.target);if(r.target===id)ids.add(r.source)}return [...ids].map(x=>this.get(x)).filter(Boolean)}
  /** relationsFor: Performs relations for for this module. */
  relationsFor(id){return this.relations.filter(r=>r.source===id||r.target===id)}
  /** snapshot: Performs snapshot for this module. */
  snapshot(){return {entities:this.all(),relations:structuredClone(this.relations)}}
  /** restore: Performs restore for this module. */
  restore(snapshot){this.entities.clear();this.relations=[];for(const e of snapshot.entities||[])this.add(e);this.relations=structuredClone(snapshot.relations||[])}
}
