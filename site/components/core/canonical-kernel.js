/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/canonical-kernel.js
 * FILE PURPOSE: Canonical kernel. One typed store, one relation vocabulary, one evidence lifecycle. Every other module reads and writes through this.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Canonical Kernel for Physical AI Platform – Iteration 02
 *
 * Semantic hardening of the Iteration 01 vertical slice.
 * Preserves all Iteration 01 APIs and behavior while adding:
 * - Project graph isolation and deterministic traversal
 * - Stable identity across round-trip (no mutation on pure deserialize)
 * - Relation definitions with type, cardinality, inverse constraints
 * - First-class validated connections using existing port logic
 * - Graph-aware execution readiness evaluation
 * - Requirements traceability chain and status APIs
 * - SIR serialization / deserialization / round-trip
 * - Basic schema validation compatible with static-first architecture
 *
 * Does not replace the architectural spine. Does not implement deferred domains.
 */

import { EntityStore } from "./store.js";
import { validateGraph as basicValidate } from "./validation.js";
import { validatePortConnection, port } from "./contracts.js";
import { relationStatus } from "./relation-registry.js";

export const CANONICAL_ENTITY_TYPES = new Set([
  "Project", "Person", "Organization", "Mission", "System", "Subsystem", "Component",
  "Port", "Interface", "Capability", "Requirement", "Constraint", "Policy", "Intent",
  "Plan", "Execution", "State", "Event", "Resource", "Environment", "Hazard",
  "SafetyCase", "ComplianceCase", "Standard", "Regulation", "Test", "Experiment",
  "Evidence", "Artifact", "Configuration", "Dataset", "Model", "Supplier", "Process",
  "Customer", "Order", "ServiceEvent", "Publication", "Patent", "Course", "Lesson", "Business",
  "Funding", "Deployment", "Telemetry", "Incident", "Simulation", "Scenario", "Connection",
  "LifecycleStage", "Gate", "GateDecision", "Baseline", "BaselineRecord", "ChangeRequest",
  "ImpactAnalysis", "Claim", "Argument", "AssuranceCase", "CockpitState", "ChecklistItem",
  "ConfigurationItem", "Material", "WorkInstruction", "WorkOrder", "Sketch", "Solid", "Feature", "Geometry", "Deployment", "Fleet", "Curriculum", "Experiment", "Publication", "Funding", "Customer", "Software", "Module", "Function", "Cost", "Transition", "Commercial"
]);

export const TYPED_RELATIONS = new Set([
  "CONTAINS", "PART_OF", "INSTANCE_OF", "IMPLEMENTS", "REQUIRES", "SATISFIES",
  "VERIFIES", "VALIDATES", "ALLOCATED_TO", "DEPENDS_ON", "CONSTRAINED_BY",
  "GOVERNED_BY", "AUTHORIZED_BY", "USES", "PRODUCES", "CONSUMES", "EMITS",
  "RECEIVES", "CONNECTS_TO", "HAS_CAPABILITY", "HAS_STATE", "HAS_EVENT",
  "GENERATES", "DERIVED_FROM", "CONFIGURED_BY", "EVIDENCED_BY", "TESTED_BY",
  "SIMULATED_BY", "DEPLOYED_AS", "OPERATES_IN", "SUPPLIED_BY", "MANUFACTURED_BY",
  "SERVICED_BY", "HAS_SUBSYSTEM", "HAS_COMPONENT", "HAS_PORT", "ALLOCATES",
  "VERIFIED_BY", "PRODUCES_EVIDENCE", "HAS_REQUIREMENT", "HAS_CONNECTION",
  "HAS_STAGE", "HAS_GATE", "SUPPORTED_BY", "CAUSED_BY", "CONTROLLED_BY",
  "AFFECTS", "BASELINED_AS", "HAS_CONFIGURATION", "HAS_GEOMETRY"
]);

export const EVIDENCE_STATES = ["PLANNED", "SPECIFIED", "IMPLEMENTED", "EXECUTED", "TESTED", "VERIFIED", "VALIDATED", "RELEASED"];

export const EXECUTION_OUTCOMES = ["EXECUTE", "REJECT", "DEFER", "HOLD", "DEGRADE", "SAFE_STATE"];

/**
 * Relation definitions.
 * source/target: arrays of allowed types, or "*" for unconstrained.
 * Where architecture does not yet specify, marked unresolved: true.
 */
export const RELATION_DEFINITIONS = {
  CONTAINS: {
    source: ["Project", "System", "Subsystem", "AssuranceCase", "Claim", "Fleet", "Experiment", "Course"],
    target: ["Mission", "System", "Subsystem", "Component", "Requirement", "Test", "Evidence", "Artifact", "Intent", "Policy", "Configuration", "Connection", "Simulation", "LifecycleStage", "Gate", "GateDecision", "Hazard", "Baseline", "ImpactAnalysis", "AssuranceCase", "ComplianceCase", "Claim", "Argument", "CockpitState", "WorkOrder", "Deployment", "Fleet", "Curriculum", "Experiment", "Publication", "Funding", "Customer", "Order", "Standard", "ServiceEvent", "Course", "Lesson", "Sketch", "Solid", "Feature", "Geometry", "Process", "Material", "Lesson", "Curriculum", "Person", "Port", "Interface", "Connection", "Software", "Module", "Function", "Cost", "Transition", "Commercial", "Event", "State"],
    cardinality: "many",
    inverse: "PART_OF",
    allowDuplicate: false,
    metadataRequired: false,
    unresolved: false
  },
  PART_OF: {
    source: ["System", "Subsystem", "Component", "Mission", "Requirement", "Test", "Evidence", "Artifact"],
    target: ["Project", "System", "Subsystem"],
    cardinality: "one",
    inverse: "CONTAINS",
    allowDuplicate: false,
    metadataRequired: false
  },
  ALLOCATED_TO: {
    source: ["Requirement"],
    target: ["Component", "System", "Subsystem"],
    cardinality: "many",
    inverse: "ALLOCATES",
    allowDuplicate: false,
    metadataRequired: false
  },
  ALLOCATES: {
    source: ["Component", "System"],
    target: ["Requirement"],
    cardinality: "many",
    inverse: "ALLOCATED_TO",
    allowDuplicate: false,
    metadataRequired: false
  },
  VERIFIES: {
    source: ["Test"],
    target: ["Requirement"],
    cardinality: "many",
    inverse: "VERIFIED_BY",
    allowDuplicate: false,
    metadataRequired: false
  },
  VERIFIED_BY: {
    source: ["Requirement"],
    target: ["Test"],
    cardinality: "many",
    inverse: "VERIFIES",
    allowDuplicate: false,
    metadataRequired: false
  },
  DERIVED_FROM: {
    source: ["Evidence", "Artifact", "Solid", "Feature", "Geometry"],
    target: ["Test", "Simulation", "Execution", "Artifact", "Requirement", "WorkOrder", "Experiment", "Lesson", "Component", "Sketch", "Solid"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  CONNECTS_TO: {
    source: ["Component", "Port", "Connection"],
    target: ["Component", "Port", "Connection"],
    cardinality: "many",
    inverse: "CONNECTS_TO",
    allowDuplicate: false,
    metadataRequired: true, // expects fromPort / toPort at minimum
    unresolved: false
  },
  GOVERNED_BY: {
    source: ["Intent", "Plan", "Execution", "ComplianceCase"],
    target: ["Policy", "Standard"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  HAS_COMPONENT: {
    source: ["System", "Subsystem"],
    target: ["Component"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  HAS_PORT: {
    source: ["Component"],
    target: ["Port"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  HAS_CONNECTION: {
    source: ["System", "Project"],
    target: ["Connection"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  MANUFACTURED_BY: {
    source: ["Component", "WorkOrder"],
    target: ["Process", "Organization", "Component"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  },
  HAS_GEOMETRY: {
    source: ["Component", "System", "Artifact"],
    target: ["Solid", "Sketch", "Geometry", "Feature"],
    cardinality: "many",
    inverse: null,
    allowDuplicate: false,
    metadataRequired: false
  }
  // Other relations remain name-validated only; deeper constraints marked unresolved.
};

export class CanonicalKernel {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor() {
    this.store = new EntityStore();
    this.projects = new Map();
    this.formatVersion = "1.0.0";
    this.platformVersion = "0.1.0-iter02";
    this.sirVersion = "1.0.0";
  }

  /** _now: Performs _now for this module. */
  _now() { return new Date().toISOString(); }

  /**
   * Ensure identity fields exist. Pure on existing objects unless forceModified=true.
   * Does not mutate semantic identity (id, type, creator, created, provenance origin).
   */
  _ensureIdentity(entity, creator = "system", { forceModified = false } = {}) {
    if (!entity.id) throw new Error("Entity requires stable id");
    if (!entity.type) throw new Error("Entity requires type");
    if (!CANONICAL_ENTITY_TYPES.has(entity.type)) {
      console.warn(`Non-canonical type: ${entity.type}`);
    }
    entity.version = entity.version || "1.0.0";
    entity.created = entity.created || this._now();
    entity.creator = entity.creator || creator;
    entity.source = entity.source || "local";
    entity.status = entity.status || "DRAFT";
    entity.schemaVersion = entity.schemaVersion || "1.0";
    if (!entity.provenance) {
      entity.provenance = {
        origin: "created",
        creator,
        version: entity.version,
        derivedFrom: null,
        artifact: null,
        evidence: null,
        timestamp: entity.created
      };
    }
    if (forceModified) {
      entity.modified = this._now();
    } else if (!entity.modified) {
      entity.modified = entity.created;
    }
    return entity;
  }

  /** upsert: Inserts or updates an entity in the canonical store. */
  upsert(entity, creator = "user") {
    const isNew = !this.store.get(entity.id);
    const e = this._ensureIdentity(structuredClone(entity), creator, { forceModified: !isNew });
    if (!isNew) {
      const existing = this.store.get(entity.id);
      e.created = existing.created;
      e.creator = existing.creator;
      e.provenance = { ...existing.provenance, ...e.provenance };
    }
    return this.store.upsert(e);
  }

  /** createProject: Performs create project for this module. */
  createProject(meta = {}) {
    const id = meta.id || `proj_${Date.now().toString(36)}`;
    const project = this.upsert({
      id,
      type: "Project",
      name: meta.name || "Untitled Project",
      description: meta.description || "",
      status: "ACTIVE"
    }, meta.creator || "user");
    this.projects.set(id, { created: this._now(), ...meta });
    return project;
  }

  /**
   * Deterministic closure of objects belonging to a project.
   * Traverses CONTAINS and other containment-style relations.
   * Does not include objects from other projects.
   */
  getProjectGraph(projectId) {
    const project = this.store.get(projectId);
    if (!project || project.type !== "Project") throw new Error("Not a project");
    const visited = new Set();
    const queue = [projectId];
    const entities = [];
    const relations = [];
    const relSet = new Set();

    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const ent = this.store.get(id);
      if (ent) entities.push(structuredClone(ent));

      for (const r of this.store.relations) {
        if (r.source === id || r.target === id) {
          const key = `${r.source}|${r.relation}|${r.target}|${JSON.stringify(r.metadata || {})}`;
          if (!relSet.has(key)) {
            relSet.add(key);
            relations.push(structuredClone(r));
          }
          const other = r.source === id ? r.target : r.source;
          if (!visited.has(other)) queue.push(other);
        }
      }
    }

    // Deterministic order
    entities.sort((a, b) => a.id.localeCompare(b.id));
    relations.sort((a, b) => {
      const ka = `${a.source}|${a.relation}|${a.target}`;
      const kb = `${b.source}|${b.relation}|${b.target}`;
      return ka.localeCompare(kb);
    });

    return { projectId, entities, relations };
  }

  /** link: Adds a typed relation. */
  link(sourceId, relation, targetId, metadata = {}) {
    if (!TYPED_RELATIONS.has(relation)) {
      throw new Error(`Invalid relation type: ${relation}. Must be one of the typed relations.`);
    }
    const src = this.store.get(sourceId);
    const tgt = this.store.get(targetId);
    if (!src || !tgt) {
      throw new Error(`Dangling reference: ${sourceId} or ${targetId} does not exist`);
    }

    const def = RELATION_DEFINITIONS[relation];
    if (def) {
      if (def.source && def.source !== "*" && !def.source.includes(src.type)) {
        throw new Error(`Invalid source type ${src.type} for relation ${relation}`);
      }
      if (def.target && def.target !== "*" && !def.target.includes(tgt.type)) {
        throw new Error(`Invalid target type ${tgt.type} for relation ${relation}`);
      }
      if (def.metadataRequired && (!metadata || Object.keys(metadata).length === 0)) {
        throw new Error(`Relation ${relation} requires metadata`);
      }
      if (!def.allowDuplicate) {
        const exists = this.store.relations.some(r =>
          r.source === sourceId && r.relation === relation && r.target === targetId
        );
        if (exists) throw new Error(`Duplicate edge prohibited for ${relation}`);
      }
    }
    return this.store.relate(sourceId, relation, targetId, metadata);
  }

  /** validateGraph: Performs validate graph for this module. */
  validateGraph() {
    const basic = basicValidate(this.store);
    const errors = [...basic.errors];
    const ids = new Set();
    for (const e of this.store.all()) {
      if (ids.has(e.id)) errors.push(`Duplicate canonical ID: ${e.id}`);
      ids.add(e.id);
      if (!e.provenance) errors.push(`Missing provenance on ${e.id}`);
      if (!e.version) errors.push(`Missing version on ${e.id}`);
    }
    for (const r of this.store.relations) {
      if (!TYPED_RELATIONS.has(r.relation)) errors.push(`Invalid relation type: ${r.relation}`);
      const def = RELATION_DEFINITIONS[r.relation];
      if (def) {
        const src = this.store.get(r.source);
        const tgt = this.store.get(r.target);
        if (src && def.source && def.source !== "*" && !def.source.includes(src.type)) {
          errors.push(`Invalid source type ${src.type} for ${r.relation}`);
        }
        if (tgt && def.target && def.target !== "*" && !def.target.includes(tgt.type)) {
          errors.push(`Invalid target type ${tgt.type} for ${r.relation}`);
        }
        if (def.metadataRequired && (!r.metadata || Object.keys(r.metadata).length === 0)) {
          errors.push(`Missing required metadata on ${r.relation} ${r.source}->${r.target}`);
        }
      }
    }
    // Orphan detection
    const linked = new Set();
    for (const r of this.store.relations) { linked.add(r.source); linked.add(r.target); }
    const orphans = this.store.all().filter(e => e.type !== "Project" && !linked.has(e.id)).map(e => e.id);
    // Unresolved relations are reported, not silent
    const unresolved = [];
    for (const r of this.store.relations) {
      const st = relationStatus(r.relation);
      if (st.unresolved) unresolved.push({ relation: r.relation, source: r.source, target: r.target });
    }
    return { valid: errors.length === 0, errors, orphans, unresolvedRelations: unresolved };
  }

  // --- Connections ---
  /**
   * Create a validated first-class connection.
   * Looks up ports on the source and target components and invokes validatePortConnection.
   */
  createConnection({ sourceComponentId, sourcePortId, targetComponentId, targetPortId, metadata = {} }) {
    const srcComp = this.store.get(sourceComponentId);
    const tgtComp = this.store.get(targetComponentId);
    if (!srcComp || srcComp.type !== "Component") throw new Error("Source must be Component");
    if (!tgtComp || tgtComp.type !== "Component") throw new Error("Target must be Component");
    const srcPort = srcComp.ports?.[sourcePortId];
    const tgtPort = tgtComp.ports?.[targetPortId];
    if (!srcPort || !tgtPort) throw new Error("Port not found on component");

    const err = validatePortConnection(srcPort, tgtPort, { allowAdapter: !!metadata.allowAdapter });
    if (err) throw new Error(`Connection validation failed: ${err}`);

    const connId = metadata.id || `conn_${sourceComponentId}_${sourcePortId}_${targetComponentId}_${targetPortId}`;
    const connection = this.upsert({
      id: connId,
      type: "Connection",
      name: metadata.name || `${sourceComponentId}.${sourcePortId} → ${targetComponentId}.${targetPortId}`,
      sourceComponent: sourceComponentId,
      sourcePort: sourcePortId,
      targetComponent: targetComponentId,
      targetPort: targetPortId,
      interface: srcPort.type,
      unit: srcPort.unit || tgtPort.unit || null,
      frame: srcPort.frame || tgtPort.frame || null,
      domain: srcPort.domain || tgtPort.domain || null,
      safetyClass: srcPort.safetyClass || tgtPort.safetyClass || null,
      authority: srcPort.authority || tgtPort.authority || null,
      configuration: metadata.configuration || "1.0.0",
      version: "1.0.0",
      provenance: { origin: "connection", timestamp: this._now() }
    });

    this.link(sourceComponentId, "CONNECTS_TO", targetComponentId, {
      fromPort: sourcePortId,
      toPort: targetPortId,
      connectionId: connId,
      ...metadata
    });
    // Optionally link to project if known
    return connection;
  }

  // --- Execution gate (legacy boolean API preserved) ---
  evaluateExecutionGate({ intentValid = false, policyValid = false, authorityValid = false, capabilityValid = false, stateValid = false, safetyValid = false, timingValid = false, resourcesValid = false } = {}) {
    if (intentValid && policyValid && authorityValid && capabilityValid && stateValid && safetyValid && timingValid && resourcesValid) {
      return { outcome: "EXECUTE", reason: "All gates passed" };
    }
    if (!safetyValid) return { outcome: "SAFE_STATE", reason: "Safety invalid" };
    if (!authorityValid) return { outcome: "REJECT", reason: "Authority invalid" };
    if (!intentValid || !policyValid) return { outcome: "HOLD", reason: "Intent or policy invalid" };
    return { outcome: "REJECT", reason: "One or more gates failed" };
  }

  /**
   * Graph-aware execution readiness evaluation.
   * Resolves Intent, Policy, Authority, Capability, State, Safety, Timing, Resources from the graph.
   * Returns structured decision. Does not execute physical actions.
   */
  evaluateExecution({ intentId, planId, executionId, projectId } = {}) {
    const intent = intentId ? this.store.get(intentId) : null;
    const plan = planId ? this.store.get(planId) : null;
    const execution = executionId ? this.store.get(executionId) : null;

    const reasons = [];
    const evidence = [];

    const intentValid = !!(intent && (intent.status === "VALID" || intent.status === "ACTIVE"));
    if (!intentValid) reasons.push("Intent missing or not VALID");

    // Policy: look for GOVERNED_BY from intent or plan
    let policyValid = false;
    if (intent) {
      const gov = this.store.relations.find(r => r.source === intent.id && r.relation === "GOVERNED_BY");
      if (gov) {
        const pol = this.store.get(gov.target);
        policyValid = !!(pol && (pol.status === "VALID" || pol.status === "ACTIVE"));
        if (pol) evidence.push({ type: "Policy", id: pol.id, status: pol.status });
      }
    }
    if (!policyValid) reasons.push("No valid governing Policy found");

    // Authority: must be an AUTHORIZED_BY edge or an explicit authority entity. Missing → not valid.
    let authorityValid = false;
    const authRel = this.store.relations.find(r =>
      (r.source === intentId || r.source === planId || r.source === executionId) && r.relation === "AUTHORIZED_BY"
    );
    if (authRel && this.store.get(authRel.target)) {
      authorityValid = true;
      evidence.push({ type: "Authority", id: authRel.target });
    }
    if (!authorityValid) reasons.push("Authority not established (no AUTHORIZED_BY)");

    // Capability: at least one component with a declared capability
    const comps = this.store.all("Component");
    const capabilityValid = comps.some(c => Array.isArray(c.capabilities) && c.capabilities.length > 0);
    if (!capabilityValid) reasons.push("No component capabilities declared");

    // State: HOLD if no State entity is linked; do not assume true
    const stateEnt = this.store.all("State").find(s => s.status === "READY" || s.status === "VALID");
    const stateValid = !!stateEnt;
    if (!stateValid) reasons.push("State unresolved");

    // Safety: safety component or controlled hazards
    const safetyValid = comps.some(c => c.capabilities?.includes("SAFETY")) ||
      this.store.all("Hazard").some(h => h.status === "CONTROLLED" || h.status === "ACCEPTED");
    if (!safetyValid) reasons.push("No safety component or controlled hazard");

    // Timing and resources: unresolved unless explicitly present
    const timingValid = this.store.all("Event").some(e => e.kind === "timing") || false;
    if (!timingValid) reasons.push("Timing unresolved");
    const resourcesValid = this.store.all("Resource").length > 0;
    if (!resourcesValid) reasons.push("Resources unresolved");

    let outcome = this.evaluateExecutionGate({
      intentValid, policyValid, authorityValid, capabilityValid, stateValid, safetyValid, timingValid, resourcesValid
    }).outcome;
    // Unresolved state/timing/resources must HOLD, not silently pass or hard-reject
    const unresolved = [];
    if (!stateValid) unresolved.push("state");
    if (!timingValid) unresolved.push("timing");
    if (!resourcesValid) unresolved.push("resources");
    if (unresolved.length && outcome === "EXECUTE") outcome = "HOLD";
    if (unresolved.length && outcome === "REJECT" && authorityValid && intentValid && policyValid) outcome = "HOLD";

    return {
      outcome,
      intent: { id: intent?.id, valid: intentValid },
      policy: { valid: policyValid },
      authority: { valid: authorityValid },
      capability: { valid: capabilityValid },
      state: { valid: stateValid },
      safety: { valid: safetyValid },
      timing: { valid: timingValid },
      resources: { valid: resourcesValid },
      reasons,
      evidence,
      timestamp: this._now()
    };
  }

  // --- Requirements traceability ---
  allocateRequirement(reqId, componentId) {
    return this.link(reqId, "ALLOCATED_TO", componentId);
  }

  /** addVerification: Performs add verification for this module. */
  addVerification(reqId, testId) {
    return this.link(testId, "VERIFIES", reqId);
  }

  /** addEvidence: Performs add evidence for this module. */
  addEvidence(testId, evidenceId) {
    return this.link(evidenceId, "DERIVED_FROM", testId);
  }

  /** getRequirementTrace: Performs get requirement trace for this module. */
  getRequirementTrace(requirementId) {
    const req = this.store.get(requirementId);
    if (!req || req.type !== "Requirement") return null;
    const allocations = this.store.relations
      .filter(r => r.source === requirementId && r.relation === "ALLOCATED_TO")
      .map(r => this.store.get(r.target))
      .filter(Boolean);
    const tests = this.store.relations
      .filter(r => r.relation === "VERIFIES" && r.target === requirementId)
      .map(r => this.store.get(r.source))
      .filter(Boolean);
    const evidences = [];
    for (const t of tests) {
      const evs = this.store.relations
        .filter(r => r.relation === "DERIVED_FROM" && r.target === t.id)
        .map(r => this.store.get(r.source))
        .filter(Boolean);
      evidences.push(...evs);
    }
    const artifacts = evidences.map(e => e.artifact ? this.store.get(e.artifact) : null).filter(Boolean);
    return {
      requirement: req,
      allocations,
      tests,
      evidences,
      artifacts,
      chain: ["Requirement", "Allocation", "Architecture/Component", "Verification Method", "Test", "Execution", "Artifact", "Evidence"]
    };
  }

  /** getRequirementStatus: Performs get requirement status for this module. */
  getRequirementStatus(requirementId) {
    const trace = this.getRequirementTrace(requirementId);
    if (!trace) return null;
    // Explicit states only; no automatic promotion
    const states = trace.evidences.map(e => e.state).filter(Boolean);
    const highest = states.length ? states[states.length - 1] : "PLANNED";
    return {
      requirementId,
      allocated: trace.allocations.length > 0,
      tested: trace.tests.length > 0,
      evidenceStates: states,
      status: highest, // does not auto-promote
      verified: states.includes("VERIFIED"),
      validated: states.includes("VALIDATED")
    };
  }

  /** getUnverifiedRequirements: Performs get unverified requirements for this module. */
  getUnverifiedRequirements(projectId) {
    const graph = this.getProjectGraph(projectId);
    const reqs = graph.entities.filter(e => e.type === "Requirement");
    return reqs.filter(r => {
      const st = this.getRequirementStatus(r.id);
      return !st || !st.verified;
    });
  }

  /** getEvidenceForRequirement: Performs get evidence for requirement for this module. */
  getEvidenceForRequirement(requirementId) {
    const trace = this.getRequirementTrace(requirementId);
    return trace ? trace.evidences : [];
  }

  // --- Serialization (project package .pap.json) ---
  serializeProject(projectId) {
    const project = this.store.get(projectId);
    if (!project || project.type !== "Project") throw new Error("Not a project");
    const graph = this.getProjectGraph(projectId);
    return {
      formatVersion: this.formatVersion,
      projectIdentity: { id: projectId, name: project.name, version: project.version },
      metadata: { exportedAt: this._now(), platform: this.platformVersion, kind: "pap" },
      graph: { entities: graph.entities, relations: graph.relations },
      configurations: graph.entities.filter(e => e.type === "Configuration"),
      requirements: graph.entities.filter(e => e.type === "Requirement"),
      evidence: graph.entities.filter(e => e.type === "Evidence"),
      provenance: graph.entities.map(e => ({ id: e.id, provenance: e.provenance })),
      artifacts: graph.entities.filter(e => e.type === "Artifact")
    };
  }

  /**
   * Pure restore. Does not call identity initializer that mutates timestamps.
   * Semantic identity and original created/modified are preserved.
   */
  deserializeProject(data) {
    if (!data.formatVersion) throw new Error("Missing formatVersion");
    if (!data.graph) throw new Error("Missing graph");
    // Clear and restore only the provided graph (project isolation)
    this.store.entities.clear();
    this.store.relations = [];
    for (const e of data.graph.entities || []) {
      // Direct add without mutating identity fields
      this.store.entities.set(e.id, structuredClone(e));
    }
    this.store.relations = structuredClone(data.graph.relations || []);
    const pid = data.projectIdentity?.id;
    if (pid) this.projects.set(pid, { restored: true });
    return this.store.get(pid);
  }

  // --- SIR (Semantic Interchange Representation) ---
  serializeToSIR(projectId) {
    const graph = this.getProjectGraph(projectId);
    const project = graph.entities.find(e => e.id === projectId);
    const components = graph.entities.filter(e => e.type === "Component");
    const connections = graph.entities.filter(e => e.type === "Connection");
    const requirements = graph.entities.filter(e => e.type === "Requirement");
    const tests = graph.entities.filter(e => e.type === "Test");
    const evidences = graph.entities.filter(e => e.type === "Evidence");
    const artifacts = graph.entities.filter(e => e.type === "Artifact");
    const intents = graph.entities.filter(e => e.type === "Intent");
    const policies = graph.entities.filter(e => e.type === "Policy");

    return {
      magic: "PAI-SIR",
      version: this.sirVersion,
      header: {
        projectId,
        name: project?.name,
        exportedAt: this._now(),
        kind: "sir"
      },
      identity: { id: projectId, type: "Project" },
      intent: intents,
      policy: policies,
      requirements,
      architecture: {
        systems: graph.entities.filter(e => e.type === "System"),
        subsystems: graph.entities.filter(e => e.type === "Subsystem")
      },
      components,
      ports: components.flatMap(c => Object.entries(c.ports || {}).map(([pid, p]) => ({ component: c.id, ...p }))),
      connections,
      events: graph.entities.filter(e => e.type === "Event"),
      states: graph.entities.filter(e => e.type === "State"),
      authority: {},
      safety: {},
      security: {},
      execution: {},
      resources: graph.entities.filter(e => e.type === "Resource"),
      simulation: { artifacts },
      verification: { tests },
      validation: {},
      provenance: graph.entities.map(e => ({ id: e.id, provenance: e.provenance })),
      lifecycle: {
        stages: graph.entities.filter(e => e.type === "LifecycleStage"),
        gates: graph.entities.filter(e => e.type === "Gate"),
        decisions: graph.entities.filter(e => e.type === "GateDecision")
      },
      configuration: graph.entities.filter(e => e.type === "Configuration" || e.type === "Baseline"),
      assurance: {
        hazards: graph.entities.filter(e => e.type === "Hazard"),
        cases: graph.entities.filter(e => e.type === "AssuranceCase" || e.type === "Claim" || e.type === "Argument")
      },
      compliance: graph.entities.filter(e => e.type === "ComplianceCase" || e.type === "Standard"),
      manufacturing: {
        workOrders: graph.entities.filter(e => e.type === "WorkOrder"),
        components: components.map(c => c.id)
      },
      education: graph.entities.filter(e => e.type === "Curriculum"),
      research: graph.entities.filter(e => e.type === "Experiment" || e.type === "Publication" || e.type === "Dataset"),
      operations: graph.entities.filter(e => e.type === "Deployment" || e.type === "Fleet" || e.type === "ServiceEvent"),
      business: graph.entities.filter(e => e.type === "Funding" || e.type === "Customer"),
      graph: { entities: graph.entities, relations: graph.relations } // full graph for lossless round-trip
    };
  }

  /** deserializeFromSIR: Performs deserialize from s i r for this module. */
  deserializeFromSIR(sir) {
    if (sir.magic !== "PAI-SIR") throw new Error("Invalid SIR magic");
    if (!sir.graph) throw new Error("SIR missing graph for lossless restore");
    // Restore via the embedded graph (deterministic)
    this.store.entities.clear();
    this.store.relations = [];
    for (const e of sir.graph.entities || []) {
      this.store.entities.set(e.id, structuredClone(e));
    }
    this.store.relations = structuredClone(sir.graph.relations || []);
    const pid = sir.identity?.id || sir.header?.projectId;
    return this.store.get(pid);
  }

  /**
   * Canonical representation for deterministic semantic comparison.
   * Sorting ensures ordering differences do not affect equality.
   */
  canonicalizeGraph(projectId) {
    const g = this.getProjectGraph(projectId);
    // Strip serialization-only timestamps if present, keep semantic fields
    const entities = g.entities.map(e => {
      const { modified, ...rest } = e;
      return rest;
    });
    entities.sort((a, b) => a.id.localeCompare(b.id));
    const relations = [...g.relations].sort((a, b) =>
      `${a.source}|${a.relation}|${a.target}`.localeCompare(`${b.source}|${b.relation}|${b.target}`)
    );
    return { entities, relations };
  }

  // --- Schema validation (lightweight, static-first compatible) ---
  validateProjectPackage(data) {
    const errors = [];
    if (!data || typeof data !== "object") return { valid: false, errors: ["not an object"] };
    if (data.formatVersion !== "1.0.0") errors.push("formatVersion must be 1.0.0");
    if (!data.projectIdentity || !data.projectIdentity.id) errors.push("missing projectIdentity.id");
    if (!data.graph || !Array.isArray(data.graph.entities)) errors.push("missing graph.entities");
    if (!Array.isArray(data.graph?.relations)) errors.push("missing graph.relations");
    return { valid: errors.length === 0, errors };
  }

  /** validateSIR: Performs validate s i r for this module. */
  validateSIR(data) {
    const errors = [];
    if (!data || data.magic !== "PAI-SIR") errors.push("missing or invalid magic");
    if (!data.version) errors.push("missing version");
    if (!data.header) errors.push("missing header");
    if (!data.graph) errors.push("missing graph");
    return { valid: errors.length === 0, errors };
  }

  /** validateComponentContract: Performs validate component contract for this module. */
  validateComponentContract(contract) {
    const errors = [];
    if (!contract || !contract.id) errors.push("missing id");
    if (!contract.interfaceVersion) errors.push("missing interfaceVersion");
    if (!contract.ports && !contract.capabilities) errors.push("missing ports or capabilities");
    return { valid: errors.length === 0, errors };
  }

  // --- Persistence ---
  saveToLocal(key = "pap_project") {
    if (typeof localStorage === "undefined") return false;
    const pid = this.currentProjectId || this.store.all("Project")[0]?.id;
    if (!pid) return false;
    const data = this.serializeProject(pid);
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  }

  /** loadFromLocal: Performs load from local for this module. */
  loadFromLocal(key = "pap_project") {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return this.deserializeProject(JSON.parse(raw));
  }

  // --- Inspection ---
  inspect(id) {
    const entity = this.store.get(id);
    if (!entity) return null;
    const incoming = this.store.relations.filter(r => r.target === id);
    const outgoing = this.store.relations.filter(r => r.source === id);
    const trace = entity.type === "Requirement" ? this.getRequirementTrace(id) : null;
    return {
      identity: { id: entity.id, type: entity.type, version: entity.version, status: entity.status, creator: entity.creator },
      provenance: entity.provenance,
      created: entity.created,
      modified: entity.modified,
      incoming,
      outgoing,
      requirements: entity.type === "Requirement" ? [entity] : [],
      allocations: trace?.allocations || [],
      tests: trace?.tests || [],
      evidences: trace?.evidences || [],
      artifacts: trace?.artifacts || [],
      connections: this.store.relations.filter(r => (r.source === id || r.target === id) && r.relation === "CONNECTS_TO"),
      configuration: this.store.all("Configuration")
    };
  }
}

/** createKernel: Canonical kernel. One typed store, one relation vocabulary, one evidence lifecycle. Every other module reads and writes through this. */
export function createKernel() {
  return new CanonicalKernel();
}
