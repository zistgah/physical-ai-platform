/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/research/research-engine.js
 * FILE PURPOSE: Research engine. Records protocols and evidence for a research path.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Research Engine – Iteration 04
 * Experiment → Dataset → Publication on the canonical graph.
 */

export class ResearchEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createExperiment: Performs create experiment for this module. */
  createExperiment(projectId, data) {
    const id = data.id || `exp_${Date.now().toString(36)}`;
    const exp = this.kernel.upsert({
      id,
      type: "Experiment",
      name: data.name || data.question || "Experiment",
      question: data.question,
      hypothesis: data.hypothesis,
      variables: data.variables || [],
      parameters: data.parameters || {},
      procedure: data.procedure || [],
      status: "PLANNED",
      provenance: { origin: "research", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return exp;
  }

  /** attachDataset: Performs attach dataset for this module. */
  attachDataset(experimentId, dataset) {
    const id = dataset.id || `ds_${experimentId}`;
    const ds = this.kernel.upsert({
      id,
      type: "Dataset",
      name: dataset.name || "Dataset",
      experimentId,
      provenance: { origin: "research", derivedFrom: experimentId }
    });
    this.kernel.link(experimentId, "PRODUCES", id);
    return ds;
  }

  /** createPublication: Performs create publication for this module. */
  createPublication(experimentId, meta = {}) {
    const id = meta.id || `pub_${experimentId}`;
    const pub = this.kernel.upsert({
      id,
      type: "Publication",
      name: meta.title || "Publication",
      experimentId,
      status: "DRAFT",
      provenance: { origin: "research", derivedFrom: experimentId, note: "Draft; not a peer-reviewed claim" }
    });
    this.kernel.link(experimentId, "PRODUCES", id);
    return pub;
  }

  /** validate: Checks the contract. A failure holds. */
  validate(exp) {
    const required = ["question", "hypothesis"];
    const missing = required.filter(k => !exp[k]);
    return { valid: missing.length === 0, missing };
  }
}
