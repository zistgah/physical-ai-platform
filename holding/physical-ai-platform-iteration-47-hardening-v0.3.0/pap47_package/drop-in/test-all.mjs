/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
import {spawnSync} from 'node:child_process';
import {readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('.',import.meta.url).pathname;
const dirs=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&existsSync(join(root,d.name,'test.mjs')));
let fail=0;
for(const d of dirs){const p=join(root,d.name,'test.mjs');const r=spawnSync(process.execPath,[p],{encoding:'utf8'});process.stdout.write(r.stdout||'');if(r.status!==0){process.stderr.write(r.stderr||'');fail++;}}
const samples=spawnSync(process.execPath,[join(root,'run-samples.mjs')],{encoding:'utf8'});process.stdout.write(samples.stdout||'');if(samples.status!==0){process.stderr.write(samples.stderr||'');fail++;}
if(fail)process.exit(1);console.log(`PASS: ${dirs.length} package test suites and sample runner`);
