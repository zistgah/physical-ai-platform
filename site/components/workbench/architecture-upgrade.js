/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/workbench/architecture-upgrade.js
 * FILE PURPOSE: Architecture upgrade. Migrates a model across a versioned contract.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import {MigrationRegistry} from "../core/migrations.js";
import {compatible} from "../core/versioning.js";

export class ArchitectureUpgradeManager {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor({currentVersion="1.0.0",schemaVersion="1.0.0"}={}){
    this.currentVersion=currentVersion; this.schemaVersion=schemaVersion;
    this.migrations=new MigrationRegistry(); this.adapters=new Map(); this.featureFlags=new Map();
  }
  /** registerMigration: Performs register migration for this module. */
  registerMigration(kind,from,to,fn){return this.migrations.register(kind,from,to,fn);}
  /** registerAdapter: Performs register adapter for this module. */
  registerAdapter(from,to,fn){this.adapters.set(`${from}->${to}`,fn);}
  /** adapt: Performs adapt for this module. */
  adapt(value,from,to){
    if(from===to)return structuredClone(value);
    const fn=this.adapters.get(`${from}->${to}`);
    if(!fn)throw new Error(`No adapter: ${from} -> ${to}`);
    return fn(structuredClone(value));
  }
  /** canLoad: Performs can load for this module. */
  canLoad(requiredVersion){return compatible(requiredVersion,this.currentVersion);}
  /** setFeature: Performs set feature for this module. */
  setFeature(name,enabled=true){this.featureFlags.set(name,!!enabled);}
  /** feature: Performs feature for this module. */
  feature(name){return this.featureFlags.get(name)===true;}
  /** upgrade: Performs upgrade for this module. */
  upgrade(document,kind,toVersion=this.schemaVersion){return this.migrations.migrate(document,{kind,toVersion});}
  /** inspect: Inspects an import. Markup or a disallowed type holds. */
  inspect(){
    return {currentVersion:this.currentVersion,schemaVersion:this.schemaVersion,
      migrations:[...this.migrations.migrations.keys()],adapters:[...this.adapters.keys()],
      features:Object.fromEntries(this.featureFlags)};
  }
}
