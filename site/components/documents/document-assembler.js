/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/document-assembler.js
 * FILE PURPOSE: document assembler. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Document assembler. Produces a provenance-bearing instance from canonical
 * project data and explicitly authored content. It does not generate claims.
 */
import { valueEnvelope } from "./canonical-binding.js";

const SECTION_ENTITY_TYPES = {
  requirements: ["Requirement"], requirements_traceability: ["Requirement"],
  architecture: ["System","Subsystem","Component"], system: ["System","Subsystem","Component"],
  system_architecture: ["System","Subsystem","Component"], interfaces: ["Port","Interface","Connection"],
  team: ["Person"], consortium: ["Person","Organization","Partner"],
  infrastructure: ["Facility","Equipment","Resource"], facilities: ["Facility","Equipment","Resource"],
  risk: ["Risk","Hazard"], risks: ["Risk","Hazard"], risk_register: ["Risk","Hazard"],
  evidence: ["Evidence","Artifact","Dataset","Experiment"], preliminary_work: ["Evidence","Artifact","Experiment","Dataset"],
  results: ["Evidence","Dataset","TestResult","SimulationRun"],
  method: ["Experiment","ResearchMethod"], methodology: ["Experiment","ResearchMethod"],
  experiments: ["Experiment"], datasets: ["Dataset"],
  product: ["System","Subsystem","Component","Capability"],
  technology: ["System","Subsystem","Component","Capability"],
  supply_chain: ["Supplier","Component"], procurement: ["Supplier","Component"],
  manufacturing: ["ManufacturingProcess","WorkInstruction","Component"],
  operations: ["Deployment","Service","Maintenance"],
  requirements_compliance: ["Requirement","Evidence"],
  verification: ["Test","Verification","Evidence"], validation: ["Validation","Evidence"],
  budget: ["Cost","Component","Funding"], economics: ["Cost","Component"],
  financials: ["Cost","Funding","Revenue","FinancialProjection"],
  financial_plan: ["Cost","Funding","Revenue","FinancialProjection"],
  references: ["Reference","Publication"], related_work: ["Reference","Publication"],
  citations: ["Reference","Publication"], market: ["MarketEvidence","Customer","Opportunity"],
  customer: ["Customer"], customers: ["Customer"], competition: ["Competitor","Alternative"],
  roadmap: ["Milestone","WorkPackage","LifecycleGate"], timeline: ["Milestone","WorkPackage"],
  deliverables: ["Artifact","Deliverable"], milestones: ["Milestone"]
};

function defaultSectionData(adapter, projectId, sectionId) {
  const types = SECTION_ENTITY_TYPES[sectionId];
  if (!types) return null;
  const all = adapter.entities(projectId);
  let rows = all.filter(e => types.includes(e.type));
  if (sectionId === "results") {
    rows = rows.filter(e => ["VERIFIED","ACCEPTED","PROMOTED"].includes(e.state) ||
      (e.type === "TestResult" && ["PASS","VERIFIED"].includes(e.status)));
    if (!rows.length) return { statement: "No verified result records are linked to this project. Do not report planned or simulated activity as measured results.", records: [] };
  }
  if (sectionId === "budget" || sectionId === "economics" || sectionId === "financials" || sectionId === "financial_plan") {
    const unknown = rows.filter(e => e.type === "Component" &&
      ["costMaterial","costProcess","costLabor"].some(k => e[k] === undefined || e[k] === null || e[k] === "UNSPECIFIED"));
    return { records: rows, completeness: unknown.length ? "INCOMPLETE" : "RECORDS_AVAILABLE",
      missing_cost_components: unknown.map(e => e.id),
      note: "Records are reproduced from the canonical graph; no missing price is treated as zero." };
  }
  return { records: rows, source: "canonical project graph", note: "Only existing linked records are included; absence is not inferred as proof of non-existence." };
}

export class DocumentAssembler {
  constructor(adapter) { this.adapter = adapter; }

  create({ projectId, template, title, audience = "unspecified", purpose = "unspecified",
    authored = {}, bindings = {}, overlay = null, createdBy = null }) {
    if (!projectId || !template?.template_id) throw new Error("projectId and template are required");
    const graph = this.adapter.graph(projectId);
    const sections = {};
    for (const section of (template.sections || template.slides || [])) {
      const content = {};
      const declaredFields = section.fields || [];
      if (declaredFields.length === 0) {
        const key = `${section.id}.body`;
        if (Object.prototype.hasOwnProperty.call(authored, key)) {
          content.body = valueEnvelope(authored[key], "HUMAN_INPUT", createdBy);
        } else {
          const bound = defaultSectionData(this.adapter, projectId, section.id);
          content.body = bound
            ? valueEnvelope(bound, "CANONICAL_ENTITY", `project:${projectId}`, { entity_types: SECTION_ENTITY_TYPES[section.id] })
            : valueEnvelope(null, "HUMAN_INPUT", null);
        }
      }
      for (const field of declaredFields) {
        const key = `${section.id}.${field.id}`;
        if (Object.prototype.hasOwnProperty.call(authored, key)) {
          content[field.id] = valueEnvelope(authored[key], "HUMAN_INPUT", createdBy);
        } else if (bindings[key]) {
          const resolved = this.adapter.resolve(projectId, bindings[key]);
          content[field.id] = valueEnvelope(resolved.value, resolved.source, key, {
            inputs: resolved.inputs || [],
            formula: resolved.formula || null,
            reason: resolved.reason || null
          });
        } else {
          content[field.id] = valueEnvelope(null, "CANONICAL_ENTITY", null);
        }
      }
      sections[section.id] = { title: section.title, content, status: "DRAFT" };
    }
    return {
      document_id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      template_id: template.template_id,
      template_version: template.template_version,
      schema_version: template.schema_version,
      project_id: projectId,
      title: title || template.title,
      document_type: template.template_id,
      audience, purpose, status: "DRAFT",
      source_baseline: {
        graph_revision: graph.revision ?? graph.version ?? null,
        project_id: projectId
      },
      template_overlay: overlay,
      sections,
      claims: [],
      references: [],
      assets: [],
      assumptions: [],
      open_items: [],
      generation: { source: "PAP DocumentAssembler", generated_at: new Date().toISOString() }
    };
  }

  setAuthoredValue(document, sectionId, fieldId, value, authorId) {
    if (!document.sections?.[sectionId]?.content?.[fieldId]) throw new Error("Unknown document field");
    document.sections[sectionId].content[fieldId] = valueEnvelope(value, "HUMAN_INPUT", authorId);
    document.status = "DRAFT";
    return document;
  }
}
