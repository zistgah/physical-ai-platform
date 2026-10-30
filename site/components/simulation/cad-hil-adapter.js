/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/cad-hil-adapter.js
 * FILE PURPOSE: CAD to HIL adapter. Hands a mesh to the HIL loop without relabeling simulation as hardware.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * CAD / HIL adapter – Iteration 04
 * CAD: import a simple component manifest into canonical Components.
 * HIL: produce Evidence with method HIL (distinct from pure simulation).
 * Not a full CAD kernel or real-time HIL runtime.
 */

export class CadHilAdapter {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** importCadManifest: Performs import cad manifest for this module. */
  importCadManifest(projectId, manifest) {
    const created = [];
    for (const item of manifest.components || []) {
      const id = item.id || `cad_${item.name}`;
      const comp = this.kernel.upsert({
        id,
        type: "Component",
        name: item.name,
        version: item.version || "1.0.0",
        source: "CAD",
        ports: item.ports || {},
        provenance: { origin: "cad-import", derivedFrom: manifest.id || "manifest", timestamp: this.kernel._now() }
      });
      this.kernel.link(projectId, "CONTAINS", id);
      created.push(comp);
    }
    return { imported: created.length, components: created, note: "CAD import is a manifest adapter, not a geometry kernel" };
  }

  /** runHil: Performs run hil for this module. */
  runHil(projectId, configId, scenario = {}) {
    const id = `hil_${Date.now().toString(36)}`;
    const artifact = this.kernel.upsert({
      id: `art_${id}`,
      type: "Artifact",
      name: "HIL Run",
      kind: "hil-run",
      configurationId: configId,
      scenario,
      provenance: { origin: "hil", derivedFrom: configId || projectId }
    });
    const evidence = this.kernel.upsert({
      id: `evd_${id}`,
      type: "Evidence",
      name: "HIL Evidence",
      state: "EXECUTED",
      method: "HIL",
      artifact: artifact.id,
      provenance: { origin: "hil", artifact: artifact.id, note: "HIL execution ≠ physical verification" }
    });
    this.kernel.link(projectId, "CONTAINS", artifact.id);
    this.kernel.link(projectId, "CONTAINS", evidence.id);
    return { artifact, evidence };
  }
}
