/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/event-bus.js
 * FILE PURPOSE: In-process event bus. Publishes and subscribes. No persistence.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export class EventBus {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(){this.listeners=new Map()}
  /** on: Performs on for this module. */
  on(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);return()=>this.listeners.get(type)?.delete(fn)}
  /** emit: Performs emit for this module. */
  emit(type,payload){for(const fn of this.listeners.get(type)||[])fn(payload)}
  /** clear: Performs clear for this module. */
  clear(){this.listeners.clear()}
}
