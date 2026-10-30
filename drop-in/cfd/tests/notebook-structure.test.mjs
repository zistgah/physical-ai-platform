/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path=new URL('../notebooks/CFD_Backend_Colab.ipynb',import.meta.url);
const nb=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(nb.nbformat,4); assert.ok(nb.cells.length>=12);
const all=nb.cells.map(c=>c.source.join('')).join('\n');
for (const token of ['Copyright © 1993-2026 Abhishek Choudhary','GPL-3.0-only','GPU','CuPy','OpenFOAM','SU2','Code_Saturne','UNVERIFIED','configuration_ref','COMMIT_SHA','openfoam2606-default','add-debian-repo.sh','ENABLE_OPENFOAM_INSTALL','simpleFoam','pitzDaily','EXECUTED_UNVERIFIED','external_backend_install','external_backend_smoke','gpu_solver_execution_claim']) assert.ok(all.includes(token),`notebook missing ${token}`);
assert.equal(nb.metadata.pap.notebook_id,'pap-cfd-backend-colab');
assert.equal(nb.metadata.pap.license,'GPL-3.0-only');
assert.ok(nb.cells.filter(c=>c.cell_type==='code').every(c=>c.outputs.length===0 && c.execution_count===null));
console.log(`NOTEBOOK STRUCTURE PASS: ${nb.cells.length} cells; metadata, attribution, GPU path, backend discovery, trust boundary, reproducibility link`);
