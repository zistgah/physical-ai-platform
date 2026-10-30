/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import { emulate, fingerprint, validatePortContract, createCoSimulationAdapter, EMULATION_API_VERSION } from './module.js';

let count = 0;
function test(name, fn) { try { fn(); count++; } catch (e) { console.error(`FAIL ${name}: ${e.stack || e}`); process.exitCode = 1; } }
const device = { id: 'test-device', type: 'motor', modelId: 'motor-model', modelVersion: '1.2.3' };
const echo = x => x;
const run = (extra = {}) => emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: echo, ...extra });

// Acceptance semantics and input validation.
test('missing device HOLD', () => assert.equal(emulate({ input: 1, observed: 1, model: echo }).outcome, 'HOLD'));
test('missing device identity HOLD', () => assert.equal(emulate({ device: {}, input: 1, observed: 1, model: echo }).outcome, 'HOLD'));
test('missing model HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1 }).outcome, 'HOLD'));
test('missing input HOLD', () => assert.equal(emulate({ device, observed: 1, model: echo }).outcome, 'HOLD'));
test('missing observation HOLD', () => assert.equal(emulate({ device, input: 1, model: echo }).outcome, 'HOLD'));
test('empty batch HOLD', () => assert.equal(emulate({ device, steps: [], model: echo }).outcome, 'HOLD'));
test('invalid batch HOLD', () => assert.equal(emulate({ device, steps: {}, model: echo }).outcome, 'HOLD'));
test('API version exposed', () => assert.equal(EMULATION_API_VERSION, '1.2.0'));
test('exact match OK', () => assert.equal(run().outcome, 'OK'));
test('mismatch distinct from HOLD', () => assert.equal(emulate({ device, input: 1, observed: 2, model: echo }).outcome, 'MISMATCH'));
test('model exception HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: () => { throw Error('boom'); } }).outcome, 'HOLD'));
test('async model HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: async x => x }).outcome, 'HOLD'));
test('NaN model output HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: () => NaN }).outcome, 'HOLD'));
test('Infinity observation HOLD', () => assert.equal(emulate({ device, input: 1, observed: Infinity, model: echo }).outcome, 'HOLD'));
test('undefined nested input HOLD', () => assert.equal(emulate({ device, input: { x: undefined }, observed: { x: 1 }, model: echo }).outcome, 'HOLD'));
test('cyclic input HOLD', () => { const x = {}; x.self = x; assert.equal(emulate({ device, input: x, observed: {}, model: echo }).outcome, 'HOLD'); });
test('accessor input HOLD without invoking getter', () => { let called = false; const x = {}; Object.defineProperty(x, 'x', { enumerable: true, get() { called = true; return 1; } }); assert.equal(emulate({ device, input: x, observed: x, model: echo }).outcome, 'HOLD'); assert.equal(called, false); });
test('class instance input HOLD', () => { class X { constructor() { this.x = 1; } } assert.equal(emulate({ device, input: new X(), observed: { x: 1 }, model: echo }).outcome, 'HOLD'); });
test('symbol key input HOLD', () => { const x = { a: 1 }; x[Symbol('s')] = 2; assert.equal(emulate({ device, input: x, observed: { a: 1 }, model: echo }).outcome, 'HOLD'); });
test('sparse array input HOLD', () => { const x = []; x[1] = 2; assert.equal(emulate({ device, input: x, observed: [null, 2], model: echo }).outcome, 'HOLD'); });
test('excessive depth HOLD', () => { let x = 1; for (let i = 0; i < 70; i++) x = { x }; assert.equal(emulate({ device, input: x, observed: x, model: echo }).outcome, 'HOLD'); });
test('bad seed HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: echo, seed: -1 }).outcome, 'HOLD'));
test('bad tolerance HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: echo, tolerance: { absolute: -1 } }).outcome, 'HOLD'));
test('non-boolean stateful flag HOLD', () => assert.equal(emulate({ device, input: 1, observed: 1, model: echo, stateful: 'yes' }).outcome, 'HOLD'));
test('path tolerance works', () => assert.equal(emulate({ device, input: { a: 1.01 }, observed: { a: 1 }, model: echo, tolerance: { absolute: 0, relative: 0, byPath: { '$.a': { absolute: 0.02 } } } }).outcome, 'OK'));
test('zero tolerance detects mismatch', () => assert.equal(emulate({ device, input: 1, observed: 1.0001, model: () => 1, tolerance: { absolute: 0, relative: 0 } }).outcome, 'MISMATCH'));
test('extreme finite numbers produce finite diagnostics', () => { const r = emulate({ device, input: 1e308, observed: -1e308, model: x => x, tolerance: { absolute: 0, relative: 0 } }); assert.equal(r.outcome, 'MISMATCH'); assert.ok(Number.isFinite(r.summary.maxAbsoluteError)); assert.ok(Number.isFinite(r.summary.rmse)); });
test('absolute and relative tolerance combine', () => assert.equal(emulate({ device, input: 0, observed: 10.00001, model: () => 10, tolerance: { absolute: 0, relative: 1e-6 } }).outcome, 'OK'));
test('nested vector exact comparison', () => assert.equal(emulate({ device, input: { v: [1, 2, 3] }, observed: { v: [1, 2, 3] }, model: echo }).outcome, 'OK'));
test('nested vector mismatch path', () => { const r = emulate({ device, input: { v: [1, 2, 3] }, observed: { v: [1, 2, 4] }, model: echo }); assert.equal(r.mismatches[0].path, '$.v[2]'); });
test('array length mismatch', () => assert.equal(emulate({ device, input: [1, 2], observed: [1], model: echo }).outcome, 'MISMATCH'));
test('object key mismatch', () => assert.equal(emulate({ device, input: { a: 1 }, observed: { b: 1 }, model: echo }).outcome, 'MISMATCH'));
test('number versus string mismatch', () => assert.equal(emulate({ device, input: 1, observed: '1', model: echo }).outcome, 'MISMATCH'));
test('null mismatch', () => assert.equal(emulate({ device, input: null, observed: 0, model: echo }).outcome, 'MISMATCH'));
test('metrics include RMSE', () => assert.equal(run().summary.rmse, 0));
test('evidence remains unverified', () => { const r = run(); assert.equal(r.evidence.promotionState, 'UNVERIFIED'); assert.equal(r.evidence.physicalVerification, false); });
test('device model version recorded', () => assert.equal(run().modelVersion, '1.2.3'));
test('fidelity metadata recorded', () => assert.equal(run({ metadata: { fidelity: 'L3' } }).fidelity, 'L3'));
test('noncanonical fidelity label HOLD', () => assert.equal(run({ metadata: { fidelity: 'L8' } }).outcome, 'HOLD'));
test('empty observation provenance HOLD', () => assert.equal(run({ metadata: { observationSource: '' } }).outcome, 'HOLD'));
test('non-string model fingerprint HOLD', () => assert.equal(run({ metadata: { modelFingerprint: 42 } }).outcome, 'HOLD'));
test('caller input is isolated from mutation', () => { const input = { x: 1 }; emulate({ device, input, observed: { x: 1 }, model: x => { x.x = 99; return { x: 1 }; } }); assert.equal(input.x, 1); });
test('seeded random is reproducible', () => { const f = () => emulate({ device, input: {}, observed: 0.5, seed: 7, model: (x, c) => c.random() }); assert.equal(f().replay.predictedFingerprint, f().replay.predictedFingerprint); });
test('different seed changes deterministic random', () => { const f = seed => emulate({ device, input: {}, observed: 0, seed, model: (x, c) => c.random() }); assert.notEqual(f(7).replay.predictedFingerprint, f(8).replay.predictedFingerprint); });
test('fingerprint ignores object key order', () => assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 })));
test('fingerprint distinguishes array order', () => assert.notEqual(fingerprint([1, 2]), fingerprint([2, 1])));

// Time, sequence and events.
test('multi-step sequence passes', () => assert.equal(emulate({ device, steps: [{ time: 0, input: 1, observed: 1 }, { time: 1, input: 2, observed: 2 }], model: echo }).outcome, 'OK'));
test('sequence reversal HOLD independent of logical clock', () => assert.equal(emulate({ device, steps: [{ sequence: 2, logicalTime: 0, input: 1, observed: 1 }, { sequence: 1, logicalTime: 1, input: 2, observed: 2 }], model: echo }).outcome, 'HOLD'));
test('time reversal HOLD', () => assert.equal(emulate({ device, steps: [{ time: 2, input: 1, observed: 1 }, { time: 1, input: 2, observed: 2 }], model: echo }).outcome, 'HOLD'));
test('logical time reversal HOLD', () => assert.equal(emulate({ device, steps: [{ logicalTime: 5, input: 1, observed: 1 }, { logicalTime: 4, input: 2, observed: 2 }], model: echo }).outcome, 'HOLD'));
test('physical time reversal HOLD', () => assert.equal(emulate({ device, steps: [{ physicalTime: 10, input: 1, observed: 1 }, { physicalTime: 9, input: 2, observed: 2 }], model: echo }).outcome, 'HOLD'));
test('logical and physical time reach model context', () => { const r = emulate({ device, steps: [{ time: 1, logicalTime: 7, physicalTime: 123, input: {}, observed: { logical: 7, physical: 123 }, }], model: (x, c) => ({ logical: c.logicalTime, physical: c.physicalTime }) }); assert.equal(r.outcome, 'OK'); assert.equal(r.steps[0].physicalTime, 123); });
test('negative dt HOLD', () => assert.equal(emulate({ device, steps: [{ dt: -1, input: 1, observed: 1 }], model: echo }).outcome, 'HOLD'));
test('NaN time HOLD', () => assert.equal(emulate({ device, steps: [{ time: NaN, input: 1, observed: 1 }], model: echo }).outcome, 'HOLD'));
test('event visible to model', () => { const r = emulate({ device, steps: [{ time: 1, input: {}, observed: 7, events: [{ time: 1, sequence: 1, type: 'TRIP', payload: { code: 7 } }] }], model: (x, c) => c.events[0].payload.code }); assert.equal(r.outcome, 'OK'); });
test('event trace persisted', () => { const r = emulate({ device, steps: [{ time: 1, input: {}, observed: 7, events: [{ time: 1, sequence: 1, type: 'TRIP', payload: 7 }] }], model: (x, c) => c.events[0].payload }); assert.equal(r.events.length, 1); });
test('event in future HOLD', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 2, sequence: 1, type: 'FUTURE', payload: 1 }] }], model: () => 1 }).outcome, 'HOLD'));
test('event sequence reversal HOLD', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 1, sequence: 2, type: 'A', payload: 1 }, { time: 1, sequence: 1, type: 'B', payload: 2 }] }], model: () => 1 }).outcome, 'HOLD'));
test('event missing payload HOLD', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 1, sequence: 1, type: 'A' }] }], model: () => 1 }).outcome, 'HOLD'));
test('event sequence is globally monotonic', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 1, sequence: 5, type: 'A', payload: 1 }] }, { time: 2, input: {}, observed: 1, events: [{ time: 2, sequence: 4, type: 'B', payload: 2 }] }], model: () => 1 }).outcome, 'HOLD'));

// Stateful model and adapter.
test('stateful recurrence passes', () => { const r = emulate({ device, stateful: true, initialState: { x: 0 }, steps: [{ time: 0, input: 1, observed: 1 }, { time: 1, input: 2, observed: 3 }], model: (x, c) => ({ output: c.state.x + x, state: { x: c.state.x + x } }) }); assert.equal(r.outcome, 'OK'); assert.deepEqual(r.finalState, { x: 3 }); });
test('stateful missing initial state HOLD', () => assert.equal(emulate({ device, stateful: true, input: 1, observed: 1, model: echo }).outcome, 'HOLD'));
test('stateful missing returned state HOLD', () => assert.equal(emulate({ device, stateful: true, initialState: {}, input: 1, observed: 1, model: echo }).outcome, 'HOLD'));
test('stateful invalid next state HOLD', () => assert.equal(emulate({ device, stateful: true, initialState: {}, input: 1, observed: 1, model: () => ({ output: 1, state: NaN }) }).outcome, 'HOLD'));
test('stateless initial state HOLD', () => assert.equal(emulate({ device, initialState: {}, input: 1, observed: 1, model: echo }).outcome, 'HOLD'));
test('model object step method accepted', () => assert.equal(emulate({ device, input: 1, observed: 1, model: { step: x => x } }).outcome, 'OK'));
test('device model callback accepted', () => assert.equal(emulate({ device: { id: 'd', model: x => x }, input: 1, observed: 1 }).outcome, 'OK'));
test('co-simulation adapter initialize once per run', () => { let n = 0; const m = createCoSimulationAdapter({ initialize() { n++; }, step({ input }) { return input; } }); emulate({ device, steps: [{ input: 1, observed: 1 }, { input: 2, observed: 2 }], model: m }); assert.equal(n, 1); emulate({ device, input: 1, observed: 1, model: m }); assert.equal(n, 2); });
test('co-simulation adapter step receives time', () => { const m = createCoSimulationAdapter({ step({ time }) { return time; } }); assert.equal(emulate({ device, steps: [{ time: 3, input: {}, observed: 3 }], model: m }).outcome, 'OK'); });
test('co-simulation async adapter HOLD', () => { const m = createCoSimulationAdapter({ async step() { return 1; } }); assert.equal(emulate({ device, input: 1, observed: 1, model: m }).outcome, 'HOLD'); });

// Typed ports.
test('valid typed input port', () => assert.equal(validatePortContract([{ name: 'voltage', direction: 'input', type: 'number', unit: 'V', min: 0, max: 24 }], { voltage: 12 }).valid, true));
test('missing required port rejected', () => assert.equal(validatePortContract([{ name: 'voltage', direction: 'input', type: 'number' }], {}).valid, false));
test('port range rejected', () => assert.equal(validatePortContract([{ name: 'voltage', direction: 'input', type: 'number', min: 0, max: 24 }], { voltage: 25 }).valid, false));
test('port type rejected', () => assert.equal(validatePortContract([{ name: 'voltage', direction: 'input', type: 'number' }], { voltage: '12' }).valid, false));
test('duplicate port rejected', () => assert.equal(validatePortContract([{ name: 'x', direction: 'input', type: 'number' }, { name: 'x', direction: 'input', type: 'number' }], { x: 1 }).valid, false));
test('invalid port bounds rejected', () => assert.equal(validatePortContract([{ name: 'x', direction: 'input', type: 'number', min: 10, max: 1 }], { x: 1 }).valid, false));
test('invalid port path type rejected without throwing', () => assert.equal(validatePortContract([{ name: 'x', path: 42, direction: 'input', type: 'number' }], { x: 1 }).valid, false));
test('unsafe port path rejected', () => assert.equal(validatePortContract([{ name: 'x', path: '__proto__.polluted', direction: 'input', type: 'number' }], { x: 1 }).valid, false));
test('non-boolean port required rejected', () => assert.equal(validatePortContract([{ name: 'x', direction: 'input', type: 'number', required: 'yes' }], { x: 1 }).valid, false));
test('nested port path supported', () => assert.equal(validatePortContract([{ name: 'v', path: 'motor.voltage', direction: 'input', type: 'number' }], { motor: { voltage: 5 } }).valid, true));
test('emulate enforces typed ports', () => assert.equal(emulate({ device, input: { v: 'wrong' }, observed: { v: 'wrong' }, model: echo, ports: [{ name: 'v', direction: 'input', type: 'number' }] }).outcome, 'HOLD'));
test('output port is validated', () => assert.equal(emulate({ device, input: {}, observed: { rpm: 10 }, model: () => ({ rpm: 'ten' }), ports: [{ name: 'rpm', direction: 'output', type: 'number', unit: 'rpm' }] }).outcome, 'HOLD'));
test('output port range is validated', () => assert.equal(emulate({ device, input: {}, observed: { rpm: 100 }, model: () => ({ rpm: 100 }), ports: [{ name: 'rpm', direction: 'output', type: 'number', min: 0, max: 80 }] }).outcome, 'HOLD'));
test('valid input and output ports pass', () => assert.equal(emulate({ device, input: { voltage: 12 }, observed: { rpm: 100 }, model: () => ({ rpm: 100 }), ports: [{ name: 'voltage', direction: 'input', type: 'number', unit: 'V', min: 0, max: 24 }, { name: 'rpm', direction: 'output', type: 'number', unit: 'rpm', min: 0, max: 1000 }] }).outcome, 'OK'));
test('optional input port may be absent', () => assert.equal(validatePortContract([{ name: 'v', direction: 'input', type: 'number', required: false }], {}).valid, true));

// Deterministic fault injection for sensor, actuator, power, communication and environment models.
test('BIAS fault alters model input and records evidence', () => { const r = emulate({ device, input: { voltage: 10 }, observed: { voltage: 12 }, model: x => ({ voltage: x.voltage }), faults: [{ id: 'bias-1', domain: 'sensor', kind: 'BIAS', path: 'voltage', value: 2 }] }); assert.equal(r.outcome, 'OK'); assert.equal(r.faultsApplied.length, 1); assert.equal(r.faultsApplied[0].after, 12); });
test('SCALE fault applies gain fault', () => assert.equal(emulate({ device, input: { x: 3 }, observed: { x: 6 }, model: x => ({ x: x.x }), faults: [{ id: 'scale-1', kind: 'SCALE', path: 'x', value: 2 }] }).outcome, 'OK'));
test('STUCK fault applies constant value', () => assert.equal(emulate({ device, input: { x: 3 }, observed: { x: 0 }, model: x => ({ x: x.x }), faults: [{ id: 'stuck-1', kind: 'STUCK', path: 'x', value: 0 }] }).outcome, 'OK'));
test('DROP fault removes signal', () => assert.equal(emulate({ device, input: { x: 3 }, observed: { present: false }, model: x => ({ present: Object.hasOwn(x, 'x') }), faults: [{ id: 'drop-1', domain: 'communication', kind: 'DROP', path: 'x' }] }).outcome, 'OK'));
test('INVERT fault flips boolean', () => assert.equal(emulate({ device, input: { enabled: true }, observed: { enabled: false }, model: x => ({ enabled: x.enabled }), faults: [{ id: 'invert-1', domain: 'actuator', kind: 'INVERT', path: 'enabled' }] }).outcome, 'OK'));
test('NOISE fault is seeded and replayable', () => { const f = () => emulate({ device, input: { x: 1 }, observed: { x: 0 }, model: x => ({ x: x.x }), seed: 33, faults: [{ id: 'noise-1', kind: 'NOISE', path: 'x', amplitude: 0.1 }] }); assert.equal(f().replay.inputFingerprint, f().replay.inputFingerprint); });
test('fault time window controls activation', () => { const r = emulate({ device, steps: [{ time: 0, input: { x: 1 }, observed: { x: 1 } }, { time: 2, input: { x: 1 }, observed: { x: 3 } }], model: x => ({ x: x.x }), faults: [{ id: 'window-1', kind: 'BIAS', path: 'x', value: 2, startTime: 1, endTime: 3 }] }); assert.equal(r.outcome, 'OK'); assert.equal(r.faultsApplied.length, 1); });
test('fault missing path HOLD', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: echo, faults: [{ id: 'bad-path', kind: 'BIAS', path: 'missing', value: 1 }] }).outcome, 'HOLD'));
test('fault unsafe prototype path HOLD', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: echo, faults: [{ id: 'unsafe', kind: 'DROP', path: '__proto__.polluted' }] }).outcome, 'HOLD'));
test('duplicate fault IDs HOLD', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: echo, faults: [{ id: 'dup', kind: 'BIAS', path: 'x', value: 1 }, { id: 'dup', kind: 'BIAS', path: 'x', value: 1 }] }).outcome, 'HOLD'));
test('fault domain validation HOLD', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: echo, faults: [{ id: 'bad-domain', domain: 'magic', kind: 'BIAS', path: 'x', value: 1 }] }).outcome, 'HOLD'));
test('fault target type mismatch HOLD', () => assert.equal(emulate({ device, input: { x: '1' }, observed: { x: '1' }, model: echo, faults: [{ id: 'bad-type', kind: 'BIAS', path: 'x', value: 1 }] }).outcome, 'HOLD'));
test('fault fingerprint is recorded', () => { const r = emulate({ device, input: { x: 1 }, observed: { x: 2 }, model: x => ({ x: x.x }), faults: [{ id: 'trace', kind: 'BIAS', path: 'x', value: 1 }] }); assert.match(r.replay.faultFingerprint, /^fnv1a32:/); });
test('faulted effective input fingerprint differs from nominal input', () => { const a = emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: x => x }); const b = emulate({ device, input: { x: 1 }, observed: { x: 2 }, model: x => x, faults: [{ id: 'fingerprint', kind: 'BIAS', path: 'x', value: 1 }] }); assert.notEqual(a.replay.inputFingerprint, b.replay.inputFingerprint); });

// Aggregate report invariants.
test('step mismatch propagates to run outcome', () => assert.equal(emulate({ device, steps: [{ input: 1, observed: 2 }, { input: 2, observed: 2 }], model: echo }).outcome, 'MISMATCH'));
test('summary mismatch count accurate', () => assert.equal(emulate({ device, input: 1, observed: 2, model: echo }).summary.mismatchCount, 1));
test('run fingerprints present', () => { const r = run(); assert.match(r.replay.inputFingerprint, /^fnv1a32:/); assert.match(r.replay.predictedFingerprint, /^fnv1a32:/); });
test('unversioned model explicitly labelled', () => assert.equal(emulate({ device: { id: 'd' }, input: 1, observed: 1, model: echo }).modelVersion, 'UNVERSIONED'));



// Boundary and adversarial regression suite (v1.2.0).
test('absolute tolerance boundary is inclusive', () => assert.equal(emulate({ device, input: 1, observed: 1.5, model: () => 1, tolerance: { absolute: 0.5, relative: 0 } }).outcome, 'OK'));
test('just above absolute tolerance boundary mismatches', () => assert.equal(emulate({ device, input: 1, observed: 1.500001, model: () => 1, tolerance: { absolute: 0.5, relative: 0 } }).outcome, 'MISMATCH'));
test('just below absolute tolerance boundary matches', () => assert.equal(emulate({ device, input: 1, observed: 1.499999, model: () => 1, tolerance: { absolute: 0.5, relative: 0 } }).outcome, 'OK'));
test('relative tolerance boundary is inclusive', () => assert.equal(emulate({ device, input: 1, observed: 100.0001, model: () => 100, tolerance: { absolute: 0, relative: 1e-6 } }).outcome, 'OK'));
test('relative tolerance just outside boundary mismatches', () => assert.equal(emulate({ device, input: 1, observed: 100.000101, model: () => 100, tolerance: { absolute: 0, relative: 1e-6 } }).outcome, 'MISMATCH'));
test('negative zero is a finite numeric value', () => assert.equal(emulate({ device, input: -0, observed: 0, model: x => x, tolerance: { absolute: 0, relative: 0 } }).outcome, 'OK'));
test('empty plain objects match exactly', () => assert.equal(emulate({ device, input: {}, observed: {}, model: () => ({}) }).outcome, 'OK'));
test('empty object versus null is a shape mismatch', () => assert.equal(emulate({ device, input: {}, observed: null, model: () => ({}) }).outcome, 'MISMATCH'));
test('output containing undefined is HOLD', () => assert.equal(emulate({ device, input: {}, observed: {}, model: () => ({ x: undefined }) }).outcome, 'HOLD'));
test('output containing a function is HOLD', () => assert.equal(emulate({ device, input: {}, observed: {}, model: () => ({ x: () => 1 }) }).outcome, 'HOLD'));
test('model returning a Date instance is HOLD', () => assert.equal(emulate({ device, input: {}, observed: {}, model: () => new Date() }).outcome, 'HOLD'));
test('same-time events are permitted when sequence increases', () => assert.equal(emulate({ device, steps: [{ time: 1, sequence: 1, input: {}, observed: 1, events: [{ time: 1, sequence: 1, type: 'A', payload: {} }] }, { time: 1, sequence: 2, input: {}, observed: 2, events: [{ time: 1, sequence: 2, type: 'B', payload: {} }] }], model: (x,c) => c.sequence }).outcome, 'OK'));
test('duplicate event sequence across steps is HOLD', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 1, sequence: 5, type: 'A', payload: {} }] }, { time: 2, input: {}, observed: 2, events: [{ time: 2, sequence: 5, type: 'B', payload: {} }] }], model: (x,c) => c.sequence }).outcome, 'HOLD'));
test('event after current simulation time is HOLD', () => assert.equal(emulate({ device, steps: [{ time: 1, input: {}, observed: 1, events: [{ time: 2, sequence: 1, type: 'FUTURE', payload: {} }] }], model: () => 1 }).outcome, 'HOLD'));
test('fault start and end bounds are inclusive', () => { const r = emulate({ device, steps: [{ time: 1, input: { x: 1 }, observed: { x: 2 } }, { time: 2, input: { x: 1 }, observed: { x: 2 } }, { time: 2.1, input: { x: 1 }, observed: { x: 1 } }], model: x => x, faults: [{ id: 'inclusive', kind: 'BIAS', path: 'x', value: 1, startTime: 1, endTime: 2 }] }); assert.equal(r.outcome, 'OK'); assert.equal(r.faultsApplied.length, 2); });
test('fault noise stays within declared amplitude', () => { const r = emulate({ device, input: { x: 0 }, observed: { x: 0 }, model: x => x, seed: 123, tolerance: { absolute: 0.25, relative: 0 }, faults: [{ id: 'noise-bound', kind: 'NOISE', path: 'x', amplitude: 0.25 }] }); assert.equal(r.outcome, 'OK'); assert.ok(Math.abs(r.faultsApplied[0].after) <= 0.25); });
test('stateful model receives defensive state copy', () => { const initial = { x: 1 }; emulate({ device, stateful: true, initialState: initial, input: {}, observed: {}, model: (x,c) => { c.state.x = 99; return { output: {}, state: { x: 2 } }; } }); assert.equal(initial.x, 1); });
test('maximum step count guard rejects oversized batch before model execution', () => { let called = false; const steps = Array.from({ length: 100001 }, () => ({ input: 1, observed: 1 })); const r = emulate({ device, steps, model: () => { called = true; return 1; } }); assert.equal(r.outcome, 'HOLD'); assert.equal(called, false); });
test('logical time may remain equal for simultaneous steps', () => assert.equal(emulate({ device, steps: [{ sequence: 1, logicalTime: 4, input: 1, observed: 1 }, { sequence: 2, logicalTime: 4, input: 2, observed: 2 }], model: (x,c) => x }).outcome, 'OK'));
test('port unit mismatch is not silently converted', () => assert.equal(validatePortContract([{ name: 'voltage', direction: 'input', type: 'number', unit: 'V', min: 0, max: 24 }], { voltage: 1000, voltageUnit: 'mV' }).valid, false));
test('unrecognized port type fails closed', () => assert.equal(validatePortContract([{ name: 'x', direction: 'input', type: 'mystery' }], { x: 1 }).valid, false));
test('fault interval with reversed bounds is HOLD', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: x => x, faults: [{ id: 'bad-window', kind: 'BIAS', path: 'x', value: 1, startTime: 5, endTime: 2 }] }).outcome, 'HOLD'));
test('unbounded missing fault target does not get created', () => assert.equal(emulate({ device, input: { x: 1 }, observed: { x: 1 }, model: x => x, faults: [{ id: 'missing-target', kind: 'STUCK', path: 'y', value: 0 }] }).outcome, 'HOLD'));
test('all result steps preserve original order', () => { const r = emulate({ device, steps: [{ time: 0, input: 1, observed: 1 }, { time: 1, input: 2, observed: 2 }, { time: 2, input: 3, observed: 3 }], model: x => x }); assert.deepEqual(r.steps.map(x => x.stepIndex), [0,1,2]); });
test('non-finite model diagnostic is HOLD not mismatch', () => assert.equal(emulate({ device, input: {}, observed: { x: 1 }, model: () => ({ x: Number.POSITIVE_INFINITY }) }).outcome, 'HOLD'));

if (!process.exitCode) console.log(`emulation unit/contract tests: ${count}/${count} PASS`);
