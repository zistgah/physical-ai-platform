/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/safety/self-assurance.js
 * FILE PURPOSE: Assurance applied to this project. A claim on the platform is walked against the graph. A claim without evidence holds.
 * MRD 10: assurance case.
 */
export class SelfAssurance {
  constructor(kernel) { this.kernel = kernel; }

  claim(projectId, { id, text }) {
    if (!text) return { outcome: "HOLD", reason: "Claim is empty" };
    const c = this.kernel.upsert({
      id, type: "Claim", name: text, status: "OPEN",
      provenance: { origin: "self-assurance", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", c.id);
    return { outcome: "OK", claim: c };
  }

  evidence(claimId, evidenceId) {
    const claim = this.kernel.store.get(claimId);
    const ev = this.kernel.store.get(evidenceId);
    if (!claim || claim.type !== "Claim") return { outcome: "HOLD", reason: "Not a claim" };
    if (!ev || ev.type !== "Evidence") return { outcome: "HOLD", reason: "Not evidence" };
    this.kernel.link(claimId, "EVIDENCED_BY", evidenceId);
    return { outcome: "OK" };
  }

  assess(claimId) {
    const claim = this.kernel.store.get(claimId);
    if (!claim) return { outcome: "HOLD", reason: "Claim is UNSPECIFIED" };
    const links = this.kernel.store.relations.filter(r => r.source === claimId && r.relation === "EVIDENCED_BY");
    if (!links.length) return { outcome: "HOLD", reason: "Claim has no evidence" };
    return { outcome: "SUPPORTED", evidence: links.map(r => r.target) };
  }
}
