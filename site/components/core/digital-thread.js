/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/digital-thread.js
 * FILE PURPOSE: Digital thread. Projects Mission to Need to Requirement to Architecture to Component to Evidence as a path over the graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Digital Thread – Iteration 03
 * Traversable through the canonical graph. Identifies missing links.
 */

const THREAD_STEPS = [
  "Mission", "Requirement", "System", "Component", "Connection",
  "Test", "Evidence", "Configuration", "Hazard", "Baseline"
];

export class DigitalThread {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** getDigitalThread: Performs get digital thread for this module. */
  getDigitalThread(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const byType = {};
    for (const t of THREAD_STEPS) byType[t] = graph.entities.filter(e => e.type === t);
    const breaks = this.getThreadBreaks(projectId);
    return { projectId, steps: THREAD_STEPS, byType, breaks, entities: graph.entities.length, relations: graph.relations.length };
  }

  /** traceForward: Performs trace forward for this module. */
  traceForward(objectId) {
    const visited = new Set();
    const result = [];
    const queue = [objectId];
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const ent = this.kernel.store.get(id);
      if (ent) result.push(ent);
      for (const r of this.kernel.store.relations) {
        if (r.source === id && !visited.has(r.target)) queue.push(r.target);
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** traceBackward: Performs trace backward for this module. */
  traceBackward(objectId) {
    const visited = new Set();
    const result = [];
    const queue = [objectId];
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const ent = this.kernel.store.get(id);
      if (ent) result.push(ent);
      for (const r of this.kernel.store.relations) {
        if (r.target === id && !visited.has(r.source)) queue.push(r.source);
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** getThreadBreaks: Performs get thread breaks for this module. */
  getThreadBreaks(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const breaks = [];
    const reqs = graph.entities.filter(e => e.type === "Requirement");
    for (const r of reqs) {
      const allocated = this.kernel.store.relations.some(rel => rel.source === r.id && rel.relation === "ALLOCATED_TO");
      if (!allocated) breaks.push({ type: "orphan-requirement", id: r.id, reason: "Requirement has no allocation" });
      const verified = this.kernel.store.relations.some(rel => rel.relation === "VERIFIES" && rel.target === r.id);
      if (!verified) breaks.push({ type: "unverified-requirement", id: r.id, reason: "Requirement has no verifying test" });
    }
    const tests = graph.entities.filter(e => e.type === "Test");
    for (const t of tests) {
      const hasEv = this.kernel.store.relations.some(rel => rel.relation === "DERIVED_FROM" && rel.target === t.id);
      if (!hasEv) breaks.push({ type: "orphan-test", id: t.id, reason: "Test has no derived evidence" });
    }
    const comps = graph.entities.filter(e => e.type === "Component");
    for (const c of comps) {
      const used = this.kernel.store.relations.some(rel => rel.relation === "ALLOCATED_TO" && rel.target === c.id);
      if (!used) breaks.push({ type: "orphan-implementation", id: c.id, reason: "Component has no allocated requirement" });
    }
    return breaks.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** getTraceabilityFindings: Performs get traceability findings for this module. */
  getTraceabilityFindings(projectId) {
    const breaks = this.getThreadBreaks(projectId);
    const findings = [...breaks];
    // Stale verification: requirement modified after evidence (simplified)
    const graph = this.kernel.getProjectGraph(projectId);
    for (const r of graph.entities.filter(e => e.type === "Requirement")) {
      const evs = this.kernel.getEvidenceForRequirement(r.id);
      if (evs.length && r.modified && evs.some(e => e.created && r.modified > e.created)) {
        findings.push({ type: "stale-verification", id: r.id, reason: "Requirement modified after evidence" });
      }
    }
    return findings.sort((a, b) => `${a.type}|${a.id}`.localeCompare(`${b.type}|${b.id}`));
  }
}
