/**
 * Iteration 46 – document system stitched into the spine.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bibo } from "../tests/bibo.mjs";
import { CanonicalProjectAdapter } from "../site/components/documents/canonical-binding.js";
import { DocumentAssembler } from "../site/components/documents/document-assembler.js";
import { validateDocument } from "../site/components/documents/document-validator.js";
import { renderMarkdown } from "../site/components/documents/document-renderer.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }
const read = p => JSON.parse(readFileSync(p, "utf8"));

const manifest = read("data/document-templates/manifest.json");
assert(manifest.templates.length === 34, "34 templates");

const kernel = createKernel();
kernel.upsert({ id: "p1", type: "Project", name: "Doc Test", revision: 7 });
kernel.upsert({ id: "c1", type: "Component", name: "C1", costMaterial: 10, costProcess: 2, costLabor: 3, provenance: { derivedFrom: "p1" } });
kernel.link("p1", "CONTAINS", "c1");

bibo("documents", {
  below: { fn: () => { try { new CanonicalProjectAdapter(null); return "threw"; } catch { return "HOLD"; } }, expect: (r) => r === "HOLD" },
  on: { fn: () => new CanonicalProjectAdapter(kernel).entities("p1", "Component").length, expect: (n) => n === 1 },
  within: { fn: () => {
    const adapter = new CanonicalProjectAdapter(kernel);
    const assembler = new DocumentAssembler(adapter);
    const template = read("data/document-templates/clean/funding-proposal.json");
    const doc = assembler.create({ projectId: "p1", template, authored: { "summary.body": "Early-stage proposal." } });
    return validateDocument(doc, template).outcome;
  }, expect: (o) => o === "HOLD" },
  above: { fn: () => validateDocument(null, null).outcome, expect: (o) => o === "FAIL" }
});

const adapter = new CanonicalProjectAdapter(kernel);
const assembler = new DocumentAssembler(adapter);
const template = read("data/document-templates/clean/funding-proposal.json");
const doc = assembler.create({ projectId: "p1", template, authored: { "summary.body": "Early-stage proposal." } });
const md = renderMarkdown(doc, template);
assert(md.includes("Early-stage proposal"), "Markdown renders the authored text");
assert(md.includes("UNSPECIFIED"), "Markdown marks unspecified fields");

console.log("\n=== ALL ITERATION 46 TESTS PASSED ===");
