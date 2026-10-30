/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emulate } from './module.js';
const source=await readFile(new URL('./module.js',import.meta.url),'utf8');
for (const forbidden of ['node:child_process','node:fs','node:process','child_process','process.env','Buffer.','require(','from \'node:']) assert.equal(source.includes(forbidden),false,`Browser runtime must not contain ${forbidden}`);
const result=emulate({device:{id:'browser-smoke-device'},input:{command:2},observed:{response:4},model:x=>({response:x.command*2})});
assert.equal(result.outcome,'OK');
assert.equal(result.evidence.physicalVerification,false);
console.log('browser runtime contract: pure ES module / no Node or Python runtime dependency PASS');
