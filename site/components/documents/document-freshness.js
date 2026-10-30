/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/document-freshness.js
 * FILE PURPOSE: document freshness. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Detects stale documents from canonical graph revision changes.
 * Released documents are never silently regenerated.
 */
export function assessDocumentFreshness(document, currentGraph) {
  const oldRevision=document?.source_baseline?.graph_revision ?? null;
  const newRevision=currentGraph?.revision ?? currentGraph?.version ?? null;
  const stale=oldRevision !== newRevision;
  return {
    state: stale ? "STALE" : "CURRENT",
    prior_revision: oldRevision,
    current_revision: newRevision,
    action: stale ? (["RELEASED","SUBMITTED","PUBLISHED"].includes(document.status)
      ? "CREATE_NEW_REVISION_FOR_REGENERATION" : "REVIEW_AND_REGENERATE") : "NONE"
  };
}
