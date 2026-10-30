/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/emulation/module.js
 * PURPOSE: Deterministic, evidence-producing model/device response conformance.
 * LICENSE: GPL-3.0-only.
 *
 * Public API:
 *   emulate({ device, input, observed, model, ... })
 *   emulate({ device, steps: [{ input, observed, time, sequence, events }], model, ... })
 *   createCoSimulationAdapter(adapter) -> synchronous model callback
 *   validatePortContract(ports, input)
 *
 * The engine is deliberately solver- and transport-neutral. It does not claim
 * to parse/execute native FMUs, perform physical acquisition, or certify safety.
 * Those are replaceable adapters/runtimes outside this pure deterministic
 * conformance core. The browser deployment has no Node/Python execution bridge;
 * optional heavy solvers are launched as user-controlled Colab notebooks.
 */

export const EMULATION_API_VERSION = '1.2.0';
export const DEFAULT_TOLERANCE = Object.freeze({ absolute: 1e-9, relative: 1e-6 });
const MAX_STEPS = 100_000;
const MAX_DEPTH = 64;
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const isObject = v => v !== null && typeof v === 'object';
const isRecord = v => isObject(v) && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const hold = (reason, details = {}) => ({ outcome: 'HOLD', reason, ...details });

/**
 * Recursively validate an inert JSON tree before any model code is invoked.
 * Reject accessors, exotic prototypes, cycles, sparse arrays and nonfinite values.
 */
function inspectJson(value, path = '$', seen = new Set(), depth = 0) {
  if (depth > MAX_DEPTH) return `${path} exceeds maximum nesting depth ${MAX_DEPTH}`;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? null : `${path} must be finite`;
  if (typeof value !== 'object') return `${path} contains unsupported ${typeof value}`;
  if (seen.has(value)) return `${path} contains a cycle`;
  if (!Array.isArray(value) && !isRecord(value)) return `${path} must be a plain object or array`;
  if (Object.getOwnPropertySymbols(value).length) return `${path} contains symbol keys`;
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((k, i) => k !== String(i))) return `${path} must be a dense array without extra properties`;
  }
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, d] of Object.entries(descriptors)) {
    if (!('value' in d)) { seen.delete(value); return `${path}.${key} uses an accessor; data must be inert JSON` ; }
    if (d.value === undefined) { seen.delete(value); return `${path}.${key} is undefined` ; }
    const err = inspectJson(d.value, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, seen, depth + 1);
    if (err) { seen.delete(value); return err; }
  }
  seen.delete(value);
  return null;
}
/** Clone validated JSON data without preserving caller-owned object references. */
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (isRecord(value)) { const out = {}; for (const k of Object.keys(value)) Object.defineProperty(out, k, { value: clone(value[k]), enumerable: true, writable: true, configurable: true }); return out; }
  return value;
}
/** Stable key-ordered serialization used only for correlation fingerprints. */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
// FNV-1a is a correlation fingerprint only. It is not cryptographic integrity.
/** Stable non-cryptographic correlation fingerprint. Never use as tamper proof. */
export function fingerprint(value) {
  const s = canonical(value); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `fnv1a32:${h.toString(16).padStart(8, '0')}`;
}
/** Small deterministic PRNG; same unsigned seed yields the same fault-noise stream. */
function seededRandom(seed) {
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Validate global and exact-path tolerance overrides before execution. */
function validTolerance(t) {
  if (t === undefined) return true;
  if (!isRecord(t)) return false;
  for (const k of ['absolute', 'relative']) if (t[k] !== undefined && (typeof t[k] !== 'number' || !Number.isFinite(t[k]) || t[k] < 0)) return false;
  if (t.byPath !== undefined) {
    if (!isRecord(t.byPath)) return false;
    for (const [path, v] of Object.entries(t.byPath)) {
      if (!path.startsWith('$') || !isRecord(v)) return false;
      for (const k of ['absolute', 'relative']) if (v[k] !== undefined && (typeof v[k] !== 'number' || !Number.isFinite(v[k]) || v[k] < 0)) return false;
    }
  }
  return true;
}
/** Resolve the effective tolerance for one scalar comparison path. */
function toleranceAt(t, path) {
  const base = { absolute: t?.absolute ?? DEFAULT_TOLERANCE.absolute, relative: t?.relative ?? DEFAULT_TOLERANCE.relative };
  return { ...base, ...(t?.byPath?.[path] || {}) };
}
/** Recursively compare JSON-shaped values and accumulate numeric/structural diagnostics. */
function compareValues(predicted, observed, tolerance, path = '$', metrics = { compared: 0, mismatches: [], maxAbsoluteError: 0, maxRelativeError: 0, sumSquaredError: 0, signedErrorSum: 0 }) {
  if (typeof predicted === 'number' && typeof observed === 'number') {
    metrics.compared++;
    const scale = Math.max(Math.abs(predicted), Math.abs(observed), Number.EPSILON);
    const normalizedDelta = Math.abs(predicted / scale - observed / scale);
    const abs = Math.min(Number.MAX_VALUE, normalizedDelta * scale);
    const rel = normalizedDelta;
    metrics.maxAbsoluteError = Math.max(metrics.maxAbsoluteError, abs);
    metrics.maxRelativeError = Math.max(metrics.maxRelativeError, rel);
    const squared = abs > Math.sqrt(Number.MAX_VALUE) ? Number.MAX_VALUE : abs * abs;
    metrics.sumSquaredError = Math.min(Number.MAX_VALUE, metrics.sumSquaredError + squared);
    const signed = predicted / scale >= observed / scale ? abs : -abs;
    const signedSum = metrics.signedErrorSum + signed;
    metrics.signedErrorSum = Number.isFinite(signedSum) ? signedSum : Math.sign(signed) * Number.MAX_VALUE;
    const t = toleranceAt(tolerance, path);
    const allowedNormalized = t.absolute / scale + t.relative;
    const allowed = Math.min(Number.MAX_VALUE, t.absolute + t.relative * scale);
    // A few ULPs of slack make an exact tolerance boundary inclusive despite
    // floating-point normalization/rounding. This is far smaller than any
    // engineering tolerance and does not mask a meaningful over-boundary error.
    const boundarySlack = Number.EPSILON * Math.max(1, Math.abs(allowedNormalized)) * 4;
    if (rel > allowedNormalized + boundarySlack) metrics.mismatches.push({ path, kind: 'NUMERIC_TOLERANCE', predicted, observed, absoluteError: abs, relativeError: rel, allowedError: allowed });
    return metrics;
  }
  if (predicted === null || observed === null || typeof predicted !== 'object' || typeof observed !== 'object') {
    metrics.compared++;
    if (predicted !== observed) metrics.mismatches.push({ path, kind: 'VALUE_MISMATCH', predicted, observed });
    return metrics;
  }
  const pa = Array.isArray(predicted), oa = Array.isArray(observed);
  if (pa !== oa) { metrics.compared++; metrics.mismatches.push({ path, kind: 'TYPE_MISMATCH', predictedType: pa ? 'array' : 'object', observedType: oa ? 'array' : 'object' }); return metrics; }
  const pk = pa ? predicted.map((_, i) => String(i)) : Object.keys(predicted).sort();
  const ok = oa ? observed.map((_, i) => String(i)) : Object.keys(observed).sort();
  if (pk.length !== ok.length || pk.some((k, i) => k !== ok[i])) { metrics.compared++; metrics.mismatches.push({ path, kind: 'SHAPE_MISMATCH', predictedKeys: pk, observedKeys: ok }); return metrics; }
  for (const k of pk) compareValues(predicted[k], observed[k], tolerance, pa ? `${path}[${k}]` : `${path}.${k}`, metrics);
  return metrics;
}
/** Require a stable canonical device identity before executing any model. */
function validateDevice(device) {
  if (!isRecord(device) || typeof device.id !== 'string' || !device.id.trim()) return 'Device identity is UNSPECIFIED or invalid';
  for (const k of ['type', 'modelId', 'modelVersion', 'serialNumber']) if (device[k] !== undefined && (typeof device[k] !== 'string' || !device[k].trim())) return `Device ${k} must be a non-empty string`;
  return null;
}
/** Resolve an explicit model callback/adapter; never infer a model from an ID. */
function resolveModel(model, device) {
  if (typeof model === 'function') return model;
  if (isRecord(model) && typeof model.step === 'function') return model.step.bind(model);
  if (isRecord(device?.model) && typeof device.model.step === 'function') return device.model.step.bind(device.model);
  if (typeof device?.model === 'function') return device.model;
  return null;
}
/** Validate a complete step record before the run begins (no partial execution). */
function validateStep(s, i) {
  if (!isRecord(s)) return `Step ${i} must be a plain object`;
  if (!own(s, 'input') || s.input === undefined) return `Step ${i} input is UNSPECIFIED`;
  if (!own(s, 'observed') || s.observed === undefined) return `Step ${i} observed response is UNSPECIFIED`;
  const ie = inspectJson(s.input, `steps[${i}].input`); if (ie) return ie;
  const oe = inspectJson(s.observed, `steps[${i}].observed`); if (oe) return oe;
  if (s.time !== undefined && (typeof s.time !== 'number' || !Number.isFinite(s.time))) return `Step ${i} simulation time must be finite`;
  if (s.logicalTime !== undefined && (typeof s.logicalTime !== 'number' || !Number.isFinite(s.logicalTime))) return `Step ${i} logical time must be finite`;
  if (s.physicalTime !== undefined && (typeof s.physicalTime !== 'number' || !Number.isFinite(s.physicalTime))) return `Step ${i} physical time must be finite`;
  if (s.sequence !== undefined && (!Number.isSafeInteger(s.sequence) || s.sequence < 0)) return `Step ${i} sequence must be a non-negative safe integer`;
  if (s.events !== undefined && !Array.isArray(s.events)) return `Step ${i} events must be an array`;
  return null;
}

/**
 * Optional typed-port validation. A port is {name,direction:'input',type:'number',unit?,required?,min?,max?}.
 * Nested data paths are addressed by `path` (dot notation); units are checked for
 * presence/identity only. No implicit unit conversion is ever performed.
 */
/** Validate declared port types/ranges without implicit unit conversion. */
export function validatePortContract(ports, values, direction = 'input') {
  if (!Array.isArray(ports) || !isRecord(values) || !['input', 'output'].includes(direction)) return { valid: false, errors: ['ports must be an array, values must be an object, and direction must be input or output'] };
  const errors = [], names = new Set();
  for (const p of ports) {
    if (!isRecord(p) || typeof p.name !== 'string' || !p.name || !['input', 'output'].includes(p.direction) || !['number', 'integer', 'boolean', 'string', 'object', 'array'].includes(p.type) || (p.min !== undefined && (typeof p.min !== 'number' || !Number.isFinite(p.min))) || (p.max !== undefined && (typeof p.max !== 'number' || !Number.isFinite(p.max))) || (p.min !== undefined && p.max !== undefined && p.min > p.max) || (p.unit !== undefined && (typeof p.unit !== 'string' || !p.unit.trim()))) { errors.push('Invalid port declaration'); continue; }
    if (p.required !== undefined && typeof p.required !== 'boolean') { errors.push(`Port ${p.name} required must be boolean`); continue; }
    if (names.has(`${p.direction}:${p.name}`)) errors.push(`Duplicate ${p.direction} port ${p.name}`);
    names.add(`${p.direction}:${p.name}`);
    const path = p.path ?? p.name;
    if (typeof path !== 'string' || !path.trim() || path.split('.').some(k => !k || ['__proto__', 'prototype', 'constructor'].includes(k))) { errors.push(`Port ${p.name} has an invalid or unsafe path`); continue; }
    if (p.direction !== direction) continue;
    const value = path.split('.').reduce((v, k) => v == null ? undefined : v[k], values);
    if (value === undefined) { if (p.required !== false) errors.push(`Missing required input port ${p.name} (${path})`); continue; }
    const typeOk = p.type === 'integer' ? Number.isSafeInteger(value) : p.type === 'number' ? typeof value === 'number' && Number.isFinite(value) : p.type === 'array' ? Array.isArray(value) : p.type === 'object' ? isRecord(value) : typeof value === p.type;
    if (!typeOk) errors.push(`Input port ${p.name} expected ${p.type}`);
    if (typeof value === 'number' && p.min !== undefined && value < p.min) errors.push(`Input port ${p.name} below minimum ${p.min}`);
    if (typeof value === 'number' && p.max !== undefined && value > p.max) errors.push(`Input port ${p.name} above maximum ${p.max}`);
    if (p.unit !== undefined && (typeof p.unit !== 'string' || !p.unit.trim())) errors.push(`Input port ${p.name} has invalid unit declaration`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Build a model callback from a co-simulation-style adapter. Adapter contract:
 * initialize({device,initialState,metadata}), step({time,dt,input,state,events}),
 * optional terminate({state,reason}). All hooks must be synchronous and return
 * plain JSON-compatible values. This is an adapter seam, not an FMI parser.
 */
export function createCoSimulationAdapter(adapter) {
  if (!isRecord(adapter) || typeof adapter.step !== 'function') throw new TypeError('Adapter requires a synchronous step() function');
  let initialized = false;
  return function adapterModel(input, context) {
    if (context.stepIndex === 0) initialized = false; // each emulate() invocation is a fresh deterministic run
    if (!initialized) {
      if (typeof adapter.initialize === 'function') {
        const init = adapter.initialize({ device: context.device, initialState: clone(context.state), metadata: clone(context.metadata) });
        if (init && typeof init.then === 'function') throw new TypeError('Async adapter initialization is unsupported by deterministic emulate()');
      }
      initialized = true;
    }
    const result = adapter.step({ time: context.time, logicalTime: context.logicalTime, physicalTime: context.physicalTime, dt: context.dt, input: clone(input), state: clone(context.state), events: clone(context.events), faults: clone(context.faults), seed: context.seed, random: context.random });
    if (result && typeof result.then === 'function') throw new TypeError('Async adapter step is unsupported by deterministic emulate()');
    return result;
  };
}

const FAULT_KINDS = new Set(['BIAS', 'SCALE', 'STUCK', 'DROP', 'NOISE', 'INVERT']);
const FAULT_DOMAINS = new Set(['sensor', 'actuator', 'power', 'communication', 'ai', 'environment', 'human_authority']);
/** Validate deterministic model-input fault schedules and their activation windows. */
function validateFaults(faults) {
  if (faults === undefined) return null;
  if (!Array.isArray(faults) || faults.length > 1000) return 'faults must be an array of at most 1000 entries';
  const ids = new Set();
  for (let i = 0; i < faults.length; i++) {
    const f = faults[i];
    if (!isRecord(f) || typeof f.id !== 'string' || !f.id.trim() || ids.has(f.id) || typeof f.path !== 'string' || !f.path.trim() || !FAULT_KINDS.has(f.kind)) return `Fault ${i} has an invalid identity, path, or kind`;
    ids.add(f.id);
    const parts = f.path.split('.');
    if (parts.some(p => !p || ['__proto__', 'prototype', 'constructor'].includes(p))) return `Fault ${f.id} has an unsafe path`;
    if (f.startTime !== undefined && (typeof f.startTime !== 'number' || !Number.isFinite(f.startTime))) return `Fault ${f.id} startTime must be finite`;
    if (f.endTime !== undefined && (typeof f.endTime !== 'number' || !Number.isFinite(f.endTime))) return `Fault ${f.id} endTime must be finite`;
    if (f.startTime !== undefined && f.endTime !== undefined && f.startTime > f.endTime) return `Fault ${f.id} time window is reversed`;
    if (f.domain !== undefined && !FAULT_DOMAINS.has(f.domain)) return `Fault ${f.id} domain is not recognized`;
    if (['BIAS', 'SCALE'].includes(f.kind) && (typeof f.value !== 'number' || !Number.isFinite(f.value))) return `Fault ${f.id} requires a finite numeric value`;
    if (f.kind === 'NOISE' && (typeof f.amplitude !== 'number' || !Number.isFinite(f.amplitude) || f.amplitude < 0)) return `Fault ${f.id} requires a finite non-negative amplitude`;
    if (f.kind === 'STUCK') { if (!own(f, 'value')) return `Fault ${f.id} requires a stuck value`; const e = inspectJson(f.value, `faults[${i}].value`); if (e) return e; }
  }
  return null;
}
/** Apply active faults to a defensive input copy and return an auditable fault trace. */
function injectFaults(input, faults, time, random) {
  const effective = clone(input), applied = [];
  for (const f of faults || []) {
    if (time < (f.startTime ?? -Infinity) || time > (f.endTime ?? Infinity)) continue;
    const parts = f.path.split('.'); let parent = effective;
    for (const part of parts.slice(0, -1)) {
      if (!isRecord(parent) || !own(parent, part)) return { error: `Fault ${f.id} path ${f.path} does not exist` };
      parent = parent[part];
    }
    const leaf = parts.at(-1);
    if (!isRecord(parent) || !own(parent, leaf)) return { error: `Fault ${f.id} path ${f.path} does not exist` };
    const before = clone(parent[leaf]); let after;
    switch (f.kind) {
      case 'BIAS': if (typeof before !== 'number') return { error: `Fault ${f.id} BIAS target must be numeric` }; after = before + f.value; break;
      case 'SCALE': if (typeof before !== 'number') return { error: `Fault ${f.id} SCALE target must be numeric` }; after = before * f.value; break;
      case 'NOISE': if (typeof before !== 'number') return { error: `Fault ${f.id} NOISE target must be numeric` }; after = before + ((random() * 2) - 1) * f.amplitude; break;
      case 'STUCK': after = clone(f.value); break;
      case 'DROP': delete parent[leaf]; after = null; break;
      case 'INVERT': if (typeof before !== 'boolean') return { error: `Fault ${f.id} INVERT target must be boolean` }; after = !before; break;
    }
    if (f.kind !== 'DROP') Object.defineProperty(parent, leaf, { value: after, enumerable: true, writable: true, configurable: true });
    const safeAfter = f.kind === 'DROP' ? null : clone(after);
    applied.push({ id: f.id, domain: f.domain ?? 'unspecified', kind: f.kind, path: f.path, time, before, after: safeAfter });
  }
  const err = inspectJson(effective, 'faultedInput');
  return err ? { error: err } : { input: effective, applied };
}

/**
 * Execute one or many deterministic model steps and compare against observations.
 * `model(input, context)` returns output, or `{output,state}` when stateful=true.
 * Missing evidence, invalid contracts, asynchronous models and runtime failures
 * return HOLD; numerical differences return MISMATCH; a full match returns OK.
 * An OK result remains SIMULATED/UNVERIFIED and cannot certify physical reality.
 */
export function emulate({ device, input, observed, model, steps, tolerance = {}, seed = 0, metadata = {}, stateful = false, initialState, ports, faults, runId } = {}) {
  const deviceError = validateDevice(device); if (deviceError) return hold(deviceError);
  const execute = resolveModel(model, device); if (!execute) return hold('Executable device model is UNSPECIFIED');
  if (!validTolerance(tolerance)) return hold('Tolerance configuration is invalid');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) return hold('Seed must be an unsigned 32-bit integer');
  if (typeof stateful !== 'boolean') return hold('stateful must be a boolean');
  if (runId !== undefined && (typeof runId !== 'string' || !runId.trim())) return hold('runId must be a non-empty string when supplied');
  if (!isRecord(metadata)) return hold('Metadata must be a plain object');
  const me = inspectJson(metadata, 'metadata'); if (me) return hold(me);
  for (const key of ['modelId', 'modelVersion', 'modelFingerprint', 'observationSource']) if (metadata[key] !== undefined && (typeof metadata[key] !== 'string' || !metadata[key].trim())) return hold(`Metadata ${key} must be a non-empty string`);
  const faultJsonError = faults === undefined ? null : inspectJson(faults, 'faults'); if (faultJsonError) return hold(faultJsonError);
  const faultError = validateFaults(faults); if (faultError) return hold(faultError);
  if (metadata.fidelity !== undefined && !['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].includes(metadata.fidelity)) return hold('Metadata fidelity must use the canonical L0-L7 ladder');
  if (metadata.observationSource !== undefined && (typeof metadata.observationSource !== 'string' || !metadata.observationSource.trim())) return hold('Metadata observationSource must be a non-empty string');
  const batch = steps === undefined ? [{ input, observed, time: 0, sequence: 0 }] : steps;
  if (!Array.isArray(batch) || batch.length === 0) return hold('At least one step is required');
  if (batch.length > MAX_STEPS) return hold(`Step count exceeds limit ${MAX_STEPS}`);
  if (steps === undefined && (input === undefined || observed === undefined)) return hold('Input and observed device response are both required');
  for (let i = 0; i < batch.length; i++) { const err = validateStep(batch[i], i); if (err) return hold(err, { stepIndex: i }); }
  if (ports !== undefined) {
    if (!Array.isArray(ports)) return hold('Port contract must be an array');
    for (let i = 0; i < batch.length; i++) { const p = validatePortContract(ports, batch[i].input); if (!p.valid) return hold('Input port contract failed', { stepIndex: i, errors: p.errors }); }
  }
  const isStateful = stateful === true || initialState !== undefined;
  if (isStateful && initialState === undefined) return hold('Stateful execution requires initialState');
  if (!isStateful && initialState !== undefined) return hold('initialState requires stateful=true');
  if (isStateful) { const e = inspectJson(initialState, 'initialState'); if (e) return hold(e); }
  let state = isStateful ? clone(initialState) : undefined;
  const initialStateCopy = isStateful ? clone(initialState) : null;
  let previousTime = -Infinity, previousLogicalTime = -Infinity, previousPhysicalTime = -Infinity, previousSequence = -1;
  const rng = seededRandom(seed), results = [], eventTrace = [], allFaultsApplied = [], effectiveInputs = [];
  let previousEventSequence = -1;
  for (let i = 0; i < batch.length; i++) {
    const s = batch[i], time = s.time ?? i, sequence = s.sequence ?? i;
    const logicalTime = s.logicalTime ?? sequence, physicalTime = s.physicalTime ?? null;
    if (sequence <= previousSequence) return hold(`Step ${i} sequence must increase strictly`, { stepIndex: i });
    if (time < previousTime) return hold(`Step ${i} simulation time must not move backwards`, { stepIndex: i });
    if (logicalTime < previousLogicalTime) return hold(`Step ${i} logical time must not move backwards`, { stepIndex: i });
    if (physicalTime !== null && physicalTime < previousPhysicalTime) return hold(`Step ${i} physical time must not move backwards`, { stepIndex: i });
    const dt = s.dt ?? s.input?.dt ?? (i === 0 ? 0 : time - previousTime);
    if (dt !== undefined && (typeof dt !== 'number' || !Number.isFinite(dt) || dt < 0)) return hold(`Step ${i} dt must be finite and non-negative`, { stepIndex: i });
    const events = s.events || [];
    let lastEventTime = -Infinity;
    for (let j = 0; j < events.length; j++) {
      const ev = events[j];
      if (!isRecord(ev) || typeof ev.type !== 'string' || !ev.type.trim() || !Number.isSafeInteger(ev.sequence) || ev.sequence < 0 || typeof ev.time !== 'number' || !Number.isFinite(ev.time) || ev.time > time || ev.time < previousTime || ev.sequence <= previousEventSequence || ev.time < lastEventTime || !own(ev, 'payload')) return hold(`Step ${i} event ${j} is invalid or out of order`, { stepIndex: i, eventIndex: j });
      const pe = inspectJson(ev.payload, `steps[${i}].events[${j}].payload`); if (pe) return hold(pe, { stepIndex: i, eventIndex: j });
      previousEventSequence = ev.sequence; lastEventTime = ev.time;
      eventTrace.push({ time: ev.time, sequence: ev.sequence, type: ev.type, payload: clone(ev.payload) });
    }
    previousTime = time; previousLogicalTime = logicalTime; if (physicalTime !== null) previousPhysicalTime = physicalTime; previousSequence = sequence;
    const injected = injectFaults(s.input, faults, time, rng);
    if (injected.error) return hold(injected.error, { stepIndex: i });
    effectiveInputs.push(injected.input); allFaultsApplied.push(...injected.applied);
    let predicted;
    try {
      const context = Object.freeze({
        apiVersion: EMULATION_API_VERSION,
        device: Object.freeze({ id: device.id, type: device.type ?? null, modelId: device.modelId ?? metadata.modelId ?? null, modelVersion: device.modelVersion ?? metadata.modelVersion ?? null }),
        stepIndex: i, sequence, time, logicalTime, physicalTime, dt, state: isStateful ? clone(state) : undefined,
        events: clone(events), faults: clone(injected.applied), seed, random: rng, metadata: clone(metadata), runId: runId ?? null
      });
      predicted = execute(clone(injected.input), context);
    } catch (error) { return hold('Device model execution failed', { stepIndex: i, error: `${error?.name || 'Error'}: ${String(error?.message || error).split('\n')[0]}` }); }
    if (predicted && typeof predicted.then === 'function') return hold('Asynchronous models are unsupported; provide a synchronous model adapter');
    if (isStateful) {
      if (!isRecord(predicted) || !own(predicted, 'output') || !own(predicted, 'state')) return hold('Stateful model must return { output, state }', { stepIndex: i });
      const se = inspectJson(predicted.state, `step[${i}].state`); if (se) return hold(se, { stepIndex: i });
      state = clone(predicted.state); predicted = predicted.output;
    }
    const pe = inspectJson(predicted, `step[${i}].output`); if (pe) return hold(pe, { stepIndex: i });
    if (ports !== undefined) {
      const p = validatePortContract(ports, isRecord(predicted) ? predicted : { value: predicted }, 'output');
      if (!p.valid) return hold('Output port contract failed', { stepIndex: i, errors: p.errors });
    }
    const metrics = compareValues(predicted, s.observed, tolerance);
    const rmse = metrics.compared ? Math.sqrt(metrics.sumSquaredError / metrics.compared) : 0;
    results.push({ stepIndex: i, sequence, time, logicalTime, physicalTime, dt, outcome: metrics.mismatches.length ? 'MISMATCH' : 'OK', predicted: clone(predicted), observed: clone(s.observed), metrics: { ...metrics, rmse, meanSignedError: metrics.compared ? metrics.signedErrorSum / metrics.compared : 0 } });
  }
  const mismatches = results.flatMap(r => r.metrics.mismatches.map(m => ({ stepIndex: r.stepIndex, ...m })));
  const comparedValues = results.reduce((n, r) => n + r.metrics.compared, 0);
  const maxAbsoluteError = Math.max(0, ...results.map(r => r.metrics.maxAbsoluteError));
  const maxRelativeError = Math.max(0, ...results.map(r => r.metrics.maxRelativeError));
  const matched = mismatches.length === 0;
  const inputs = batch.map((s, i) => ({ input: effectiveInputs[i], time: s.time ?? i, logicalTime: s.logicalTime ?? (s.sequence ?? i), physicalTime: s.physicalTime ?? null, sequence: s.sequence ?? i, events: s.events || [] }));
  const predictedValues = results.map(r => r.predicted), observedValues = batch.map(s => s.observed);
  return {
    outcome: matched ? 'OK' : 'MISMATCH', status: matched ? 'MATCH' : 'MISMATCH',
    apiVersion: EMULATION_API_VERSION, runId: runId ?? null,
    deviceId: device.id, modelId: metadata.modelId ?? device.modelId ?? 'UNVERSIONED_MODEL', modelVersion: device.modelVersion ?? metadata.modelVersion ?? 'UNVERSIONED',
    fidelity: metadata.fidelity ?? 'L1', timeDomain: 'SIMULATION_TIME',
    steps: results,
    summary: { stepCount: results.length, comparedValues, mismatchCount: mismatches.length, maxAbsoluteError, maxRelativeError, rmse: comparedValues ? Math.sqrt(results.reduce((n, r) => n + r.metrics.sumSquaredError, 0) / comparedValues) : 0 },
    mismatches, ...(isStateful ? { finalState: clone(state) } : {}),
    events: eventTrace, faultsApplied: allFaultsApplied,
    replay: { seed, initialStateFingerprint: isStateful ? fingerprint(initialStateCopy) : null, inputFingerprint: fingerprint(inputs), predictedFingerprint: fingerprint(predictedValues), observedFingerprint: fingerprint(observedValues), faultFingerprint: fingerprint(faults || []), modelFingerprint: metadata.modelFingerprint ?? null },
    evidence: { method: 'DETERMINISTIC_MODEL_RESPONSE_COMPARISON', observationSource: metadata.observationSource ?? 'CALLER_SUPPLIED', promotionState: 'UNVERIFIED', physicalVerification: false, safetyCertification: false, note: 'A numerical match is not physical certification, HIL evidence, field verification, or a safety case.' }
  };
}

export { compareValues };
