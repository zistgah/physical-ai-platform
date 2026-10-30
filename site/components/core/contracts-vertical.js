/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/contracts-vertical.js
 * FILE PURPOSE: Vertical contracts. Domain-specific port and capability checks layered over the generic contract.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Unified vertical contracts – Iteration 05
 * One contract dialect. Kernel remains semantic authority.
 * Each contract identifies identity, required fields, relations, lifecycle, provenance, failure semantics.
 */

export const VERTICAL_CONTRACTS = {
  Solid: {
    required: ["id", "type", "mesh", "volume"],
    optional: ["planes", "feature", "sketchId"],
    relations: ["DERIVED_FROM", "HAS_GEOMETRY"],
    lifecycle: ["DRAFT", "VALID"],
    failure: "volume not equal to mesh integral, or mesh not watertight"
  },
  Component: {
    required: ["id", "type", "name", "version"],
    optional: ["ports", "capabilities", "provenance"],
    relations: ["HAS_PORT", "CONNECTS_TO", "ALLOCATED_TO"],
    lifecycle: ["DRAFT", "ACTIVE", "OBSOLETE"],
    failure: "missing required field or invalid port"
  },
  Requirement: {
    required: ["id", "type", "name"],
    optional: ["text", "status"],
    relations: ["ALLOCATED_TO", "VERIFIED_BY"],
    lifecycle: ["DRAFT", "ALLOCATED", "VERIFIED"],
    failure: "orphan requirement (no allocation and no test)"
  },
  Configuration: {
    required: ["id", "type", "items", "status"],
    optional: ["fingerprint", "kind"],
    relations: ["CONTAINS"],
    lifecycle: ["DRAFT", "FROZEN"],
    failure: "mutation of FROZEN configuration"
  },
  Evidence: {
    required: ["id", "type", "state", "method"],
    optional: ["artifact", "configurationId", "subject"],
    relations: ["DERIVED_FROM"],
    lifecycle: ["PLANNED", "EXECUTED", "TESTED", "VERIFIED", "VALIDATED"],
    failure: "missing method or silent promotion"
  },
  Test: {
    required: ["id", "type", "name"],
    optional: ["method", "status"],
    relations: ["VERIFIES"],
    lifecycle: ["PLANNED", "EXECUTED"],
    failure: "orphan test"
  },
  Hazard: {
    required: ["id", "type", "name", "status"],
    optional: ["hazardType", "severity"],
    relations: ["CONTAINS"],
    lifecycle: ["UNKNOWN", "CONTROLLED", "ACCEPTED", "CLOSED"],
    failure: "UNKNOWN status blocks GO"
  },
  ComplianceCase: {
    required: ["id", "type", "state"],
    optional: ["profileId"],
    relations: ["CONTAINS"],
    lifecycle: ["APPLICABLE", "TAILORED", "ALLOCATED", "VERIFIED", "ACCEPTED", "WAIVED"],
    failure: "UNKNOWN/PROHIBITED blocks"
  },
  WorkOrder: {
    required: ["id", "type", "componentId", "status"],
    optional: ["routing"],
    relations: ["MANUFACTURED_BY"],
    lifecycle: ["PLANNED", "ASSEMBLE", "INSPECT", "CLOSE"],
    failure: "inspection without evidence"
  },
  Deployment: {
    required: ["id", "type", "configurationId", "status"],
    optional: ["location", "fleetId"],
    relations: ["CONTAINS"],
    lifecycle: ["PLANNED", "ACTIVE", "RETIRED"],
    failure: "deployment without configuration"
  },
  Curriculum: {
    required: ["id", "type", "grade"],
    optional: ["concepts", "activities"],
    relations: ["CONTAINS"],
    lifecycle: ["DRAFT", "ACTIVE"],
    failure: "path without safety note when required"
  },
  Experiment: {
    required: ["id", "type", "question", "hypothesis"],
    optional: ["variables", "procedure"],
    relations: ["PRODUCES"],
    lifecycle: ["PLANNED", "EXECUTED", "PUBLISHED"],
    failure: "publication without experiment"
  },
  Funding: {
    required: ["id", "type", "amount"],
    optional: ["status"],
    relations: ["CONTAINS"],
    lifecycle: ["PROPOSED", "COMMITTED", "CLOSED"],
    failure: "aggregation without provenance"
  }
};

/** validateContract: Vertical contracts. Domain-specific port and capability checks layered over the generic contract. */
export function validateContract(entity) {
  const c = VERTICAL_CONTRACTS[entity?.type];
  if (!c) return { valid: true, contract: null, note: "no vertical contract for type" };
  const missing = c.required.filter(f => entity[f] == null || entity[f] === "");
  return {
    valid: missing.length === 0,
    contract: entity.type,
    missing,
    failureSemantics: c.failure
  };
}
