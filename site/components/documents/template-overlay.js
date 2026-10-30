/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/template-overlay.js
 * FILE PURPOSE: template overlay. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Versioned call/journal/RFP overlay resolver.
 * Overlay source metadata is mandatory; no generic template is called compliant
 * until the target overlay has been loaded and validated.
 */
export function applyTemplateOverlay(base, overlay) {
  if (!base || !overlay) throw new Error("Base template and overlay are required");
  const meta = overlay.source || {};
  const missing = ["identifier","url","retrieved_at","checksum","reviewer"].filter(k => !meta[k]);
  if (missing.length) return { outcome:"HOLD", reason:`Overlay provenance missing: ${missing.join(", ")}` };
  if (overlay.base_template_id !== base.template_id) return { outcome:"HOLD", reason:"Overlay targets a different base template" };
  const merged = structuredClone(base);
  const byId = new Map((merged.sections || []).map(s => [s.id,s]));
  for (const change of (overlay.sections || [])) {
    const section = byId.get(change.id);
    if (!section) {
      if (change.action !== "ADD") return { outcome:"HOLD", reason:`Unknown overlay section ${change.id}` };
      merged.sections.push({id:change.id,title:change.title || change.id,required:!!change.required});
      continue;
    }
    if (change.title) section.title = change.title;
    if (typeof change.required === "boolean") section.required = change.required;
    if (change.instruction) section.instruction = change.instruction;
  }
  if (overlay.section_order) {
    const order = new Map(overlay.section_order.map((id,i)=>[id,i]));
    if (overlay.section_order.some(id=>!byId.has(id))) return {outcome:"HOLD",reason:"Overlay order references unknown section"};
    merged.sections.sort((a,b)=>(order.get(a.id) ?? 9999)-(order.get(b.id) ?? 9999));
  }
  merged.overlay = {identifier:meta.identifier,url:meta.url,retrieved_at:meta.retrieved_at,
    checksum:meta.checksum,reviewer:meta.reviewer,expires_at:meta.expires_at || null};
  return {outcome:"OK",template:merged};
}
