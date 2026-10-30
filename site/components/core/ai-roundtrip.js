/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/ai-roundtrip.js
 * FILE PURPOSE: AI round trip. Context leaves as identifiers from the graph. A proposal returns as an entity. It is not authority. Acceptance is a separate act by a role.
 * MRD 2: AI is a proposal, not authority.
 */
import { buildContext } from "./ai-guide.js";

export function toProvider(kernel, projectId, role, question) {
  const ctx = buildContext(kernel, projectId, role, question);
  if (ctx.status === "HOLD") return { outcome: "HOLD", reason: ctx.gaps.join("; "), context: ctx };
  return { outcome: "OK", context: ctx, note: "Identifiers only. No authority." };
}

export function fromProvider(kernel, projectId, proposal) {
  if (!proposal?.text) return { outcome: "HOLD", reason: "Proposal is empty" };
  const id = proposal.id || `proposal_${Date.now().toString(36)}`;
  const entity = kernel.upsert({
    id, type: "Intent", name: "AI proposal", text: proposal.text, status: "PROPOSAL", accepted: false,
    provenance: { origin: "ai-roundtrip", derivedFrom: projectId, note: "Proposal. Not authority." }
  });
  kernel.link(projectId, "CONTAINS", entity.id);
  return { outcome: "PROPOSAL", id: entity.id, accepted: false };
}

export function accept(kernel, proposalId, role) {
  if (!role) return { outcome: "HOLD", reason: "No role" };
  const p = kernel.store.get(proposalId);
  if (!p || p.status !== "PROPOSAL") return { outcome: "HOLD", reason: "Not a proposal" };
  p.status = "ACCEPTED";
  p.accepted = true;
  p.acceptedBy = role;
  kernel.upsert(p);
  return { outcome: "OK", acceptedBy: role };
}
