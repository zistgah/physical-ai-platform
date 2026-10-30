/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Targeted mutation test: each weakened integrity/evidence gate must be detected. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=await readFile(path.join(here,'module.js'),'utf8');
const tests=path.join(here,'test.mjs');
const mutants=[
  ['disable-job-payload-binding',"if (canonicalJson(payload) !== canonicalJson(body))","if (false)"],
  ['disable-job-result-binding',"if (result.jobId !== job.jobId || result.jobDigest !== job.digest)","if (false)"],
  ['allow-physical-promotion',"if (result.physicalVerification !== false || result.evidenceState !== 'UNVERIFIED' || result.fidelity !== 'SIMULATED')","if (false)"]
];
let killed=0;
for(const [name,needle,replacement] of mutants){
  assert.ok(source.includes(needle),`Mutation anchor missing: ${name}`);
  const dir=await mkdtemp(path.join(os.tmpdir(),'pap-colab-mutant-'));
  try{
    await copyFile(tests,path.join(dir,'test.mjs'));
    await writeFile(path.join(dir,'module.js'),source.replaceAll(needle,replacement));
    const {spawnSync}=await import('node:child_process');
    const run=spawnSync(process.execPath,['test.mjs'],{cwd:dir,encoding:'utf8',timeout:60000});
    if(run.status!==0){killed++;console.log(`KILLED ${name}`);} else {console.error(`SURVIVED ${name}`);process.exitCode=1;}
  } finally { await rm(dir,{recursive:true,force:true}); }
}
console.log(`Colab Bridge mutation sample: ${killed}/${mutants.length} killed`);
assert.equal(killed,mutants.length,'All bridge mutations must be killed');
