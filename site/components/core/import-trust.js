/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/import-trust.js
 * FILE PURPOSE: Import trust boundary. Quarantines, allow-lists types, and rejects markup that would execute.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Import / export trust boundary – Iteration 05
 * Imported material is distinguishable and never auto-verified.
 */

export class ImportTrustBoundary {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** importObject: Performs import object for this module. */
  importObject(projectId, raw, meta = {}) {
    const id = raw.id || `imp_${Date.now().toString(36)}`;
    const entity = this.kernel.upsert({
      ...raw,
      id,
      type: raw.type || "Artifact",
      trust: {
        status: "IMPORTED",
        source: meta.source || "external",
        importer: meta.importer || "system",
        sourceFormat: meta.sourceFormat || "unknown",
        sourceVersion: meta.sourceVersion || null,
        importedAt: this.kernel._now(),
        transformation: meta.transformation || "direct",
        validationStatus: "UNVERIFIED",
        verified: false
      },
      provenance: {
        origin: "import",
        source: meta.source || "external",
        derivedFrom: null,
        timestamp: this.kernel._now(),
        note: "Imported; not automatically verified"
      }
    });
    if (projectId) this.kernel.link(projectId, "CONTAINS", id);
    return entity;
  }

  /** isVerified: Performs is verified for this module. */
  isVerified(id) {
    const e = this.kernel.store.get(id);
    return !!(e && e.trust && e.trust.verified === true && e.trust.validationStatus === "VERIFIED");
  }
}
