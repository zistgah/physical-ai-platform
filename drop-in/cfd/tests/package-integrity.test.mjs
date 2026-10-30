/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const paths=['../module.js','../integration/backend-job.js','./backend-job.test.mjs','./notebook-structure.test.mjs','./catalogue.test.mjs'];
for (const p of paths) {
  const s=fs.readFileSync(new URL(p,import.meta.url),'utf8');
  assert.ok(s.startsWith('/** Copyright © 1993-2026 Abhishek Choudhary.'),`copyright missing: ${p}`);
}
for (const p of ['../manifest.json','../backend-catalogue/manifest.json']) {
  const m=JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
  assert.equal(m.license,'GPL-3.0-only');
}
const notebook=JSON.parse(fs.readFileSync(new URL('../notebooks/CFD_Backend_Colab.ipynb',import.meta.url),'utf8'));
assert.equal(notebook.metadata.pap.copyright,'Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.');
assert.equal(notebook.metadata.pap.license,'GPL-3.0-only');
console.log('PACKAGE INTEGRITY PASS: source attribution, JSON manifests and notebook copyright/licence metadata');
