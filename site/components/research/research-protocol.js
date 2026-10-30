/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/research/research-protocol.js
 * FILE PURPOSE: Research protocol. Structured steps that produce evidence, not documents.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Research Protocol - Iteration 10
 *
 * Research protocol adapter on the canonical semantic graph.
 * This is a research protocol, not a laboratory execution system.
 *
 * The adapter creates Experiment and Evidence entities in the canonical
 * kernel and records protocol gaps without inventing missing data.
 */

const UNSPECIFIED = "UNSPECIFIED";

export class ResearchProtocol {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel) throw new Error("ResearchProtocol requires a canonical kernel");
    this.kernel = kernel;
  }

  /**
   * Create a research Experiment and attach it to the project.
   *
   * Required protocol fields are represented explicitly as UNSPECIFIED
   * when absent. Dataset IDs remain identifiers supplied by the caller;
   * this adapter does not invent Dataset entities or relations.
   */
  createExperiment(projectId, data = {}) {
    const id = data.id || `exp-research-${Date.now().toString(36)}`;
    const experiment = this.kernel.upsert({
      id,
      type: "Experiment",
      name: data.name || data.question || "Research Experiment",
      question: data.question ?? UNSPECIFIED,
      hypothesis: data.hypothesis ?? UNSPECIFIED,
      method: data.method ?? UNSPECIFIED,
      datasetIds: data.datasetIds ?? UNSPECIFIED,
      status: data.status || "PLANNED",
      protocolState: "PLANNED",
      provenance: {
        origin: "research-protocol",
        derivedFrom: projectId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link(projectId, "CONTAINS", experiment.id);
    return experiment;
  }

  /**
   * Produce research Evidence from an Experiment.
   *
   * Evidence method is explicitly RESEARCH. This does not imply
   * verification, validation, or physical testing.
   */
  produceEvidence(experimentId, data = {}) {
    const id = data.id || `evidence-research-${experimentId}`;
    const evidence = this.kernel.upsert({
      id,
      type: "Evidence",
      name: data.name || `Research evidence for ${experimentId}`,
      method: "RESEARCH",
      state: data.state || "PLANNED",
      experimentId,
      provenance: {
        origin: "research-protocol",
        derivedFrom: experimentId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link(experimentId, "PRODUCES", evidence.id);
    return evidence;
  }

  /**
   * Validate the protocol without substituting values for missing inputs.
   * A missing required field places the protocol on HOLD.
   */
  validate(experimentOrId) {
    const experiment =
      typeof experimentOrId === "string"
        ? this.kernel.store.get(experimentOrId)
        : experimentOrId;

    if (!experiment || experiment.type !== "Experiment") {
      return {
        valid: false,
        state: "HOLD",
        gaps: ["Experiment is missing or is not an Experiment entity"]
      };
    }

    const required = ["hypothesis", "method", "datasetIds"];
    const gaps = required.filter((field) =>
      experiment[field] === undefined ||
      experiment[field] === null ||
      experiment[field] === UNSPECIFIED ||
      (Array.isArray(experiment[field]) && experiment[field].length === 0)
    );

    return {
      valid: gaps.length === 0,
      state: gaps.length === 0 ? "PLANNED" : "HOLD",
      gaps
    };
  }
}

export { UNSPECIFIED };
