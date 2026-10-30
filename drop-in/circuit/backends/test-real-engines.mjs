/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** SPDX-License-Identifier: GPL-3.0-only
 * Real-engine acceptance harness. Missing executables are SKIP, never PASS.
 * Optional CIRCUIT_REAL_ENGINE_REPORT=/path/report.json writes a machine-readable report.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { runNgspice, runXyce } from './index.js';

const root = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(root, '..', 'samples');
const sampleFiles = [
  ...(await readdir(samplesDir)).filter(f => f.endsWith('.json')).map(f => join(samplesDir, f)),
  ...(await readdir(join(samplesDir, 'backends'))).filter(f => f.endsWith('.json')).map(f => join(samplesDir, 'backends', f))
].sort();
const backends = [['ngspice', runNgspice], ['xyce', runXyce]];
const report = {
  schema: 'circuit-real-engine-report/1',
  generatedAt: new Date().toISOString(),
  status: 'PENDING',
  totals: { pass: 0, fail: 0, skip: 0 },
  results: []
};

for (const [backend, runner] of backends) {
  let backendMissing = false;
  for (const file of sampleFiles) {
    const sample = JSON.parse(await readFile(file, 'utf8'));
    const sampleName = file.slice(samplesDir.length + 1).replaceAll('\\', '/');
    if (backendMissing) {
      report.results.push({ backend, sample: sampleName, status: 'SKIP', reason: 'executable unavailable (confirmed earlier in this backend run)' });
      report.totals.skip++;
      console.log(`SKIP ${backend}/${sampleName}: executable unavailable`);
      continue;
    }
    const started = Date.now();
    const result = await runner({ ...sample.input, timeoutMs: 120000, probeVersion: true });
    const elapsedMs = Date.now() - started;
    if (result.outcome === 'HOLD' && /ENOENT|not found|not recognized/i.test(result.reason ?? '')) {
      backendMissing = true;
      report.results.push({ backend, sample: sampleName, status: 'SKIP', reason: result.reason, elapsedMs });
      report.totals.skip++;
      console.log(`SKIP ${backend}/${sampleName}: executable not installed`);
      continue;
    }
    if (result.outcome !== 'OK') {
      report.results.push({ backend, sample: sampleName, status: 'FAIL', reason: result.reason ?? 'backend returned non-OK', elapsedMs, diagnostics: result.diagnostics ?? null });
      report.totals.fail++;
      console.error(`FAIL ${backend}/${sampleName}: ${result.reason}`);
      continue;
    }
    const mismatches = [];
    for (const check of sample.assertions ?? []) {
      const actual = check.path.split('.').reduce((v, k) => v?.[k], result);
      if (!Number.isFinite(actual) || Math.abs(actual - check.expected) > check.tolerance) {
        mismatches.push({ path: check.path, expected: check.expected, tolerance: check.tolerance, actual: Number.isFinite(actual) ? actual : null });
      }
    }
    if (mismatches.length) {
      report.results.push({ backend, sample: sampleName, status: 'FAIL', mismatches, elapsedMs, backendVersion: result.backendVersion ?? null });
      report.totals.fail++;
      console.error(`FAIL ${backend}/${sampleName}: ${mismatches.length} reference mismatch(es)`);
    } else {
      report.results.push({ backend, sample: sampleName, status: 'PASS', elapsedMs,
        backendVersion: result.backendVersion ?? null, netlistHash: result.provenance?.netlistSha256 ?? null,
        deckHash: result.provenance?.deckSha256 ?? null, rawOutputHash: result.provenance?.rawOutputSha256 ?? null });
      report.totals.pass++;
      console.log(`PASS ${backend}/${sampleName}`);
    }
  }
}
report.status = report.totals.fail ? 'FAIL' : report.totals.pass ? (report.totals.skip ? 'PARTIAL' : 'PASS') : 'NOT_RUN';
const reportPath = process.env.CIRCUIT_REAL_ENGINE_REPORT;
if (reportPath) await writeFile(resolve(reportPath), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(`real-engine summary: ${report.totals.pass} PASS, ${report.totals.fail} FAIL, ${report.totals.skip} SKIP; status=${report.status}`);
if (report.totals.fail) process.exitCode = 1;
