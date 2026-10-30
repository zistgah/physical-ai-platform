/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/manufacturing-engine.js
 * FILE PURPOSE: Manufacturing engine. BOM projection and work orders over the graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Manufacturing Engine – Iteration 03
 * BOM projections over the canonical graph. Not independent stores.
 * Process plans, supply-chain links, sovereignty analysis, cost substrate.
 */

export class ManufacturingEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** generateBOMs: Performs generate b o ms for this module. */
  generateBOMs(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const components = graph.entities.filter(e => e.type === "Component");
    const connections = graph.entities.filter(e => e.type === "Connection");
    const systems = graph.entities.filter(e => e.type === "System");

    const ebom = {
      kind: "EBOM",
      items: components.map(c => ({ id: c.id, name: c.name, version: c.version, type: "engineering" })),
      provenance: { derivedFrom: projectId, generator: "ManufacturingEngine/0.1.0-iter03", note: "Projection, not physical manufacture" }
    };
    const hbom = {
      kind: "HBOM",
      items: components.filter(c => c.capabilities?.includes("MOTION") || c.capabilities?.includes("ENERGY_STORAGE") || c.name?.includes("Motor") || c.name?.includes("Battery"))
        .map(c => ({ id: c.id, name: c.name, version: c.version, type: "hardware" })),
      provenance: { derivedFrom: projectId, generator: "ManufacturingEngine/0.1.0-iter03" }
    };
    const sbom = {
      kind: "SBOM",
      items: components.filter(c => c.capabilities?.includes("CONTROL") || c.name?.includes("Controller"))
        .map(c => ({ id: c.id, name: c.name, version: c.version, type: "software" })),
      provenance: { derivedFrom: projectId, generator: "ManufacturingEngine/0.1.0-iter03" }
    };
    const mbom = {
      kind: "MBOM",
      items: components.map(c => ({ id: c.id, name: c.name, process: "assemble", inspection: "visual" })),
      provenance: { derivedFrom: projectId, generator: "ManufacturingEngine/0.1.0-iter03" }
    };
    const cbom = { kind: "CBOM", items: [], provenance: { derivedFrom: projectId, note: "No chemical data present" } };
    const abom = { kind: "ABOM", items: [], provenance: { derivedFrom: projectId, note: "No AI model data present" } };
    const systemBom = {
      kind: "SystemBOM",
      systems: systems.map(s => s.id),
      components: components.map(c => c.id),
      connections: connections.map(c => c.id),
      provenance: { derivedFrom: projectId, generator: "ManufacturingEngine/0.1.0-iter03" }
    };

    return { ebom, hbom, sbom, mbom, cbom, abom, systemBom };
  }

  /** processPlan: Performs process plan for this module. */
  processPlan(componentId) {
    const c = this.kernel.store.get(componentId);
    if (!c) return null;
    return {
      componentId,
      material: c.material || "UNSPECIFIED",
      process: c.process || "assemble",
      machine: c.machine || "UNSPECIFIED",
      tool: c.tool || "UNSPECIFIED",
      inspection: "visual + functional",
      cycleTime: c.cycleTime || null,
      yield: c.yield || null,
      cost: {
        material: c.costMaterial || null,
        process: c.costProcess || null,
        labor: c.costLabor || null
      },
      provenance: { derivedFrom: componentId, note: "Planning slice, not factory execution" }
    };
  }

  /** sovereigntyAnalysis: Performs sovereignty analysis for this module. */
  sovereigntyAnalysis(projectId) {
    const graph = this.kernel.getProjectGraph(projectId);
    const components = graph.entities.filter(e => e.type === "Component");
    const singleSource = components.filter(c => !c.alternateSuppliers || c.alternateSuppliers.length === 0);
    const singleJurisdiction = components.filter(c => c.jurisdiction && !c.alternateJurisdictions);
    return {
      projectId,
      singleSource: singleSource.map(c => ({ id: c.id, name: c.name, classification: "Dependency" })),
      singleJurisdiction: singleJurisdiction.map(c => c.id),
      nonSubstitutable: [],
      obsolete: components.filter(c => c.status === "OBSOLETE").map(c => c.id),
      independentPaths: singleSource.length === 0 ? "multiple" : "limited",
      note: "Explainable classification; not a percentage score",
      progression: ["Dependency", "Controlled Dependency", "Replaceable Dependency", "Sovereign Capability"]
    };
  }
}
