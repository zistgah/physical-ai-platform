/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/document-workbench.js
 * FILE PURPOSE: document workbench. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Document workflow facade for integration with the existing PAP kernel.
 */
import { CanonicalProjectAdapter } from "./canonical-binding.js";
import { DocumentAssembler } from "./document-assembler.js";
import { validateDocument } from "./document-validator.js";
import { renderMarkdown, renderHTML } from "./document-renderer.js";

export class DocumentWorkbench {
  constructor(kernel, registry) {
    this.adapter = new CanonicalProjectAdapter(kernel);
    this.assembler = new DocumentAssembler(this.adapter);
    this.registry = registry;
  }

  async create(projectId, templateId, options = {}) {
    const template = await this.registry.get(templateId, { mode: "clean" });
    const document = this.assembler.create({ projectId, template, ...options });
    return { document, template, qa: validateDocument(document, template) };
  }

  validate(document, template) { return validateDocument(document, template); }

  render(document, template, format = "markdown") {
    if (format === "markdown" || format === "md") return renderMarkdown(document, template);
    if (format === "html") return renderHTML(document, template);
    throw new Error(`Browser renderer does not create ${format}; use tools/render-document.py locally`);
  }

  packageSource(document, template) {
    return {
      "document.yaml": document,
      "template.json": template,
      "document.md": renderMarkdown(document, template),
      "manifest.json": {
        document_id: document.document_id,
        project_id: document.project_id,
        template_id: document.template_id,
        template_version: document.template_version,
        source_baseline: document.source_baseline,
        generated_at: document.generation?.generated_at || null
      }
    };
  }
}
