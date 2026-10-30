/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-acceptance.js
 * FILE PURPOSE: Project-level standards acceptance. Records the project's decision to adopt, tailor, or waive a standard.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Standards acceptance – Iteration 07
 * Moves a project-scoped standard out of purely informational status.
 * Acceptance is project-scoped and evidence-backed.
 * It is not a regulatory certification or legal determination.
 */

import { STANDARDS_CORPUS } from "./standards-corpus.js";

export const PROJECT_STANDARD_STATES = [
  "INFORMATIONAL",
  "PROFILED",
  "PROJECT_ADOPTED",
  "TAILORED",
  "ALLOCATED",
  "EVIDENCED",
  "REVIEWED",
  "ACCEPTED"
];

export class StandardsAcceptance {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** profile: Performs profile for this module. */
  profile(projectId, standardId) {
    const std = STANDARDS_CORPUS.find(s => s.id === standardId);
    if (!std) throw new Error("Standard not in corpus");
    const id = `profile_${standardId}_${projectId}`;
    const ent = this.kernel.upsert({
      id,
      type: "Standard",
      name: std.name,
      standardId,
      layer: std.layer,
      title: std.title,
      topic: std.topic,
      authority: std.authority,
      requiredEvidence: [...(std.requiredEvidence || [])],
      status: "PROFILED",
      authorityScope: "PROJECT",
      regulatoryAuthority: false,
      provenance: {
        ...std.provenance,
        profiledFor: projectId,
        note: "Profiled for project; corpus entry remains informational"
      }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return ent;
  }

  /** adopt: Adopts a standard onto the project and copies its required evidence. */
  adopt(projectId, profileId) {
    const p = this.kernel.store.get(profileId);
    if (!p || p.status !== "PROFILED") throw new Error("Must adopt from PROFILED");
    return this.kernel.upsert({
      ...p,
      status: "PROJECT_ADOPTED",
      provenance: { ...p.provenance, adoptedAt: this.kernel._now(), note: "Project adoption; not regulatory" }
    });
  }

  /** review: Performs review for this module. */
  review(entityId, { reviewer, evidenceIds = [] }) {
    const ent = this.kernel.store.get(entityId);
    if (!ent) throw new Error("Standard entity not found");
    if (!evidenceIds.length) throw new Error("Review requires evidence");
    for (const eid of evidenceIds) {
      if (!this.kernel.store.get(eid)) throw new Error(`Missing evidence ${eid}`);
      this.kernel.link(ent.id, "EVIDENCED_BY", eid);
    }
    return this.kernel.upsert({
      ...ent,
      status: "REVIEWED",
      review: { reviewer, evidenceIds, timestamp: this.kernel._now() },
      provenance: { ...ent.provenance, reviewedBy: reviewer }
    });
  }

  /** accept: Performs accept for this module. */
  accept(entityId, { authority, rationale }) {
    const ent = this.kernel.store.get(entityId);
    if (!ent) throw new Error("Standard entity not found");
    if (ent.status !== "REVIEWED" && ent.status !== "EVIDENCED") {
      throw new Error("Acceptance requires REVIEWED or EVIDENCED status");
    }
    if (!authority) throw new Error("Acceptance requires project authority");
    if (!rationale) throw new Error("Acceptance requires rationale");
    return this.kernel.upsert({
      ...ent,
      status: "ACCEPTED",
      authorityScope: "PROJECT",
      regulatoryAuthority: false,
      acceptance: {
        authority,
        rationale,
        timestamp: this.kernel._now(),
        scope: "project",
        notRegulatoryCertification: true
      },
      provenance: {
        ...ent.provenance,
        acceptedBy: authority,
        note: "Project-scoped acceptance. Not a regulatory certification or legal determination."
      }
    });
  }

  /** projectAccepted: Performs project accepted for this module. */
  projectAccepted(projectId) {
    return this.kernel.getProjectGraph(projectId).entities
      .filter(e => e.type === "Standard" && e.status === "ACCEPTED")
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** isInformationalOnly: Performs is informational only for this module. */
  isInformationalOnly(projectId) {
    const accepted = this.projectAccepted(projectId);
    return accepted.length === 0;
  }
}
