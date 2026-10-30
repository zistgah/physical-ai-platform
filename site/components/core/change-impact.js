/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/change-impact.js
 * FILE PURPOSE: Change impact. Walks the graph from a changed entity and reports what becomes stale.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Change Impact Analysis – Iteration 03
 * Explains path, reason, impact class, and required action.
 * Does not treat every edge as "affected".
 */

const IMPACT_RELATIONS = new Set([
  "ALLOCATED_TO", "VERIFIES", "DERIVED_FROM", "CONNECTS_TO", "HAS_COMPONENT",
  "REQUIRES", "GOVERNED_BY", "CONTAINS", "PART_OF"
]);

export class ChangeImpactEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** analyzeChange: Performs analyze change for this module. */
  analyzeChange(objectId, proposedChange = {}) {
    const obj = this.kernel.store.get(objectId);
    if (!obj) throw new Error("Object not found");
    const affected = this._collectAffected(objectId);
    const id = `impact_${objectId}_${Date.now().toString(36)}`;
    const analysis = this.kernel.upsert({
      id,
      type: "ImpactAnalysis",
      name: `Impact of change to ${objectId}`,
      sourceId: objectId,
      proposedChange,
      affected: affected.map(a => ({ id: a.id, type: a.type, path: a.path, reason: a.reason, impactClass: a.impactClass, requiredAction: a.requiredAction })),
      status: "ANALYZED",
      provenance: { origin: "change-impact", derivedFrom: objectId, timestamp: this.kernel._now() }
    });
    return analysis;
  }

  /** _collectAffected: Performs _collect affected for this module. */
  _collectAffected(startId) {
    const results = [];
    const seen = new Set([startId]);
    const queue = [{ id: startId, path: [startId], depth: 0 }];
    while (queue.length) {
      const { id, path, depth } = queue.shift();
      if (depth > 6) continue;
      for (const r of this.kernel.store.relations) {
        if (!IMPACT_RELATIONS.has(r.relation)) continue;
        let next = null;
        let reason = "";
        if (r.source === id) { next = r.target; reason = `${r.relation} →`; }
        else if (r.target === id) { next = r.source; reason = `← ${r.relation}`; }
        if (!next || seen.has(next)) continue;
        seen.add(next);
        const ent = this.kernel.store.get(next);
        if (!ent) continue;
        const impactClass = this._classFor(ent.type, r.relation);
        results.push({
          id: next,
          type: ent.type,
          path: [...path, next],
          reason: `${reason} ${ent.type}`,
          impactClass,
          requiredAction: this._actionFor(impactClass)
        });
        queue.push({ id: next, path: [...path, next], depth: depth + 1 });
      }
    }
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** _classFor: Performs _class for for this module. */
  _classFor(type, relation) {
    if (type === "Requirement") return "requirements";
    if (type === "Test") return "verification";
    if (type === "Evidence" || type === "Artifact") return "evidence";
    if (type === "Hazard" || type === "SafetyCase") return "safety";
    if (type === "ComplianceCase" || type === "Standard") return "compliance";
    if (type === "Component" || type === "Connection" || type === "Port") return "architecture";
    return "other";
  }

  /** _actionFor: Performs _action for for this module. */
  _actionFor(cls) {
    const map = {
      requirements: "Re-allocate or re-verify requirement",
      verification: "Re-run or update test",
      evidence: "Regenerate or re-assess evidence",
      safety: "Re-evaluate hazard and controls",
      compliance: "Re-assess applicability and evidence",
      architecture: "Review interface and connection compatibility",
      other: "Review for impact"
    };
    return map[cls] || "Review";
  }

  /** getAffectedObjects: Performs get affected objects for this module. */
  getAffectedObjects(changeId) {
    const a = this.kernel.store.get(changeId);
    return a?.affected || [];
  }
  /** getAffectedRequirements: Performs get affected requirements for this module. */
  getAffectedRequirements(changeId) {
    return this.getAffectedObjects(changeId).filter(o => o.impactClass === "requirements" || o.type === "Requirement");
  }
  /** getAffectedTests: Performs get affected tests for this module. */
  getAffectedTests(changeId) {
    return this.getAffectedObjects(changeId).filter(o => o.impactClass === "verification" || o.type === "Test");
  }
  /** getAffectedEvidence: Performs get affected evidence for this module. */
  getAffectedEvidence(changeId) {
    return this.getAffectedObjects(changeId).filter(o => o.impactClass === "evidence");
  }
  /** getAffectedSafety: Performs get affected safety for this module. */
  getAffectedSafety(changeId) {
    return this.getAffectedObjects(changeId).filter(o => o.impactClass === "safety");
  }
  /** getAffectedCompliance: Performs get affected compliance for this module. */
  getAffectedCompliance(changeId) {
    return this.getAffectedObjects(changeId).filter(o => o.impactClass === "compliance");
  }
}
