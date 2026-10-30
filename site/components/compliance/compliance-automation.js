/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/compliance-automation.js
 * FILE PURPOSE: Compliance automation. Adopts standards, binds typed evidence, and holds when evidence is missing, rejected, simulated, or outside the project. Waivers need a registered role.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Automated compliance – Iteration 22
 * Evidence must be bound, in a valid state, and cover the requirement.
 * A name that happens to contain the label is not evidence.
 * This is not a regulatory determination.
 */
const VALID_STATES = new Set(["EXECUTED", "TESTED", "VERIFIED", "VALIDATED", "RELEASED"]);
const PROMOTED = new Set(["VERIFIED", "VALIDATED", "RELEASED"]);
export const WAIVER_ROLES = new Set(["compliance-lead", "safety-authority", "pic"]);
const CLOSED = new Set(["NOT_APPLICABLE", "WAIVED"]);

export class ComplianceAutomation {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** bind: Binds evidence to a requirement. Rejected or unbound evidence does not clear. */
  bind(standardId, evidenceId, need) {
    const std = this.kernel.store.get(standardId);
    const ev = this.kernel.store.get(evidenceId);
    if (!std || !ev) return { outcome: "HOLD", reason: "Standard or evidence is UNSPECIFIED" };
    if (!need) return { outcome: "HOLD", reason: "Requirement is UNSPECIFIED" };
    this.kernel.link(std.id, "EVIDENCED_BY", ev.id, { covers: need });
    ev.covers = need;
    return { outcome: "BOUND", standardId, evidenceId, need };
  }

  /** waive: Performs waive for this module. */
  waive(standardId, need, { reason, role } = {}) {
    const std = this.kernel.store.get(standardId);
    if (!std) return { outcome: "HOLD", reason: "Standard is UNSPECIFIED" };
    if (!reason || !role) return { outcome: "HOLD", reason: "Waiver needs a reason and a role" };
    if (!WAIVER_ROLES.has(role)) return { outcome: "HOLD", reason: "Role is not in the registry" };
    std.waivers = [...(std.waivers || []), { need, reason, role }];
    return { outcome: "WAIVED", need };
  }

  /** markNotApplicable: Performs mark not applicable for this module. */
  markNotApplicable(standardId, { reason, role } = {}) {
    const std = this.kernel.store.get(standardId);
    if (!std) return { outcome: "HOLD", reason: "Standard is UNSPECIFIED" };
    if (!reason || !role) return { outcome: "HOLD", reason: "Not-applicable needs a reason and a role" };
    std.status = "NOT_APPLICABLE";
    std.notApplicable = { reason, role };
    return std;
  }

  /** run: Performs run for this module. */
  run(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const adopted = graph.entities.filter(e =>
      e.type === "Standard" && ["PROJECT_ADOPTED", "ACCEPTED", "APPLICABLE", "EVIDENCED", "TAILORED"].includes(e.status)
    );
    if (!adopted.length) return { outcome: "OK", checked: 0, gaps: [], regulatoryDetermination: false };
    const gaps = [];
    for (const std of adopted) {
      if (CLOSED.has(std.status)) continue;
      const required = std.requiredEvidence;
      if (!required?.length) {
        gaps.push({ standardId: std.standardId || std.id, need: "requiredEvidence", reason: "Requirements were not transferred" });
        continue;
      }
      const bound = this.kernel.store.relations.filter(r => r.source === std.id && r.relation === "EVIDENCED_BY");
      for (const need of required) {
        if ((std.waivers || []).some(w => w.need === need && w.reason && w.role)) continue;
        const hit = bound
          .map(r => ({ rel: r, ev: this.kernel.store.get(r.target) }))
          .find(({ rel, ev }) => this._valid(ev, need, rel, projectId, std));
        if (!hit) gaps.push({ standardId: std.standardId || std.id, need, reason: "No bound valid evidence" });
      }
    }
    if (gaps.length) return { outcome: "HOLD", checked: adopted.length, gaps, regulatoryDetermination: false };
    return { outcome: "PASS", checked: adopted.length, gaps: [], regulatoryDetermination: false };
  }

  /** _valid: Performs _valid for this module. */
  _valid(ev, need, rel, projectId, std) {
    if (!ev || ev.type !== "Evidence") return false;
    if (!VALID_STATES.has(ev.state)) return false;
    if (ev.method === "SIMULATION" && !PROMOTED.has(ev.state)) return false;
    if (ev.stale) return false;
    const covers = rel.metadata?.covers || ev.covers;
    if (covers !== need && ev.subject !== need) return false;
    const inProject = this.kernel.store.relations.some(r => r.source === projectId && r.relation === "CONTAINS" && r.target === ev.id);
    if (!inProject) return false;
    if (std.configurationId && ev.configurationId !== std.configurationId) return false;
    return true;
  }
}
