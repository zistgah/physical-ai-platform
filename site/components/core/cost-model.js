/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/cost-model.js
 * FILE PURPOSE: Cost model. Rolls up declared numeric costs. Does not estimate. Not an ERP.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-BUSINESS-COST - declared cost rollup.
 *
 * Uses only canonical Component costMaterial, costProcess, and costLabor
 * fields when their values are finite numbers. Missing or non-numeric values
 * remain UNSPECIFIED and are reported as undeclared. No estimation and no ERP.
 */
export class CostModel {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /**
   * Roll up declared component costs for a project.
   *
   * Components are obtained from the canonical project graph. Each line is
   * ordered deterministically by component id. A field is included only when
   * its value is a finite JavaScript number. Missing values are not converted
   * to zero.
   */
  rollup(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const components = graph.entities
      .filter(e => e.type === "Component")
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const lines = components.map(component => {
      const line = { id: component.id, name: component.name };

      for (const field of ["costMaterial", "costProcess", "costLabor"]) {
        const value = component[field];
        if (typeof value === "number" && Number.isFinite(value)) {
          line[field] = value;
        }
      }

      const undeclared = ["costMaterial", "costProcess", "costLabor"]
        .filter(field => !(field in line));

      line.undeclared = undeclared;
      return line;
    });

    let total = 0;
    for (const line of lines) {
      for (const field of ["costMaterial", "costProcess", "costLabor"]) {
        if (typeof line[field] === "number") total += line[field];
      }
    }

    return {
      projectId,
      lines,
      total,
      undeclared: lines.flatMap(line =>
        line.undeclared.map(field => ({ componentId: line.id, field, status: "UNSPECIFIED" }))
      ),
      provenance: {
        origin: "business-cost",
        derivedFrom: projectId,
        timestamp: this.kernel._now(),
        note: "Declared numeric costs only; no estimation and not an ERP."
      }
    };
  }

  /**
   * Alias for callers using calculate terminology.
   */
  calculate(projectId) {
    return this.rollup(projectId);
  }
}
