/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-workflow.js
 * FILE PURPOSE: Standards workflow. Moves a standard through the compliance states without collapsing them to a checkbox.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Standards workflow – Iteration 06
 * Expands the corpus path: candidate → tailored → project-adopted → evidenced.
 * Status remains INFORMATIONAL until explicit project adoption.
 * Not a legal determination.
 */

import { STANDARDS_CORPUS } from "./standards-corpus.js";

export class StandardsWorkflow {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** tailor: Performs tailor for this module. */
  tailor(projectId, standardId, tailoring = {}) {
    const std = STANDARDS_CORPUS.find(s => s.id === standardId);
    if (!std) throw new Error("Standard not in corpus");
    const id = `tailor_${standardId}_${projectId}`;
    const ent = this.kernel.upsert({
      id,
      type: "Standard",
      name: `${std.name} (tailored)`,
      standardId,
      layer: std.layer,
      status: "TAILORED",
      tailoring,
      requiredEvidence: std.requiredEvidence,
      provenance: {
        ...std.provenance,
        tailoredFor: projectId,
        note: "Tailoring is a project decision; corpus entry remains informational"
      }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return ent;
  }

  /** bindEvidence: Performs bind evidence for this module. */
  bindEvidence(standardEntityId, evidenceId) {
    const std = this.kernel.store.get(standardEntityId);
    const ev = this.kernel.store.get(evidenceId);
    if (!std || !ev) throw new Error("Missing standard or evidence");
    this.kernel.link(std.id, "EVIDENCED_BY", ev.id);
    return this.kernel.upsert({
      ...std,
      status: "EVIDENCED",
      provenance: { ...std.provenance, evidencedBy: evidenceId, note: "Evidence linked; not a certification" }
    });
  }

  /** corpusSize: Performs corpus size for this module. */
  corpusSize() { return STANDARDS_CORPUS.length; }
}
