/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fidelity-ladder.js
 * FILE PURPOSE: Fidelity ladder. L0 conceptual through L7 field. Promotion needs evidence of the higher method.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Fidelity ladder – Iteration 06
 * Distinct evidence methods: SIMULATION, SIL, HIL, PHIL, RIL, PHYSICAL_TEST.
 * Adapter/slice. Not a real-time HIL runtime or geometry CAD kernel.
 */

export class FidelityLadder {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** run: Performs run for this module. */
  run(projectId, { method = "SIL", configurationId, subjectId, scenario = {} } = {}) {
    const allowed = ["SIMULATION", "SIL", "HIL", "PHIL", "RIL"];
    if (!allowed.includes(method)) throw new Error(`Unsupported fidelity method ${method}`);
    const id = `${method.toLowerCase()}_${Date.now().toString(36)}`;
    const artifact = this.kernel.upsert({
      id: `art_${id}`,
      type: "Artifact",
      name: `${method} run`,
      kind: method.toLowerCase(),
      configurationId: configurationId || null,
      scenario,
      provenance: { origin: "fidelity-ladder", method, derivedFrom: configurationId || projectId }
    });
    const evidence = this.kernel.upsert({
      id: `evd_${id}`,
      type: "Evidence",
      name: `${method} evidence`,
      state: "EXECUTED",
      method,
      subject: subjectId || null,
      configurationId: configurationId || null,
      artifact: artifact.id,
      provenance: {
        origin: "fidelity-ladder",
        method,
        artifact: artifact.id,
        note: `${method} execution is not physical verification`
      }
    });
    this.kernel.link(projectId, "CONTAINS", artifact.id);
    this.kernel.link(projectId, "CONTAINS", evidence.id);
    return { artifact, evidence };
  }

  /** importGeometryManifest: Performs import geometry manifest for this module. */
  importGeometryManifest(projectId, manifest) {
    const created = [];
    for (const item of manifest.components || []) {
      const id = item.id;
      const comp = this.kernel.upsert({
        id,
        type: "Component",
        name: item.name,
        version: item.version || "1.0.0",
        geometry: item.geometry || null,
        material: item.material || null,
        interfaces: item.interfaces || [],
        source: "CAD",
        provenance: { origin: "cad-geometry-import", derivedFrom: manifest.id || "manifest", note: "Manifest adapter; not a geometry kernel" }
      });
      this.kernel.link(projectId, "CONTAINS", id);
      created.push(comp);
    }
    return { imported: created.length, components: created };
  }
}
