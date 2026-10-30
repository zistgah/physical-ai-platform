/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
/** Engine-neutral backend registry. Engines are replaceable implementations, never canonical model stores. */
const HOLD = (reason, details = {}) => ({ outcome: 'HOLD', reason, ...details });
const ID = /^[a-z][a-z0-9._-]{1,63}$/;

export function createBackendRegistry() {
  const entries = new Map();
  return Object.freeze({
    register(backend) {
      if (!backend || !ID.test(backend.id ?? '') || typeof backend.run !== 'function')
        throw new TypeError('Backend requires a valid id and run(input) function');
      if (entries.has(backend.id)) throw new Error(`Backend already registered: ${backend.id}`);
      const entry = Object.freeze({
        id: backend.id, version: String(backend.version ?? 'unversioned'),
        adapterVersion: String(backend.adapterVersion ?? '1.0.0'),
        capabilities: Object.freeze([...(backend.capabilities ?? [])]),
        license: backend.license ?? 'unspecified',
        run: backend.run
      });
      entries.set(entry.id, entry);
      return entry;
    },
    get(id) { return entries.get(id) ?? null; },
    list() { return [...entries.values()].map(({ run, ...meta }) => meta); },
    resolve({ requiredCapabilities = [], preferredIds = [] } = {}) {
      if (!Array.isArray(requiredCapabilities) || !Array.isArray(preferredIds)) throw new TypeError('capability and preference lists must be arrays');
      const candidates = [...entries.values()].filter(b => requiredCapabilities.every(c => b.capabilities.includes(c)));
      candidates.sort((a,b) => {
        const ai = preferredIds.indexOf(a.id), bi = preferredIds.indexOf(b.id);
        const ar = ai < 0 ? Number.MAX_SAFE_INTEGER : ai, br = bi < 0 ? Number.MAX_SAFE_INTEGER : bi;
        return ar - br || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
      if (!candidates.length) return null;
      const { run, ...metadata } = candidates[0]; return metadata;
    },
    async execute(id, input) {
      const backend = entries.get(id);
      if (!backend) return HOLD(`Backend is not registered: ${id}`, { backend: id });
      try {
        const result = await backend.run(input);
        if (!result || !['OK', 'HOLD'].includes(result.outcome))
          return HOLD(`Backend ${id} returned an invalid result contract`, { backend: id });
        if (result.outcome === 'OK' && (!Array.isArray(result.bodies) || !result.bodies.every(b =>
          b && typeof b.id === 'string' && ['x','y','vx','vy','angle','omega'].every(k => Number.isFinite(b[k])))))
          return HOLD(`Backend ${id} returned malformed or non-finite body state`, { backend: id });
        return { ...result, backend: { id, version: backend.version, adapterVersion: backend.adapterVersion } };
      } catch (error) {
        return HOLD(`Backend ${id} failed: ${error?.message ?? String(error)}`, { backend: id, errorType: error?.name ?? 'Error' });
      }
    }
  });
}

/**
 * JSON-RPC 2.0 adapter for native engines hosted outside JS/WASM.
 * The host owns process lifecycle and engine installation. The adapter owns
 * protocol validation, bounded timeouts, and fail-closed result validation.
 */
export function createRemoteBackend({ id, engine, version = 'host-managed', license,
  transport, timeoutMs = 30000, capabilities = [], protocolVersion = '1.0' } = {}) {
  if (!ID.test(id ?? '') || !engine || typeof engine !== 'string') throw new TypeError('id and engine are required');
  if (!transport || typeof transport.request !== 'function') throw new TypeError('transport.request(method, params, options) is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new RangeError('timeoutMs must be in [1, 300000]');
  let ready = false, requestId = 0;
  const request = async (method, params) => {
    const id = ++requestId;
    const envelope = { jsonrpc: '2.0', id, method, params };
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`Remote backend timeout after ${timeoutMs} ms`)); }, timeoutMs); });
      const response = await Promise.race([transport.request(envelope, { timeoutMs, signal: controller.signal }), timeout]);
      if (!response || response.jsonrpc !== '2.0' || response.id !== id || response.error || !Object.hasOwn(response, 'result'))
        throw new Error(response?.error?.message ?? `Invalid JSON-RPC response/id for ${method}`);
      return response.result;
    } finally { clearTimeout(timer); }
  };
  return {
    id, version, adapterVersion: '1.0.0', capabilities, license,
    async run(input) {
      if (!ready) {
        const hello = await request('simulation.backend.hello', { protocolVersion, engine });
        if (hello?.protocolVersion !== protocolVersion || hello?.engine !== engine || hello?.ready !== true)
          throw new Error('Remote engine handshake mismatch or engine not ready');
        ready = true;
      }
      const result = await request('simulation.run', { schemaVersion: '1.0', input });
      if (result?.schemaVersion !== '1.0') throw new Error('Remote result schema version mismatch');
      return result.result;
    }
  };
}
