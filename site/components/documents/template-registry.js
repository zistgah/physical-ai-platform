/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/template-registry.js
 * FILE PURPOSE: template registry. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * PAP Document Template Registry.
 * Runtime uses JSON mirrors; YAML files remain the human-editable source.
 */
export class TemplateRegistry {
  constructor({ fetchImpl = globalThis.fetch, basePath = new URL("../../../data/document-templates/", import.meta.url).href } = {}) {
    this.fetchImpl = fetchImpl;
    this.basePath = basePath.replace(/\/$/, "");
    this.manifest = null;
    this.cache = new Map();
  }

  async loadManifest() {
    if (this.manifest) return this.manifest;
    const response = await this.fetchImpl(`${this.basePath}/manifest.json`);
    if (!response.ok) throw new Error(`Template manifest unavailable: ${response.status}`);
    this.manifest = await response.json();
    return this.manifest;
  }

  async list({ mode, category } = {}) {
    const manifest = await this.loadManifest();
    let items = manifest.templates.slice();
    if (mode === "guide") items = items.filter(x => x.mode === true);
    if (mode === "clean") items = items.filter(x => x.mode === false);
    if (category) items = items.filter(x => x.template_id.startsWith(`${category}.`));
    return items;
  }

  async get(templateId, { mode = "clean" } = {}) {
    const manifest = await this.loadManifest();
    const item = manifest.templates.find(x => x.template_id === templateId && x.mode === (mode === "guide"));
    if (!item) throw new Error(`Unknown template ${templateId} (${mode})`);
    const key = `${templateId}:${mode}`;
    if (this.cache.has(key)) return structuredClone(this.cache.get(key));
    const response = await this.fetchImpl(item.path);
    if (!response.ok) throw new Error(`Template unavailable: ${item.path}`);
    const template = await response.json();
    validateTemplateStructure(template);
    this.cache.set(key, template);
    return structuredClone(template);
  }
}

export function validateTemplateStructure(template) {
  if (!template || typeof template !== "object") throw new Error("Template must be an object");
  for (const key of ["template_id", "template_version", "schema_version", "title"]) {
    if (!template[key]) throw new Error(`Template missing ${key}`);
  }
  const sections = template.sections || template.slides || [];
  const ids = sections.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate section IDs in ${template.template_id}`);
  for (const section of sections) {
    if (!section.id || !section.title) throw new Error("Every section requires id and title");
    const fieldIds = (section.fields || []).map(f => f.id);
    if (new Set(fieldIds).size !== fieldIds.length) throw new Error(`Duplicate field IDs in ${section.id}`);
  }
  return true;
}
