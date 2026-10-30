/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/ai-guide.js
 * FILE PURPOSE: AI Guide context builder. Packages role, project, domain, embodiment, stage, requirements, standards, and evidence for a replaceable AI provider. The guide proposes; it does not authorize.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * AI Guide context - Iteration 10
 *
 * Builds a provider-neutral context from the canonical project graph.
 * This package does not call an AI provider, infer standards applicability,
 * or maintain a secondary semantic store.
 */

function idsOf(graph, type) {
  return graph.entities
    .filter(entity => entity.type === type)
    .map(entity => entity.id)
    .filter(Boolean)
    .sort();
}

/**
 * Build the bounded context an AI Guide may receive for a project question.
 *
 * The returned identifiers are drawn exclusively from getProjectGraph(projectId).
 * No standards applicability is inferred and no external provider is called.
 *
 * @param {object} kernel Canonical kernel instance.
 * @param {string} projectId Canonical Project id.
 * @param {string|null|undefined} role Requested guide role.
 * @param {string|null|undefined} question User question.
 * @returns {{
 *   role: string|null,
 *   projectId: string,
 *   stage: string|null,
 *   requirementIds: string[],
 *   standardIds: string[],
 *   evidenceIds: string[],
 *   question: string|null,
 *   status?: string,
 *   gaps?: string[]
 * }}
 */
export function buildContext(kernel, projectId, role, question) {
  if (!kernel || typeof kernel.getProjectGraph !== "function") {
    throw new Error("buildContext requires a canonical kernel");
  }
  if (!projectId) {
    throw new Error("buildContext requires projectId");
  }

  const graph = kernel.getProjectGraph(projectId);
  const project = graph.entities.find(entity => entity.id === projectId && entity.type === "Project");
  if (!project) {
    throw new Error(`Project ${projectId} not found in canonical graph`);
  }

  const stages = graph.entities
    .filter(entity => entity.type === "LifecycleStage")
    .sort((a, b) => a.id.localeCompare(b.id));

  const current = stages.find(stage => stage.status === "CURRENT");
  const stage = current ? current.id : null;

  const context = {
    role: role || null,
    projectId,
    stage,
    requirementIds: idsOf(graph, "Requirement"),
    standardIds: idsOf(graph, "Standard"),
    evidenceIds: idsOf(graph, "Evidence"),
    question: question || null
  };

  const gaps = [];
  if (!role) gaps.push("role is missing");
  if (!question) gaps.push("question is missing");
  if (!stage) gaps.push("current lifecycle stage is unspecified");

  if (gaps.length) {
    context.status = "HOLD";
    context.gaps = gaps;
  }

  return context;
}
