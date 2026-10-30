/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/import-quarantine.js
 * FILE PURPOSE: Import quarantine pipeline. Stages a payload before it becomes a component.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Import quarantine – Iteration 23
 * quarantine → parse → identify → license → schema → interface → provenance → component.
 * A failed stage HOLDs. Nothing is admitted as a component before the last stage.
 */
const STAGES = ["quarantine", "parse", "identify", "license", "schema", "interface", "provenance", "component"];

export class ImportQuarantine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** admit: Performs admit for this module. */
  admit(projectId, payload = {}) {
    const missing = ["id", "name", "schema", "license", "ports"].filter(k => payload[k] == null);
    if (missing.length) return { outcome: "HOLD", stage: "quarantine", reason: `Missing ${missing.join(", ")}` };
    if (payload.license === "UNKNOWN") return { outcome: "HOLD", stage: "license", reason: "License is UNKNOWN" };
    if (payload.schema !== "component-v1") return { outcome: "HOLD", stage: "schema", reason: "Schema is not component-v1" };
    if (!Array.isArray(payload.ports) || !payload.ports.length) return { outcome: "HOLD", stage: "interface", reason: "No ports" };
    const id = `imp_${payload.id}`;
    const component = this.kernel.upsert({
      id, type: "Component", name: payload.name,
      imported: true,
      license: payload.license,
      ports: payload.ports,
      provenance: { origin: "import-quarantine", derivedFrom: projectId, stages: STAGES }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return { outcome: "ADMITTED", stages: STAGES, component };
  }
}
