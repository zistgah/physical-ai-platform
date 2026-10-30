/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * GPL-3.0-only. Optional, capability-driven adapters for external fabrication engines.
 * No backend is silently installed, trusted, or selected. The host owns process/network
 * isolation, authentication, licensing compliance, artifact storage and hardware safety.
 */
export const BACKEND_PROTOCOL = "PAI-FAB-BACKEND/1";
const isObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const nonBlank = v => typeof v === "string" && v.trim().length > 0;
const cloneJson = value => JSON.parse(JSON.stringify(value));
const timeoutError = ms => new Error(`Backend operation timed out after ${ms} ms`);

export const BUILTIN_BACKENDS = Object.freeze([
  { id:"cadquery-occt", name:"CadQuery / Open CASCADE", role:"BREP_GEOMETRY", license:"Apache-2.0 (CadQuery); LGPL-2.1 with OCCT exception (Open CASCADE; verify selected build)" , capabilities:["geometry.step.inspect","geometry.brep.validate","geometry.mesh.tessellate"], invocation:"python-worker", optional:true },
  { id:"trimesh", name:"Trimesh", role:"MESH_GEOMETRY", license:"MIT", capabilities:["geometry.mesh.inspect","geometry.mesh.validate","geometry.mesh.bounds"], invocation:"python-worker", optional:true },
  { id:"shapely", name:"Shapely / GEOS", role:"PLANAR_GEOMETRY", license:"BSD-3-Clause (Shapely); GEOS license as packaged", capabilities:["geometry.planar.validate","geometry.planar.offset","geometry.planar.boolean"], invocation:"python-worker", optional:true },
  { id:"scipy", name:"SciPy", role:"NUMERICAL_OPTIMIZATION", license:"BSD-3-Clause", capabilities:["numerics.process.optimize"], invocation:"python-worker", optional:true },
  { id:"opencamlib", name:"OpenCAMLib", role:"CAM_TOOLPATH", license:"LGPL-2.1-or-later", capabilities:["cam.drop-cutter","cam.push-cutter","cam.toolpath.3d","cam.toolpath.normalized"], invocation:"external-worker", optional:true },
  { id:"freecad-cam", name:"FreeCAD CAM Workbench", role:"CAM_AND_POSTPROCESS", license:"LGPL-2.0-or-later (verify exact distribution/build components)", capabilities:["cam.profile","cam.pocket","cam.adaptive","cam.drilling","cam.postprocess","cam.job.inspect","cam.toolpath.normalized"], invocation:"external-worker", optional:true },
  { id:"camotics", name:"CAMotics", role:"NC_SIMULATION", license:"GPL-2.0-or-later", capabilities:["simulation.gcode.3axis","simulation.stock.removal.3axis","simulation.gcode.annotate"], invocation:"external-worker", optional:true },
  { id:"cavalier-contours", name:"CavalierContours", role:"PLANAR_OFFSET", license:"MIT (verify exact source revision and bundled components)", capabilities:["geometry.planar.offset","geometry.planar.boolean"], invocation:"external-worker", optional:true }
]);

export function createBackendRegistry({ backends = BUILTIN_BACKENDS } = {}) {
  const registry = new Map();
  for (const raw of backends) {
    if (!isObject(raw) || !nonBlank(raw.id) || !Array.isArray(raw.capabilities) || !raw.capabilities.length || registry.has(raw.id))
      throw new TypeError("Backend descriptor requires a unique ID and non-empty capabilities");
    registry.set(raw.id, Object.freeze({ ...raw, capabilities:Object.freeze([...raw.capabilities]) }));
  }
  return Object.freeze({
    list: () => [...registry.values()].map(v => ({ ...v, capabilities:[...v.capabilities] })),
    get: id => registry.get(id) || null,
    find: capability => [...registry.values()].filter(v => v.capabilities.includes(capability)).map(v => ({ ...v, capabilities:[...v.capabilities] }))
  });
}

function validateBackendResult(reply, { backendId, operation }) {
  if (!isObject(reply)) return { outcome:"FAIL", reason:"Backend returned a non-object response" };
  if (reply.protocol !== BACKEND_PROTOCOL || reply.backendId !== backendId || reply.operation !== operation)
    return { outcome:"FAIL", reason:"Backend response protocol, identity or operation mismatch" };
  if (reply.status === "UNAVAILABLE") return { outcome:"HOLD", reason:reply.reason || "Backend unavailable" };
  if (reply.status === "REJECTED") return { outcome:"FAIL", reason:reply.reason || "Backend rejected the request" };
  if (reply.status !== "COMPLETED" || !isObject(reply.result)) return { outcome:"HOLD", reason:"Backend did not return a completed structured result" };
  if (!nonBlank(reply.backendVersion)) return { outcome:"HOLD", reason:"Backend version is not reported" };
  return { outcome:"PASS", result:reply.result, backendEvidence:{ backendId, backendVersion:reply.backendVersion, operation, license:reply.license || null, artifactRefs:Array.isArray(reply.artifactRefs) ? reply.artifactRefs : [] } };
}

/**
 * Execute an optional backend through a host-supplied isolated runner.
 * host.probe({protocol,backendId}) => {state:"READY",version,capabilities,license}
 * host.invoke({protocol,backendId,operation,payload,timeoutMs,signal}) => backend envelope.
 * The host must enforce sandboxing, resource limits, auth, dependency policy and artifact custody.
 */
export async function invokeFabricationBackend({ registry = createBackendRegistry(), host, backendId, capability, operation, payload, timeoutMs = 120000, signal }) {
  const backend = registry.get(backendId);
  if (!backend) return { outcome:"HOLD", reason:`Backend ${String(backendId)} is not registered` };
  if (!nonBlank(capability) || !backend.capabilities.includes(capability)) return { outcome:"HOLD", reason:`Backend ${backendId} does not declare capability ${String(capability)}` };
  if (!nonBlank(operation) || !isObject(payload)) return { outcome:"FAIL", reason:"Operation and object payload are required" };
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000) return { outcome:"FAIL", reason:"Backend timeout must be 1..3600000 ms" };
  if (!host || typeof host.probe !== "function" || typeof host.invoke !== "function") return { outcome:"HOLD", reason:"No isolated backend host is connected" };
  if (signal?.aborted) return { outcome:"HOLD", reason:"Backend request was cancelled before dispatch" };
  let probe;
  try { probe = await host.probe({ protocol:BACKEND_PROTOCOL, backendId }); }
  catch (e) { return { outcome:"HOLD", reason:`Backend probe failed: ${String(e?.message || e)}` }; }
  if (!isObject(probe) || probe.state !== "READY") return { outcome:"HOLD", reason:probe?.reason || `Backend ${backendId} is not READY` };
  if (signal?.aborted) return { outcome:"HOLD", reason:"Backend request was cancelled during capability probe" };
  if (!nonBlank(probe.version)) return { outcome:"HOLD", reason:"Backend version handshake is missing" };
  if (!Array.isArray(probe.capabilities) || !probe.capabilities.includes(capability)) return { outcome:"HOLD", reason:`Installed backend does not expose ${capability}` };
  const aborter = new AbortController();
  const relayAbort = () => aborter.abort(signal?.reason || new Error("Cancelled"));
  signal?.addEventListener("abort", relayAbort, { once:true });
  let timer;
  try {
    const call = Promise.resolve().then(() => host.invoke({ protocol:BACKEND_PROTOCOL, backendId, operation, payload:cloneJson(payload), timeoutMs, signal:aborter.signal }));
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { aborter.abort(timeoutError(timeoutMs)); reject(timeoutError(timeoutMs)); }, timeoutMs); });
    const reply = await Promise.race([call, timeout]);
    const checked = validateBackendResult(reply, { backendId, operation });
    if (checked.outcome !== "PASS") return checked;
    if (probe.version !== reply.backendVersion) return { outcome:"FAIL", reason:"Backend version changed between probe and execution" };
    return { outcome:"BACKEND_COMPLETED", backend:{ ...checked.backendEvidence, name:backend.name || backendId, role:backend.role || null, declaredLicense:backend.license || null }, result:checked.result };
  } catch (e) {
    return { outcome:"HOLD", reason:`Backend execution unconfirmed: ${String(e?.message || e)}`, abortRequested:aborter.signal.aborted };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}

/** Select first READY backend from an explicit preference order; never guesses. */
export async function resolveBackend({ registry = createBackendRegistry(), host, capability, preference = [] }) {
  if (!nonBlank(capability) || !Array.isArray(preference)) return { outcome:"FAIL", reason:"Capability and preference array are required" };
  const candidates = preference.length ? preference : registry.find(capability).map(x => x.id);
  const diagnostics = [];
  for (const id of candidates) {
    const backend = registry.get(id);
    if (!backend || !backend.capabilities.includes(capability)) { diagnostics.push({ backendId:id, state:"INCOMPATIBLE" }); continue; }
    if (!host || typeof host.probe !== "function") return { outcome:"HOLD", reason:"Backend host is not connected", diagnostics };
    try {
      const p = await host.probe({ protocol:BACKEND_PROTOCOL, backendId:id });
      diagnostics.push({ backendId:id, state:p?.state || "UNKNOWN", version:p?.version || null });
      if (p?.state === "READY" && p.version && Array.isArray(p.capabilities) && p.capabilities.includes(capability)) return { outcome:"RESOLVED", backendId:id, backend, version:p.version, diagnostics };
    } catch (e) { diagnostics.push({ backendId:id, state:"PROBE_ERROR", reason:String(e?.message || e) }); }
  }
  return { outcome:"HOLD", reason:`No installed backend satisfies ${capability}`, diagnostics };
}

/** Execute ordered backend stages while retaining each backend's provenance. */
export async function executeBackendPipeline({ registry = createBackendRegistry(), host, stages, signal }) {
  if (!Array.isArray(stages) || !stages.length) return { outcome:"FAIL", reason:"Pipeline requires at least one stage" };
  const outputs = [];
  let previous = null;
  for (let index=0; index<stages.length; index++) {
    const stage = stages[index];
    if (!isObject(stage) || !nonBlank(stage.backendId) || !nonBlank(stage.capability) || !nonBlank(stage.operation)) return { outcome:"FAIL", reason:`Malformed pipeline stage ${index}`, outputs };
    const payload = typeof stage.payload === "function" ? stage.payload(previous) : stage.payload;
    const result = await invokeFabricationBackend({ registry, host, ...stage, payload, signal });
    outputs.push({ index, backendId:stage.backendId, operation:stage.operation, outcome:result.outcome, backend:result.backend || null });
    if (result.outcome !== "BACKEND_COMPLETED") return { outcome:result.outcome, reason:result.reason || `Pipeline stage ${index} did not complete`, outputs };
    previous = result.result;
  }
  return { outcome:"PIPELINE_COMPLETED", result:previous, outputs };
}

/**
 * Ask an external CAM backend for a platform-normalized PAI-FAB-TOOLPATH/2.1,
 * then independently validate it against the canonical job and local interpreters.
 * The external backend must return {toolpath}; arbitrary G-code is not accepted here.
 */
export async function planFabricationWithBackend({ job, host, backendId, capability, operation, payload, registry = createBackendRegistry(), timeoutMs = 120000, signal }) {
  if (!isObject(job)) return { outcome:"FAIL", reason:"Canonical fabrication job is required" };
  const { validateExternalToolpath } = await import('../module.js');
  const invoked = await invokeFabricationBackend({ registry, host, backendId, capability, operation, payload, timeoutMs, signal });
  if (invoked.outcome !== "BACKEND_COMPLETED") return invoked;
  if (!isObject(invoked.result.toolpath)) return { outcome:"HOLD", reason:"CAM backend did not return a normalized PAI-FAB-TOOLPATH/2.1 artifact", backend:invoked.backend };
  const checked = validateExternalToolpath(job, invoked.result.toolpath);
  if (checked.outcome !== "PLANNED") return { ...checked, backend:invoked.backend };
  return { ...checked, backendEvidence:invoked.backend, planning:{...checked.planning, backendId, backendVersion:invoked.backend.backendVersion, backendOperation:operation} };
}
