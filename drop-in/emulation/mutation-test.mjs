/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Targeted mutations: numeric, sequence, event, output-port and nonfinite gates. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=await readFile(path.join(here,'module.js'),'utf8');
const tests=path.join(here,'test.mjs');
const mutants=[
 ['disable-numeric-tolerance-gate','if (rel > allowedNormalized + boundarySlack)','if (false)'],
 ['disable-step-sequence-gate','if (sequence <= previousSequence) return hold','if (false)'],
 ['disable-event-sequence-gate','ev.sequence <= previousEventSequence ||','false ||'],
 [ 'disable-output-port-gate',"if (!p.valid) return hold('Output port contract failed'","if (false) return hold('Output port contract failed'"],
 ['disable-nonfinite-output-gate','const pe = inspectJson(predicted, `step[${i}].output`); if (pe) return hold(pe, { stepIndex: i });','const pe = null; if (pe) return hold(pe, { stepIndex: i });']
];
let killed=0;
for(const [name,needle,replacement] of mutants){
 assert.equal(source.split(needle).length-1,1,`Mutation anchor must be unique: ${name}`);
 const dir=await mkdtemp(path.join(os.tmpdir(),'pap-emulation-mutant-'));
 try{
  await copyFile(tests,path.join(dir,'test.mjs'));
  await writeFile(path.join(dir,'module.js'),source.replace(needle,replacement));
  const {spawnSync}=await import('node:child_process');
  const run=spawnSync(process.execPath,['test.mjs'],{cwd:dir,encoding:'utf8',timeout:60000});
  if(run.status!==0){killed++;console.log(`KILLED ${name}`);} else {console.error(`SURVIVED ${name}`);process.exitCode=1;}
 } finally { await rm(dir,{recursive:true,force:true}); }
}
console.log(`Emulation mutation sample: ${killed}/${mutants.length} killed`);
assert.equal(killed,mutants.length,'All emulation mutations must be killed');
