/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Adapter contract tests use deterministic fake process runners; no external binary is claimed. */
import assertStrict from 'node:assert/strict';
let assertionCount = 0;
const assert = Object.assign(
  (...args) => { assertionCount++; return assertStrict(...args); },
  Object.fromEntries(Object.keys(assertStrict).filter(k => typeof assertStrict[k] === 'function').map(k => [k, (...args) => { assertionCount++; return assertStrict[k](...args); }]))
);
import { readFile } from 'node:fs/promises';
import { runNgspice, runXyce, runCircuit, BACKEND_CATALOG, BACKEND_CONTRACT } from './index.js';
import { createHash } from 'node:crypto';

const netlist = { ground: 'earth', elements: [
  { id: 'supply/main', type: 'V', n1: 'VIN', n2: 'earth', value: { type: 'step', initial: 0, value: 5, at: 0.0002 } },
  { id: 'load-R', type: 'R', n1: 'VIN', n2: 'OUT', value: 1000 },
  { id: 'filter-C', type: 'C', n1: 'OUT', n2: 'earth', value: 1e-6 }
] };
function fakeRunnerFactory(backend) {
  return async (bin, args, opts) => {
    assert.equal(opts.shell, false, 'external process must not use a shell');
    assert.equal(opts.cwd.startsWith('/tmp/'), true, 'execution is isolated in a temporary directory');
    const deck = await readFile(args.at(-1), 'utf8');
    assert.match(deck, /1\.000000000000000e\+3/);
    assert.match(deck, /1\.000000000000000e-6/);
    assert.match(deck, /PWL\(/, 'step waveform is lowered to PWL');
    assert.match(deck, backend === 'ngspice' ? /wrdata results\.dat/ : /FORMAT=CSV FILE=results\.csv/);
    const content = backend === 'ngspice'
      ? 'time v(n00001) v(n00002) i(v00001) i(r00001) i(c00001)\n0 0 5 -0.005 0.005 0\n0.001 2 5 -0.003 0.003 0.003\n'
      : 'TIME,V(N00001),V(N00002),I(V00001),I(R00001),I(C00001)\n0,0,5,-0.005,0.005,0\n0.001,2,5,-0.003,0.003,0.003\n';
    const { writeFile } = await import('node:fs/promises');
    await writeFile(`${opts.cwd}/${backend === 'ngspice' ? 'results.dat' : 'results.csv'}`, content);
    return { code: 0, stdout: 'simulated backend fixture' };
  };
}

for (const [backend, fn] of [['ngspice', runNgspice], ['xyce', runXyce]]) {
  const result = await fn({ netlist, steps: 10, dt: 1e-4, method: 'trapezoidal', runner: fakeRunnerFactory(backend) });
  assert.equal(result.outcome, 'OK', `${backend} fake-runner result succeeds`);
  assert.equal(result.backend, backend);
  assert.equal(result.history.time.length, 2);
  assert.equal(result.final.nodeVoltages.OUT, 2);
  assert.equal(result.final.elementCurrents['load-R'], 0.003);
  assert(Math.abs(result.final.elementPower['load-R'] - 0.009) < 1e-14);
  assert.equal(result.verified, false, 'external execution does not imply engineering verification');
  assert.equal(result.evidence.referenceComparison, 'NOT_PERFORMED');
}
const unknownDevice = await runNgspice({ netlist: { elements: [{ id: 'D1', type: 'D', n1: 'a', n2: '0', value: 1 }] }, steps: 1, dt: 1e-3, runner: fakeRunnerFactory('ngspice') });
assert.equal(unknownDevice.outcome, 'HOLD');
const badTime = await runXyce({ netlist, steps: 1, dt: 0, runner: fakeRunnerFactory('xyce') });
assert.equal(badTime.outcome, 'HOLD');
const malformedOutput = await runNgspice({ netlist, steps: 10, dt: 1e-4, runner: async () => ({ code: 0 }) });
assert.equal(malformedOutput.outcome, 'HOLD');
assert.equal(BACKEND_CATALOG.xyce.license, 'GPL-3.0');
assert(BACKEND_CONTRACT.externalAdapters.includes('ngspice'));

// Nonlinear SPICE model cards and multi-terminal current probes are lowered explicitly.
const diodeNetlist = {
  models: [{ name: 'DMOD', type: 'D', card: '.model DMOD D(Is=1e-14 N=1)' }],
  elements: [
    { id: 'VCC', type: 'V', n1: 'vcc', n2: '0', value: 5 },
    { id: 'RLOAD', type: 'R', n1: 'vcc', n2: 'out', value: 1000 }
  ],
  devices: [{ id: 'DLED', type: 'D', terminals: { anode: 'out', cathode: '0' }, model: 'DMOD' }]
};
for (const [backend, fn] of [['ngspice', runNgspice], ['xyce', runXyce]]) {
  const semiRunner = async (_bin, args, opts) => {
    const deck = await readFile(args.at(-1), 'utf8');
    assert.match(deck, /\.model DMOD D\(Is=1e-14 N=1\)/);
    assert.match(deck, /VSENSE00001 N00001 S00001 0/);
    assert.match(deck, /D00001 S00001 S00002 DMOD/);
    const content = backend === 'ngspice'
      ? 'time v(n00001) v(n00002) i(v00001) i(r00001) i(vsense00001) i(vsense00002)\n0 0.7 5 -0.0043 0.0043 0.0043 -0.0043\n'
      : 'TIME,V(N00001),V(N00002),I(V00001),I(R00001),I(VSENSE00001),I(VSENSE00002)\n0,0.7,5,-0.0043,0.0043,0.0043,-0.0043\n';
    const { writeFile } = await import('node:fs/promises');
    await writeFile(`${opts.cwd}/${backend === 'ngspice' ? 'results.dat' : 'results.csv'}`, content);
    return { code: 0, stdout: '' };
  };
  const result = await fn({ netlist: diodeNetlist, steps: 1, dt: 1e-6, runner: semiRunner });
  assert.equal(result.outcome, 'OK');
  assert.equal(result.final.elementCurrents.DLED, 0.0043);
  assert.equal(result.final.terminalCurrents.DLED.anode, 0.0043);
  assert.equal(result.final.terminalCurrents.DLED.cathode, -0.0043);
  assert(Math.abs(result.final.elementPower.DLED - 0.00301) < 1e-12);
}
const missingModel = await runNgspice({ netlist: { elements: [], devices: [{ id: 'D1', type: 'D', terminals: { anode: 'a', cathode: '0' }, model: 'MISSING' }] }, steps: 1, dt: 1e-6, runner: fakeRunnerFactory('ngspice') });
assert.equal(missingModel.outcome, 'HOLD');


// Trusted, content-addressed model-library packs are copied into the isolated run directory.
const libraryContent = '.model DMOD D(Is=1e-14 N=1)\n';
const libraryDigest = createHash('sha256').update(libraryContent).digest('hex');
const libraryResolver = async (refs, { backend }) => ({
  verified: true,
  libraries: [{ id: refs[0], version: 'test-1', source: 'test-registry', files: [{ path: 'lib/diodes.lib', content: libraryContent, sha256: libraryDigest }] }],
  models: [{ name: 'DMOD', type: 'D', libraryId: refs[0] }]
});
const libraryRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /\.include "lib\/diodes\.lib"/);
  assert.equal(await readFile(`${opts.cwd}/lib/diodes.lib`, 'utf8'), libraryContent);
  const content = 'time v(n00001) v(n00002) i(v00001) i(r00001) i(vsense00001) i(vsense00002)\n0 0.7 5 -0.0043 0.0043 0.0043 -0.0043\n';
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, content);
  return { code: 0, stdout: '' };
};
const fromLibrary = await runNgspice({ netlist: { elements: diodeNetlist.elements, devices: diodeNetlist.devices }, steps: 1, dt: 1e-6,
  modelLibraryRefs: ['vendor-diode-pack@1'], modelLibraryResolver: libraryResolver, runner: libraryRunner });
assert.equal(fromLibrary.outcome, 'OK');
assert.equal(fromLibrary.evidence.modelLibraryCount, 1);
assert.equal(fromLibrary.evidence.modelLibraries[0].id, 'vendor-diode-pack@1');
const badLibrary = await runNgspice({ netlist: diodeNetlist, steps: 1, dt: 1e-6, modelLibraryRefs: ['tampered'],
  modelLibraryResolver: async () => ({ verified: true, libraries: [{ id: 'tampered', version: '1', files: [{ path: 'x.lib', content: 'bad', sha256: '0'.repeat(64) }] }], models: [] }), runner: libraryRunner });
assert.equal(badLibrary.outcome, 'HOLD');
const noResolver = await runNgspice({ netlist: diodeNetlist, steps: 1, dt: 1e-6, modelLibraryRefs: ['unresolved'], runner: libraryRunner });
assert.equal(noResolver.outcome, 'HOLD');
const fallback = await runCircuit({ backend: 'auto', netlist: { elements: [ { id: 'V', type: 'V', n1: 'n', n2: '0', value: 2 }, { id: 'R', type: 'R', n1: 'n', n2: '0', value: 1000 } ] }, steps: 1, dt: 1e-3,
  runner: async bin => { throw new Error(`spawn ${bin} ENOENT`); } });
assert.equal(fallback.outcome, 'OK');
assert.equal(fallback.backend, 'native');
assert.equal(fallback.backendSelection, 'AUTO_FALLBACK_NATIVE');

// Three- and four-terminal device families preserve pin order and return per-terminal currents.
const multiDeviceNetlist = {
  models: [
    { name: 'QMOD', type: 'NPN', card: '.model QMOD NPN(BF=100 IS=1e-15)' },
    { name: 'MMOD', type: 'NMOS', card: '.model MMOD NMOS(VTO=1 KP=1e-3)' },
    { name: 'JMOD', type: 'NJF', card: '.model JMOD NJF(VTO=-2 BETA=1e-4)' }
  ],
  devices: [
    { id: 'Q1', type: 'Q', model: 'QMOD', terminals: { collector: 'qc', base: 'qb', emitter: 'qe' } },
    { id: 'M1', type: 'M', model: 'MMOD', terminals: { drain: 'md', gate: 'mg', source: 'ms', bulk: 'mb' }, parameters: { L: 1e-6, W: 10e-6 } },
    { id: 'J1', type: 'J', model: 'JMOD', terminals: { drain: 'jd', gate: 'jg', source: 'js' } }
  ]
};
const multiRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /Q00001 S00001 S00002 S00003 QMOD/);
  assert.match(deck, /M00001 S00004 S00005 S00006 S00007 MMOD L=1\.000000000000000e-6 W=1\.000000000000000e-5/);
  assert.match(deck, /J00001 S00008 S00009 S00010 JMOD/);
  const externalNodes = ['qc', 'qb', 'qe', 'md', 'mg', 'ms', 'mb', 'jd', 'jg', 'js'].sort();
  const headers = ['time', ...externalNodes.map((_, i) => `v(n${String(i + 1).padStart(5, '0')})`), ...Array.from({ length: 10 }, (_, i) => `i(vsense${String(i + 1).padStart(5, '0')})`)];
  const row = Array(headers.length).fill('0').join(' ');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, `${headers.join(' ')}\n${row}\n`);
  return { code: 0, stdout: '' };
};
const multiResult = await runNgspice({ netlist: multiDeviceNetlist, steps: 1, dt: 1e-6, runner: multiRunner });
assert.equal(multiResult.outcome, 'OK');
assert.deepEqual(Object.keys(multiResult.final.terminalCurrents.Q1), ['collector', 'base', 'emitter']);
assert.deepEqual(Object.keys(multiResult.final.terminalCurrents.M1), ['drain', 'gate', 'source', 'bulk']);
assert.deepEqual(Object.keys(multiResult.final.terminalCurrents.J1), ['drain', 'gate', 'source']);


// Trusted subcircuit libraries support vendor-style X instances with explicit ordered pins.
const subcktContent = '.SUBCKT DIODEMOD A K\nDCORE A K DMOD\n.ENDS DIODEMOD\n.model DMOD D(Is=1e-14 N=1)\n';
const subcktHash = createHash('sha256').update(subcktContent).digest('hex');
const subcktResolver = async refs => ({
  verified: true,
  libraries: [{ id: refs[0], version: 'subckt-1', files: [{ path: 'models/diode-subckt.lib', content: subcktContent, sha256: subcktHash }] }],
  models: [
    { name: 'DIODEMOD', type: 'SUBCKT', pins: ['A', 'K'], libraryId: refs[0] },
    { name: 'DMOD', type: 'D', libraryId: refs[0] }
  ]
});
const subcktRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /\.include "models\/diode-subckt\.lib"/);
  assert.match(deck, /X00001 S00001 S00002 DIODEMOD/);
  const content = 'time v(n00001) i(vsense00001) i(vsense00002)\n0 0.65 0.00435 -0.00435\n';
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, content);
  return { code: 0, stdout: '' };
};
const subcktResult = await runNgspice({ netlist: { devices: [{ id: 'DIODE_X', type: 'X', model: 'DIODEMOD', pinOrder: ['A', 'K'], terminals: { A: 'out', K: '0' } }] },
  steps: 1, dt: 1e-6, modelLibraryRefs: ['diode-subcircuit'], modelLibraryResolver: subcktResolver, runner: subcktRunner });
assert.equal(subcktResult.outcome, 'OK');
assert.equal(subcktResult.final.terminalCurrents.DIODE_X.A, 0.00435);
assert.equal(subcktResult.final.terminalCurrents.DIODE_X.K, -0.00435);


const unsafeLibrary = await runNgspice({ netlist: diodeNetlist, steps: 1, dt: 1e-6, modelLibraryRefs: ['unsafe-pack'],
  modelLibraryResolver: async refs => ({ verified: true, libraries: [{ id: refs[0], version: '1', files: [{ path: 'bad.lib', content: '.control\nquit\n.endc\n', sha256: createHash('sha256').update('.control\nquit\n.endc\n').digest('hex') }] }], models: [] }), runner: libraryRunner });
assert.equal(unsafeLibrary.outcome, 'HOLD');
const unsafeInclude = await runNgspice({ netlist: diodeNetlist, steps: 1, dt: 1e-6, modelLibraryRefs: ['include-escape'],
  modelLibraryResolver: async refs => ({ verified: true, libraries: [{ id: refs[0], version: '1', files: [{ path: 'lib/a.lib', content: '.include "../../outside.lib"\n', sha256: createHash('sha256').update('.include "../../outside.lib"\n').digest('hex') }] }], models: [] }), runner: libraryRunner });
assert.equal(unsafeInclude.outcome, 'HOLD');

// Xyce current-source current is reconstructed from the canonical independent source,
// rather than requesting an I() branch variable that the engine does not expose uniformly.
const currentSourceNetlist = { elements: [
  { id: 'ISRC', type: 'I', n1: '0', n2: 'sense', value: { type: 'step', initial: 0, value: 0.001, at: 0 } },
  { id: 'RLOAD', type: 'R', n1: 'sense', n2: '0', value: 1000 }
] };
const currentSourceRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.doesNotMatch(deck, /I\(I00001\)/i);
  const content = 'TIME,V(N00001),I(R00001)\n0.001,1,0.001\n';
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.csv`, content);
  return { code: 0, stdout: '' };
};
const currentSourceResult = await runXyce({ netlist: currentSourceNetlist, steps: 1, dt: 1e-3, runner: currentSourceRunner });
assert.equal(currentSourceResult.outcome, 'OK');
assert.equal(currentSourceResult.final.elementCurrents.ISRC, 0.001);
assert.equal(currentSourceResult.final.nodeVoltages.sense, 1);

const nonzeroExit = await runXyce({ netlist, steps: 1, dt: 1e-6, runner: async () => ({ code: 17, stdout: '', stderr: 'model convergence failure' }) });
assert.equal(nonzeroExit.outcome, 'HOLD');
assert.match(nonzeroExit.reason, /exited with code 17/);


// The shipped external diode sample itself is loaded and checked through the adapter.
const diodeSample = JSON.parse(await readFile(new URL('../samples/backends/diode-clamp.json', import.meta.url), 'utf8'));
const diodeSampleRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /\.model DMOD D\(Is=1e-14 N=1\)/);
  const output = backendOutput => backendOutput === 'ngspice'
    ? 'time v(n00001) v(n00002) i(v00001) i(r00001) i(vsense00001) i(vsense00002)\n0 0.6929 5 -0.004307 0.004307 0.004307 -0.004307\n'
    : 'TIME,V(N00001),V(N00002),I(V00001),I(R00001),I(VSENSE00001),I(VSENSE00002)\n0,0.6929,5,-0.004307,0.004307,0.004307,-0.004307\n';
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/${_bin === 'ngspice' ? 'results.dat' : 'results.csv'}`, output(_bin));
  return { code: 0, stdout: '' };
};
for (const [backend, fn] of [['ngspice', runNgspice], ['xyce', runXyce]]) {
  const sampleResult = await fn({ ...diodeSample.input, runner: diodeSampleRunner });
  assert.equal(sampleResult.outcome, 'OK');
  for (const check of diodeSample.assertions) {
    const actual = check.path.split('.').reduce((v, k) => v?.[k], sampleResult);
    assert(Number.isFinite(actual) && Math.abs(actual - check.expected) <= check.tolerance, `${backend} diode sample ${check.path}`);
  }
}


// Multi-file library bundles include only the declared root entrypoint; nested includes are closed.
const mainLib = '.include "models/diodes.lib"\n';
const modelLib = '.model DMOD D(Is=1e-14 N=1)\n';
const nestedResolver = async refs => ({ verified: true, libraries: [{ id: refs[0], version: 'nested-1', entrypoints: ['root/main.lib'], files: [
  { path: 'root/main.lib', content: mainLib, sha256: createHash('sha256').update(mainLib).digest('hex') },
  { path: 'root/models/diodes.lib', content: modelLib, sha256: createHash('sha256').update(modelLib).digest('hex') }
] }], models: [{ name: 'DMOD', type: 'D', libraryId: refs[0] }] });
const nestedRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /\.include "root\/main\.lib"/);
  assert.doesNotMatch(deck, /\.include "root\/models\/diodes\.lib"/);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, 'time v(n00001) i(vsense00001) i(vsense00002)\n0 0.65 0.01 -0.01\n');
  return { code: 0, stdout: '' };
};
const nestedResult = await runNgspice({ netlist: { devices: [{ id: 'D1', type: 'D', model: 'DMOD', terminals: { anode: 'a', cathode: '0' } }] },
  steps: 1, dt: 1e-6, modelLibraryRefs: ['nested-pack'], modelLibraryResolver: nestedResolver, runner: nestedRunner });
assert.equal(nestedResult.outcome, 'OK');


// PDK-style library sections are selected through typed registry metadata, not raw user directives.
const cornerContent = '.lib tt\n.model DMOD D(Is=1e-14 N=1)\n.endl tt\n';
const cornerResolver = async refs => ({ verified: true, libraries: [{ id: refs[0], version: 'corner-1', libraryCalls: [{ path: 'pdk/corners.lib', section: 'tt' }], files: [
  { path: 'pdk/corners.lib', content: cornerContent, sha256: createHash('sha256').update(cornerContent).digest('hex') }
] }], models: [{ name: 'DMOD', type: 'D', libraryId: refs[0] }] });
const cornerRunner = async (_bin, args, opts) => {
  const deck = await readFile(args.at(-1), 'utf8');
  assert.match(deck, /\.lib "pdk\/corners\.lib" tt/);
  assert.doesNotMatch(deck, /\.include "pdk\/corners\.lib"/);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, 'time v(n00001) i(vsense00001) i(vsense00002)\n0 0.65 0.01 -0.01\n');
  return { code: 0, stdout: '' };
};
const cornerResult = await runNgspice({ netlist: { devices: [{ id: 'D1', type: 'D', model: 'DMOD', terminals: { anode: 'a', cathode: '0' } }] },
  steps: 1, dt: 1e-6, modelLibraryRefs: ['pdk-corner-pack'], modelLibraryResolver: cornerResolver, runner: cornerRunner });
assert.equal(cornerResult.outcome, 'OK');


// Auto selection uses the best installed engine, but never hides a real engine failure.
const autoNgspice = await runCircuit({ backend: 'auto', netlist: { elements: [
  { id: 'V', type: 'V', n1: 'n', n2: '0', value: 2 }, { id: 'R', type: 'R', n1: 'n', n2: '0', value: 1000 }
] }, steps: 1, dt: 1e-3, runner: async (bin, args, opts) => {
  if (bin === 'Xyce') throw new Error('spawn Xyce ENOENT');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, 'time v(n00001) i(v00001) i(r00001)\n0.001 2 -0.002 0.002\n');
  return { code: 0, stdout: '' };
} });
assert.equal(autoNgspice.outcome, 'OK');
assert.equal(autoNgspice.backend, 'ngspice');
const autoNoMask = await runCircuit({ backend: 'auto', netlist: { elements: [
  { id: 'V', type: 'V', n1: 'n', n2: '0', value: 2 }, { id: 'R', type: 'R', n1: 'n', n2: '0', value: 1000 }
] }, steps: 1, dt: 1e-3, runner: async bin => {
  if (bin === 'Xyce') return { code: 17, stdout: '', stderr: 'convergence failure' };
  throw new Error('should not fall through to ngspice after a real Xyce failure');
} });
assert.equal(autoNoMask.outcome, 'HOLD');
assert.match(autoNoMask.reason, /exited with code 17/);


// Version probing is opt-in, captured, and included in the returned execution record.
const versionRunner = async (bin, args, opts) => {
  if (args[0] === '-v') return { code: 0, stdout: bin === 'ngspice' ? 'ngspice-44 test build' : 'Xyce 7.8 test build', stderr: '' };
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`${opts.cwd}/results.dat`, 'time v(n00001) i(v00001) i(r00001)\n0.001 2 -0.002 0.002\n');
  return { code: 0, stdout: '' };
};
const versioned = await runNgspice({ netlist: { elements: [
  { id: 'V', type: 'V', n1: 'n', n2: '0', value: 2 }, { id: 'R', type: 'R', n1: 'n', n2: '0', value: 1000 }
] }, steps: 1, dt: 1e-3, probeVersion: true, runner: versionRunner });
assert.equal(versioned.outcome, 'OK');
assert.equal(versioned.backendVersion, 'ngspice-44 test build');
assert.equal(versioned.evidence.versionProbe, 'CAPTURED');

const mutableVersion = await runNgspice({ netlist: diodeNetlist, steps: 1, dt: 1e-6, modelLibraryRefs: ['mutable'],
  modelLibraryResolver: async refs => ({ verified: true, libraries: [{ id: refs[0], version: 'latest', files: [{ path: 'm.lib', content: libraryContent, sha256: libraryDigest }] }], models: [{ name: 'DMOD', type: 'D', libraryId: refs[0] }] }), runner: libraryRunner });
assert.equal(mutableVersion.outcome, 'HOLD');

console.log(`backend adapters: ${assertionCount} assertions PASS; nonlinear devices, immutable PDK packs/sections, subcircuits, version provenance, safety, process failure, backend selection and samples PASS (fake-runner; external engines not installed)`);
