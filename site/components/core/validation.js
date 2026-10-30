/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/validation.js
 * FILE PURPOSE: Schema validation. Rejects entities that do not match their type contract.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export function validateEntity(entity){
  const errors=[];
  if(!entity?.id)errors.push("missing id");
  if(!entity?.type)errors.push("missing type");
  if(entity?.schemaVersion===undefined)errors.push("missing schemaVersion");
  return {valid:errors.length===0,errors};
}
/** validateGraph: Schema validation. Rejects entities that do not match their type contract. */
export function validateGraph(store){
  const errors=[];
  for(const r of store.relations){
    if(!store.get(r.source))errors.push(`missing source ${r.source}`);
    if(!store.get(r.target))errors.push(`missing target ${r.target}`);
  }
  for(const e of store.all()){
    if(!e.id||!e.type)errors.push(`invalid entity ${e.id||"<missing>"}`);
  }
  return {valid:errors.length===0,errors};
}
