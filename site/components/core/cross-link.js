/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/cross-link.js
 * FILE PURPOSE: A cross-link between two projects. Both must exist. A missing endpoint holds. The link is an entity, not a copy.
 * MRD 12.
 */
export function crossLink(kernel, fromId, toId) {
  const from = kernel.store.get(fromId);
  const to = kernel.store.get(toId);
  if (!from || from.type !== "Project") return { outcome: "HOLD", reason: "Source is not a project" };
  if (!to || to.type !== "Project") return { outcome: "HOLD", reason: "Target is not a project" };
  const id = `link_${fromId}_${toId}`;
  const link = kernel.upsert({
    id, type: "Connection", name: `${fromId} to ${toId}`, from: fromId, to: toId,
    provenance: { origin: "cross-link", derivedFrom: fromId }
  });
  kernel.link(fromId, "CONTAINS", link.id);
  return { outcome: "OK", from: fromId, to: toId, link: link.id };
}
