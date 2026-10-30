/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/circuit/module.js
 * FILE PURPOSE: Deterministic fixed-step transient circuit solver using modified nodal analysis (MNA).
 * License: GPL-3.0-only.
 *
 * Supported devices: linear R, C, L, independent V and I sources.
 * Supported source values: scalar DC, {type:"dc"}, {type:"step"}, {type:"pulse"}.
 * This is an L1 functional linear transient solver, not a full SPICE implementation.
 */

const VERSION = "0.3.1";
const SUPPORTED = new Set(["R", "C", "L", "V", "I"]);
const GROUND_ALIASES = new Set(["0", "gnd", "ground"]);
const DEFAULT_LIMITS = Object.freeze({ maxElements: 512, maxUnknowns: 256, maxSteps: 250000, maxRecordedSamples: 250000, maxWorkUnits: 300000000, maxHistoryValues: 5000000 });
const PIVOT_TOLERANCE = 1e-13;

function hold(reason, details = {}) { return { outcome: "HOLD", reason, ...details }; }
function isFiniteNumber(x) { return typeof x === "number" && Number.isFinite(x); }
function isPositiveFinite(x) { return isFiniteNumber(x) && x > 0; }
function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function asNode(n) { return String(n); }

function validateSource(spec) {
  if (isFiniteNumber(spec)) return null;
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return "source must be a finite scalar or waveform object";
  if (spec.type === "dc") return isFiniteNumber(spec.value) ? null : "DC source value must be finite";
  if (spec.type === "step") {
    const initial = spec.initial ?? 0, at = spec.at ?? 0;
    return isFiniteNumber(spec.value) && isFiniteNumber(initial) && isFiniteNumber(at) && at >= 0
      ? null : "step source requires finite value, initial and non-negative at";
  }
  if (spec.type === "pulse") {
    const low = spec.low ?? 0, high = spec.high ?? 1, delay = spec.delay ?? 0;
    const rise = spec.rise ?? 0, fall = spec.fall ?? 0, width = spec.width ?? 1;
    const period = spec.period ?? Infinity;
    if (![low, high, delay, rise, fall, width].every(isFiniteNumber)) return "pulse levels and timing values must be finite";
    if (delay < 0 || rise < 0 || fall < 0 || width < 0) return "pulse timing values must be non-negative";
    if (!(period === Infinity || isPositiveFinite(period))) return "pulse period must be positive and finite when supplied";
    if (period !== Infinity && rise + width + fall > period + Number.EPSILON * Math.max(1, period))
      return "pulse rise + width + fall cannot exceed period";
    return null;
  }
  return "unsupported source waveform; use dc, step or pulse";
}

function sourceValue(spec, t) {
  if (isFiniteNumber(spec)) return spec;
  if (spec.type === "dc") return spec.value;
  if (spec.type === "step") return t < (spec.at ?? 0) ? (spec.initial ?? 0) : spec.value;
  if (spec.type === "pulse") {
    const low = spec.low ?? 0, high = spec.high ?? 1, delay = spec.delay ?? 0;
    const rise = spec.rise ?? 0, fall = spec.fall ?? 0, width = spec.width ?? 1;
    const period = spec.period ?? Infinity;
    if (t < delay) return low;
    const phase = period === Infinity ? t - delay : (t - delay) % period;
    if (rise > 0 && phase < rise) return low + (high - low) * phase / rise;
    if (phase < rise + width) return high;
    if (fall > 0 && phase < rise + width + fall)
      return high + (low - high) * (phase - rise - width) / fall;
    return low;
  }
  return NaN;
}

// A discontinuous independent-source transition must not be integrated with a
// trapezoidal average across the jump. Use backward Euler for the transition
// interval; subsequent intervals return to the requested method. Continuous
// pulse ramps remain eligible for trapezoidal integration.
function sourceHasJumpInInterval(spec, t0, t1) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return false;
  if (spec.type === "step") return sourceValue(spec, t0) !== sourceValue(spec, t1);
  if (spec.type === "pulse") {
    const rise = spec.rise ?? 0, fall = spec.fall ?? 0;
    if (rise > 0 && fall > 0) return false;
    return sourceValue(spec, t0) !== sourceValue(spec, t1);
  }
  return false;
}

function normalizeNetlist(netlist, limits) {
  if (!netlist || typeof netlist !== "object" || Array.isArray(netlist)) return { error: "netlist must be an object" };
  const rawElements = netlist.elements ?? netlist.components;
  if (!Array.isArray(rawElements) || rawElements.length === 0) return { error: "netlist requires a non-empty elements array" };
  if (rawElements.length > limits.maxElements) return { error: `element count exceeds limit ${limits.maxElements}` };
  const ground = asNode(netlist.ground ?? "0");
  if (!ground.length) return { error: "ground node name cannot be empty" };
  const ids = new Set();
  const elements = [];
  const canonicalNode = n => GROUND_ALIASES.has(asNode(n).toLowerCase()) ? ground : asNode(n);
  for (let i = 0; i < rawElements.length; i++) {
    const raw = rawElements[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: `element ${i} must be an object` };
    const id = raw.id == null ? "" : String(raw.id).trim();
    const type = String(raw.type ?? raw.kind ?? "").toUpperCase();
    const n1raw = raw.n1 ?? raw.positive ?? raw.from;
    const n2raw = raw.n2 ?? raw.negative ?? raw.to;
    if (!id) return { error: `element ${i} has no id` };
    if (ids.has(id)) return { error: `duplicate element id: ${id}` };
    if (!SUPPORTED.has(type)) return { error: `unsupported element type for ${id}: ${type || "<missing>"}` };
    if (n1raw == null || n2raw == null) return { error: `${id} requires n1 and n2 terminals` };
    const n1 = canonicalNode(n1raw), n2 = canonicalNode(n2raw);
    if (!n1 || !n2) return { error: `${id} has an empty terminal name` };
    if (n1 === n2) return { error: `${id} has identical terminals` };
    const value = raw.value ?? raw.resistance ?? raw.capacitance ?? raw.inductance;
    if (["R", "C", "L"].includes(type)) {
      if (!isPositiveFinite(value)) return { error: `${id} requires a finite positive ${type} value` };
    } else {
      const problem = validateSource(value);
      if (problem) return { error: `${id}: ${problem}` };
    }
    ids.add(id);
    elements.push({ id, type, n1, n2, value });
  }
  const nodes = [...new Set(elements.flatMap(e => [e.n1, e.n2]).filter(n => n !== ground))].sort();
  if (!nodes.length) return { error: "circuit has no non-ground node" };
  const branches = elements.filter(e => e.type === "V" || e.type === "L");
  const unknowns = nodes.length + branches.length;
  if (unknowns > limits.maxUnknowns) return { error: `MNA unknown count ${unknowns} exceeds limit ${limits.maxUnknowns}` };
  return { ground, nodes, elements, branches, unknowns };
}

// Scaled partial-pivot Gaussian elimination. Row scaling avoids a single global
// threshold incorrectly rejecting legitimate circuits with disparate units.
function solveLinear(matrix, rhs, tolerance = PIVOT_TOLERANCE) {
  const n = rhs.length;
  if (!n || matrix.length !== n || matrix.some(r => r.length !== n)) return { ok: false, reason: "invalid linear system dimensions" };
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  const rowScale = a.map(row => Math.max(...row.slice(0, n).map(Math.abs)));
  if (rowScale.some(s => !Number.isFinite(s) || s === 0) || a.some(row => row.some(v => !Number.isFinite(v))))
    return { ok: false, reason: "singular or non-finite circuit matrix" };
  for (let col = 0; col < n; col++) {
    let pivot = -1, best = -1;
    for (let r = col; r < n; r++) {
      const score = Math.abs(a[r][col]) / rowScale[r];
      if (score > best) { best = score; pivot = r; }
    }
    if (pivot < 0 || best <= tolerance) return { ok: false, reason: "singular or floating circuit matrix" };
    if (pivot !== col) { [a[col], a[pivot]] = [a[pivot], a[col]]; [rowScale[col], rowScale[pivot]] = [rowScale[pivot], rowScale[col]]; }
    const d = a[col][col];
    for (let c = col; c <= n; c++) a[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      a[r][col] = 0;
      for (let c = col + 1; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  const x = a.map(row => row[n]);
  if (!x.every(Number.isFinite)) return { ok: false, reason: "linear solution contains non-finite values" };
  let residual = 0, denominator = 0;
  for (let i = 0; i < n; i++) {
    let ax = 0, rowNorm = 0;
    for (let j = 0; j < n; j++) { ax += matrix[i][j] * x[j]; rowNorm += Math.abs(matrix[i][j]) * Math.abs(x[j]); }
    residual = Math.max(residual, Math.abs(ax - rhs[i]));
    denominator = Math.max(denominator, rowNorm + Math.abs(rhs[i]));
  }
  const relativeResidual = residual / Math.max(denominator, Number.MIN_VALUE);
  if (!Number.isFinite(relativeResidual) || relativeResidual > 1e-8)
    return { ok: false, reason: "linear solve failed residual verification", relativeResidual };
  return { ok: true, x, relativeResidual };
}

function validateInitialConditions(initialConditions, capacitors, inductors) {
  if (initialConditions == null) return { capacitors: {}, inductors: {} };
  if (typeof initialConditions !== "object" || Array.isArray(initialConditions)) return { error: "initialConditions must be an object" };
  const cap = initialConditions.capacitors ?? {}, ind = initialConditions.inductors ?? {};
  if (!cap || typeof cap !== "object" || Array.isArray(cap) || !ind || typeof ind !== "object" || Array.isArray(ind))
    return { error: "initialConditions.capacitors and inductors must be objects" };
  const capIds = new Set(capacitors.map(e => e.id)), indIds = new Set(inductors.map(e => e.id));
  for (const [id, value] of Object.entries(cap)) if (!capIds.has(id) || !isFiniteNumber(value)) return { error: `invalid capacitor initial condition: ${id}` };
  for (const [id, value] of Object.entries(ind)) if (!indIds.has(id) || !isFiniteNumber(value)) return { error: `invalid inductor initial condition: ${id}` };
  return { capacitors: cap, inductors: ind };
}

/**
 * circuitStep({ netlist, steps, dt, method="trapezoidal", initialConditions={}, recordEvery=1 })
 *
 * Element schema: {id,type,n1,n2,value}. R/C/L values are ohm/F/H. V/I values are
 * finite DC scalars or waveform objects. Current source direction is n1 -> n2;
 * voltage is V(n1)-V(n2). Initial state: {capacitors:{C1:volts},inductors:{L1:amps}}.
 * Samples are recorded at dt, 2*dt, ...; there is no implicit t=0 operating-point solve.
 */
export function circuitStep({ netlist, steps, dt, method = "trapezoidal", initialConditions = {}, recordEvery = 1, limits = {} } = {}) {
  if (!netlist) return hold("netlist is UNSPECIFIED");
  if (!Number.isSafeInteger(steps) || steps <= 0) return hold("steps must be a positive safe integer");
  if (!isPositiveFinite(dt)) return hold("dt must be a finite positive number");
  if (!Number.isFinite(steps * dt)) return hold("total simulation duration must be finite");
  if (!["backward-euler", "trapezoidal"].includes(method)) return hold("method must be backward-euler or trapezoidal");
  if (!Number.isSafeInteger(recordEvery) || recordEvery <= 0) return hold("recordEvery must be a positive integer");
  const activeLimits = { ...DEFAULT_LIMITS, ...limits };
  for (const [k, v] of Object.entries(activeLimits)) if (!Number.isSafeInteger(v) || v <= 0) return hold(`limit ${k} must be a positive safe integer`);
  if (steps > activeLimits.maxSteps) return hold(`steps exceed limit ${activeLimits.maxSteps}`);
  const sampleCount = Math.ceil(steps / recordEvery);
  if (sampleCount > activeLimits.maxRecordedSamples) return hold(`recorded sample count exceeds limit ${activeLimits.maxRecordedSamples}`);

  const parsed = normalizeNetlist(netlist, activeLimits);
  if (parsed.error) return hold(parsed.error);
  const { ground, nodes, elements, branches, unknowns } = parsed;
  const estimatedWork = unknowns * unknowns * unknowns * steps;
  if (!Number.isFinite(estimatedWork) || estimatedWork > activeLimits.maxWorkUnits)
    return hold(`estimated dense-solver work ${estimatedWork} exceeds limit ${activeLimits.maxWorkUnits}`);
  const estimatedHistoryValues = sampleCount * (nodes.length + branches.length + elements.length * 3 + 1);
  if (!Number.isFinite(estimatedHistoryValues) || estimatedHistoryValues > activeLimits.maxHistoryValues)
    return hold(`estimated history size ${estimatedHistoryValues} exceeds limit ${activeLimits.maxHistoryValues}`);
  const capacitors = elements.filter(e => e.type === "C");
  const inductors = elements.filter(e => e.type === "L");
  const ic = validateInitialConditions(initialConditions, capacitors, inductors);
  if (ic.error) return hold(ic.error);
  const nodeIndex = new Map(nodes.map((n, i) => [n, i]));
  const branchIndex = new Map(branches.map((e, i) => [e.id, nodes.length + branches.indexOf(e)]));
  const idx = n => n === ground ? -1 : nodeIndex.get(n);
  const capV = Object.fromEntries(capacitors.map(e => [e.id, ic.capacitors[e.id] ?? 0]));
  const indI = Object.fromEntries(inductors.map(e => [e.id, ic.inductors[e.id] ?? 0]));
  const capI = Object.fromEntries(capacitors.map(e => [e.id, 0]));
  const indV = Object.fromEntries(inductors.map(e => [e.id, 0]));

  const history = {
    time: [], nodes: Object.fromEntries(nodes.map(n => [n, []])),
    branchCurrents: Object.fromEntries(branches.map(e => [e.id, []])),
    elementVoltages: Object.fromEntries(elements.map(e => [e.id, []])),
    elementCurrents: Object.fromEntries(elements.map(e => [e.id, []])),
    elementPower: Object.fromEntries(elements.map(e => [e.id, []]))
  };
  const stamp = (A, i, j, v) => { if (i >= 0 && j >= 0) A[i][j] += v; };
  const inject = (b, i, v) => { if (i >= 0) b[i] += v; };
  let finalX = null, maxRelativeResidual = 0;

  for (let k = 1; k <= steps; k++) {
    const t = k * dt;
    const discontinuity = elements.some(e => (e.type === "V" || e.type === "I") &&
      sourceHasJumpInInterval(e.value, (k - 1) * dt, t));
    const activeMethod = method === "trapezoidal" && (k === 1 || discontinuity)
      ? "backward-euler" : method;
    const A = Array.from({ length: unknowns }, () => Array(unknowns).fill(0));
    const b = Array(unknowns).fill(0);
    for (const e of elements) {
      const p = idx(e.n1), n = idx(e.n2);
      if (e.type === "R") {
        const g = 1 / e.value;
        stamp(A,p,p,g); stamp(A,n,n,g); stamp(A,p,n,-g); stamp(A,n,p,-g);
      } else if (e.type === "I") {
        const current = sourceValue(e.value, t);
        if (!isFiniteNumber(current)) return hold(`source waveform evaluation failed: ${e.id}`, { time: t, step: k });
        inject(b,p,-current); inject(b,n,current);
      } else if (e.type === "V") {
        const v = sourceValue(e.value, t), q = branchIndex.get(e.id);
        if (!isFiniteNumber(v)) return hold(`source waveform evaluation failed: ${e.id}`, { time: t, step: k });
        stamp(A,p,q,1); stamp(A,n,q,-1); stamp(A,q,p,1); stamp(A,q,n,-1); b[q] += v;
      } else if (e.type === "C") {
        const g = (activeMethod === "trapezoidal" ? 2 : 1) * e.value / dt;
        const historyCurrent = g * capV[e.id] + (activeMethod === "trapezoidal" ? capI[e.id] : 0);
        stamp(A,p,p,g); stamp(A,n,n,g); stamp(A,p,n,-g); stamp(A,n,p,-g);
        inject(b,p,historyCurrent); inject(b,n,-historyCurrent);
      } else if (e.type === "L") {
        const q = branchIndex.get(e.id);
        const factor = (activeMethod === "trapezoidal" ? 2 : 1) * e.value / dt;
        stamp(A,p,q,1); stamp(A,n,q,-1); stamp(A,q,p,1); stamp(A,q,n,-1); stamp(A,q,q,-factor);
        b[q] = -factor * indI[e.id] - (activeMethod === "trapezoidal" ? indV[e.id] : 0);
      }
    }
    const solved = solveLinear(A, b);
    if (!solved.ok) return hold(solved.reason, { time: t, step: k, relativeResidual: solved.relativeResidual });
    maxRelativeResidual = Math.max(maxRelativeResidual, solved.relativeResidual);
    const x = solved.x; finalX = x;
    const nodeVoltage = name => idx(name) < 0 ? 0 : x[idx(name)];
    for (const e of elements) {
      const v = nodeVoltage(e.n1) - nodeVoltage(e.n2);
      let current;
      if (e.type === "R") current = v / e.value;
      else if (e.type === "C") {
        const g = (activeMethod === "trapezoidal" ? 2 : 1) * e.value / dt;
        current = g * (v - capV[e.id]) - (activeMethod === "trapezoidal" ? capI[e.id] : 0);
        capV[e.id] = v; capI[e.id] = current;
      } else if (e.type === "L" || e.type === "V") {
        current = x[branchIndex.get(e.id)];
        if (e.type === "L") { indI[e.id] = current; indV[e.id] = v; }
      } else current = sourceValue(e.value, t);
      const power = v * current;
      if (![v, current, power].every(Number.isFinite)) return hold(`non-finite electrical result: ${e.id}`, { time: t, step: k });
      if (k % recordEvery === 0 || k === steps) {
        history.elementVoltages[e.id].push(v);
        history.elementCurrents[e.id].push(current);
        history.elementPower[e.id].push(power);
      }
    }
    if (k % recordEvery === 0 || k === steps) {
      history.time.push(t);
      for (const name of nodes) history.nodes[name].push(nodeVoltage(name));
      for (const e of branches) history.branchCurrents[e.id].push(x[branchIndex.get(e.id)]);
    }
  }

  const finalNodeVoltages = Object.fromEntries(nodes.map(n => [n, finalX[idx(n)]]));
  const finalBranchCurrents = Object.fromEntries(branches.map(e => [e.id, finalX[branchIndex.get(e.id)]]));
  const finalElementVoltages = {}, finalElementCurrents = {}, finalElementPower = {};
  for (const e of elements) {
    const v = history.elementVoltages[e.id].at(-1), i = history.elementCurrents[e.id].at(-1);
    finalElementVoltages[e.id] = v; finalElementCurrents[e.id] = i; finalElementPower[e.id] = v * i;
  }
  return {
    outcome: "OK", method: method.toUpperCase().replaceAll("-", "_"), solver: "MNA_SCALED_PARTIAL_PIVOT_GAUSSIAN",
    version: VERSION, fidelity: "L1_FUNCTIONAL", verified: false,
    units: { time: "s", voltage: "V", current: "A", resistance: "ohm", capacitance: "F", inductance: "H", power: "W" },
    steps, dt, duration: steps * dt, nodes, history,
    final: { nodeVoltages: finalNodeVoltages, branchCurrents: finalBranchCurrents,
      capacitorVoltages: { ...capV }, inductorCurrents: { ...indI },
      elementVoltages: finalElementVoltages, elementCurrents: finalElementCurrents, elementPower: finalElementPower },
    evidence: { numericalMethod: method, equationCount: unknowns, elementCount: elements.length,
      deterministic: true, maxLinearRelativeResidual: maxRelativeResidual,
      referenceComparison: "NOT_PERFORMED", physicalVerification: "NOT_PERFORMED" }
  };
}

export const CIRCUIT_CONTRACT = Object.freeze({ version: VERSION, fidelity: "L1_FUNCTIONAL", devices: [...SUPPORTED],
  methods: ["backward-euler", "trapezoidal"], sourceWaveforms: ["dc", "step", "pulse"],
  currentDirection: "n1_to_n2", voltageDefinition: "V(n1)-V(n2)", groundAliases: [...GROUND_ALIASES], limits: DEFAULT_LIMITS });
