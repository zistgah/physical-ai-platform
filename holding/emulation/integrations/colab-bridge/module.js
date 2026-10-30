/**
 * Physical AI Platform - Colab Bridge
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Browser-native exchange boundary between the canonical SIR/job model and
 * externally executed Colab notebooks. This module does not execute Python,
 * contact Colab APIs, create credentials, or promote simulation evidence.
 */

export const COLAB_BRIDGE_VERSION = '1.0.0';
export const JOB_SCHEMA = 'pap.emulation.job/1.0';
export const RESULT_SCHEMA = 'pap.emulation.result/1.0';
export const MAX_BUNDLE_BYTES = 16 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function inspectJson(value, path = '$', seen = new Set(), depth = 0) {
  if (depth > 64) return `${path}: maximum depth exceeded`;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? null : `${path}: non-finite number`;
  if (typeof value !== 'object') return `${path}: unsupported ${typeof value}`;
  if (seen.has(value)) return `${path}: cyclic value`;
  if (!Array.isArray(value) && !isRecord(value)) return `${path}: non-plain object`;
  if (Object.getOwnPropertySymbols(value).length) return `${path}: symbol keys are not allowed`;
  seen.add(value);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (FORBIDDEN_KEYS.has(key)) { seen.delete(value); return `${path}.${key}: unsafe key` ; }
    if (!('value' in descriptor)) { seen.delete(value); return `${path}.${key}: accessors are not allowed`; }
    if (descriptor.value === undefined) { seen.delete(value); return `${path}.${key}: undefined is not JSON data`; }
    const error = inspectJson(descriptor.value, `${path}.${key}`, seen, depth + 1);
    if (error) { seen.delete(value); return error; }
  }
  seen.delete(value);
  return null;
}

export function canonicalJson(value) {
  const error = inspectJson(value);
  if (error) throw new TypeError(error);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable; use a secure browser context (HTTPS/localhost).');
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function assertBundleSize(value) {
  const encoded = canonicalJson(value);
  const size = new TextEncoder().encode(encoded).byteLength;
  if (size > MAX_BUNDLE_BYTES) throw new RangeError(`Bundle exceeds ${MAX_BUNDLE_BYTES} bytes`);
  return encoded;
}

/** Create a portable job envelope; `sir` remains the authoritative model. */
export async function createJobBundle({ sir, target, inputs, observations = null, configuration = {}, provenance = {} }) {
  if (!isRecord(sir)) throw new TypeError('sir must be a plain canonical SIR object');
  if (!isRecord(target) || typeof target.backendId !== 'string' || !target.backendId.trim()) throw new TypeError('target.backendId is required');
  if (typeof target.operation !== 'string' || !target.operation.trim()) throw new TypeError('target.operation is required');
  if (target.backendVersion !== undefined && target.backendVersion !== null && (typeof target.backendVersion !== 'string' || !target.backendVersion.trim())) throw new TypeError('target.backendVersion must be a non-empty string or null');
  if (target.requestedDevice !== undefined && (typeof target.requestedDevice !== 'string' || !target.requestedDevice.trim())) throw new TypeError('target.requestedDevice must be a non-empty string');
  if (!isRecord(inputs)) throw new TypeError('inputs must be a plain object');
  if (observations !== null && !Array.isArray(observations)) throw new TypeError('observations must be an array or null');
  if (!isRecord(configuration) || !isRecord(provenance)) throw new TypeError('configuration and provenance must be plain objects');
  const createdAt = new Date().toISOString();
  const body = {
    schema: JOB_SCHEMA,
    bridgeVersion: COLAB_BRIDGE_VERSION,
    createdAt,
    target: { backendId: target.backendId, backendVersion: target.backendVersion ?? null, operation: target.operation ?? null, requestedDevice: target.requestedDevice ?? 'cpu' },
    sir,
    inputs,
    observations,
    configuration,
    provenance: { source: provenance.source ?? 'PAP_BROWSER', sourceVersion: provenance.sourceVersion ?? null, license: provenance.license ?? 'GPL-3.0-only' }
  };
  const canonical = assertBundleSize(body);
  const digest = await sha256Hex(canonical);
  const bundle = { ...body, jobId: `papjob-${digest.slice(0, 20)}`, digest: `sha256:${digest}`, canonicalPayload: canonical };
  assertBundleSize(bundle);
  return Object.freeze(bundle);
}

export function validateJobBundle(bundle) {
  const error = inspectJson(bundle);
  if (error) return { valid: false, reason: error };
  if (!isRecord(bundle) || bundle.schema !== JOB_SCHEMA || bundle.bridgeVersion !== COLAB_BRIDGE_VERSION) return { valid: false, reason: 'Unsupported job schema/bridge version' };
  if (typeof bundle.createdAt !== 'string' || !Number.isFinite(Date.parse(bundle.createdAt))) return { valid: false, reason: 'Missing or invalid job creation timestamp' };
  if (typeof bundle.jobId !== 'string' || !bundle.jobId.startsWith('papjob-')) return { valid: false, reason: 'Missing or invalid jobId' };
  if (!isRecord(bundle.target) || typeof bundle.target.backendId !== 'string' || !bundle.target.backendId.trim() || typeof bundle.target.operation !== 'string' || !bundle.target.operation.trim()) return { valid: false, reason: 'Missing backend target or operation' };
  if (!isRecord(bundle.sir) || !isRecord(bundle.inputs) || !isRecord(bundle.configuration) || !isRecord(bundle.provenance)) return { valid: false, reason: 'SIR, inputs, configuration and provenance must be objects' };
  if (bundle.observations !== null && !Array.isArray(bundle.observations)) return { valid: false, reason: 'Observations must be an array or null' };
  if (typeof bundle.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(bundle.digest)) return { valid: false, reason: 'Missing SHA-256 digest' };
  try { assertBundleSize(bundle); } catch (e) { return { valid: false, reason: e.message }; }
  return { valid: true, jobId: bundle.jobId };
}

/** Recompute the job digest; structural validation alone is not integrity verification. */
export async function verifyJobBundle(bundle) {
  const structural = validateJobBundle(bundle);
  if (!structural.valid) return structural;
  if (typeof bundle.canonicalPayload !== 'string') return { valid: false, reason: 'Canonical payload is missing' };
  let payload;
  try { payload = JSON.parse(bundle.canonicalPayload); } catch { return { valid: false, reason: 'Canonical payload is not valid JSON' }; }
  const { digest, jobId, canonicalPayload, ...body } = bundle;
  if (canonicalJson(payload) !== canonicalJson(body)) return { valid: false, reason: 'Canonical payload does not match job fields' };
  const expected = `sha256:${await sha256Hex(canonicalPayload)}`;
  if (expected !== digest || jobId !== `papjob-${expected.slice(7, 27)}`) return { valid: false, reason: 'Job digest or deterministic jobId verification failed' };
  return { valid: true, jobId };
}

/** Validate and bind a Colab result to the exact job digest; never promote it. */
export async function validateResultBundle(job, result) {
  const jobCheck = await verifyJobBundle(job);
  if (!jobCheck.valid) return { valid: false, outcome: 'HOLD', reason: `Invalid source job: ${jobCheck.reason}` };
  const error = inspectJson(result);
  if (error) return { valid: false, outcome: 'HOLD', reason: error };
  if (!isRecord(result) || result.schema !== RESULT_SCHEMA || result.bridgeVersion !== COLAB_BRIDGE_VERSION) return { valid: false, outcome: 'HOLD', reason: 'Unsupported result schema/bridge version' };
  if (result.jobId !== job.jobId || result.jobDigest !== job.digest) return { valid: false, outcome: 'HOLD', reason: 'Result is not bound to this exact job' };
  if (!isRecord(result.backend) || result.backend.id !== job.target.backendId || typeof result.backend.version !== 'string' || !result.backend.version.trim() || (job.target.backendVersion && job.target.backendVersion !== result.backend.version)) return { valid: false, outcome: 'HOLD', reason: 'Backend identity/version mismatch' };
  if (!isRecord(result.execution) || result.execution.status !== 'EXECUTED' || result.execution.runtime !== 'COLAB' || typeof result.execution.finishedAt !== 'string' || !Number.isFinite(Date.parse(result.execution.finishedAt)) || (result.execution.startedAt !== null && (typeof result.execution.startedAt !== 'string' || !Number.isFinite(Date.parse(result.execution.startedAt)) || Date.parse(result.execution.startedAt) > Date.parse(result.execution.finishedAt))) || typeof result.execution.device !== 'string' || !result.execution.device.trim()) return { valid: false, outcome: 'HOLD', reason: 'Execution record is incomplete or not a Colab run' };
  if (!isRecord(result.diagnostics)) return { valid: false, outcome: 'HOLD', reason: 'Solver diagnostics must be an object' };
  if (!Array.isArray(result.outputs) || result.outputs.length === 0) return { valid: false, outcome: 'HOLD', reason: 'Result outputs are missing' };
  if (Array.isArray(job.observations) && job.observations.length !== result.outputs.length) return { valid: false, outcome: 'HOLD', reason: 'Result sample count does not match the job observation grid' };
  let priorTime = -Infinity, priorSequence = -1;
  for (let i = 0; i < result.outputs.length; i++) {
    const sample = result.outputs[i];
    if (!isRecord(sample) || !Number.isSafeInteger(sample.sequence) || sample.sequence !== i || sample.sequence <= priorSequence || !Number.isFinite(sample.time) || sample.time < priorTime || !isRecord(sample.values)) return { valid: false, outcome: 'HOLD', reason: `Invalid output sample at index ${i}` };
    priorSequence = sample.sequence; priorTime = sample.time;
  }
  if (result.physicalVerification !== false || result.evidenceState !== 'UNVERIFIED' || result.fidelity !== 'SIMULATED') return { valid: false, outcome: 'HOLD', reason: 'Colab results must remain SIMULATED and UNVERIFIED' };
  if (!isRecord(result.claims) || result.claims.verified !== false || result.claims.hil !== false || result.claims.physical !== false) return { valid: false, outcome: 'HOLD', reason: 'Result claims must explicitly deny VERIFIED/HIL/physical status' };
  if (typeof result.resultDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(result.resultDigest)) return { valid: false, outcome: 'HOLD', reason: 'Result digest is missing or malformed' };
  const { resultDigest, canonicalPayload, ...body } = result;
  if (typeof result.canonicalPayload !== 'string') return { valid: false, outcome: 'HOLD', reason: 'Result canonical payload is missing' };
  let payload;
  try { payload = JSON.parse(result.canonicalPayload); } catch { return { valid: false, outcome: 'HOLD', reason: 'Result canonical payload is invalid JSON' }; }
  if (canonicalJson(payload) !== canonicalJson(body)) return { valid: false, outcome: 'HOLD', reason: 'Result canonical payload does not match result fields' };
  const expected = `sha256:${await sha256Hex(result.canonicalPayload)}`;
  if (expected !== resultDigest) return { valid: false, outcome: 'HOLD', reason: 'Result digest verification failed' };
  return { valid: true, outcome: 'UNVERIFIED', jobId: job.jobId, samples: result.outputs.length, backend: result.backend };
}

export async function createResultBundle({ job, backend, outputs, diagnostics = {}, execution = {} }) {
  const check = validateJobBundle(job);
  if (!check.valid) throw new TypeError(`Invalid job: ${check.reason}`);
  const body = {
    schema: RESULT_SCHEMA,
    bridgeVersion: COLAB_BRIDGE_VERSION,
    jobId: job.jobId,
    jobDigest: job.digest,
    backend: { id: backend.id, version: backend.version },
    execution: { status: 'EXECUTED', runtime: 'COLAB', startedAt: execution.startedAt ?? null, finishedAt: execution.finishedAt ?? new Date().toISOString(), device: execution.device ?? 'unknown' },
    outputs,
    diagnostics,
    fidelity: 'SIMULATED',
    physicalVerification: false,
    evidenceState: 'UNVERIFIED',
    claims: { verified: false, hil: false, physical: false }
  };
  assertBundleSize(body);
  const canonicalPayload = canonicalJson(body);
  const result = { ...body, canonicalPayload, resultDigest: `sha256:${await sha256Hex(canonicalPayload)}` };
  assertBundleSize(result);
  const validation = await validateResultBundle(job, result);
  if (!validation.valid) throw new TypeError(`Cannot create invalid result bundle: ${validation.reason}`);
  return result;
}

/** Build the canonical Colab GitHub URL after Grok knows the real repository. */
export function buildColabUrl({ owner, repository, branch = 'main', notebookPath }) {
  const parts = [owner, repository, branch, notebookPath];
  if (parts.some(value => typeof value !== 'string' || !value.trim())) throw new TypeError('owner, repository, branch and notebookPath are required');
  if ([owner, repository, branch].some(value => value.includes('/') || value === '.' || value === '..')) throw new TypeError('Invalid GitHub path segment');
  const path = notebookPath.split('/');
  if (path.some(segment => !segment || segment === '.' || segment === '..')) throw new TypeError('Invalid notebook path');
  if (!notebookPath.endsWith('.ipynb')) throw new TypeError('notebookPath must identify an .ipynb file');
  return `https://colab.research.google.com/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/blob/${encodeURIComponent(branch)}/${path.map(encodeURIComponent).join('/')}`;
}

export function bundleToBlob(bundle) {
  const json = assertBundleSize(bundle);
  return new Blob([json], { type: 'application/json;charset=utf-8' });
}
