/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/graph-queries.js
 * FILE PURPOSE: Graph queries. Traversals and filters over the canonical store.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Canonical graph queries – Iteration 05
 * Operates on the kernel graph. No duplicate indexes.
 */

export class GraphQueries {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** orphans: Performs orphans for this module. */
  orphans(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const linked = new Set();
    for (const r of graph.relations) { linked.add(r.source); linked.add(r.target); }
    return graph.entities.filter(e => e.id !== projectId && !linked.has(e.id)).map(e => e.id);
  }

  /** circular: Performs circular for this module. */
  circular(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const adj = new Map();
    for (const r of graph.relations) {
      if (!adj.has(r.source)) adj.set(r.source, []);
      adj.get(r.source).push(r.target);
    }
    const cycles = [];
    const visiting = new Set();
    const visited = new Set();
    const stack = [];
    function dfs(n) {
      if (visiting.has(n)) { cycles.push([...stack, n]); return; }
      if (visited.has(n)) return;
      visiting.add(n); stack.push(n);
      for (const m of adj.get(n) || []) dfs(m);
      stack.pop(); visiting.delete(n); visited.add(n);
    }
    for (const e of graph.entities) dfs(e.id);
    return cycles;
  }

  /** requirementCoverage: Performs requirement coverage for this module. */
  requirementCoverage(projectId) {
    const reqs = this.kernel.getProjectGraph(projectId).entities.filter(e => e.type === "Requirement");
    return reqs.map(r => {
      const st = this.kernel.getRequirementStatus(r.id);
      return { id: r.id, allocated: st?.allocated || false, tested: st?.tested || false, verified: st?.verified || false };
    });
  }

  /** staleEvidence: Performs stale evidence for this module. */
  staleEvidence(projectId) {
    const findings = [];
    const graph = this.kernel.getProjectGraph(projectId);
    for (const r of graph.entities.filter(e => e.type === "Requirement")) {
      const evs = this.kernel.getEvidenceForRequirement(r.id);
      if (evs.length && r.modified && evs.some(e => e.created && r.modified > e.created)) {
        findings.push({ requirement: r.id, reason: "requirement modified after evidence" });
      }
    }
    return findings;
  }

  /** readiness: Performs readiness for this module. */
  readiness(projectId) {
    const hazards = this.kernel.store.all("Hazard").filter(h =>
      this.kernel.store.relations.some(r => r.source === projectId && r.target === h.id)
    );
    const unknownH = hazards.filter(h => h.status === "UNKNOWN" || !h.status).length;
    const configs = this.kernel.store.all("Configuration").filter(c =>
      this.kernel.store.relations.some(r => r.source === projectId && r.target === c.id)
    );
    const frozen = configs.some(c => c.status === "FROZEN");
    return {
      safety: unknownH ? "HOLD" : (hazards.length ? "GO" : "UNKNOWN"),
      configuration: frozen ? "FROZEN" : (configs.length ? "DRAFT" : "MISSING"),
      compliance: "UNKNOWN",
      manufacturing: this.kernel.store.all("WorkOrder").length ? "PLANNED" : "NONE"
    };
  }
}
