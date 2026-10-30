/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-binding.js
 * FILE PURPOSE: Binds a standard to a project requirement and the evidence that supports it.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Standards binding – Iteration 17
 * A project can accept a standard as binding. A binding without evidence HOLDs.
 * This is project acceptance, not a regulator's determination.
 */
export class StandardsBinding {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** accept: Performs accept for this module. */
  accept(projectId, standardId, { role }) {
    const ROLES = new Set(["compliance-lead", "safety-authority", "pic"]);
    if (!role) return { outcome: "HOLD", reason: "Acceptance role is UNSPECIFIED" };
    if (!ROLES.has(role)) return { outcome: "HOLD", reason: "Role is not in the registry" };
    const standard = this.kernel.store.get(standardId);
    if (!standard) return { outcome: "HOLD", reason: "Standard is UNSPECIFIED" };
    const binding = this.kernel.upsert({
      id: `bind_${projectId}_${standardId}`,
      type: "ComplianceCase",
      name: `Binding ${standardId}`,
      standardId,
      binding: "PROJECT_ACCEPTED",
      acceptedBy: role,
      evidenceIds: [],
      regulatoryDetermination: false,
      provenance: { origin: "standards-binding", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", binding.id);
    this.kernel.link(binding.id, "GOVERNED_BY", standardId);
    return binding;
  }

  /** attachEvidence: Performs attach evidence for this module. */
  attachEvidence(bindingId, evidenceId) {
    const binding = this.kernel.store.get(bindingId);
    const evidence = this.kernel.store.get(evidenceId);
    if (!binding || !evidence) return { outcome: "HOLD", reason: "Binding or evidence is UNSPECIFIED" };
    binding.evidenceIds = [...binding.evidenceIds, evidenceId];
    return binding;
  }

  /** gate: Performs gate for this module. */
  gate(bindingId) {
    const binding = this.kernel.store.get(bindingId);
    if (!binding) return { outcome: "HOLD", reason: "Binding is UNSPECIFIED" };
    if (!binding.evidenceIds.length) return { outcome: "HOLD", reason: "Binding has no evidence" };
    const evidence = binding.evidenceIds.map(id => this.kernel.store.get(id));
    if (evidence.some(e => !e || e.type !== "Evidence")) return { outcome: "HOLD", reason: "Binding evidence is not Evidence" };
    return { outcome: "PASS", binding: binding.binding, regulatoryDetermination: false };
  }
}
