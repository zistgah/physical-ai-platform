/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/relation-overlay.js
 * FILE PURPOSE: Relation overlay. Adds view relations without changing the kernel vocabulary.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-RELATION-CLOSE - Iteration 10 additive relation registry overlay.
 *
 * This file is intentionally NOT imported by canonical-kernel.js or
 * relation-registry.js. It declares package-level relation semantics without
 * silently activating them in the existing runtime registry.
 *
 * Architectural distinctions preserved:
 * - HAS_CONFIGURATION is association/availability, not CONFIGURED_BY binding.
 * - TESTED_BY is subject -> Test, not VERIFIES.
 * - SUPPLIED_BY is supply-chain provenance, not DEPENDS_ON.
 * - SIMULATED_BY is simulation association, not verification or PHYSICAL_TEST.
 * - MANUFACTURED_BY remains unresolved because the preserved architecture does
 *   not settle its direction. The WorkOrder -> Component edge is recorded only
 *   as an implementation precedent.
 */

const broadDependencyTypes = [
  "Mission", "System", "Subsystem", "Component", "Capability", "Requirement",
  "Constraint", "Policy", "Intent", "Plan", "Execution", "Resource",
  "Environment", "Test", "Experiment", "Evidence", "Artifact", "Configuration",
  "Dataset", "Model", "Process", "Deployment", "Telemetry", "Incident",
  "Simulation", "Scenario", "Connection", "WorkInstruction", "WorkOrder",
  "Fleet", "Curriculum", "Course", "Lesson", "ServiceEvent"
];

export const PACKAGE_RELATIONS = {
  HAS_STAGE: {
    source: ["Project"],
    target: ["LifecycleStage"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED"
  },

  HAS_GATE: {
    source: ["Project"],
    target: ["Gate"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Gate-to-stage association is not inferred as a graph relation; the preserved lifecycle gate table supplies that mapping."
  },

  DEPENDS_ON: {
    source: [...broadDependencyTypes],
    target: [...broadDependencyTypes],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Cross-domain dependency relation. It must not be reduced to supply-chain dependency or to Component -> Supplier."
  },

  SUPPLIED_BY: {
    source: ["Component", "Material"],
    target: ["Supplier"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Process is intentionally excluded unless a Process entity is explicitly modeled as a supplied capability."
  },

  MANUFACTURED_BY: {
    source: ["Component", "WorkOrder"],
    target: ["Process", "Organization", "Component"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    precedentDirection: "WorkOrder -> Component",
    note: "Component is manufactured by Process or Organization. WorkOrder -> Component remains valid factory precedent. Neither direction is dropped."
  },

  HAS_CONFIGURATION: {
    source: ["Project", "System", "Subsystem", "Component", "Deployment"],
    target: ["Configuration"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Association/availability of a configuration. It is distinct from CONFIGURED_BY, which records operative binding."
  },

  TESTED_BY: {
    source: [
      "Mission", "System", "Subsystem", "Component", "Requirement", "Capability",
      "Process", "Model", "Configuration", "Deployment", "WorkOrder", "Artifact"
    ],
    target: ["Test"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Subject -> Test exercise/coverage relation. It does not assert formal requirement verification."
  },

  SIMULATED_BY: {
    source: [
      "Mission", "System", "Subsystem", "Component", "Requirement", "Capability",
      "Process", "Model", "Configuration", "Deployment", "Scenario"
    ],
    target: ["Simulation"],
    inverse: null,
    allowDuplicate: false,
    unresolved: false,
    architecturalStatus: "DEFINED",
    note: "Digital-thread simulation association. It does not imply verification, validation, or physical testing."
  }
};
