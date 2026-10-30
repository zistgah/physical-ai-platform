/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/plugin-system.js
 * FILE PURPOSE: Plugin registry. Registers and looks up replaceable implementations.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class PluginRegistry {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor({contracts,events}={}){this.contracts=contracts;this.events=events;this.plugins=new Map();}
  /** register: Performs register for this module. */
  register(manifest,factory){
    if(!manifest?.id || !manifest.version) throw new Error("Plugin manifest requires id and version");
    if(this.plugins.has(manifest.id)) throw new Error(`Plugin already registered: ${manifest.id}`);
    if(typeof factory!=="function") throw new Error("Plugin factory required");
    const plugin={manifest:structuredClone(manifest),factory};
    this.plugins.set(manifest.id,plugin); this.events?.emit("plugin:registered",{id:manifest.id,version:manifest.version});
    return plugin;
  }
  /** load: Performs load for this module. */
  load(id,context={}){
    const p=this.plugins.get(id); if(!p) throw new Error(`Plugin not found: ${id}`);
    const instance=p.factory(context);
    return {id,version:p.manifest.version,instance};
  }
  /** list: Performs list for this module. */
  list(){return [...this.plugins.values()].map(x=>structuredClone(x.manifest));}
}
