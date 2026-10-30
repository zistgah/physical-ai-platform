/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 47-compatible uncertainty study orchestration.
 * This module does not alter the canonical model or certify physical accuracy.
 * It samples explicitly bounded input parameters, invokes an injected simulation
 * runner, and returns descriptive statistics only when every run is valid.
 * Any HOLD, malformed result, timeout, or non-finite metric fails the study closed.
 */
const finite = Number.isFinite;
const HOLD = (reason, details = {}) => ({ outcome: 'HOLD', reason, ...details });
const LIMITS = Object.freeze({ parameters: 32, samples: 10000, metrics: 32, magnitude: 1e50 });

function hashSeed(seed) {
  let x = seed >>> 0;
  if (x === 0) x = 0x6d2b79f5;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function validateSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return 'Study specification must be an object';
  if (!Array.isArray(spec.parameters) || spec.parameters.length < 1 || spec.parameters.length > LIMITS.parameters) return `parameters must contain 1..${LIMITS.parameters} entries`;
  if (!Number.isInteger(spec.samples) || spec.samples < 1 || spec.samples > LIMITS.samples) return `samples must be an integer in [1, ${LIMITS.samples}]`;
  if (!Number.isInteger(spec.seed) || spec.seed < 0 || spec.seed > 0xffffffff) return 'seed must be an unsigned 32-bit integer';
  const names = new Set();
  for (const [i, p] of spec.parameters.entries()) {
    if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(p.name)) return `parameter ${i} requires a valid name`;
    if (names.has(p.name)) return `duplicate parameter name: ${p.name}`;
    names.add(p.name);
    if (p.distribution === 'uniform') {
      if (![p.min, p.max].every(finite) || p.min < -LIMITS.magnitude || p.max > LIMITS.magnitude || p.min > p.max) return `parameter ${p.name}: uniform bounds must be finite, bounded, and min <= max`;
    } else if (p.distribution === 'normal') {
      if (![p.mean, p.stddev, p.min, p.max].every(finite) || p.stddev < 0 || p.min > p.max || p.min < -LIMITS.magnitude || p.max > LIMITS.magnitude) return `parameter ${p.name}: normal requires finite mean, stddev >= 0, and bounded min <= max`;
    } else return `parameter ${p.name}: distribution must be uniform or normal`;
  }
  if (!Array.isArray(spec.metrics) || spec.metrics.length < 1 || spec.metrics.length > LIMITS.metrics) return `metrics must contain 1..${LIMITS.metrics} entries`;
  if (new Set(spec.metrics).size !== spec.metrics.length || spec.metrics.some(m => typeof m !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(m))) return 'metrics must be unique valid names';
  return null;
}
function gaussian(random) {
  // Box-Muller transform; clamp away from log(0).
  const u1 = Math.max(Number.MIN_VALUE, random()), u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function draw(p, random) {
  const raw = p.distribution === 'uniform' ? p.min + random() * (p.max - p.min) : p.mean + p.stddev * gaussian(random);
  return Math.max(p.min, Math.min(p.max, raw));
}
function stats(values) {
  const sorted = [...values].sort((a,b) => a-b), n = sorted.length;
  const mean = values.reduce((a,b) => a+b, 0) / n;
  const variance = values.reduce((a,b) => a + (b-mean)**2, 0) / n;
  const quantile = q => {
    const pos = (n - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  return { min: sorted[0], max: sorted[n-1], mean, stddev: Math.sqrt(variance), p05: quantile(.05), median: quantile(.5), p95: quantile(.95) };
}

/**
 * Run a deterministic Monte Carlo study.
 * runner(parameters, {sampleIndex, seed}) must return {outcome:'OK', metrics:{...}}.
 * The runner is called serially to preserve deterministic order and bounded memory.
 */
export async function uncertaintyStudy(spec, { runner, timeoutMs = 30000 } = {}) {
  const error = validateSpec(spec); if (error) return HOLD(error);
  if (typeof runner !== 'function') return HOLD('A simulation runner is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) return HOLD('timeoutMs must be in [1, 300000]');
  const random = hashSeed(spec.seed), values = Object.fromEntries(spec.metrics.map(m => [m, []]));
  const inputRanges = Object.fromEntries(spec.parameters.map(p => [p.name, { min: Infinity, max: -Infinity }]));
  for (let i = 0; i < spec.samples; i++) {
    const parameters = Object.fromEntries(spec.parameters.map(p => [p.name, draw(p, random)]));
    for (const p of spec.parameters) { const r = inputRanges[p.name]; r.min = Math.min(r.min, parameters[p.name]); r.max = Math.max(r.max, parameters[p.name]); }
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => runner(Object.freeze({ ...parameters }), { sampleIndex: i, seed: spec.seed })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`sample ${i} timed out after ${timeoutMs} ms`)), timeoutMs); })
      ]);
      if (!result || result.outcome !== 'OK') return HOLD(`Sample ${i} did not produce an OK simulation result`, { sampleIndex: i, sampleOutcome: result?.outcome ?? 'INVALID', sampleReason: result?.reason ?? null, completedSamples: i });
      if (!result.metrics || typeof result.metrics !== 'object' || Array.isArray(result.metrics)) return HOLD(`Sample ${i} returned no metrics object`, { sampleIndex: i, completedSamples: i });
      for (const metric of spec.metrics) {
        const value = result.metrics[metric];
        if (!finite(value) || Math.abs(value) > LIMITS.magnitude) return HOLD(`Sample ${i} metric ${metric} is missing, non-finite, or out of bounds`, { sampleIndex: i, metric, completedSamples: i });
        values[metric].push(value);
      }
    } catch (e) { return HOLD(`Sample ${i} failed: ${e?.message ?? String(e)}`, { sampleIndex: i, completedSamples: i, errorType: e?.name ?? 'Error' }); }
    finally { clearTimeout(timer); }
  }
  const summaries = Object.fromEntries(spec.metrics.map(m => [m, stats(values[m])]));
  if (Object.values(summaries).some(s => Object.values(s).some(v => !finite(v)))) return HOLD('Study statistics exceeded numeric range');
  return { outcome: 'OK', study: { method: 'DETERMINISTIC_MONTE_CARLO', version: '1.0.0', seed: spec.seed, samples: spec.samples, parameterRanges: inputRanges, metrics: summaries, metricNames: [...spec.metrics] }, verification: { status: 'SIMULATED', physicalVerification: false, qualification: 'DESCRIPTIVE_UNCERTAINTY_ONLY' } };
}
export const UNCERTAINTY_LIMITS = LIMITS;
