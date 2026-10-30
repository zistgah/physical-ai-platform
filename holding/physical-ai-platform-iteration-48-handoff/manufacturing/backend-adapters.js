/**
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 * Optional, replaceable manufacturing backend orchestration. No backend is
 * bundled, auto-installed, trusted, or allowed to mutate the canonical graph.
 */
import { route } from "./module.js";
import catalog from "./backend-catalog.json" with { type: "json" };

const STATUSES = new Set(["SUCCEEDED", "INFEASIBLE", "UNKNOWN", "INVALID", "FAILED", "UNAVAILABLE"]);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isFiniteNumber = Number.isFinite;
const cloneJson = value => JSON.parse(JSON.stringify(value));

export class BackendContractError extends Error {
  constructor(code, message) { super(message); this.name = "BackendContractError"; this.code = code; }
}

function assertJsonSafe(value, path = "$", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!isFiniteNumber(value)) throw new BackendContractError("NON_FINITE_NUMBER", `${path} must be finite`);
    return;
  }
  if (typeof value !== "object") throw new BackendContractError("NON_JSON_VALUE", `${path} is not JSON-safe`);
  if (seen.has(value)) throw new BackendContractError("CYCLIC_VALUE", `${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`, seen));
  else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new BackendContractError("NON_PLAIN_OBJECT", `${path} must be a plain object`);
    for (const [k, v] of Object.entries(value)) assertJsonSafe(v, `${path}.${k}`, seen);
  }
  seen.delete(value);
}

function validateManifest(m) {
  if (!isObject(m) || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(m.id || "") ||
      typeof m.name !== "string" || !m.name.trim() ||
      typeof m.license !== "string" || !m.license.trim() ||
      !Array.isArray(m.capabilities) || !m.capabilities.length ||
      !Array.isArray(m.operations) || !m.operations.length) {
    throw new BackendContractError("MANIFEST_INVALID", "Backend manifest requires id, name, license, capabilities and operations");
  }
  return Object.freeze(cloneJson(m));
}

function validateBackendResponse(raw, request, manifest) {
  if (!isObject(raw)) throw new BackendContractError("RESPONSE_INVALID", "Backend response must be an object");
  if (raw.protocol !== "ayeai.manufacturing.backend/v1") throw new BackendContractError("PROTOCOL_MISMATCH", "Backend protocol mismatch");
  if (raw.requestId !== request.requestId) throw new BackendContractError("REQUEST_ID_MISMATCH", "Backend response requestId does not match");
  if (raw.backendId !== manifest.id) throw new BackendContractError("BACKEND_ID_MISMATCH", "Backend response identity does not match selected backend");
  if (!STATUSES.has(raw.status)) throw new BackendContractError("STATUS_INVALID", "Backend returned an unknown status");
  if (raw.status === "SUCCEEDED" && !isObject(raw.result)) throw new BackendContractError("RESULT_MISSING", "SUCCEEDED response requires an object result");
  if (raw.diagnostics !== undefined && !Array.isArray(raw.diagnostics)) throw new BackendContractError("DIAGNOSTICS_INVALID", "diagnostics must be an array");
  assertJsonSafe(raw);
  return {
    status: raw.status,
    result: raw.result ?? null,
    diagnostics: raw.diagnostics ?? [],
    metrics: raw.metrics ?? {},
    backend: { id: manifest.id, name: manifest.name, version: String(raw.backendVersion || "UNSPECIFIED"), license: manifest.license },
    provenance: {
      requestId: request.requestId,
      capability: request.capability,
      operation: request.operation,
      protocol: request.protocol,
      payloadDigest: raw.payloadDigest || null,
      backendVersion: String(raw.backendVersion || "UNSPECIFIED"),
      receivedAt: raw.receivedAt || null
    },
    evidence: {
      state: request.executionClass === "simulation" ? "SIMULATED" : "PLANNED",
      verified: false,
      method: "EXTERNAL_BACKEND",
      note: "Backend output is a proposal/simulation until independently validated and bound to subject/configuration evidence."
    }
  };
}

export class BackendRegistry {
  constructor({ transport, manifests = catalog.backends, enabled = [], maxPayloadBytes = 5_000_000 } = {}) {
    if (!transport || typeof transport.invoke !== "function") throw new BackendContractError("TRANSPORT_REQUIRED", "A transport with invoke() is required");
    this.transport = transport;
    this.maxPayloadBytes = maxPayloadBytes;
    this.backends = new Map();
    this.enabled = new Set(enabled);
    for (const manifest of manifests) this.register(manifest);
  }

  register(manifest) {
    const m = validateManifest(manifest);
    if (this.backends.has(m.id)) throw new BackendContractError("BACKEND_DUPLICATE", `Backend ${m.id} is already registered`);
    this.backends.set(m.id, m);
    return m;
  }

  list({ capability = null, includeDisabled = true } = {}) {
    return [...this.backends.values()]
      .filter(m => !capability || m.capabilities.includes(capability))
      .filter(m => includeDisabled || this.enabled.has(m.id))
      .map(m => ({ ...m, configured: this.enabled.has(m.id) }));
  }

  enable(id) {
    if (!this.backends.has(id)) throw new BackendContractError("BACKEND_UNKNOWN", `Unknown backend ${id}`);
    this.enabled.add(id);
  }

  disable(id) { this.enabled.delete(id); }

  async discover() {
    const entries = [];
    for (const manifest of this.backends.values()) {
      if (!this.enabled.has(manifest.id)) {
        entries.push({ id: manifest.id, status: "DISABLED", capabilities: [...manifest.capabilities] });
        continue;
      }
      if (typeof this.transport.probe !== "function") {
        entries.push({ id: manifest.id, status: "CONFIGURED_UNVERIFIED", capabilities: [...manifest.capabilities] });
        continue;
      }
      try {
        const health = await this.transport.probe(manifest);
        entries.push({
          id: manifest.id,
          status: health?.available === true ? "AVAILABLE" : "UNAVAILABLE",
          reason: health?.reason || null,
          capabilities: [...manifest.capabilities]
        });
      } catch (e) {
        entries.push({ id: manifest.id, status: "UNAVAILABLE", reason: e.message, capabilities: [...manifest.capabilities] });
      }
    }
    return entries;
  }

  async invoke({ capability, operation, payload, requestId, preferredBackend = null, allowFallback = false, executionClass = "planning", metadata = {} } = {}) {
    if (typeof capability !== "string" || !capability || typeof operation !== "string" || !operation)
      return { outcome: "HOLD", status: "INVALID", reason: "Capability and operation are required" };
    if (typeof requestId !== "string" || !requestId.trim())
      return { outcome: "HOLD", status: "INVALID", reason: "Stable requestId is required for traceability and idempotency" };
    if (!isObject(payload)) return { outcome: "HOLD", status: "INVALID", reason: "Payload must be an object" };
    try {
      assertJsonSafe(payload);
      assertJsonSafe(metadata);
      const size = new TextEncoder().encode(JSON.stringify(payload)).length;
      if (size > this.maxPayloadBytes) return { outcome: "HOLD", status: "INVALID", reason: "Payload exceeds configured size limit" };
    } catch (e) {
      return { outcome: "HOLD", status: "INVALID", reason: e.message, code: e.code || "PAYLOAD_INVALID" };
    }

    // The drop-in never performs physical actuation. A deployment-specific,
    // independently safety-reviewed gateway must own that operation.
    if (executionClass === "physical-actuation" || operation === "request-execution")
      return { outcome: "HOLD", status: "UNAVAILABLE", reason: "Physical actuation is disabled in this planning package; use a separately safety-qualified machine gateway." };

    const candidates = [...this.backends.values()].filter(m =>
      this.enabled.has(m.id) && m.capabilities.includes(capability) && m.operations.includes(operation)
    );
    if (preferredBackend) {
      const preferred = candidates.filter(m => m.id === preferredBackend);
      const others = allowFallback ? candidates.filter(m => m.id !== preferredBackend) : [];
      candidates.splice(0, candidates.length, ...preferred, ...others);
    } else if (!allowFallback && candidates.length > 1) {
      candidates.splice(1);
    }
    if (!candidates.length) return { outcome: "HOLD", status: "UNAVAILABLE", reason: "No enabled backend advertises the requested capability and operation" };

    const request = {
      protocol: "ayeai.manufacturing.backend/v1",
      requestId,
      capability,
      operation,
      executionClass,
      metadata: cloneJson(metadata),
      payload: cloneJson(payload)
    };
    let lastUnavailable = null;
    for (const manifest of candidates) {
      try {
        if (typeof this.transport.probe === "function") {
          const health = await this.transport.probe(manifest);
          if (!health || health.available !== true) {
            lastUnavailable = { backendId: manifest.id, reason: health?.reason || "Backend unavailable" };
            if (allowFallback) continue;
            return { outcome: "HOLD", status: "UNAVAILABLE", ...lastUnavailable };
          }
        }
        const raw = await this.transport.invoke(manifest, request);
        const normalized = validateBackendResponse(raw, request, manifest);
        if (normalized.status === "UNAVAILABLE" && allowFallback) {
          lastUnavailable = { backendId: manifest.id, reason: normalized.diagnostics };
          continue;
        }
        return {
          outcome: normalized.status === "SUCCEEDED" ? "OK" : "HOLD",
          ...normalized
        };
      } catch (e) {
        // A contract violation, solver failure or infeasible model is not a
        // reason to silently fall back to a different algorithm.
        return { outcome: "HOLD", status: "FAILED", backendId: manifest.id, reason: e.message, code: e.code || "BACKEND_FAILURE" };
      }
    }
    return { outcome: "HOLD", status: "UNAVAILABLE", reason: "All permitted backends are unavailable", lastUnavailable };
  }
}

/**
 * HTTP JSON transport for a separately deployed backend gateway.
 * Endpoints and credentials are injected by the host, never stored in this
 * package or emitted in provenance. HTTPS is required except loopback HTTP.
 */
export function createHttpJsonTransport({ fetchImpl = globalThis.fetch, endpoints = {}, headers = {}, timeoutMs = 30_000 } = {}) {
  if (typeof fetchImpl !== "function") throw new BackendContractError("FETCH_UNAVAILABLE", "fetch implementation is required");
  const endpointFor = manifest => {
    const raw = endpoints[manifest.id];
    if (typeof raw !== "string" || !raw) throw new BackendContractError("ENDPOINT_MISSING", `No endpoint configured for ${manifest.id}`);
    let u;
    try { u = new URL(raw); } catch { throw new BackendContractError("ENDPOINT_INVALID", `Invalid endpoint for ${manifest.id}`); }
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && loopback))
      throw new BackendContractError("ENDPOINT_INSECURE", "Backend endpoint must use HTTPS (HTTP is permitted only on loopback)");
    if (u.username || u.password || u.hash) throw new BackendContractError("ENDPOINT_INVALID", "Endpoint must not embed credentials or fragments");
    return u;
  };
  const send = async (manifest, path, body = null) => {
    const base = endpointFor(manifest);
    const url = new URL(path, base);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        method: body === null ? "GET" : "POST",
        headers: { "accept": "application/json", ...(body === null ? {} : { "content-type": "application/json" }), ...headers },
        body: body === null ? undefined : JSON.stringify(body),
        signal: controller.signal,
        redirect: "error"
      });
      if (response.status === 404 || response.status === 503 || response.status === 502)
        return { unavailable: true, reason: `HTTP ${response.status}` };
      if (!response.ok) throw new BackendContractError("HTTP_ERROR", `Backend HTTP ${response.status}`);
      const json = await response.json();
      return { unavailable: false, json };
    } catch (e) {
      if (e.name === "AbortError") throw new BackendContractError("BACKEND_TIMEOUT", `Backend timed out after ${timeoutMs} ms`);
      throw e;
    } finally { clearTimeout(timer); }
  };
  return {
    async probe(manifest) {
      try {
        const r = await send(manifest, "/health");
        return r.unavailable ? { available: false, reason: r.reason } : { available: r.json?.status === "OK" || r.json?.available === true, reason: r.json?.reason || "Health check not affirmative" };
      } catch (e) { return { available: false, reason: e.message }; }
    },
    async invoke(manifest, request) {
      const r = await send(manifest, "/v1/execute", request);
      if (r.unavailable) return {
        protocol: request.protocol, requestId: request.requestId, backendId: manifest.id,
        status: "UNAVAILABLE", diagnostics: [{ code: "HTTP_UNAVAILABLE", message: r.reason }]
      };
      return r.json;
    }
  };
}

/** Build a backend-neutral job-shop model from canonical projection snapshots. */
export function buildJobshopModel({ orders, stations, qualityByOrder = {}, materialsByOrder = {}, horizonMinutes = null } = {}) {
  if (!Array.isArray(orders) || !orders.length || !Array.isArray(stations) || !stations.length)
    throw new BackendContractError("JOBSHOP_INPUT_INVALID", "Non-empty orders and stations are required");
  const stationIds = stations.map(s => s?.id);
  if (stationIds.some(id => typeof id !== "string" || !id) || new Set(stationIds).size !== stationIds.length)
    throw new BackendContractError("STATION_ID_INVALID", "Station ids must be unique non-empty strings");
  const orderIds = orders.map(e => (e.order || e)?.id);
  if (orderIds.some(id => typeof id !== "string" || !id) || new Set(orderIds).size !== orderIds.length)
    throw new BackendContractError("ORDER_ID_INVALID", "Order ids must be unique non-empty strings");
  const operations = [];
  const stationModels = stations.map(s => ({
    id: s.id,
    processes: Array.isArray(s.processes) ? [...s.processes] : [],
    capabilities: Array.isArray(s.capabilities) ? [...s.capabilities] : [],
    availableMinutes: Math.max(0, (s.capacityMinutes ?? 0) - (s.bookedMinutes ?? 0)),
    status: s.status || (s.available === true ? "READY" : "UNSPECIFIED"),
    maintenanceDue: s.maintenanceDue === true,
    calibration: s.calibration || null
  }));
  for (const [orderIndex, entry] of orders.entries()) {
    const order = entry.order || entry;
    const quality = entry.quality || qualityByOrder[order.id];
    const materials = entry.materials || materialsByOrder[order.id];
    const gate = route({ order, stations, quality, materials });
    if (gate.outcome !== "OK") throw new BackendContractError("ORDER_GATE_HOLD", `Order ${order.id || orderIndex} failed native release gates: ${gate.issues.map(x => x.code).join(", ")}`);
    const operationIds = order.routing.map((op, i) => op?.id || `${order.id}-op-${i + 1}`);
    if (new Set(operationIds).size !== operationIds.length)
      throw new BackendContractError("OPERATION_ID_INVALID", `Operation ids must be unique within ${order.id}`);
    for (const [sequence, op] of order.routing.entries()) {
      const quantity = op.quantity ?? order.quantity;
      const cycle = op.cycleTimeMinutes;
      const setup = op.setupMinutes ?? 0;
      if (!isFiniteNumber(quantity) || quantity <= 0 || !isFiniteNumber(cycle) || cycle <= 0 || !isFiniteNumber(setup) || setup < 0)
        throw new BackendContractError("OPERATION_INVALID", `Invalid quantity, cycle time or setup at ${order.id}/${op.id || sequence}`);
      const eligible = stationModels.filter(s =>
        s.status === "READY" || s.status === "IDLE" || s.status === "AVAILABLE"
      ).filter(s => !s.maintenanceDue && s.calibration?.status === "VALID")
       .filter(s => s.processes.includes(op.process))
       .filter(s => (op.requiredCapabilities || []).every(c => s.capabilities.includes(c)))
       .filter(s => !op.stationId || op.stationId === s.id)
       .map(s => s.id).sort();
      if (!eligible.length) throw new BackendContractError("NO_ELIGIBLE_STATION", `No eligible station for ${order.id}/${op.id || sequence}`);
      operations.push({
        id: op.id || `${order.id}-op-${sequence + 1}`,
        orderId: order.id,
        sequence,
        process: op.process,
        durationMinutes: setup + quantity * cycle,
        eligibleStationIds: eligible,
        priority: entry.priority ?? order.priority ?? 0,
        dueDate: entry.dueDate ?? order.dueDate ?? null
      });
    }
  }
  const inferredHorizon = Math.max(...stationModels.map(s => s.availableMinutes));
  const horizon = horizonMinutes === null ? inferredHorizon : horizonMinutes;
  if (!isFiniteNumber(horizon) || horizon <= 0)
    throw new BackendContractError("HORIZON_INVALID", "horizonMinutes must be finite and greater than zero");
  return {
    modelVersion: "1.0.0",
    objective: ["minimize-makespan"],
    timeUnit: "minute",
    horizonMinutes: horizon,
    operations,
    stations: stationModels,
    constraints: { eachOperationExactlyOnce: true, operationPrecedence: true, stationNoOverlap: true, respectExistingBookedCapacity: true }
  };
}

/** Independently validate a solver's schedule before it can be returned as usable. */
export function validateJobshopSchedule(model, schedule) {
  const errors = [];
  if (!isObject(model) || !Array.isArray(model.operations) || !isObject(schedule) || !Array.isArray(schedule.assignments))
    return { valid: false, errors: ["MODEL_OR_SCHEDULE_INVALID"] };
  const expected = new Map(model.operations.map(o => [`${o.orderId}::${o.id}`, o]));
  const seen = new Set();
  const stationLoads = new Map();
  const stationIntervals = new Map();
  const byOrder = new Map();
  for (const [i, a] of schedule.assignments.entries()) {
    const key = `${a.orderId}::${a.operationId}`;
    const op = expected.get(key);
    if (!op) { errors.push(`UNEXPECTED_OPERATION:${key}`); continue; }
    if (seen.has(key)) { errors.push(`DUPLICATE_OPERATION:${key}`); continue; }
    seen.add(key);
    if (!op.eligibleStationIds.includes(a.stationId)) errors.push(`INELIGIBLE_STATION:${key}`);
    if (![a.startMinute, a.endMinute].every(isFiniteNumber) || a.startMinute < 0 || a.endMinute <= a.startMinute)
      errors.push(`INVALID_INTERVAL:${key}`);
    else {
      if (a.endMinute > model.horizonMinutes + 1e-7) errors.push(`HORIZON_EXCEEDED:${key}`);
      const duration = a.endMinute - a.startMinute;
      if (Math.abs(duration - op.durationMinutes) > 1e-7) errors.push(`DURATION_MISMATCH:${key}`);
      stationLoads.set(a.stationId, (stationLoads.get(a.stationId) || 0) + duration);
      const intervals = stationIntervals.get(a.stationId) || [];
      intervals.push({ start: a.startMinute, end: a.endMinute, key });
      stationIntervals.set(a.stationId, intervals);
      const list = byOrder.get(a.orderId) || [];
      list.push({ sequence: op.sequence, start: a.startMinute, end: a.endMinute, key });
      byOrder.set(a.orderId, list);
    }
  }
  for (const key of expected.keys()) if (!seen.has(key)) errors.push(`MISSING_OPERATION:${key}`);
  const stationMap = new Map(model.stations.map(s => [s.id, s]));
  for (const [id, load] of stationLoads) {
    const st = stationMap.get(id);
    if (!st) errors.push(`UNKNOWN_STATION:${id}`);
    else if (load > st.availableMinutes + 1e-7) errors.push(`CAPACITY_EXCEEDED:${id}`);
  }
  for (const [id, intervals] of stationIntervals) {
    intervals.sort((a,b)=>a.start-b.start || a.end-b.end);
    for (let i=1;i<intervals.length;i++) if (intervals[i].start < intervals[i-1].end - 1e-7)
      errors.push(`STATION_OVERLAP:${id}:${intervals[i-1].key}:${intervals[i].key}`);
  }
  for (const [orderId, ops] of byOrder) {
    ops.sort((a,b)=>a.sequence-b.sequence);
    for (let i=1;i<ops.length;i++) if (ops[i].start < ops[i-1].end - 1e-7)
      errors.push(`PRECEDENCE_VIOLATION:${orderId}:${ops[i-1].key}:${ops[i].key}`);
  }
  return { valid: errors.length === 0, errors, stationLoads: Object.fromEntries(stationLoads) };
}

export async function optimizeJobshop(registry, input, options = {}) {
  let model;
  try { model = buildJobshopModel(input); }
  catch (e) { return { outcome: "HOLD", status: "INVALID", reason: e.message, code: e.code || "JOBSHOP_INVALID" }; }
  const result = await registry.invoke({
    capability: "manufacturing.jobshop.optimize",
    operation: options.operation || "solve-jobshop",
    payload: { model, solverOptions: options.solverOptions || { timeLimitSeconds: 30, deterministic: true, randomSeed: 0 } },
    requestId: options.requestId,
    preferredBackend: options.preferredBackend || "google-or-tools",
    allowFallback: options.allowFallback === true,
    executionClass: "planning",
    metadata: { modelVersion: model.modelVersion, timeUnit: model.timeUnit }
  });
  if (result.outcome !== "OK") return result;
  const checked = validateJobshopSchedule(model, result.result);
  if (!checked.valid) return {
    outcome: "HOLD", status: "INVALID", backend: result.backend,
    reason: "External solver schedule failed independent validation",
    validationErrors: checked.errors,
    evidence: { state: "PLANNED", verified: false, method: "EXTERNAL_BACKEND_REJECTED" }
  };
  return { ...result, result: { ...result.result, validation: checked } };
}

/** Worker gateway transport for a host that runs local JSON-stdin workers. */
export function createWorkerTransport({ invokeWorker, probeWorker } = {}) {
  if (typeof invokeWorker !== "function") throw new BackendContractError("WORKER_INVOKER_REQUIRED", "invokeWorker function is required");
  return {
    probe: async manifest => typeof probeWorker === "function" ? probeWorker(manifest) : { available: true },
    invoke: (manifest, request) => invokeWorker(manifest, request)
  };
}

export const BACKEND_CATALOG = catalog;


/**
 * Read-only ERPNext/Frappe REST transport. It maps external records into
 * response payloads; it never writes to ERPNext. Work-order changes are
 * returned as proposals only. Credentials remain in injected host config.
 */
export function createFrappeRestTransport({ baseUrl, apiKey, apiSecret, fetchImpl = globalThis.fetch, timeoutMs = 20_000 } = {}) {
  if (typeof fetchImpl !== "function") throw new BackendContractError("FETCH_UNAVAILABLE", "fetch implementation is required");
  let base;
  try { base = new URL(baseUrl); } catch { throw new BackendContractError("FRAPPE_URL_INVALID", "Valid Frappe baseUrl is required"); }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(base.hostname);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && loopback))
    throw new BackendContractError("FRAPPE_URL_INSECURE", "Frappe endpoint must use HTTPS except loopback development");
  if (base.username || base.password || base.hash) throw new BackendContractError("FRAPPE_URL_INVALID", "Do not embed credentials or fragments in baseUrl");
  if (typeof apiKey !== "string" || !apiKey || typeof apiSecret !== "string" || !apiSecret)
    throw new BackendContractError("FRAPPE_CREDENTIALS_REQUIRED", "Frappe API credentials must be injected by the host secret store");

  const requestJson = async (path, method = "GET", body = undefined) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(new URL(path, base).toString(), {
        method,
        headers: {
          "accept": "application/json",
          "authorization": `token ${apiKey}:${apiSecret}`,
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        redirect: "error"
      });
      if (response.status === 404) return { status: "INVALID", diagnostics: [{ code: "ERP_RECORD_NOT_FOUND", message: "Requested ERPNext record was not found" }] };
      if (response.status === 401 || response.status === 403) return { status: "FAILED", diagnostics: [{ code: "ERP_AUTHORIZATION_FAILED", message: `Frappe authorization failed (${response.status})` }] };
      if (response.status === 502 || response.status === 503 || response.status === 504) return { status: "UNAVAILABLE", diagnostics: [{ code: "ERP_UNAVAILABLE", message: `Frappe returned ${response.status}` }] };
      if (!response.ok) return { status: "FAILED", diagnostics: [{ code: "ERP_HTTP_ERROR", message: `Frappe returned ${response.status}` }] };
      const data = await response.json();
      return { status: "SUCCEEDED", data: data?.data ?? data?.message ?? data, version: response.headers?.get?.("x-frappe-version") || "UNSPECIFIED" };
    } catch (e) {
      return { status: "UNAVAILABLE", diagnostics: [{ code: e.name === "AbortError" ? "ERP_TIMEOUT" : "ERP_NETWORK_ERROR", message: e.name === "AbortError" ? `Frappe request timed out after ${timeoutMs} ms` : "Frappe endpoint could not be reached" }] };
    } finally { clearTimeout(timer); }
  };

  return {
    async probe() { return { available: true, reason: "Frappe endpoint configured; request-level health is checked on invocation" }; },
    async invoke(manifest, request) {
      const p = request.payload || {};
      if (request.operation === "propose-workorder-update") {
        if (typeof p.name !== "string" || !p.name || !isObject(p.changes))
          return { protocol: request.protocol, requestId: request.requestId, backendId: manifest.id, backendVersion: "UNSPECIFIED", status: "INVALID", diagnostics: [{ code: "PROPOSAL_INVALID", message: "name and changes object are required" }] };
        return {
          protocol: request.protocol, requestId: request.requestId, backendId: manifest.id, backendVersion: "UNSPECIFIED",
          status: "SUCCEEDED", result: { proposalOnly: true, externalWritePerformed: false, doctype: "Work Order", name: p.name, changes: p.changes },
          diagnostics: [{ code: "PROPOSAL_ONLY", message: "No ERPNext write was performed" }]
        };
      }
      let path;
      if (request.operation === "read-workorder" || request.operation === "read-bom" || request.operation === "read-quality-inspection") {
        const name = p.name;
        if (typeof name !== "string" || !name) return { protocol: request.protocol, requestId: request.requestId, backendId: manifest.id, backendVersion: "UNSPECIFIED", status: "INVALID", diagnostics: [{ code: "ERP_NAME_REQUIRED", message: "A record name is required" }] };
        const doctype = request.operation === "read-workorder" ? "Work Order" : request.operation === "read-bom" ? "BOM" : "Quality Inspection";
        path = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
      } else if (request.operation === "read-stock") {
        if (typeof p.itemCode !== "string" || !p.itemCode) return { protocol: request.protocol, requestId: request.requestId, backendId: manifest.id, backendVersion: "UNSPECIFIED", status: "INVALID", diagnostics: [{ code: "ERP_ITEM_REQUIRED", message: "itemCode is required" }] };
        const filters = [["item_code", "=", p.itemCode]];
        if (p.warehouse) filters.push(["warehouse", "=", p.warehouse]);
        const fields = ["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"];
        const query = new URLSearchParams({ filters: JSON.stringify(filters), fields: JSON.stringify(fields), limit_page_length: "500" });
        path = `/api/resource/Bin?${query.toString()}`;
      } else {
        return { protocol: request.protocol, requestId: request.requestId, backendId: manifest.id, backendVersion: "UNSPECIFIED", status: "INVALID", diagnostics: [{ code: "ERP_OPERATION_UNSUPPORTED", message: request.operation }] };
      }
      const result = await requestJson(path);
      return {
        protocol: request.protocol, requestId: request.requestId, backendId: manifest.id,
        backendVersion: result.version || "UNSPECIFIED", status: result.status,
        ...(result.status === "SUCCEEDED" ? { result: { externalSystem: "ERPNext", operation: request.operation, data: result.data, readOnly: true } } : {}),
        diagnostics: result.diagnostics || []
      };
    }
  };
}
