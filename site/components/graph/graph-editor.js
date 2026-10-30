/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/graph/graph-editor.js
 * FILE PURPOSE: Graph editor. Typed views for architecture, physical, electrical, manufacturing, software, event, commercial, and regulatory. Rejects incompatible connections.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Graph editor – Iteration 20
 * Architecture, physical, electrical, manufacturing views.
 * Incompatible ports cannot connect.
 */
const VIEWS = {
  architecture: ["System", "Subsystem", "Component", "Port", "Interface"],
  physical: ["Component", "Solid", "Geometry", "Sketch"],
  electrical: ["Component", "Port", "Interface", "Connection"],
  manufacturing: ["WorkOrder", "Process", "Material", "Component"],
  software: ["Software", "Module", "Function", "Component"],
  event: ["Event", "State", "Transition"],
  commercial: ["Cost", "Funding", "Commercial", "Stock"],
  regulatory: ["Standard", "ComplianceCase", "Hazard"],
  physical3d: ["Geometry", "Solid"]
};

export class GraphEditor {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** view: Performs view for this module. */
  view(projectId, name) {
    const types = VIEWS[name];
    if (!types) return { outcome: "HOLD", reason: `Unknown view ${name}` };
    const graph = this.kernel.getProjectGraph(projectId);
    const entities = graph.entities.filter(e => types.includes(e.type));
    if (name === "electrical") {
      return { outcome: "OK", view: name, entities: entities.filter(e => e.type !== "Port" || e.domain === "electrical" || e.domain == null) };
    }
    if (name === "physical3d") {
      const placed = entities.map(e => ({
        id: e.id, type: e.type, name: e.name,
        position: e.position || [0, 0, 0],
        bounds: e.bounds || null
      }));
      if (placed.some(e => !e.bounds)) return { outcome: "HOLD", view: name, entities: placed, reason: "A solid has no bounds" };
      return { outcome: "OK", view: name, entities: placed };
    }
    return { outcome: "OK", view: name, entities };
  }

  /** connect: Connects two ports. Rejects incompatible types or units. */
  connect(projectId, aId, bId) {
    const a = this.kernel.store.get(aId);
    const b = this.kernel.store.get(bId);
    if (!a || !b || a.type !== "Port" || b.type !== "Port") return { outcome: "HOLD", reason: "Connection needs two ports" };
    if (a.domain && b.domain && a.domain !== b.domain) return { outcome: "HOLD", reason: `Incompatible domains ${a.domain} and ${b.domain}` };
    if (a.unit && b.unit && a.unit !== b.unit) return { outcome: "HOLD", reason: `Incompatible units ${a.unit} and ${b.unit}` };
    const id = `conn_${aId}_${bId}`;
    const conn = this.kernel.upsert({ id, type: "Connection", name: id, provenance: { origin: "graph-editor", derivedFrom: projectId } });
    this.kernel.link(projectId, "CONTAINS", id);
    this.kernel.link(aId, "CONNECTS_TO", bId, { domain: a.domain, unit: a.unit });
    return { outcome: "OK", connection: conn };
  }
}
