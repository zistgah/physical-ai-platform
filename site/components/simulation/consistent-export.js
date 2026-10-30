/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/consistent-export.js
 * FILE PURPOSE: Consistent export. Research, spec, dossier, and demo draw the same numbers from the graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Consistent export – Iteration 23
 * Research, spec, dossier, and demo use the same numbers from the graph.
 */
export class ConsistentExport {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** numbers: Performs numbers for this module. */
  numbers(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const costs = graph.entities.filter(e => e.type === "Cost");
    const solids = graph.entities.filter(e => e.type === "Solid");
    const evidence = graph.entities.filter(e => e.type === "Evidence");
    const material = costs.reduce((s, c) => s + (c.amount || 0), 0);
    const volume = solids.reduce((s, g) => s + (g.volume || 0), 0);
    return { material, volume, evidence: evidence.length, regulatoryDetermination: false };
  }

  /** export: Performs export for this module. */
  export(projectId, kind) {
    const kinds = ["research", "spec", "dossier", "demo"];
    if (!kinds.includes(kind)) return { outcome: "HOLD", reason: `Unknown export ${kind}` };
    const numbers = this.numbers(projectId);
    return { outcome: "OK", kind, numbers, regulatoryDetermination: false };
  }
}
