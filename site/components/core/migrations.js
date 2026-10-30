/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/migrations.js
 * FILE PURPOSE: Schema migrations. Versioned, explicit, and reversible in the contract sense.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class MigrationRegistry {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){ this.migrations=new Map(); }
  /** register: Performs register for this module. */
  register(kind,from,to,fn){
    const key=`${kind}:${from}->${to}`;
    if(this.migrations.has(key)) throw new Error(`Migration already registered: ${key}`);
    this.migrations.set(key,fn); return key;
  }
  /** migrate: Performs migrate for this module. */
  migrate(document,{kind,toVersion}={}){
    let current=document?.schemaVersion;
    if(!current) throw new Error("Document requires schemaVersion");
    if(current===toVersion) return structuredClone(document);
    const keys=[...this.migrations.keys()].filter(k=>k.startsWith(`${kind}:`));
    let out=structuredClone(document), guard=0;
    while(out.schemaVersion!==toVersion && guard++<100){
      const next=keys.find(k=>k.startsWith(`${kind}:${out.schemaVersion}->`));
      if(!next) throw new Error(`No migration path for ${kind} from ${out.schemaVersion} to ${toVersion}`);
      out=this.migrations.get(next)(out);
    }
    if(out.schemaVersion!==toVersion) throw new Error(`Migration did not reach ${toVersion}`);
    return out;
  }
}
