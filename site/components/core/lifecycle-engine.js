/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/lifecycle-engine.js
 * FILE PURPOSE: Lifecycle engine. Advances a project through Discover to Retire under the gate schemas.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { ComplianceAutomation } from "../compliance/compliance-automation.js";
/**
 * Lifecycle Engine – Iteration 03
 * Operates on the canonical Project graph.
 * Gates are evidence-based; missing information yields HOLD, never silent PASS.
 */

export const LIFECYCLE_STAGES = [
  "Discover", "Define", "Research", "Architect", "Design", "Simulate",
  "Prototype", "MVP", "Validate", "Fund", "Certify", "Manufacture",
  "Procure", "Deploy", "Operate", "Service", "Bill", "Audit", "Improve", "Retire"
];

import { GateSchemaEngine } from "./gate-schemas.js";
import { GATES } from "./lifecycle-gates.js";
export { GATES };

export class LifecycleEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** getLifecycle: Performs get lifecycle for this module. */
  getLifecycle(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const stages = graph.entities.filter(e => e.type === "LifecycleStage");
    const gates = graph.entities.filter(e => e.type === "Gate");
    const decisions = graph.entities.filter(e => e.type === "GateDecision");
    return { projectId, stages, gates, decisions, applicableGates: gates.filter(g => g.applicable !== false) };
  }

  /** getCurrentStage: Performs get current stage for this module. */
  getCurrentStage(projectId) {
    const lc = this.getLifecycle(projectId);
    const current = lc.stages.find(s => s.status === "CURRENT") || lc.stages[0];
    return current || null;
  }

  /** getCurrentGate: Performs get current gate for this module. */
  getCurrentGate(projectId) {
    const lc = this.getLifecycle(projectId);
    return lc.gates.find(g => g.status === "CURRENT") || lc.gates.find(g => g.status === "OPEN") || null;
  }

  /** evaluateGate: Performs evaluate gate for this module. */
  evaluateGate(projectId, gateId, { configurationId = null, authority = null } = {}) {
    const gate = this.kernel.store.get(gateId);
    if (!gate || gate.type !== "Gate") return { outcome: "HOLD", reason: "Gate not found", evidence: [], unknown: true };
    if (gate.applicable === false) return { outcome: "NOT_APPLICABLE", reason: "Explicitly marked not applicable", evidence: [], unknown: false };

    const reasons = [];
    const evidence = [];

    // Required conditions from gate metadata or related requirements
    const reqs = this.kernel.store.relations
      .filter(r => r.source === gateId && r.relation === "REQUIRES")
      .map(r => this.kernel.store.get(r.target))
      .filter(Boolean);

    for (const req of reqs) {
      const st = this.kernel.getRequirementStatus(req.id);
      if (!st || !st.tested) reasons.push(`Requirement ${req.id} lacks verification`);
      const evs = this.kernel.getEvidenceForRequirement(req.id);
      if (evs.length === 0) reasons.push(`Requirement ${req.id} has no evidence`);
      else evidence.push(...evs);
    }

    // Safety: any UNKNOWN hazard → HOLD
    const hazards = this.kernel.store.all("Hazard").filter(h => {
      return this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === h.id);
    });
    const unknownHazards = hazards.filter(h => h.status === "UNKNOWN" || !h.status);
    if (unknownHazards.length) reasons.push(`${unknownHazards.length} unknown hazard(s)`);

    // Configuration present
    const configs = this.kernel.store.all("Configuration").filter(c =>
      this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === c.id)
    );
    if (configs.length === 0) reasons.push("No configuration defined");

    const compliance = new ComplianceAutomation(this.kernel).run(projectId);
    if (compliance.outcome === "HOLD") {
      reasons.push(...compliance.gaps.map(g => `Compliance ${g.standardId} lacks ${g.need}`));
    }

    const unknown = reasons.some(r => /unknown|no configuration|not found/i.test(r));
    const failed = reasons.some(r => /reject|fail|violat/i.test(r));
    let outcome = reasons.length === 0 ? "PASS" : (failed ? "FAIL" : "HOLD");
    let schemaResult = null;
    if (configurationId) {
      schemaResult = new GateSchemaEngine(this.kernel).evaluateGate(projectId, gateId, { configurationId, authority });
      const rank = { FAIL: 3, HOLD: 2, NOT_APPLICABLE: 1, PASS: 0 };
      if ((rank[schemaResult.outcome] ?? 2) > (rank[outcome] ?? 2)) {
        outcome = schemaResult.outcome;
        reasons.push(...(schemaResult.reasons || []));
      }
    }

    return {
      outcome,
      gateId,
      configurationId,
      authority: authority || null,
      schema: schemaResult,
      unknown,
      failed,
      reasons,
      missingEvidence: reasons.filter(r => /no evidence|lacks verification/i.test(r)),
      evidence: evidence.map(e => ({ id: e.id, state: e.state, configurationId: e.configurationId || null })),
      timestamp: this.kernel._now(),
      provenance: { derivedFrom: gateId, generator: "LifecycleEngine/0.2.0-iter08", configurationId, authority }
    };
  }

  /** advanceGate: Performs advance gate for this module. */
  advanceGate(projectId, gateId) {
    const evalResult = this.evaluateGate(projectId, gateId);
    if (evalResult.outcome !== "PASS" && evalResult.outcome !== "NOT_APPLICABLE") {
      return { advanced: false, evaluation: evalResult };
    }
    const gate = this.kernel.store.get(gateId);
    this.kernel.upsert({ ...gate, status: "COMPLETED", completedAt: this.kernel._now() });
    // Move next applicable gate to CURRENT
    const gates = this.getLifecycle(projectId).gates.sort((a, b) => a.id.localeCompare(b.id));
    const idx = gates.findIndex(g => g.id === gateId);
    for (let i = idx + 1; i < gates.length; i++) {
      if (gates[i].applicable !== false) {
        this.kernel.upsert({ ...gates[i], status: "CURRENT" });
        break;
      }
    }
    return { advanced: true, evaluation: evalResult };
  }

  /** holdGate: Performs hold gate for this module. */
  holdGate(projectId, gateId, reason) {
    const gate = this.kernel.store.get(gateId);
    if (!gate) return null;
    return this.kernel.upsert({ ...gate, status: "HOLD", holdReason: reason });
  }

  /** rejectGate: Performs reject gate for this module. */
  rejectGate(projectId, gateId, reason) {
    const gate = this.kernel.store.get(gateId);
    if (!gate) return null;
    return this.kernel.upsert({ ...gate, status: "FAIL", rejectReason: reason });
  }

  /** recordGateDecision: Performs record gate decision for this module. */
  recordGateDecision(projectId, gateId, decision) {
    const id = `gd_${gateId}_${Date.now().toString(36)}`;
    const gd = this.kernel.upsert({
      id,
      type: "GateDecision",
      name: `Decision on ${gateId}`,
      gateId,
      outcome: decision.outcome,
      reasons: decision.reasons || [],
      evidence: decision.evidence || [],
      configurationId: decision.configurationId || null,
      authority: decision.authority || null,
      unknown: !!decision.unknown,
      status: decision.outcome,
      provenance: { origin: "gate-decision", derivedFrom: gateId, configurationId: decision.configurationId || null, authority: decision.authority || null, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    this.kernel.link(gateId, "PRODUCES", id);
    return gd;
  }

  /** getGateEvidence: Performs get gate evidence for this module. */
  async getGateEvidence(projectId, gateId) {
    return (this.evaluateGate(projectId, gateId)).evidence;
  }
}
