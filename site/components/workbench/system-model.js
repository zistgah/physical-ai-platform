/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/workbench/system-model.js
 * FILE PURPOSE: System model. Creates a system, adds components, and connects ports under the contracts.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import {PortRegistry} from "./ports.js";
import {componentContract} from "../core/contracts.js";

export class SystemModel {
  constructor(graph,{portRegistry=new PortRegistry()}={}){this.graph=graph;this.ports=portRegistry;}
  /** create: Creates the entity and records it. */
  create(data){
    const system=this.graph.add({type:"System",id:data.id,name:data.name,version:data.version||"1.0.0",
      mission:data.mission||null,domain:data.domain||"TERRESTRIAL",embodiment:data.embodiment||"WHEELED",
      components:data.components||[],requirements:data.requirements||[],interfaces:data.interfaces||[],
      configuration:data.configuration||null,architectureVersion:data.architectureVersion||"1.0.0"});
    return system;
  }
  /** addComponent: Performs add component for this module. */
  addComponent(systemId,component){
    const c=componentContract(component); this.graph.add({...component,...c});
    this.ports.register(c); this.graph.link(systemId,"HAS_COMPONENT",c.id);
    const s=this.graph.store.get(systemId);s.components=[...(s.components||[]),c.id];this.graph.store.add(s);return c;
  }
  /** connect: Connects two ports. Rejects incompatible types or units. */
  connect(systemId,fromComponent,fromPort,toComponent,toPort){
    const c=this.ports.connect(fromComponent,fromPort,toComponent,toPort);
    this.graph.link(fromComponent,"CONNECTS_TO",toComponent,{systemId,fromPort,toPort});
    const s=this.graph.store.get(systemId);s.interfaces=[...(s.interfaces||[]),c];this.graph.store.add(s);return c;
  }
  /** validate: Checks the contract. A failure holds. */
  validate(){return {portErrors:this.ports.validate()};}
}
