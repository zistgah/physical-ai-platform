/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/sharing-boundary.js
 * FILE PURPOSE: Sharing boundary. Publication is an explicit action. Unverified import cannot be published when verification is required.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Sharing / publication boundary – Iteration 05
 * Publication is an explicit action. Never auto-publishes private data.
 */

export class SharingBoundary {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** publish: Publishes an object only as an explicit action. */
  publish(objectId, meta = {}) {
    const obj = this.kernel.store.get(objectId);
    if (!obj) throw new Error("Object not found");
    if (obj.trust && obj.trust.verified === false && meta.requireVerified) {
      throw new Error("Cannot publish unverified imported material");
    }
    const pubId = `pubshare_${objectId}`;
    const record = this.kernel.upsert({
      id: pubId,
      type: "Publication",
      name: `Publication of ${objectId}`,
      subjectId: objectId,
      publicationState: "PUBLISHED",
      privacyState: meta.privacy || "PUBLIC",
      canonicalUrl: meta.url || null,
      provenance: {
        origin: "explicit-publication",
        derivedFrom: objectId,
        timestamp: this.kernel._now(),
        note: "Explicit publication action; no automatic export of restricted data"
      }
    });
    this.kernel.link(objectId, "PRODUCES", pubId);
    return record;
  }
}
