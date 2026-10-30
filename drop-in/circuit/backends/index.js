/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Optional Node.js adapters for established circuit engines.
 * No simulator is bundled. External programs are invoked without a shell.
 * License of each external engine remains its own; see LICENSES.md.
 */
import { mkdtemp, writeFile, readFile, rm, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { posix as pathPosix } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const positive = x => finite(x) && x > 0;
const safeName = (prefix, n) => `${prefix}${String(n).padStart(5, '0')}`;
const stableStringify = value => Array.isArray(value) ? `[${value.map(stableStringify).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}` : JSON.stringify(value);

export const BACKEND_CATALOG = Object.freeze({
  native: { id: 'native', role: 'embedded-linear-transient', runtime: 'javascript', optional: false, license: 'platform' },
  ngspice: { id: 'ngspice', role: 'general-purpose-spice', runtime: 'external-cli', optional: true, license: 'Modified BSD base with file-level exceptions; inspect installed distribution' },
  xyce: { id: 'xyce', role: 'scalable-spice', runtime: 'external-cli', optional: true, license: 'GPL-3.0' },
  openmodelica: { id: 'openmodelica', role: 'equation-based-multiphysics', runtime: 'external-service-or-cli', optional: true, adapterStatus: 'PLANNED_NOT_IMPLEMENTED', license: 'OSMC-PL / AGPLv3 modes' }
});

function hold(reason, details = {}) { return { outcome: 'HOLD', reason, ...details }; }
function quoteSpice(value) {
  if (!finite(value)) throw new Error('SPICE numeric values must be finite');
  return value.toExponential(15).replace('e', 'e');
}
function sourceAt(spec, t) {
  if (finite(spec)) return spec;
  if (spec?.type === 'dc') return spec.value;
  if (spec?.type === 'step') return t < (spec.at ?? 0) ? (spec.initial ?? 0) : spec.value;
  if (spec?.type === 'pulse') {
    const low = spec.low ?? 0, high = spec.high ?? 1, delay = spec.delay ?? 0;
    const rise = spec.rise ?? 0, fall = spec.fall ?? 0, width = spec.width ?? 1, period = spec.period ?? Infinity;
    if (t < delay) return low;
    const phase = period === Infinity ? t - delay : (t - delay) % period;
    if (rise > 0 && phase < rise) return low + (high - low) * phase / rise;
    if (phase < rise + width) return high;
    if (fall > 0 && phase < rise + width + fall) return high + (low - high) * (phase - rise - width) / fall;
    return low;
  }
  return NaN;
}

function sourceExpr(spec, duration) {
  if (finite(spec)) return quoteSpice(spec);
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('invalid source definition');
  if (spec.type === 'dc') {
    if (!finite(spec.value)) throw new Error('DC source must be finite');
    return quoteSpice(spec.value);
  }
  if (spec.type === 'step') {
    const initial = spec.initial ?? 0, at = spec.at ?? 0;
    if (![initial, at, spec.value].every(finite) || at < 0) throw new Error('invalid step source');
    if (at === 0) return quoteSpice(spec.value);
    return `PWL(0 ${quoteSpice(initial)} ${quoteSpice(at)} ${quoteSpice(spec.value)})`;
  }
  if (spec.type === 'pulse') {
    const low = spec.low ?? 0, high = spec.high ?? 1, delay = spec.delay ?? 0;
    const rise = spec.rise ?? 0, fall = spec.fall ?? 0, width = spec.width ?? 1;
    const period = spec.period ?? (duration + delay + rise + width + fall + 1);
    if (![low, high, delay, rise, fall, width, period].every(finite) || delay < 0 || rise < 0 || fall < 0 || width < 0 || period <= 0 || rise + width + fall > period)
      throw new Error('invalid pulse source');
    return `PULSE(${[low, high, delay, rise, fall, width, period].map(quoteSpice).join(' ')})`;
  }
  throw new Error('unsupported source waveform; supported: scalar, dc, step, pulse');
}

function prepare(netlist, controls, dialect, resolvedModels = [], includePaths = [], libraryCalls = []) {
  if (!netlist || typeof netlist !== 'object' || Array.isArray(netlist)) throw new Error('netlist must be an object');
  const basic = netlist.elements ?? netlist.components ?? [];
  const semiconductors = netlist.devices ?? [];
  if (!Array.isArray(basic) || !Array.isArray(semiconductors) || (basic.length + semiconductors.length) === 0) throw new Error('netlist requires non-empty elements or devices');
  const elements = [...basic, ...semiconductors];
  if (elements.length > 10000) throw new Error('external backend element limit exceeded (10000)');
  if (!controls.initialConditions || typeof controls.initialConditions !== 'object' || Array.isArray(controls.initialConditions)) throw new Error('initialConditions must be an object');
  if (controls.initialConditions.capacitors != null && (typeof controls.initialConditions.capacitors !== 'object' || Array.isArray(controls.initialConditions.capacitors))) throw new Error('initialConditions.capacitors must be an object');
  if (controls.initialConditions.inductors != null && (typeof controls.initialConditions.inductors !== 'object' || Array.isArray(controls.initialConditions.inductors))) throw new Error('initialConditions.inductors must be an object');
  if (!Number.isSafeInteger(controls.steps) || controls.steps <= 0 || controls.steps > 250000 || !positive(controls.dt)) throw new Error('steps must be 1..250000 and dt must be positive');
  const duration = controls.steps * controls.dt;
  if (!finite(duration) || duration <= 0) throw new Error('duration must be finite and positive');
  const ground = String(netlist.ground ?? '0');
  const groundAliases = new Set(['0', 'gnd', 'ground', ground.toLowerCase()]);
  const semiPins = { D: ['anode', 'cathode'], Q: ['collector', 'base', 'emitter'], M: ['drain', 'gate', 'source', 'bulk'], J: ['drain', 'gate', 'source'] };
  const terminalsOf = raw => {
    const type = String(raw?.type ?? raw?.kind ?? '').toUpperCase();
    if (type === 'X') return Array.isArray(raw.pinOrder) ? raw.pinOrder.map(k => raw.terminals?.[k]) : [];
    if (semiPins[type]) {
      const t = raw.terminals ?? {};
      return semiPins[type].map(k => t[k]);
    }
    return [raw?.n1 ?? raw?.positive ?? raw?.from, raw?.n2 ?? raw?.negative ?? raw?.to];
  };
  const allNodeNames = elements.flatMap(terminalsOf).filter(n => n != null).map(String);
  const nodes = [...new Set(allNodeNames.filter(n => !groundAliases.has(n.toLowerCase())))].sort();
  if (!nodes.length) throw new Error('circuit has no non-ground nodes');
  const nodeNames = new Map(nodes.map((n, i) => [n, `N${String(i + 1).padStart(5, '0')}`]));
  const node = n => groundAliases.has(String(n).toLowerCase()) ? '0' : nodeNames.get(String(n));

  const models = netlist.models ?? [];
  if (!Array.isArray(models)) throw new Error('netlist.models must be an array');
  const modelMap = new Map();
  const modelCards = [];
  for (const model of [...models, ...resolvedModels]) {
    const name = String(model?.name ?? '').trim();
    const type = String(model?.type ?? '').toUpperCase();
    const card = String(model?.card ?? '');
    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name) || modelMap.has(name.toLowerCase())) throw new Error('model names must be unique SPICE identifiers');
    if (!['D', 'NPN', 'PNP', 'NMOS', 'PMOS', 'NJF', 'PJF', 'SUBCKT'].includes(type)) throw new Error(`unsupported SPICE model type: ${type}`);
    if (model.libraryId) {
      if (card) throw new Error(`resolved library model ${name} must not embed a second model card`);
      const pins = model.pins ?? [];
      if (type === 'SUBCKT' && (!Array.isArray(pins) || pins.length < 2 || pins.some(p => !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(p)))) throw new Error(`subcircuit model ${name} requires ordered pin metadata`);
      modelMap.set(name.toLowerCase(), { name, type, libraryId: model.libraryId, pins });
      continue;
    }
    if (type === 'SUBCKT') throw new Error(`subcircuit model ${name} must come from a trusted model library registry`);
    const lines = card.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!lines.length || !new RegExp(`^\\.model\\s+${name}\\s+${type}\\b`, 'i').test(lines[0])) throw new Error(`model card must begin with .model ${name} ${type}`);
    if (lines.some((line, i) => (i > 0 && !line.startsWith('+')) || !/^[A-Za-z0-9_.$+\-*/=(), \t]+$/.test(line))) throw new Error(`unsafe or unsupported syntax in model card ${name}; only a .model card and + continuations are accepted`);
    const joined = lines.join('\n');
    let depth = 0;
    for (const ch of joined) { if (ch === '(') depth++; if (ch === ')') depth--; if (depth < 0) throw new Error(`unbalanced model card ${name}`); }
    if (depth !== 0 || !joined.includes('(')) throw new Error(`unbalanced model card ${name}`);
    modelMap.set(name.toLowerCase(), { name, type }); modelCards.push(joined);
  }

  const ids = new Set();
  const counts = { R: 0, C: 0, L: 0, V: 0, I: 0, D: 0, Q: 0, M: 0, J: 0, X: 0, VSENSE: 0 };
  const mapped = [];
  const deviceLines = [];
  for (const raw of elements) {
    const id = String(raw?.id ?? '').trim();
    const type = String(raw?.type ?? raw?.kind ?? '').toUpperCase();
    const semi = Boolean(semiPins[type] || type === 'X');
    const terminalKeys = type === 'X' ? (Array.isArray(raw.pinOrder) ? raw.pinOrder : []) : (semiPins[type] ?? ['n1', 'n2']);
    const terminalValues = terminalsOf(raw);
    const value = raw?.value ?? raw?.resistance ?? raw?.capacitance ?? raw?.inductance;
    if (!id || ids.has(id)) throw new Error('every element requires a unique non-empty id');
    if (!['R', 'C', 'L', 'V', 'I', 'D', 'Q', 'M', 'J', 'X'].includes(type)) throw new Error(`unsupported element type ${type || '<missing>'} (${id})`);
    if (terminalValues.some(n => n == null || !String(n).trim() || !node(n)) || new Set(terminalValues.map(String)).size !== terminalValues.length) throw new Error(`${id} has invalid terminals`);
    ids.add(id);
    const name = safeName(type, ++counts[type]);
    if (semi) {
      const modelName = String(raw.model ?? '').trim();
      const model = modelMap.get(modelName.toLowerCase());
      if (!model) throw new Error(`${id} references missing model ${modelName || '<missing>'}`);
      const expected = { D: ['D'], Q: ['NPN', 'PNP'], M: ['NMOS', 'PMOS'], J: ['NJF', 'PJF'], X: ['SUBCKT'] }[type];
      if (!expected.includes(model.type)) throw new Error(`${id} type ${type} is incompatible with model ${modelName} (${model.type})`);
      if (type === 'X' && (terminalKeys.length !== model.pins.length || terminalKeys.some((pin, i) => pin !== model.pins[i]))) throw new Error(`${id} pinOrder must exactly match registered subcircuit pins`);
      const sensors = [];
      const parameters = raw.parameters ?? {};
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new Error(`${id} parameters must be an object`);
      const parameterEntries = Object.entries(parameters);
      if (parameterEntries.some(([key, val]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !finite(val))) throw new Error(`${id} parameters require safe names and finite SI numeric values`);
      const parameterSuffix = parameterEntries.length ? ` ${type === 'X' ? 'PARAMS: ' : ''}${parameterEntries.map(([k, v]) => `${k.toUpperCase()}=${quoteSpice(v)}`).join(' ')}` : '';
      const internalNodes = terminalValues.map((external, i) => {
        const sensorName = safeName('VSENSE', ++counts.VSENSE);
        const internal = `S${String(counts.VSENSE).padStart(5, '0')}`;
        deviceLines.push(`${sensorName} ${node(external)} ${internal} 0`);
        sensors.push({ terminal: terminalKeys[i], name: sensorName, external: String(external) });
        return internal;
      });
      deviceLines.push(`${name} ${internalNodes.join(' ')} ${model.name}${parameterSuffix}`);
      mapped.push({ id, type, name, model: model.name, terminals: Object.fromEntries(terminalKeys.map((k, i) => [k, String(terminalValues[i])])), sensors,
        voltagePair: type === 'D' ? [0, 1] : [0, type === 'Q' || type === 'M' || type === 'J' ? 2 : 1] });
      continue;
    }
    const [n1, n2] = terminalValues;
    if (['R', 'C', 'L'].includes(type) && !positive(value)) throw new Error(`${id} requires a positive finite ${type} value`);
    let line;
    if (type === 'R' || type === 'C' || type === 'L') {
      line = `${name} ${node(n1)} ${node(n2)} ${quoteSpice(value)}`;
      const ic = controls.initialConditions;
      if (type === 'C' && Object.hasOwn(ic.capacitors ?? {}, id)) {
        if (!finite(ic.capacitors[id])) throw new Error(`invalid initial capacitor voltage: ${id}`);
        line += ` IC=${quoteSpice(ic.capacitors[id])}`;
      }
      if (type === 'L' && Object.hasOwn(ic.inductors ?? {}, id)) {
        if (!finite(ic.inductors[id])) throw new Error(`invalid initial inductor current: ${id}`);
        line += ` IC=${quoteSpice(ic.inductors[id])}`;
      }
    } else line = `${name} ${node(n1)} ${node(n2)} ${sourceExpr(value, duration)}`;
    deviceLines.push(line);
    mapped.push({ id, type, name, n1: String(n1), n2: String(n2), value });
  }
  for (const id of Object.keys(controls.initialConditions.capacitors ?? {})) if (!mapped.some(e => e.type === 'C' && e.id === id)) throw new Error(`unknown capacitor initial condition: ${id}`);
  for (const id of Object.keys(controls.initialConditions.inductors ?? {})) if (!mapped.some(e => e.type === 'L' && e.id === id)) throw new Error(`unknown inductor initial condition: ${id}`);
  const transient = controls.method === 'gear' ? 'gear' : 'trap';
  const hasInitialConditions = Object.keys(controls.initialConditions.capacitors ?? {}).length > 0 || Object.keys(controls.initialConditions.inductors ?? {}).length > 0;
  const nodeVectors = nodes.map(n => ({ key: n, vector: `v(${node(n)})` }));
  const currentVectors = [];
  for (const e of mapped) {
    if (e.sensors) for (const sensor of e.sensors) currentVectors.push({ key: `${e.id}.${sensor.terminal}`, vector: `i(${sensor.name})`, elementId: e.id, terminal: sensor.terminal });
    else if (e.type !== 'I') currentVectors.push({ key: e.id, vector: `i(${e.name})`, elementId: e.id, terminal: null });
  }
  let deck;
  if (dialect === 'ngspice') {
    const vectors = [...nodeVectors, ...currentVectors].map(v => v.vector).join(' ');
    deck = ['* Generated by Physical AI circuit backend adapter', ...includePaths.map(p => `.include \"${p}\"`), ...libraryCalls.map(c => `.lib \"${c.path}\" ${c.section}`), ...modelCards, ...deviceLines,
      '.control', 'set noaskquit', 'set wr_singlescale', 'set wr_vecnames', `option method=${transient}`,
      `tran ${quoteSpice(controls.dt)} ${quoteSpice(duration)} 0 ${quoteSpice(controls.dt)}${hasInitialConditions ? ' uic' : ''}`,
      `wrdata results.dat ${vectors}`, 'quit', '.endc', '.end', ''].join('\n');
  } else {
    const vectors = [...nodeVectors, ...currentVectors].map(v => v.vector.toUpperCase()).join(' ');
    deck = ['* Generated by Physical AI circuit backend adapter', ...includePaths.map(p => `.include \"${p}\"`), ...libraryCalls.map(c => `.lib \"${c.path}\" ${c.section}`), ...modelCards, ...deviceLines,
      `.OPTIONS TIMEINT METHOD=${transient.toUpperCase()}`,
      `.TRAN ${quoteSpice(controls.dt)} ${quoteSpice(duration)} 0 ${quoteSpice(controls.dt)}${hasInitialConditions ? ' NOOP' : ''}`,
      `.PRINT TRAN FORMAT=CSV FILE=results.csv PRECISION=15 ${vectors}`, '.END', ''].join('\n');
  }
  return { deck, nodes, mapped, duration, nodeVectors, currentVectors, dialect, groundAliases, modelCards, includePaths };
}

function parseRows(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('backend output has no data rows');
  const split = line => line.includes(',') ? line.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : line.split(/\s+/);
  let headerIndex = lines.findIndex(line => /[a-zA-Z]/.test(line) && !/^[+-]?(?:\d|\.)/.test(line));
  if (headerIndex < 0) throw new Error('backend output header not found');
  const headers = split(lines[headerIndex]).map(h => h.toLowerCase().replaceAll('"', ''));
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = split(line);
    if (cells.length < headers.length) continue;
    const values = cells.slice(0, headers.length).map(Number);
    if (values.every(Number.isFinite)) rows.push(values);
  }
  if (!rows.length) throw new Error('backend output contains no finite numeric samples');
  return { headers, rows };
}
function headerIndex(headers, expected, fallback) {
  const norm = s => s.toLowerCase().replaceAll('"', '').replaceAll(' ', '');
  const wanted = norm(expected);
  let i = headers.findIndex(h => norm(h) === wanted);
  if (i < 0) i = headers.findIndex(h => norm(h).endsWith(wanted));
  if (i < 0 && fallback != null) return fallback;
  if (i < 0) throw new Error(`backend output missing required vector ${expected}`);
  return i;
}
function normalizeOutput(table, prepared, controls, backend, backendVersion = null) {
  const ti = headerIndex(table.headers, 'time', 0);
  const nodeCols = Object.fromEntries(prepared.nodeVectors.map(v => [v.key, headerIndex(table.headers, v.vector, null)]));
  const currentCols = Object.fromEntries(prepared.currentVectors.map(v => [v.key, headerIndex(table.headers, v.vector, null)]));
  if (table.rows.length > 250001) throw new Error('backend output sample count exceeds 250001');
  const history = { time: [], nodes: Object.fromEntries(prepared.nodes.map(n => [n, []])), branchCurrents: {}, elementVoltages: {}, elementCurrents: {}, elementPower: {}, terminalCurrents: {}, terminalVoltages: {} };
  for (const e of prepared.mapped) {
    history.elementVoltages[e.id] = []; history.elementCurrents[e.id] = []; history.elementPower[e.id] = [];
    if (e.type === 'V' || e.type === 'L') history.branchCurrents[e.id] = [];
    if (e.sensors) { history.terminalCurrents[e.id] = Object.fromEntries(e.sensors.map(s => [s.terminal, []])); history.terminalVoltages[e.id] = Object.fromEntries(e.sensors.map(s => [s.terminal, []])); }
  }
  let previousTime = -Infinity;
  for (const row of table.rows) {
    const t = row[ti];
    if (!finite(t) || t < 0 || t < previousTime) throw new Error('backend returned invalid or non-monotonic time values');
    previousTime = t;
    history.time.push(t);
    for (const n of prepared.nodes) history.nodes[n].push(row[nodeCols[n]]);
    const voltage = n => prepared.groundAliases.has(String(n).toLowerCase()) ? 0 : history.nodes[n]?.at(-1);
    for (const e of prepared.mapped) {
      let v, i, power;
      if (e.sensors) {
        const terminalV = {}, terminalI = {};
        for (const sensor of e.sensors) {
          const tv = voltage(sensor.external), tiValue = row[currentCols[`${e.id}.${sensor.terminal}`]];
          if (![tv, tiValue].every(finite)) throw new Error(`backend returned non-finite terminal result for ${e.id}.${sensor.terminal}`);
          terminalV[sensor.terminal] = tv; terminalI[sensor.terminal] = tiValue;
          history.terminalVoltages[e.id][sensor.terminal].push(tv);
          history.terminalCurrents[e.id][sensor.terminal].push(tiValue);
        }
        const [a, b] = e.voltagePair;
        const keys = Object.keys(e.terminals);
        v = terminalV[keys[a]] - terminalV[keys[b]];
        i = terminalI[keys[a]];
        power = Object.keys(terminalV).reduce((sum, key) => sum + terminalV[key] * terminalI[key], 0);
      } else {
        v = voltage(e.n1) - voltage(e.n2);
        i = e.type === 'I' ? sourceAt(e.value, t) : row[currentCols[e.id]];
        power = v * i;
      }
      if (![v, i, power].every(finite)) throw new Error(`backend returned non-finite result for ${e.id}`);
      history.elementVoltages[e.id].push(v); history.elementCurrents[e.id].push(i); history.elementPower[e.id].push(power);
      if (Object.hasOwn(history.branchCurrents, e.id)) history.branchCurrents[e.id].push(i);
    }
  }
  const last = history.time.length - 1;
  const final = { nodeVoltages: Object.fromEntries(prepared.nodes.map(n => [n, history.nodes[n][last]])), branchCurrents: {}, capacitorVoltages: {}, inductorCurrents: {}, elementVoltages: {}, elementCurrents: {}, elementPower: {}, terminalCurrents: {}, terminalVoltages: {} };
  for (const e of prepared.mapped) {
    final.elementVoltages[e.id] = history.elementVoltages[e.id][last];
    final.elementCurrents[e.id] = history.elementCurrents[e.id][last];
    final.elementPower[e.id] = history.elementPower[e.id][last];
    if (e.type === 'C') final.capacitorVoltages[e.id] = final.elementVoltages[e.id];
    if (e.type === 'L') final.inductorCurrents[e.id] = final.elementCurrents[e.id];
    if (e.sensors) {
      final.terminalCurrents[e.id] = Object.fromEntries(e.sensors.map(s => [s.terminal, history.terminalCurrents[e.id][s.terminal][last]]));
      final.terminalVoltages[e.id] = Object.fromEntries(e.sensors.map(s => [s.terminal, history.terminalVoltages[e.id][s.terminal][last]]));
    }
    if (Object.hasOwn(history.branchCurrents, e.id)) final.branchCurrents[e.id] = history.branchCurrents[e.id][last];
  }
  return { outcome: 'OK', backend, backendVersion, fidelity: 'EXTERNAL_SOLVER_EXECUTION', verified: false,
    units: { time: 's', voltage: 'V', current: 'A', resistance: 'ohm', capacitance: 'F', inductance: 'H', power: 'W' },
    steps: controls.steps, sampleCount: history.time.length, dt: controls.dt, duration: prepared.duration, outputTimeGrid: 'ENGINE_REPORTED', nodes: prepared.nodes, history, final,
    evidence: { backendExecution: 'COMPLETED', backendVersion: backendVersion ?? 'NOT_PROBED', deterministic: null, referenceComparison: 'NOT_PERFORMED', physicalVerification: 'NOT_PERFORMED', sourceNetlistDialect: prepared.dialect, modelCardCount: prepared.modelCards.length, modelCardDigest: createHash('sha256').update(prepared.modelCards.join('\n')).digest('hex') } };
}

function validateLibraryBundle(bundle, refs) {
  if (!bundle || bundle.verified !== true || !Array.isArray(bundle.libraries) || !Array.isArray(bundle.models))
    throw new Error('model library resolver must return a verified bundle with libraries and models');
  const requested = new Set(refs);
  const found = new Set();
  const files = [];
  const filePaths = new Set();
  const entrypoints = [];
  const libraryCalls = [];
  let totalBytes = 0;
  for (const lib of bundle.libraries) {
    if (!requested.has(lib.id) || found.has(lib.id) || !lib.version || /^(latest|main|master|head|stable)$/i.test(String(lib.version)) || !Array.isArray(lib.files)) throw new Error('model library bundle identity/version/files are invalid; immutable version required');
    found.add(lib.id);
    for (const file of lib.files) {
      const rel = String(file.path ?? '');
      if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(rel) || rel.startsWith('/') || pathPosix.normalize(rel) !== rel || rel.split('/').some(p => !p || p === '.' || p === '..'))
        throw new Error(`unsafe model-library relative path: ${rel}`);
      if (filePaths.has(rel)) throw new Error(`duplicate model-library path across resolved packs: ${rel}`);
      filePaths.add(rel);
      const content = String(file.content ?? '');
      const bytes = Buffer.byteLength(content, 'utf8');
      totalBytes += bytes;
      if (bytes === 0 || bytes > 25 * 1024 * 1024 || totalBytes > 50 * 1024 * 1024) throw new Error('model-library size limit exceeded');
      const digest = createHash('sha256').update(content).digest('hex');
      if (String(file.sha256 ?? '').toLowerCase() !== digest) throw new Error(`model-library digest mismatch: ${rel}`);
      const forbidden = /^(?:\.control|\.endc|\.end|\.shell|\.exec|\.quit|\.write|\.wrdata|\.tran|\.ac|\.dc|\.noise|\.four|\.meas|\.print|\.option|\.options|\.save|\.alter)\b/i;
      for (const line of content.split(/\r?\n/)) { const t = line.trim(); if (forbidden.test(t)) throw new Error(`unsafe executable directive in model library ${rel}`); }
      files.push({ path: rel, content, sha256: digest, libraryId: lib.id });
    }
    const libEntrypoints = lib.entrypoints ?? (lib.files.length === 1 && !(lib.libraryCalls?.length) ? [lib.files[0].path] : []);
    if (!Array.isArray(libEntrypoints)) throw new Error(`model library ${lib.id} entrypoints must be an array`);
    const calls = lib.libraryCalls ?? [];
    if (!Array.isArray(calls)) throw new Error(`model library ${lib.id} libraryCalls must be an array`);
    for (const call of calls) {
      const rel = String(call.path ?? ''), section = String(call.section ?? '');
      if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(rel) || !/^[A-Za-z_][A-Za-z0-9_$.-]*$/.test(section) || !lib.files.some(f => f.path === rel)) throw new Error(`invalid SPICE library section selection in ${lib.id}`);
      libraryCalls.push({ path: rel, section });
    }
    if (libEntrypoints.length === 0 && calls.length === 0) throw new Error(`model library ${lib.id} must declare entrypoints or libraryCalls`);
    for (const entry of libEntrypoints) {
      const rel = String(entry);
      if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(rel) || !files.some(f => f.libraryId === lib.id && f.path === rel)) throw new Error(`invalid model-library entrypoint: ${rel}`);
      if (entrypoints.includes(rel) || libraryCalls.some(c => c.path === rel)) throw new Error(`duplicate model-library entrypoint: ${rel}`);
      entrypoints.push(rel);
    }
  }
  if (found.size !== requested.size || [...requested].some(id => !found.has(id))) throw new Error('one or more requested model libraries were not resolved');
  const fileSet = new Set(files.map(f => f.path));
  for (const file of files) for (const line of file.content.split(/\r?\n/)) {
    const match = line.trim().match(/^\.include\s+[\"']?([^\"'\s]+)[\"']?$/i);
    if (match) { const target = pathPosix.normalize(pathPosix.join(pathPosix.dirname(file.path), match[1])); if (!fileSet.has(target)) throw new Error(`model-library include escapes or is missing from bundle: ${file.path} -> ${match[1]}`); }
  }
  const models = bundle.models.map(m => {
    const name = String(m.name ?? '').trim(), type = String(m.type ?? '').toUpperCase();
    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name) || !['D', 'NPN', 'PNP', 'NMOS', 'PMOS', 'NJF', 'PJF', 'SUBCKT'].includes(type) || !found.has(m.libraryId))
      throw new Error(`invalid model metadata in trusted library bundle: ${name}`);
    const pins = m.pins ?? [];
    if (type === 'SUBCKT' && (!Array.isArray(pins) || pins.length < 2 || pins.some(p => !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(p)))) throw new Error(`invalid subcircuit pin metadata: ${name}`);
    return { name, type, libraryId: m.libraryId, pins };
  });
  const provenance = bundle.libraries.map(l => ({ id: l.id, version: l.version, source: String(l.source ?? 'registry'), digest: createHash('sha256').update(files.filter(f => f.libraryId === l.id).sort((a, b) => a.path.localeCompare(b.path)).map(f => `${f.path}:${f.sha256}`).join('|')).digest('hex') }));
  return { files, models, provenance, entrypoints, libraryCalls };
}

async function runExternal({ backend, netlist, steps, dt, method = 'trapezoidal', initialConditions = {}, executable, timeoutMs = 120000, maxBuffer = 16 * 1024 * 1024, maxOutputBytes = 64 * 1024 * 1024, runner = execFile, modelLibraryRefs = [], modelLibraryResolver = null, probeVersion = false }) {
  try {
    if (!['trapezoidal', 'gear'].includes(method)) return hold('external backend method must be trapezoidal or gear; backward-euler is native-only');
    if (typeof probeVersion !== 'boolean') return hold('probeVersion must be boolean');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3600000) return hold('timeoutMs must be between 1000 and 3600000');
    if (!Number.isSafeInteger(maxBuffer) || maxBuffer < 1024 || maxBuffer > 256 * 1024 * 1024) return hold('maxBuffer outside permitted range');
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1024 || maxOutputBytes > 512 * 1024 * 1024) return hold('maxOutputBytes outside permitted range');
    if (!Array.isArray(modelLibraryRefs) || modelLibraryRefs.some(x => typeof x !== 'string' || !x.trim()) || new Set(modelLibraryRefs).size !== modelLibraryRefs.length) return hold('modelLibraryRefs must be unique non-empty registry identifiers');
    let libraryBundle = { files: [], models: [], provenance: [], entrypoints: [], libraryCalls: [] };
    if (modelLibraryRefs.length) {
      if (typeof modelLibraryResolver !== 'function') return hold('modelLibraryResolver is required for external model-library references');
      const resolved = await modelLibraryResolver(modelLibraryRefs, { backend });
      libraryBundle = validateLibraryBundle(resolved, modelLibraryRefs);
    }
    const includePaths = libraryBundle.entrypoints;
    const prepared = prepare(netlist, { steps, dt, method, initialConditions }, backend, libraryBundle.models, includePaths, libraryBundle.libraryCalls);
    const dir = await mkdtemp(join(tmpdir(), `pap-circuit-${backend}-`));
    try {
      const input = join(dir, backend === 'ngspice' ? 'circuit.cir' : 'circuit.cir');
      for (const file of libraryBundle.files) { const target = join(dir, file.path); await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, file.content, { encoding: 'utf8', mode: 0o600 }); }
      await writeFile(input, prepared.deck, { encoding: 'utf8', mode: 0o600 });
      const bin = executable || (backend === 'ngspice' ? 'ngspice' : 'Xyce');
      let backendVersion = null;
      if (probeVersion) {
        const versionResult = await runner(bin, ['-v'], { cwd: dir, timeout: Math.min(timeoutMs, 15000), maxBuffer: Math.min(maxBuffer, 1024 * 1024), windowsHide: true, shell: false });
        if (versionResult?.code != null && versionResult.code !== 0) throw new Error(`${backend} version probe exited with code ${versionResult.code}`);
        backendVersion = String(versionResult?.stdout ?? '') + String(versionResult?.stderr ?? '');
        backendVersion = backendVersion.trim().slice(0, 512);
        if (!backendVersion) throw new Error(`${backend} version probe returned no version banner`);
      }
      const args = backend === 'ngspice' ? ['-b', input] : [input];
      const processResult = await runner(bin, args, { cwd: dir, timeout: timeoutMs, maxBuffer, windowsHide: true, shell: false });
      if (processResult?.code != null && processResult.code !== 0) throw new Error(`${backend} exited with code ${processResult.code}`);
      const outPath = join(dir, backend === 'ngspice' ? 'results.dat' : 'results.csv');
      const outputStat = await stat(outPath);
      if (outputStat.size > maxOutputBytes) throw new Error(`backend output exceeds ${maxOutputBytes} bytes`);
      const output = await readFile(outPath, 'utf8');
      const table = parseRows(output);
      const normalized = normalizeOutput(table, prepared, { steps, dt }, backend, backendVersion);
      normalized.evidence.processExitCode = processResult?.code ?? 0;
      normalized.evidence.stdoutBytes = Buffer.byteLength(processResult?.stdout ?? '');
      normalized.evidence.modelLibraries = libraryBundle.provenance;
      normalized.evidence.modelLibraryCount = libraryBundle.provenance.length;
      normalized.evidence.netlistDigest = createHash('sha256').update(stableStringify(netlist)).digest('hex');
      normalized.evidence.requestDigest = createHash('sha256').update(stableStringify({ netlist, steps, dt, method, initialConditions, backend, libraries: libraryBundle.provenance })).digest('hex');
      normalized.evidence.generatedDeckDigest = createHash('sha256').update(prepared.deck).digest('hex');
      normalized.evidence.rawOutputDigest = createHash('sha256').update(output).digest('hex');
      normalized.evidence.outputBytes = outputStat.size;
      normalized.evidence.executable = bin;
      normalized.evidence.versionProbe = probeVersion ? 'CAPTURED' : 'NOT_REQUESTED';
      return normalized;
    } finally { await rm(dir, { recursive: true, force: true }); }
  } catch (error) {
    const message = String(error?.message ?? error).slice(0, 1200);
    return hold(`${backend} backend unavailable or failed: ${message}`, { backend, verified: false });
  }
}

export function runNgspice(options) { return runExternal({ ...options, backend: 'ngspice' }); }
export function runXyce(options) { return runExternal({ ...options, backend: 'xyce' }); }

/** Backend federation entry point. Auto mode prefers Xyce/ngspice if installed, then native. */
export async function runCircuit(options = {}) {
  const backend = options.backend ?? 'auto';
  if (backend === 'ngspice') return runNgspice(options);
  if (backend === 'xyce') return runXyce(options);
  if (backend === 'native') {
    const { circuitStep } = await import('../module.js');
    return circuitStep(options);
  }
  if (backend !== 'auto') return hold(`unknown circuit backend: ${backend}`);
  const { circuitStep } = await import('../module.js');
  const candidates = [() => runXyce(options), () => runNgspice(options)];
  for (const candidate of candidates) {
    const result = await candidate();
    if (result.outcome === 'OK') return result;
    if (!/not found|ENOENT|spawn .* ENOENT/i.test(result.reason ?? '')) return result;
  }
  const native = circuitStep(options);
  if (native.outcome === 'OK') { native.backend = 'native'; native.backendSelection = 'AUTO_FALLBACK_NATIVE'; native.evidence.backendFallback = 'Xyce and ngspice executables were not found'; }
  return native;
}

export const BACKEND_CONTRACT = Object.freeze({ version: '1.0.0', externalAdapters: ['ngspice', 'xyce'], orchestration: ['native', 'ngspice', 'xyce', 'auto'],
  execution: 'node-only; external executable; no shell; isolated temporary directory; bounded timeout and output buffer',
  supportedCanonicalDevices: ['R', 'C', 'L', 'V', 'I'], supportedBackendDevices: ['R', 'C', 'L', 'V', 'I', 'D', 'Q', 'M', 'J', 'X-subcircuit'], supportedAnalyses: ['transient'], modelLibraries: 'trusted content-addressed resolver with relative include closure', unsupported: ['AC', 'DC sweep', 'noise', 'Monte Carlo', 'parameter sweep', 'mixed-signal co-simulation'] });
