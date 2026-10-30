/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/gate-schemas.js
 * FILE PURPOSE: Gate schemas G0 to G12. Preconditions and evidence required to leave each lifecycle gate.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Per-gate lifecycle evidence schemas - Iteration 10.
 *
 * This is an overlay beside LifecycleEngine. It does not modify the lifecycle
 * engine, canonical kernel, relation registry, or standards corpus.
 *
 * Evidence binding is deliberately expressed through the canonical
 * CONFIGURED_BY relation from Evidence -> Configuration. A configurationId
 * field on Evidence is retained as an inspectable declaration, but the
 * relation is the operative binding.
 */

import { GATES } from "./lifecycle-gates.js";

const REQUIRED_EVIDENCE = Object.freeze({
  requirementCoverage: true,
  configurationId: true,
  hazardStatus: true,
  authority: true
});

const GATE_SCHEMA_DATA = Object.freeze([
  ["G0", "Opportunity", "Discover"],
  ["G1", "Concept", "Define"],
  ["G2", "Feasibility", "Research"],
  ["G3", "Architecture", "Architect"],
  ["G4", "Prototype", "Prototype"],
  ["G5", "MVP", "MVP"],
  ["G6", "Validation", "Validate"],
  ["G7", "Funding / Production Decision", "Fund"],
  ["G8", "Production Release", "Manufacture"],
  ["G9", "Market Release", "Deploy"],
  ["G10", "Operational Release", "Operate"],
  ["G11", "Major Revision", "Improve"],
  ["G12", "Retirement", "Retire"]
]);

function freezeSchema(id, name, stage) {
  return Object.freeze({
    id,
    name,
    stage,
    requiredEvidence: REQUIRED_EVIDENCE,
    evidenceBinding: "CONFIGURED_BY",
    failureStatuses: Object.freeze(["FAIL", "FAILED", "REJECTED", "UNACCEPTABLE"]),
    unknownStatuses: Object.freeze(["UNKNOWN", "UNASSESSED", "UNSPECIFIED"])
  });
}

export const GATE_SCHEMAS = Object.freeze(
  Object.fromEntries(GATE_SCHEMA_DATA.map(([id, name, stage]) => [
    id,
    freezeSchema(id, name, stage)
  ]))
);

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function normalizedStatus(value) {
  if (value === null || value === undefined) return null;
  return String(value).trim().toUpperCase();
}

function isFailure(value, failureStatuses) {
  if (value === true) return true;
  const status = normalizedStatus(value);
  return status ? failureStatuses.includes(status) : false;
}

function isUnknown(value, unknownStatuses) {
  const status = normalizedStatus(value);
  return status ? unknownStatuses.includes(status) : false;
}

function hasConfiguredBy(kernel, evidenceId, configurationId) {
  return kernel.store.relations.some(r =>
    r.source === evidenceId &&
    r.relation === "CONFIGURED_BY" &&
    r.target === configurationId
  );
}

function evidenceForRequirement(kernel, requirementId) {
  const tests = kernel.store.relations
    .filter(r => r.relation === "VERIFIES" && r.target === requirementId)
    .map(r => kernel.store.get(r.source))
    .filter(e => e?.type === "Test");

  const evidence = [];
  for (const test of tests) {
    for (const rel of kernel.store.relations.filter(
      r => r.relation === "DERIVED_FROM" && r.target === test.id
    )) {
      const ev = kernel.store.get(rel.source);
      if (ev?.type === "Evidence") evidence.push({ test, evidence: ev });
    }
  }
  return evidence;
}

function projectContains(kernel, projectId, type) {
  return kernel.store.all(type).filter(entity =>
    kernel.store.relations.some(r =>
      r.source === projectId &&
      r.relation === "CONTAINS" &&
      r.target === entity.id
    )
  );
}

export class GateSchemaEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /** getSchema: Performs get schema for this module. */
  getSchema(gateId) {
    return GATE_SCHEMAS[gateId] || null;
  }

  /** evaluateGate: Performs evaluate gate for this module. */
  evaluateGate(projectId, gateId, { configurationId = null, authority = null } = {}) {
    const schema = this.getSchema(gateId);
    const gate = this.kernel.store.get(gateId);

    if (!schema || !gate || gate.type !== "Gate") {
      return {
        outcome: "HOLD",
        gateId,
        configurationId,
        authority: authority ?? null,
        missingEvidence: ["gate"],
        evidence: [],
        reasons: ["Gate schema or Gate entity not found"],
        unknown: true,
        failed: false,
        timestamp: this.kernel._now()
      };
    }

    if (gate.applicable === false) {
      return {
        outcome: "NOT_APPLICABLE",
        gateId,
        configurationId: configurationId ?? null,
        authority: authority ?? null,
        missingEvidence: [],
        evidence: [],
        reasons: ["Explicitly marked not applicable"],
        unknown: false,
        failed: false,
        timestamp: this.kernel._now()
      };
    }

    const missingEvidence = [];
    const reasons = [];
    const evidence = [];
    let failed = false;
    let unknown = false;

    if (isFailure(gate.status, schema.failureStatuses) || gate.failed === true) {
      failed = true;
      reasons.push("Gate explicitly failed");
    }

    if (schema.requiredEvidence.configurationId) {
      if (!isPresent(configurationId)) {
        missingEvidence.push("configurationId");
        reasons.push("Configuration id is required");
      } else {
        const configuration = this.kernel.store.get(configurationId);
        if (!configuration || configuration.type !== "Configuration") {
          missingEvidence.push("configurationId");
          reasons.push(`Configuration ${configurationId} is not present`);
        } else if (isFailure(configuration.status, schema.failureStatuses)) {
          failed = true;
          reasons.push(`Configuration ${configurationId} explicitly failed`);
        } else if (isUnknown(configuration.status, schema.unknownStatuses)) {
          unknown = true;
          missingEvidence.push("configurationId");
          reasons.push(`Configuration ${configurationId} has unknown status`);
        }
      }
    }

    if (schema.requiredEvidence.authority && !isPresent(authority)) {
      missingEvidence.push("authority");
      reasons.push("Authority is required");
    } else if (isPresent(authority) && typeof authority === "object") {
      if (isFailure(authority.status, schema.failureStatuses) || authority.failed === true) {
        failed = true;
        reasons.push("Authority explicitly failed");
      }
      if (isUnknown(authority.status, schema.unknownStatuses)) {
        unknown = true;
        missingEvidence.push("authority");
        reasons.push("Authority status is unknown");
      }
    }

    const requirements = this.kernel.store.relations
      .filter(r => r.source === gateId && r.relation === "REQUIRES")
      .map(r => this.kernel.store.get(r.target))
      .filter(e => e?.type === "Requirement");

    if (schema.requiredEvidence.requirementCoverage) {
      if (requirements.length === 0) {
        missingEvidence.push("requirementCoverage");
        reasons.push("No required Requirement is linked to the gate");
      } else {
        for (const req of requirements) {
          if (isFailure(req.status, schema.failureStatuses) || req.failed === true) {
            failed = true;
            reasons.push(`Requirement ${req.id} explicitly failed`);
            continue;
          }
          if (isUnknown(req.status, schema.unknownStatuses)) {
            unknown = true;
            missingEvidence.push(`requirementCoverage:${req.id}`);
            reasons.push(`Requirement ${req.id} has unknown status`);
          }

          const candidates = evidenceForRequirement(this.kernel, req.id);
          const bound = candidates.filter(({ evidence: ev }) =>
            isPresent(configurationId) &&
            hasConfiguredBy(this.kernel, ev.id, configurationId) &&
            (!isPresent(ev.configurationId) || ev.configurationId === configurationId)
          );

          const failingEvidence = candidates.filter(({ evidence: ev }) =>
            isFailure(ev.status, schema.failureStatuses) ||
            isFailure(ev.outcome, schema.failureStatuses) ||
            ev.failed === true
          );
          if (failingEvidence.length) {
            failed = true;
            reasons.push(`Requirement ${req.id} has explicitly failed evidence`);
          }

          const unknownEvidence = candidates.filter(({ evidence: ev }) =>
            isUnknown(ev.status, schema.unknownStatuses) ||
            isUnknown(ev.outcome, schema.unknownStatuses)
          );
          if (unknownEvidence.length) {
            unknown = true;
            reasons.push(`Requirement ${req.id} has unknown evidence`);
          }

          if (bound.length === 0) {
            missingEvidence.push(`requirementEvidence:${req.id}`);
            reasons.push(`Requirement ${req.id} lacks evidence bound to ${configurationId || "the named configuration"}`);
          } else {
            for (const item of bound) {
              evidence.push({
                id: item.evidence.id,
                requirementId: req.id,
                testId: item.test.id,
                state: item.evidence.state ?? null,
                configurationId
              });
            }
          }
        }
      }
    }

    const hazards = projectContains(this.kernel, projectId, "Hazard");
    if (schema.requiredEvidence.hazardStatus) {
      if (hazards.length === 0) {
        missingEvidence.push("hazardStatus");
        reasons.push("No Hazard with an explicit status is linked to the project");
      } else {
        for (const hazard of hazards) {
          if (!isPresent(hazard.status)) {
            missingEvidence.push(`hazardStatus:${hazard.id}`);
            reasons.push(`Hazard ${hazard.id} has no status`);
          } else if (isFailure(hazard.status, schema.failureStatuses) || hazard.failed === true) {
            failed = true;
            reasons.push(`Hazard ${hazard.id} explicitly failed`);
          } else if (isUnknown(hazard.status, schema.unknownStatuses)) {
            unknown = true;
            missingEvidence.push(`hazardStatus:${hazard.id}`);
            reasons.push(`Hazard ${hazard.id} has unknown status`);
          }
        }
      }
    }

    const uniqueMissing = [...new Set(missingEvidence)];
    const outcome = failed ? "FAIL" : (
      uniqueMissing.length || unknown ? "HOLD" : "PASS"
    );

    return {
      outcome,
      gateId,
      configurationId: configurationId ?? null,
      authority: authority ?? null,
      missingEvidence: uniqueMissing,
      evidence,
      reasons,
      unknown,
      failed,
      timestamp: this.kernel._now(),
      provenance: {
        origin: "gate-schema-engine",
        derivedFrom: gateId,
        configurationId: configurationId ?? null,
        authority: authority ?? null,
        timestamp: this.kernel._now()
      }
    };
  }
}

// Ensure the overlay remains aligned with the canonical lifecycle gate set.
for (const gate of GATES) {
  if (!GATE_SCHEMAS[gate.id]) {
    throw new Error(`Missing gate schema for canonical gate ${gate.id}`);
  }
}
