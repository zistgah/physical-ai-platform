/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/workbench/build-adapter.js
 * FILE PURPOSE: Build workbench adapter. Projects the canonical graph into the build view.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Canonical graph adapter for the existing Build workbench.
 *
 * This adapter is intentionally read-only. It projects the canonical project
 * graph into the small model shape consumed by a workbench without creating a
 * second store, ontology, or semantic model.
 */


function note(kernel, code, status, message, entityId = null) {
  return {
    id: `workbench-note-${code.toLowerCase()}${entityId ? `-${entityId}` : ""}`,
    code,
    status,
    message,
    entityId
  };
}

/**
 * Build the existing workbench model from one canonical project graph.
 *
 * The adapter does not mutate the kernel and does not maintain another store.
 * System -> Component -> Port is followed through canonical HAS_COMPONENT and
 * HAS_PORT relations. Missing required structure is represented as HOLD rather
 * than fabricated data.
 *
 * @param {import("../core/canonical-kernel.js").CanonicalKernel} kernel
 * @param {string} projectId
 * @returns {{projectId:string, systems:Array, ports:Array, upgradeNotes:Array}}
 */
export function buildWorkbenchModel(kernel, projectId) {
  if (!kernel || typeof kernel.getProjectGraph !== "function") {
    throw new TypeError("buildWorkbenchModel requires a canonical kernel");
  }
  if (!projectId) throw new Error("projectId is required");

  const graph = kernel.getProjectGraph(projectId);
  const entities = new Map(graph.entities.map(entity => [entity.id, entity]));
  const outgoing = new Map();

  for (const relation of graph.relations) {
    if (!outgoing.has(relation.source)) outgoing.set(relation.source, []);
    outgoing.get(relation.source).push(relation);
  }

  const systems = graph.entities
    .filter(entity => entity.type === "System")
    .map(system => {
      const componentIds = (outgoing.get(system.id) || [])
        .filter(relation => relation.relation === "HAS_COMPONENT")
        .map(relation => relation.target)
        .filter(id => entities.get(id)?.type === "Component");

      const components = componentIds.map(id => entities.get(id));
      return {
        id: system.id,
        name: system.name || system.id,
        version: system.version || null,
        architectureVersion: system.architectureVersion || null,
        components: components.map(component => ({
          id: component.id,
          name: component.name || component.id
        }))
      };
    });

  const componentIds = new Set(
    systems.flatMap(system => system.components.map(component => component.id))
  );

  const ports = graph.entities
    .filter(entity => entity.type === "Port")
    .filter(portEntity => {
      return graph.relations.some(relation =>
        relation.relation === "HAS_PORT" &&
        relation.target === portEntity.id &&
        componentIds.has(relation.source)
      );
    })
    .map(portEntity => {
      const owner = graph.relations.find(relation =>
        relation.relation === "HAS_PORT" && relation.target === portEntity.id
      );
      return {
        id: portEntity.id,
        name: portEntity.name || portEntity.id,
        componentId: owner?.source || null,
        direction: portEntity.direction ?? null,
        interface: portEntity.portType ?? portEntity.interface ?? null,
        unit: portEntity.unit ?? null,
        frame: portEntity.frame ?? null,
        domain: portEntity.domain ?? null
      };
    });

  const upgradeNotes = [];

  if (systems.length === 0) {
    upgradeNotes.push(note(
      kernel,
      "SYSTEM_MISSING",
      "HOLD",
      "No System is present in the project graph; the Build workbench cannot render a system model."
    ));
  }

  for (const system of systems) {
    if (system.components.length === 0) {
      upgradeNotes.push(note(
        kernel,
        "COMPONENTS_MISSING",
        "HOLD",
        `System ${system.id} has no canonical HAS_COMPONENT path to a Component.`,
        system.id
      ));
    }

    if (!system.architectureVersion) {
      upgradeNotes.push(note(
        kernel,
        "ARCHITECTURE_VERSION_UNSPECIFIED",
        "HOLD",
        `System ${system.id} does not declare architectureVersion; an upgrade path is unspecified.`,
        system.id
      ));
    }
  }

  if (systems.length > 0 && ports.length === 0) {
    upgradeNotes.push(note(
      kernel,
      "PORTS_MISSING",
      "HOLD",
      "Systems are present but no Port is reachable through the canonical HAS_COMPONENT -> HAS_PORT path."
    ));
  }

  return {
    projectId,
    systems,
    ports,
    upgradeNotes
  };
}
