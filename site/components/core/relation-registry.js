/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/relation-registry.js
 * FILE PURPOSE: Relation registry. The typed relation vocabulary and its direction rules.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { PACKAGE_RELATIONS } from "./relation-overlay.js";

/**
 * Relation registry – Iteration 08
 * Every typed relation is either defined or explicitly unresolved.
 * Unresolved relations are allowed but reported. They are not silent.
 */

export const RESOLVED_RELATIONS = {
  CONTAINS: { source: ["Project","System","Subsystem","AssuranceCase","Claim","Fleet","Experiment","Course"], target: ["*"], inverse: "PART_OF", allowDuplicate: false },
  PART_OF: { source: ["*"], target: ["Project","System","Subsystem"], inverse: "CONTAINS", allowDuplicate: false },
  ALLOCATED_TO: { source: ["Requirement"], target: ["Component","System","Subsystem"], inverse: "ALLOCATES", allowDuplicate: false },
  ALLOCATES: { source: ["Component","System"], target: ["Requirement"], inverse: "ALLOCATED_TO", allowDuplicate: false },
  VERIFIES: { source: ["Test"], target: ["Requirement"], inverse: "VERIFIED_BY", allowDuplicate: false },
  VERIFIED_BY: { source: ["Requirement"], target: ["Test"], inverse: "VERIFIES", allowDuplicate: false },
  DERIVED_FROM: { source: ["Evidence","Artifact"], target: ["*"], inverse: null, allowDuplicate: false },
  CONNECTS_TO: { source: ["Component","Port","Connection"], target: ["Component","Port","Connection"], inverse: "CONNECTS_TO", allowDuplicate: false, metadataRequired: true },
  GOVERNED_BY: { source: ["Intent","Plan","Execution"], target: ["Policy"], inverse: null, allowDuplicate: false },
  HAS_COMPONENT: { source: ["System","Subsystem"], target: ["Component"], inverse: null, allowDuplicate: false },
  HAS_PORT: { source: ["Component"], target: ["Port"], inverse: null, allowDuplicate: false },
  HAS_CONNECTION: { source: ["System","Project"], target: ["Connection"], inverse: null, allowDuplicate: false },
  REQUIRES: { source: ["Gate","Requirement","System"], target: ["Requirement","Capability","Standard"], inverse: null, allowDuplicate: false },
  PRODUCES: { source: ["*"], target: ["*"], inverse: null, allowDuplicate: false },
  EVIDENCED_BY: { source: ["Argument","Claim","Standard","AssuranceCase"], target: ["Evidence"], inverse: null, allowDuplicate: false },
  SUPPORTED_BY: { source: ["Claim"], target: ["Argument"], inverse: null, allowDuplicate: false },
  AUTHORIZED_BY: { source: ["Intent","Plan","Execution","Person"], target: ["Person","Policy"], inverse: null, allowDuplicate: false },
  CONTROLLED_BY: { source: ["Hazard"], target: ["Requirement","Component"], inverse: null, allowDuplicate: false },
  CAUSED_BY: { source: ["Hazard"], target: ["Hazard","Component","Event"], inverse: null, allowDuplicate: false },
  CONFIGURED_BY: { source: ["System","Component","Deployment","Evidence"], target: ["Configuration"], inverse: null, allowDuplicate: false }
};

export const UNRESOLVED_RELATIONS = [
  "INSTANCE_OF","IMPLEMENTS","SATISFIES","DEPENDS_ON","CONSTRAINED_BY",
  "USES","CONSUMES","EMITS","RECEIVES","HAS_CAPABILITY","HAS_STATE","HAS_EVENT",
  "GENERATES","TESTED_BY","SIMULATED_BY","DEPLOYED_AS","OPERATES_IN",
  "SUPPLIED_BY","MANUFACTURED_BY","SERVICED_BY","HAS_SUBSYSTEM","HAS_REQUIREMENT",
  "PRODUCES_EVIDENCE","VALIDATES","HAS_STAGE","HAS_GATE","AFFECTS","BASELINED_AS","HAS_CONFIGURATION"
];

/** relationStatus: Relation registry. The typed relation vocabulary and its direction rules. */
export function relationStatus(name) {
  if (RESOLVED_RELATIONS[name]) return { defined: true, unresolved: false, def: RESOLVED_RELATIONS[name], source: "registry" };
  const overlay = PACKAGE_RELATIONS[name];
  if (overlay && overlay.unresolved !== true && overlay.architecturalStatus !== "UNRESOLVED") {
    return { defined: true, unresolved: false, def: overlay, source: "overlay" };
  }
  if (overlay && (overlay.unresolved === true || overlay.architecturalStatus === "UNRESOLVED")) {
    return { defined: false, unresolved: true, def: overlay, source: "overlay", note: overlay.note || "Unresolved by architecture" };
  }
  if (UNRESOLVED_RELATIONS.includes(name)) return { defined: false, unresolved: true, def: null, source: "registry" };
  return { defined: false, unresolved: false, def: null, source: null };
}
