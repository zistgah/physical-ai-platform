/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/workbench/ports.js
 * FILE PURPOSE: Port registry. Registers typed ports and rejects incompatible connections.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import {validatePortConnection} from "../core/contracts.js";
export class PortRegistry {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){this.components=new Map();this.connections=[];}
  /** register: Performs register for this module. */
  register(component){
    if(!component?.id) throw new Error("Component id required");
    this.components.set(component.id,structuredClone(component));
  }
  /** connect: Connects two ports. Rejects incompatible types or units. */
  connect(fromComponent,fromPort,toComponent,toPort){
    const a=this.components.get(fromComponent)?.ports?.[fromPort];
    const b=this.components.get(toComponent)?.ports?.[toPort];
    if(!a||!b) throw new Error("Both ports must be registered");
    const error=validatePortConnection(a,b); if(error) throw new Error(error);
    const c={from:{component:fromComponent,port:fromPort},to:{component:toComponent,port:toPort}};
    this.connections.push(c); return c;
  }
  /** validate: Checks the contract. A failure holds. */
  validate(){ return this.connections.map(c=>{
    const a=this.components.get(c.from.component).ports[c.from.port];
    const b=this.components.get(c.to.component).ports[c.to.port];
    return {connection:c,error:validatePortConnection(a,b)};
  }).filter(x=>x.error); }
}
