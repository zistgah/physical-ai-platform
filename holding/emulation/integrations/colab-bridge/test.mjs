/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createJobBundle, validateJobBundle, verifyJobBundle, createResultBundle, validateResultBundle, buildColabUrl, canonicalJson, sha256Hex, bundleToBlob } from './module.js';
let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack || e}`); } }
const base = () => createJobBundle({ sir: { header: { id: 'demo-system', version: '1.0.0' }, components: [] }, target: { backendId: 'scipy.solve_ivp', backendVersion: '1.14.1', operation: 'linear_ode', requestedDevice: 'cpu' }, inputs: { A: [[-1]], B: [[1]], x0: [0], times: [0, 1] }, observations: [{ sequence: 0, time: 0 }, { sequence: 1, time: 1 }], provenance: { source: 'unit-test' } });
const outputs = [{ sequence: 0, time: 0, values: { state: [0] } }, { sequence: 1, time: 1, values: { state: [0.6321205588] } }];
let job;
await test('canonical JSON sorts object keys recursively', () => assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}'));
await test('SHA-256 matches known empty-string vector', async () => assert.equal(await sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
await test('createJobBundle binds SIR, backend, inputs and provenance', async () => { job = await base(); assert.equal(job.schema, 'pap.emulation.job/1.0'); assert.match(job.digest, /^sha256:[a-f0-9]{64}$/); assert.ok(job.jobId.startsWith('papjob-')); });
await test('job bundle structural validation succeeds', () => assert.equal(validateJobBundle(job).valid, true));
await test('job bundle digest and deterministic ID verify', async () => assert.equal((await verifyJobBundle(job)).valid, true));
await test('mutated job inputs fail digest verification', async () => { const altered = structuredClone(job); altered.inputs.x0[0] = 99; assert.equal((await verifyJobBundle(altered)).valid, false); });
await test('unknown job schema is rejected', () => assert.equal(validateJobBundle({ ...job, schema: 'pap.job/99' }).valid, false));
await test('missing backend identity is rejected', () => assert.equal(validateJobBundle({ ...job, target: {} }).valid, false));
await test('non-finite input is rejected', async () => await assert.rejects(() => createJobBundle({ sir: {}, target: { backendId: 'x' }, inputs: { x: Infinity } })));
await test('cyclic job payload is rejected', async () => { const x = {}; x.self = x; await assert.rejects(() => createJobBundle({ sir: x, target: { backendId: 'x' }, inputs: {} })); });
await test('accessor-bearing job payload is rejected', async () => { const x = {}; Object.defineProperty(x, 'bad', { enumerable: true, get() { return 1; } }); await assert.rejects(() => createJobBundle({ sir: {}, target: { backendId: 'x' }, inputs: x })); });
await test('unsafe prototype keys are rejected', async () => { const x = JSON.parse('{"__proto__":{"polluted":true}}'); await assert.rejects(() => createJobBundle({ sir: x, target: { backendId: 'x' }, inputs: {} })); });
await test('createResultBundle creates a bound, unverified result', async () => { const result = await createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs, diagnostics: { success: true } }); assert.equal(result.evidenceState, 'UNVERIFIED'); assert.equal(result.physicalVerification, false); });
let good;
await test('valid result verifies against exact job and digest', async () => { good = await createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs }); const v = await validateResultBundle(job, good); assert.equal(v.valid, true); assert.equal(v.outcome, 'UNVERIFIED'); });
await test('result from another job is rejected', async () => { const other = await base(); const r = await createResultBundle({ job: other, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs }); assert.equal((await validateResultBundle(job, r)).valid, false); });
await test('result backend identity mismatch is rejected at creation', async () => await assert.rejects(() => createResultBundle({ job, backend: { id: 'other', version: '1.0' }, outputs }))); 
await test('result with missing backend version is rejected at creation', async () => await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '' }, outputs }))); 
await test('empty output list is rejected at creation', async () => await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs: [] }))); 
await test('non-monotonic sequence is rejected at creation', async () => await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs: [{ ...outputs[0] }, { ...outputs[1], sequence: 0 }] }))); 
await test('backward simulation time is rejected at creation', async () => await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs: [{ ...outputs[0] }, { ...outputs[1], time: -1 }] }))); 
await test('NaN output is rejected before serialization', async () => { await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs: [{ sequence: 0, time: 0, values: { x: NaN } }] })); });
await test('attempted physical/HIL promotion is rejected even with a recomputed digest', async () => { const { canonicalPayload, resultDigest, ...body } = structuredClone(good); body.physicalVerification = true; const cp = canonicalJson(body); const r = { ...body, canonicalPayload: cp, resultDigest: `sha256:${await sha256Hex(cp)}` }; assert.equal((await validateResultBundle(job, r)).valid, false); });
await test('tampered result body fails digest validation', async () => { const r = structuredClone(good); r.outputs[1].values.state[0] = 42; assert.equal((await validateResultBundle(job, r)).valid, false); });
await test('wrong runtime/status is rejected even with recomputed digest', async () => { const { canonicalPayload, resultDigest, ...body } = structuredClone(good); body.execution.runtime = 'LOCAL_NODE'; const cp = canonicalJson(body); const r = { ...body, canonicalPayload: cp, resultDigest: `sha256:${await sha256Hex(cp)}` }; assert.equal((await validateResultBundle(job, r)).valid, false); });

await test('result sample count must match declared observation grid', async () => { const observedJob = await createJobBundle({ sir: { id: 'obs' }, target: { backendId: 'scipy.solve_ivp', operation: 'scipy.linear_ode' }, inputs: {}, observations: [{ sequence: 0, time: 0 }, { sequence: 1, time: 1 }] }); await assert.rejects(() => createResultBundle({ job: observedJob, backend: { id: 'scipy.solve_ivp', version: '1.0.0' }, outputs: [outputs[0]] })); });
await test('result schema version mismatch is rejected', async () => { const r = structuredClone(good); r.schema = 'pap.emulation.result/99'; assert.equal((await validateResultBundle(job, r)).valid, false); });
await test('result execution status must be EXECUTED', async () => { const { canonicalPayload, resultDigest, ...body } = structuredClone(good); body.execution.status = 'PLANNED'; const cp = canonicalJson(body); const r = { ...body, canonicalPayload: cp, resultDigest: `sha256:${await sha256Hex(cp)}` }; assert.equal((await validateResultBundle(job, r)).valid, false); });
await test('equal timestamps are allowed when sample sequence increases', async () => { const r = await createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs: [{ sequence: 0, time: 1, values: { x: 0 } }, { sequence: 1, time: 1, values: { x: 0 } }] }); assert.equal((await validateResultBundle(job, r)).valid, true); });

await test('pinned backend version cannot be substituted', async () => { const pinned = await createJobBundle({ sir: { id: 'pinned' }, target: { backendId: 'scipy.solve_ivp', backendVersion: '1.0.0', operation: 'scipy.linear_ode' }, inputs: {} }); await assert.rejects(() => createResultBundle({ job: pinned, backend: { id: 'scipy.solve_ivp', version: '1.0.1' }, outputs })); });
await test('execution start after finish is rejected', async () => { await assert.rejects(() => createResultBundle({ job, backend: { id: 'scipy.solve_ivp', version: '1.14.1' }, outputs, execution: { startedAt: '2026-10-30T12:00:00Z', finishedAt: '2026-10-30T11:00:00Z', device: 'cpu' } })); });
await test('Colab URL builder creates GitHub notebook URL', () => assert.equal(buildColabUrl({ owner: 'example', repository: 'pap', branch: 'main', notebookPath: 'notebooks/emulation/a.ipynb' }), 'https://colab.research.google.com/github/example/pap/blob/main/notebooks/emulation/a.ipynb'));
await test('Colab URL rejects missing repository coordinates', () => assert.throws(() => buildColabUrl({ owner: 'example', repository: '', notebookPath: 'a.ipynb' })));
await test('Colab URL rejects traversal path', () => assert.throws(() => buildColabUrl({ owner: 'x', repository: 'y', branch: 'main', notebookPath: '../a.ipynb' })));
await test('Colab URL requires notebook extension', () => assert.throws(() => buildColabUrl({ owner: 'x', repository: 'y', branch: 'main', notebookPath: 'script.py' })));
await test('bundle converts to browser Blob with JSON MIME type', () => { const blob = bundleToBlob(job); assert.equal(blob.type, 'application/json;charset=utf-8'); assert.ok(blob.size > 0); });
await test('bundle size limit is enforced', async () => { const huge = { payload: 'x'.repeat(17 * 1024 * 1024) }; assert.throws(() => bundleToBlob(huge), /exceeds/); });
if (failed) process.exitCode = 1;


await test('bridge source is browser-native and contains no Node/Python execution APIs', async () => { const source=await readFile(new URL('./module.js',import.meta.url),'utf8'); for (const forbidden of ['node:child_process','node:fs','process.env','Buffer.','child_process','subprocess','eval(']) assert.equal(source.includes(forbidden),false,`Forbidden runtime API ${forbidden}`); });
console.log(`\nColab bridge tests: ${passed} PASS, ${failed} FAIL`);
