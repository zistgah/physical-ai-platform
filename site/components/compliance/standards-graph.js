/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-graph.js
 * FILE PURPOSE: Standards graph. Layers global, regional, national, sector, organizational, and project standards over the canonical model.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { displayStandard } from "./standards-display.js";
/**
 * Standards Graph - Iteration 10 additive applicability/supersession layer.
 *
 * Uses the canonical kernel for all project-scoped semantic records.
 * The Iteration 10 standards corpus remains informational and is never mutated.
 * No standard text is imported.
 */

import { STANDARDS_CORPUS } from "./standards-corpus.js";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function hold(reason, details = {}) {
  return {
    outcome: "HOLD",
    reason,
    ...details
  };
}

function normalizeList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(v => v != null && v !== "") : [value];
}

function matchesRule(standard, rule) {
  const domains = normalizeList(rule.domain);
  const embodiments = normalizeList(rule.embodiment);
  const risks = normalizeList(rule.risk);

  const domainMatch =
    domains.length === 0 ||
    domains.includes("ALL") ||
    domains.includes(standard.domain) ||
    domains.some(d => normalizeList(standard.domains).includes(d));

  const standardEmbodiments = normalizeList(standard.embodiments);
  const embodimentMatch =
    embodiments.length === 0 ||
    embodiments.includes("ALL") ||
    standardEmbodiments.length === 0 ||
    embodiments.some(e => standardEmbodiments.includes(e));

  const standardRisks = normalizeList(standard.riskClass);
  const riskMatch =
    risks.length === 0 ||
    risks.includes("ALL") ||
    standardRisks.length === 0 ||
    risks.some(r => standardRisks.includes(r));

  return domainMatch && embodimentMatch && riskMatch;
}

function corpusProjection(std) {
  return {
    corpusId: std.id,
    id: std.id,
    name: std.name,
    title: displayStandard(std).title,
    layer: displayStandard(std).layer,
    tier: std.tier ?? null,
    topic: displayStandard(std).topic,
    domains: clone(std.domains ?? []),
    embodiments: clone(std.embodiments ?? []),
    riskClass: clone(std.riskClass ?? []),
    requiredEvidence: clone(std.requiredEvidence ?? []),
    status: std.status,
    provenance: clone(std.provenance ?? {})
  };
}

export class StandardsGraph {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel, corpus = STANDARDS_CORPUS) {
    if (!kernel) throw new Error("StandardsGraph requires the canonical kernel");
    this.kernel = kernel;
    this.corpus = corpus;
  }

  /** corpusRecord: Performs corpus record for this module. */
  corpusRecord(standardId) {
    const std = this.corpus.find(s => s.id === standardId);
    return std ? clone(std) : null;
  }

  /** _validateApplicabilityInput: Performs _validate applicability input for this module. */
  _validateApplicabilityInput({ domain, embodiment, risk } = {}) {
    const missing = [];
    if (!domain) missing.push("domain");
    if (!embodiment) missing.push("embodiment");
    if (missing.length) {
      return hold("UNSPECIFIED_REQUIRED_INPUT", { missing });
    }
    return null;
  }

  /** _projectStandard: Performs _project standard for this module. */
  _projectStandard(projectId, standardId, extra = {}) {
    const std = this.corpus.find(s => s.id === standardId);
    if (!std) throw new Error(`Standard not in corpus: ${standardId}`);

    const id = `sg_${projectId}_${standardId}`;
    const existing = this.kernel.store.get(id);
    const entity = this.kernel.upsert({
      ...(existing ?? {}),
      id,
      type: "Standard",
      name: std.name,
      standardId,
      corpusId: std.id,
      title: displayStandard(std).title,
      layer: displayStandard(std).layer,
      tier: std.tier ?? null,
      topic: displayStandard(std).topic,
      status: "INFORMATIONAL",
      applicability: extra.applicability ?? existing?.applicability ?? null,
      supersedes: extra.supersedes ?? existing?.supersedes ?? [],
      supersededBy: extra.supersededBy ?? existing?.supersededBy ?? [],
      clauses: extra.clauses ?? existing?.clauses ?? [],
      provenance: {
        origin: "standards-graph",
        derivedFrom: std.id,
        timestamp: this.kernel._now(),
        corpusStatus: std.status,
        corpusProvenance: clone(std.provenance ?? {})
      }
    });
    if (!existing) this.kernel.link(projectId, "CONTAINS", id);
    return entity;
  }

  /** recordApplicabilityRule: Performs record applicability rule for this module. */
  recordApplicabilityRule(projectId, standardId, rule) {
    const validation = this._validateApplicabilityInput(rule);
    if (validation) return validation;

    const entity = this._projectStandard(projectId, standardId, {
      applicability: {
        domain: normalizeList(rule.domain),
        embodiment: normalizeList(rule.embodiment),
        risk: normalizeList(rule.risk),
        recordedAt: this.kernel._now()
      }
    });

    return {
      outcome: "RECORDED",
      standard: entity,
      corpusStatus: this.corpusRecord(standardId)?.status ?? "UNSPECIFIED"
    };
  }

  /** applicable: Performs applicable for this module. */
  applicable(projectId, { domain, embodiment, risk } = {}) {
    const validation = this._validateApplicabilityInput({ domain, embodiment, risk });
    if (validation) return validation;

    const candidates = this.corpus
      .filter(std => matchesRule(std, { domain, embodiment, risk }))
      .map(corpusProjection);

    return {
      outcome: "CANDIDATES",
      projectId,
      inputs: { domain, embodiment, risk: risk ?? "UNSPECIFIED" },
      candidates,
      note: "Candidates only. Corpus entries remain INFORMATIONAL; no corpus mutation or legal determination."
    };
  }

  /** recordSupersession: Performs record supersession for this module. */
  recordSupersession(projectId, standardId, { supersedes = [], supersededBy = [] } = {}) {
    if (!this.corpus.find(s => s.id === standardId)) {
      return hold("STANDARD_NOT_IN_CORPUS", { standardId });
    }

    const refs = [...normalizeList(supersedes), ...normalizeList(supersededBy)];
    const missing = refs.filter(id => !this.corpus.find(s => s.id === id));
    if (missing.length) {
      return hold("UNSPECIFIED_SUPERSESSION_TARGET", { standardId, missing });
    }

    const entity = this._projectStandard(projectId, standardId, {
      supersedes: normalizeList(supersedes),
      supersededBy: normalizeList(supersededBy)
    });

    return { outcome: "RECORDED", standard: entity };
  }

  /** supersession: Performs supersession for this module. */
  supersession(projectId, standardId) {
    const id = `sg_${projectId}_${standardId}`;
    const entity = this.kernel.store.get(id);
    if (!entity) return hold("UNSPECIFIED_SUPERSESSION_RECORD", { standardId });
    return {
      outcome: "FOUND",
      standardId,
      supersedes: clone(entity.supersedes ?? []),
      supersededBy: clone(entity.supersededBy ?? [])
    };
  }

  /** addClausePlaceholder: Performs add clause placeholder for this module. */
  addClausePlaceholder(projectId, standardId, { id, title, requiredEvidence = [] } = {}) {
    if (!id || !title) {
      return hold("UNSPECIFIED_CLAUSE_PLACEHOLDER_INPUT", {
        missing: [!id && "id", !title && "title"].filter(Boolean)
      });
    }

    const entity = this._projectStandard(projectId, standardId);
    const clauses = clone(entity.clauses ?? []);
    const placeholder = {
      id,
      title,
      requiredEvidence: normalizeList(requiredEvidence)
    };
    if (Object.prototype.hasOwnProperty.call(placeholder, "body")) {
      delete placeholder.body;
    }
    clauses.push(placeholder);

    const updated = this.kernel.upsert({
      ...entity,
      clauses,
      provenance: {
        ...entity.provenance,
        timestamp: this.kernel._now()
      }
    });

    return { outcome: "RECORDED", clause: placeholder, standard: updated };
  }

  /** clauses: Performs clauses for this module. */
  clauses(projectId, standardId) {
    const id = `sg_${projectId}_${standardId}`;
    const entity = this.kernel.store.get(id);
    if (!entity) return [];
    return clone(entity.clauses ?? []).map(c => {
      const out = { id: c.id, title: c.title, requiredEvidence: clone(c.requiredEvidence ?? []) };
      delete out.body;
      return out;
    });
  }
}

export default StandardsGraph;
