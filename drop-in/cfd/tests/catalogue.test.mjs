/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=new URL('../backend-catalogue/manifest.json',import.meta.url);
const c=JSON.parse(fs.readFileSync(p,'utf8'));
assert.equal(c.catalogueVersion,'1.0.0');
assert.ok(c.entries.length>=3);
for (const e of c.entries) {
  assert.ok(e.id && e.name && e.license && e.official && e.licenseUrl);
  assert.equal(e.adapterStatus,'CATALOGUED_NOT_EXECUTION_TESTED');
  assert.ok(e.gpu && e.gpu.length>20);
  assert.ok(e.dimensions.includes(2) && e.dimensions.includes(3));
}
assert.ok(c.entries.some(e=>e.id==='openfoam.com'));
assert.ok(c.entries.some(e=>e.id==='su2'));
assert.ok(c.entries.some(e=>e.id==='code-saturne'));
console.log(`BACKEND CATALOGUE PASS: ${c.entries.length} candidate backends; licence/source/GPU cautions; no false execution claim`);
