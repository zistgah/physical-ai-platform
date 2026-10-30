/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/document-validator.js
 * FILE PURPOSE: document validator. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Fail-closed document QA. This is deliberately conservative.
 */
const missing = v => v === undefined || v === null || v === "" || v === "UNSPECIFIED";
const validClaimClasses = new Set(["MEASURED","SIMULATED","DERIVED","REPORTED","ASSUMED","TARGET","PLANNED","PROPOSED","UNVERIFIED","UNKNOWN"]);

export function validateDocument(document, template, { requireReview = false } = {}) {
  const issues = [];
  const add = (severity, code, path, message) => issues.push({ severity, code, path, message });
  if (!document || !template) return { outcome: "FAIL", issues: [{severity:"ERROR",code:"INPUT",path:"$",message:"Document and template are required"}] };
  if (document.template_id !== template.template_id) add("ERROR","TEMPLATE_MISMATCH","template_id","Document/template mismatch");
  for (const section of (template.sections || template.slides || [])) {
    const instance = document.sections?.[section.id];
    if (!instance && section.required) add("HOLD","SECTION_MISSING",section.id,"Required section is absent");
    const declaredFields = section.fields || [];
    if (section.required && declaredFields.length === 0 && missing(instance?.content?.body?.value)) {
      add("HOLD","SECTION_BODY_UNSPECIFIED",`${section.id}.body`,"Required section body is not populated");
    }
    for (const field of declaredFields) {
      const cell = instance?.content?.[field.id];
      if (field.required && (!cell || missing(cell.value))) {
        add("HOLD","FIELD_UNSPECIFIED",`${section.id}.${field.id}`,"Required field has no value");
      }
      if (cell && cell.value_state === "DERIVED" && !cell.source?.formula && !cell.source?.inputs?.length) {
        add("HOLD","DERIVATION_UNTRACEABLE",`${section.id}.${field.id}`,"Derived value lacks formula or input references");
      }
    }
  }
  for (const [i, claim] of (document.claims || []).entries()) {
    if (!validClaimClasses.has(claim.claim_class)) add("ERROR","CLAIM_CLASS",`claims[${i}]`,"Unknown claim class");
    if (["MEASURED","SIMULATED","DERIVED","REPORTED"].includes(claim.claim_class) &&
        !(claim.evidence_refs?.length || claim.source_ref || claim.reference_id)) {
      add("HOLD","CLAIM_WITHOUT_SOURCE",`claims[${i}]`,"Evidence-bearing claim has no source reference");
    }
    if (claim.claim_class === "SIMULATED" &&
        (!claim.model_ref || !claim.run_ref || !claim.fidelity || !claim.configuration_ref)) {
      add("HOLD","SIMULATION_PROVENANCE",`claims[${i}]`,"Simulation claim requires model, run, fidelity and configuration");
    }
    if (claim.claim_class === "MEASURED" && !claim.evidence_refs?.length) {
      add("HOLD","MEASUREMENT_EVIDENCE",`claims[${i}]`,"Measured claim requires evidence records");
    }
    if (claim.claim_class === "DERIVED" && (!claim.formula_ref || !claim.input_refs?.length)) {
      add("HOLD","DERIVED_PROVENANCE",`claims[${i}]`,"Derived claim requires formula and inputs");
    }
  }
  for (const [i, asset] of (document.assets || []).entries()) {
    if (!asset.asset_id || !asset.uri) add("HOLD","ASSET_REFERENCE",`assets[${i}]`,"Asset requires asset_id and uri");
    if (!asset.alt_text) add("HOLD","ASSET_ALT_TEXT",`assets[${i}]`,"Asset requires alt text");
    if (!asset.caption) add("HOLD","ASSET_CAPTION",`assets[${i}]`,"Asset requires caption");
    if (asset.asset_type === "SIMULATION_PLOT" &&
        (!asset.run_id || !asset.model_id || !asset.fidelity || !asset.source_hash)) {
      add("HOLD","SIM_ASSET_PROVENANCE",`assets[${i}]`,"Simulation plot requires run, model, fidelity and source hash");
    }
    if (["HIL","PHIL"].includes(asset.fidelity) &&
        (!asset.device_id || !asset.transport_id || !asset.hardware_io_log)) {
      add("HOLD","HARDWARE_EVIDENCE",`assets[${i}]`,"HIL/PHIL asset requires device, transport and hardware I/O log");
    }
  }
  for (const [i, ref] of (document.references || []).entries()) {
    if (!ref.title || !(ref.doi || ref.url)) add("HOLD","REFERENCE_METADATA",`references[${i}]`,"Reference needs title and DOI or URL");
    if (ref.verification_status !== "METADATA_VERIFIED" && ref.verification_status !== "CONTENT_CHECKED") {
      add("HOLD","REFERENCE_UNVERIFIED",`references[${i}]`,"Reference metadata/content is not verified");
    }
  }
  if (requireReview && !["APPROVED","RELEASED","SUBMITTED","PUBLISHED"].includes(document.status)) {
    add("HOLD","REVIEW_REQUIRED","status","Document has not passed its release approval state");
  }
  const errors = issues.some(x => x.severity === "ERROR");
  const holds = issues.some(x => x.severity === "HOLD");
  return { outcome: errors ? "FAIL" : holds ? "HOLD" : "PASS", issues,
    summary: { errors: issues.filter(x=>x.severity==="ERROR").length, holds: issues.filter(x=>x.severity==="HOLD").length } };
}
