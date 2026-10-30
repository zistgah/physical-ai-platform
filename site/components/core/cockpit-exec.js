/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/cockpit-exec.js
 * FILE PURPOSE: Cockpit execution adapter. Bridges the state machine to the execution graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Cockpit execution – Iteration 17
 * Checklist items complete only with a role that holds the authority.
 */
export class CockpitExec {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** open: Performs open for this module. */
  open(projectId, { id, items }) {
    const c = this.kernel.upsert({
      id, type: "CockpitState", name: id, state: "S0",
      items: items.map(i => ({ ...i, done: false })),
      provenance: { origin: "cockpit", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", c.id);
    return c;
  }

  /** complete: Performs complete for this module. */
  complete(cockpitId, itemId, { role, authorities }) {
    const c = this.kernel.store.get(cockpitId);
    const item = c?.items?.find(i => i.id === itemId);
    if (!item) return { outcome: "HOLD", reason: "Checklist item is UNSPECIFIED" };
    if (!authorities?.includes(item.authority)) return { outcome: "HOLD", reason: `Role ${role} lacks ${item.authority}` };
    item.done = true;
    item.completedBy = role;
    if (c.items.every(i => i.done)) c.state = "S10";
    return c;
  }
}
