/* Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
 * SPDX-License-Identifier: GPL-3.0-only
 * AyeAI Physical AI Platform - distributed compute orchestration drop-in.
 * This package plans and validates execution. It never mutates the canonical graph,
 * grants authority, promotes evidence, or actuates physical equipment.
 */

export const COMPUTE_PROTOCOL = "ayeai.compute.job/v1";
export const COMPUTE_STATES = Object.freeze([
  "PLANNED", "SUBMITTED", "RUNNING", "SUCCEEDED", "FAILED", "UNAVAILABLE", "CANCELLED"
]);
export const COMPUTE_TRANSITIONS = Object.freeze({
  PLANNED: ["SUBMITTED", "CANCELLED", "UNAVAILABLE"],
  SUBMITTED: ["RUNNING", "FAILED", "UNAVAILABLE", "CANCELLED"],
  RUNNING: ["SUCCEEDED", "FAILED", "UNAVAILABLE", "CANCELLED"],
  SUCCEEDED: [], FAILED: [], UNAVAILABLE: [], CANCELLED: []
});

export class ComputeContractError extends Error {
  constructor(code, message) { super(message); this.name = "ComputeContractError"; this.code = code; }
}

const isObject = x => x !== null && typeof x === "object" && !Array.isArray(x);
const finite = x => typeof x === "number" && Number.isFinite(x);
const nonempty = x => typeof x === "string" && x.trim().length > 0;
const sha256 = x => typeof x === "string" && /^[a-f0-9]{64}$/i.test(x);

function assertJsonSafe(value, path="$", seen=new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ComputeContractError("NON_FINITE_NUMBER", `${path} must be finite`);
    return;
  }
  if (typeof value !== "object") throw new ComputeContractError("NON_JSON_VALUE", `${path} is not JSON-safe`);
  if (seen.has(value)) throw new ComputeContractError("CYCLIC_VALUE", `${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((v,i)=>assertJsonSafe(v,`${path}[${i}]`,seen));
  else {
    const proto=Object.getPrototypeOf(value);
    if (proto!==Object.prototype && proto!==null) throw new ComputeContractError("NON_PLAIN_OBJECT", `${path} must be a plain object`);
    for (const [k,v] of Object.entries(value)) assertJsonSafe(v,`${path}.${k}`,seen);
  }
  seen.delete(value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stableJson(value[k])).join(",")}}`;
  return JSON.stringify(value);
}

/** Validate a versioned compute job without executing it or mutating platform state. */
export function validateComputeJob(job, {maxPayloadBytes=5_000_000}={}) {
  const errors=[];
  if (!isObject(job)) return {valid:false,errors:["JOB_NOT_OBJECT"]};
  if (job.protocol!==COMPUTE_PROTOCOL) errors.push("PROTOCOL_UNSUPPORTED");
  if (!nonempty(job.jobId)) errors.push("JOB_ID_REQUIRED");
  if (!nonempty(job.capability)) errors.push("CAPABILITY_REQUIRED");
  if (!["analysis","simulation","optimization","verification"].includes(job.executionClass)) errors.push("EXECUTION_CLASS_INVALID");
  if (!sha256(job.inputDigest)) errors.push("INPUT_DIGEST_INVALID");
  if (!isObject(job.payload)) errors.push("PAYLOAD_INVALID");
  if (!isObject(job.resourceRequirements)) errors.push("RESOURCE_REQUIREMENTS_INVALID");
  else {
    const r=job.resourceRequirements;
    if (!["none","preferred","required"].includes(r.accelerator)) errors.push("ACCELERATOR_POLICY_INVALID");
    if (r.minMemoryGiB!==undefined && (!finite(r.minMemoryGiB)||r.minMemoryGiB<0)) errors.push("MEMORY_REQUIREMENT_INVALID");
    if (r.maxRuntimeSeconds!==undefined && (!finite(r.maxRuntimeSeconds)||r.maxRuntimeSeconds<=0)) errors.push("RUNTIME_LIMIT_INVALID");
  }
  if (!isObject(job.provenance)) errors.push("PROVENANCE_REQUIRED");
  else {
    if (!nonempty(job.provenance.sourceRef)) errors.push("SOURCE_REF_REQUIRED");
    if (!nonempty(job.provenance.configurationRef)) errors.push("CONFIGURATION_REF_REQUIRED");
  }
  try {
    assertJsonSafe(job);
    const bytes=new TextEncoder().encode(stableJson(job.payload)).length;
    if (bytes>maxPayloadBytes) errors.push("PAYLOAD_TOO_LARGE");
  } catch(e) { errors.push(e.code || "PAYLOAD_NOT_JSON_SAFE"); }
  return {valid:errors.length===0,errors};
}

/** Registry of replaceable compute providers. Provider declarations are not availability evidence. */
export class ComputeProviderRegistry {
  constructor({providers=[],enabled=[],maxPayloadBytes=5_000_000}={}) {
    this.providers=new Map(); this.enabled=new Set(enabled); this.maxPayloadBytes=maxPayloadBytes;
    for (const p of providers) this.register(p);
    for (const id of enabled) if (!this.providers.has(id)) throw new ComputeContractError("PROVIDER_UNKNOWN",`Unknown enabled provider: ${id}`);
  }
  register(provider) {
    if (!isObject(provider)||!nonempty(provider.id)||!nonempty(provider.version)||!Array.isArray(provider.capabilities)||!provider.capabilities.length)
      throw new ComputeContractError("PROVIDER_MANIFEST_INVALID","Provider id, version and capabilities are required");
    if (this.providers.has(provider.id)) throw new ComputeContractError("PROVIDER_DUPLICATE",`Duplicate provider: ${provider.id}`);
    if (!["browser-worker","colab-manual","https-json"].includes(provider.transport))
      throw new ComputeContractError("PROVIDER_TRANSPORT_INVALID","Unsupported provider transport");
    if (!Array.isArray(provider.accelerators)||provider.accelerators.length===0||provider.accelerators.some(x=>!["cpu","gpu","tpu"].includes(x)))
      throw new ComputeContractError("PROVIDER_ACCELERATOR_INVALID","Provider accelerators must be cpu, gpu or tpu");
    if (provider.memoryGiB!==undefined && (!finite(provider.memoryGiB)||provider.memoryGiB<0))
      throw new ComputeContractError("PROVIDER_MEMORY_INVALID","Provider memoryGiB must be finite and non-negative");
    if (provider.maxRuntimeSeconds!==undefined && (!finite(provider.maxRuntimeSeconds)||provider.maxRuntimeSeconds<=0))
      throw new ComputeContractError("PROVIDER_RUNTIME_INVALID","Provider maxRuntimeSeconds must be positive and finite");
    this.providers.set(provider.id,Object.freeze({...provider,capabilities:[...provider.capabilities],accelerators:[...provider.accelerators]}));
  }
  enable(id) { if(!this.providers.has(id)) throw new ComputeContractError("PROVIDER_UNKNOWN",`Unknown provider: ${id}`); this.enabled.add(id); }
  disable(id) { this.enabled.delete(id); }
  list() { return [...this.providers.values()].map(p=>({...p,enabled:this.enabled.has(p.id)})); }
  /** Deterministic discovery. Missing health is UNKNOWN, never AVAILABLE. */
  discover(health={}) {
    return [...this.providers.values()].map(p=>({
      id:p.id,enabled:this.enabled.has(p.id),
      status:!this.enabled.has(p.id)?"DISABLED":health[p.id]==="AVAILABLE"?"AVAILABLE":health[p.id]==="UNAVAILABLE"?"UNAVAILABLE":"UNKNOWN",
      capabilities:[...p.capabilities],accelerators:[...p.accelerators]
    }));
  }
  /** Selects a provider; no silent fallback from FAILED, UNKNOWN or INFEASIBLE. */
  plan(job, {health={},preferredProvider=null,allowFallback=false}={}) {
    const checked=validateComputeJob(job,{maxPayloadBytes:this.maxPayloadBytes});
    if(!checked.valid) return {outcome:"HOLD",status:"INVALID",errors:checked.errors};
    const candidates=[...this.providers.values()].filter(p=>this.enabled.has(p.id)&&p.capabilities.includes(job.capability));
    if(!candidates.length) return {outcome:"HOLD",status:"UNAVAILABLE",code:"NO_PROVIDER_FOR_CAPABILITY"};
    const preferredCandidate=preferredProvider?candidates.find(p=>p.id===preferredProvider):null;
    if(preferredProvider&&!preferredCandidate&&!allowFallback)
      return {outcome:"HOLD",status:"UNAVAILABLE",code:"PREFERRED_PROVIDER_NOT_REGISTERED"};
    const ordered=preferredCandidate?[preferredCandidate,...candidates.filter(p=>p.id!==preferredCandidate.id)]:candidates;
    const acceleratorPolicy=job.resourceRequirements.accelerator;
    let sawUnknown=false;
    for(const provider of ordered){
      const state=health[provider.id]??"UNKNOWN";
      if(state==="UNKNOWN"){sawUnknown=true;if(provider.id===preferredProvider&&!allowFallback) return {outcome:"HOLD",status:"UNKNOWN",code:"PREFERRED_PROVIDER_HEALTH_UNKNOWN"};continue;}
      if(state!=="AVAILABLE"){if(provider.id===preferredProvider&&!allowFallback) return {outcome:"HOLD",status:"UNAVAILABLE",code:"PREFERRED_PROVIDER_UNAVAILABLE"};continue;}
      let resourceUnknown=false,resourceMismatch=false;
      const req=job.resourceRequirements;
      if(req.minMemoryGiB!==undefined){
        if(provider.memoryGiB===undefined)resourceUnknown=true;
        else if(provider.memoryGiB<req.minMemoryGiB)resourceMismatch=true;
      }
      if(req.maxRuntimeSeconds!==undefined){
        if(provider.maxRuntimeSeconds===undefined)resourceUnknown=true;
        else if(provider.maxRuntimeSeconds<req.maxRuntimeSeconds)resourceMismatch=true;
      }
      if(resourceUnknown){sawUnknown=true;if(provider.id===preferredProvider&&!allowFallback)return {outcome:"HOLD",status:"UNKNOWN",code:"PROVIDER_RESOURCE_CAPACITY_UNKNOWN"};continue;}
      if(resourceMismatch)continue;
      const hasAccelerator=provider.accelerators.includes("gpu")||provider.accelerators.includes("tpu");
      if(acceleratorPolicy==="required"&&!hasAccelerator)continue;
      if(acceleratorPolicy==="preferred"&&!hasAccelerator&&!allowFallback)continue;
      if(preferredProvider&&provider.id!==preferredProvider&&!allowFallback)continue;
      const accelerator=provider.accelerators.includes("gpu")?"gpu":provider.accelerators.includes("tpu")?"tpu":"cpu";
      return {outcome:"PLANNED",status:"PLANNED",jobId:job.jobId,providerId:provider.id,
        providerVersion:provider.version,transport:provider.transport,accelerator,
        executionClass:job.executionClass,evidenceState:job.executionClass==="simulation"?"SIMULATED":"PLANNED",
        inputDigest:job.inputDigest,canonicalRefs:{...job.provenance},sideEffects:false};
    }
    return {outcome:"HOLD",status:sawUnknown?"UNKNOWN":"UNAVAILABLE",
      code:acceleratorPolicy==="required"?"REQUIRED_ACCELERATOR_UNAVAILABLE":"NO_PROVIDER_SATISFIES_RESOURCES",
      diagnostics:["No enabled, available provider satisfies capability, accelerator and resource constraints."]};
  }
}

/** Validate a returned result against the original request and provider. */
export function validateComputeResult(job, result, providerId) {
  const errors=[];
  if (!isObject(result)) return {valid:false,errors:["RESULT_NOT_OBJECT"]};
  if (result.protocol!==COMPUTE_PROTOCOL) errors.push("RESULT_PROTOCOL_MISMATCH");
  if (result.jobId!==job?.jobId) errors.push("JOB_ID_MISMATCH");
  if (result.inputDigest!==job?.inputDigest) errors.push("INPUT_DIGEST_MISMATCH");
  if (result.providerId!==providerId) errors.push("PROVIDER_ID_MISMATCH");
  if (!nonempty(result.providerVersion)) errors.push("PROVIDER_VERSION_REQUIRED");
  if (result.status!=="SUCCEEDED") errors.push("RESULT_NOT_SUCCEEDED");
  if (!sha256(result.outputDigest)) errors.push("OUTPUT_DIGEST_INVALID");
  if (!isObject(result.result)) errors.push("RESULT_PAYLOAD_INVALID");
  if (result.evidenceState!==(job?.executionClass==="simulation"?"SIMULATED":"PLANNED")) errors.push("EVIDENCE_STATE_INVALID");
  if (result.evidenceState==="VERIFIED"||result.evidenceState==="PHYSICAL_VERIFIED") errors.push("UNAUTHORIZED_EVIDENCE_PROMOTION");
  try { assertJsonSafe(result); } catch(e) { errors.push(e.code||"RESULT_NOT_JSON_SAFE"); }
  return {valid:errors.length===0,errors};
}

/** Enforce a monotonic, terminal-aware remote job state machine. */
export function transitionComputeState(current,next) {
  if (!COMPUTE_STATES.includes(current)||!COMPUTE_STATES.includes(next))
    throw new ComputeContractError("STATE_INVALID","Unknown compute job state");
  if (!COMPUTE_TRANSITIONS[current].includes(next))
    throw new ComputeContractError("STATE_TRANSITION_INVALID",`${current} cannot transition to ${next}`);
  return {previous:current,current:next,terminal:COMPUTE_TRANSITIONS[next].length===0};
}

/** Build a Colab launch URL only when a real repository coordinate is supplied. */
export function createColabLaunchDescriptor({owner,repository,branch="main",notebookPath,uploadUrl="https://colab.research.google.com/#create=true"}={}) {
  if (!nonempty(notebookPath)) throw new ComputeContractError("NOTEBOOK_PATH_REQUIRED","notebookPath is required");
  if (owner&&repository) {
    for (const part of [owner,repository,branch,notebookPath]) if (!nonempty(part)||part.includes("..")||part.startsWith("/"))
      throw new ComputeContractError("REPOSITORY_COORDINATE_INVALID","Invalid GitHub notebook coordinate");
    const path=notebookPath.split("/").map(encodeURIComponent).join("/");
    return {mode:"github",url:`https://colab.research.google.com/github/${owner}/${repository}/blob/${branch}/${path}`,
      notebookPath,requiresPublishedRepository:true};
  }
  return {mode:"upload",url:uploadUrl,notebookPath,requiresNotebookUpload:true};
}

/** Return a canonical graph adapter payload; caller decides whether and how to persist it. */
export function toCanonicalComputeArtifact(job, plan, resultValidation, result=null) {
  if (!job||!plan||plan.outcome!=="PLANNED"||!resultValidation?.valid)
    return {outcome:"HOLD",status:"INVALID",reason:"A valid plan and validated result are required"};
  return {outcome:"PROPOSAL",artifact:{
    type:"ComputeExecutionArtifact",id:job.jobId,capability:job.capability,
    executionClass:job.executionClass,providerId:plan.providerId,providerVersion:plan.providerVersion,
    inputDigest:job.inputDigest,outputDigest:result.outputDigest,
    evidenceState:result.evidenceState,sourceRef:job.provenance.sourceRef,
    configurationRef:job.provenance.configurationRef,diagnostics:result.diagnostics||[],
    canonicalMutationPerformed:false,authorityGranted:false,physicalActuation:false
  }};
}

/** Compute a SHA-256 digest of a JSON value using the browser Web Crypto API. */
export async function digestJson(value, subtle=globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.digest!=="function")
    throw new ComputeContractError("WEBCRYPTO_UNAVAILABLE","A Web Crypto SHA-256 implementation is required");
  assertJsonSafe(value);
  const bytes=new TextEncoder().encode(stableJson(value));
  const digest=await subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

/** Verify that the request digest binds to its payload before execution. */
export async function verifyComputeInputDigest(job, subtle=globalThis.crypto?.subtle) {
  if (!job || !isObject(job.payload) || !sha256(job.inputDigest))
    return {valid:false,code:"INPUT_DIGEST_INVALID"};
  const actual=await digestJson(job.payload,subtle);
  return {valid:actual.toLowerCase()===job.inputDigest.toLowerCase(),expected:job.inputDigest,actual};
}

/** Verify output digest before accepting a remote result into the digital thread. */
export async function verifyComputeOutputDigest(result, subtle=globalThis.crypto?.subtle) {
  if (!result || !isObject(result.result) || !sha256(result.outputDigest))
    return {valid:false,code:"OUTPUT_DIGEST_INVALID"};
  const actual=await digestJson(result.result,subtle);
  return {valid:actual.toLowerCase()===result.outputDigest.toLowerCase(),expected:result.outputDigest,actual};
}


/**
 * Create a browser Web Worker transport. The worker URL must be a same-origin
 * or explicitly permitted CORS URL supplied by the host application.
 * No eval, inline code, shell, or implicit provider fallback is used.
 */
export function createBrowserWorkerTransport({workerUrl,workerFactory=(url)=>new Worker(url,{type:"module"}),timeoutMs=120_000}={}) {
  if (!nonempty(workerUrl) || typeof workerFactory!=="function" || !finite(timeoutMs) || timeoutMs<=0)
    throw new ComputeContractError("BROWSER_WORKER_CONFIG_INVALID","workerUrl, workerFactory and positive timeoutMs are required");
  return {
    invoke(provider,job) {
      return new Promise((resolve,reject)=>{
        let worker;
        let settled=false;
        const finish=(error,value)=>{
          if(settled)return; settled=true;
          clearTimeout(timer);
          try{worker?.terminate?.();}catch{}
          if(error)reject(error);else resolve(value);
        };
        const timer=setTimeout(()=>finish(new ComputeContractError("BROWSER_WORKER_TIMEOUT",`Worker exceeded ${timeoutMs} ms`)),timeoutMs);
        try {
          worker=workerFactory(workerUrl);
          worker.onmessage=(event)=>finish(null,event.data);
          worker.onerror=(event)=>finish(new ComputeContractError("BROWSER_WORKER_FAILED",event.message||"Browser worker failed"));
          worker.postMessage({protocol:COMPUTE_PROTOCOL,providerId:provider.id,job});
        } catch(e){finish(e);}
      });
    }
  };
}

/**
 * HTTPS JSON transport for a separately deployed worker.
 * Endpoints and secret headers are injected by the host; credentials never
 * enter manifests, job payloads, or returned diagnostics.
 */
export function createHttpsJsonTransport({endpoints={},headers={},fetchImpl=globalThis.fetch,timeoutMs=30_000,maxResponseBytes=10_000_000}={}) {
  if(typeof fetchImpl!=="function") throw new ComputeContractError("FETCH_UNAVAILABLE","fetch implementation is required");
  const endpointMap=new Map();
  for(const [id,value] of Object.entries(endpoints)){
    let url;
    try{url=new URL(value);}catch{throw new ComputeContractError("ENDPOINT_INVALID",`Invalid endpoint for ${id}`);}
    const loopback=["localhost","127.0.0.1","::1"].includes(url.hostname);
    if(url.protocol!=="https:"&&!(url.protocol==="http:"&&loopback))
      throw new ComputeContractError("ENDPOINT_INSECURE",`Endpoint for ${id} must use HTTPS except loopback development`);
    if(url.username||url.password||url.hash) throw new ComputeContractError("ENDPOINT_INVALID","Credentials and fragments are forbidden in endpoint URLs");
    endpointMap.set(id,url.toString());
  }
  if(!finite(timeoutMs)||timeoutMs<=0||!Number.isInteger(maxResponseBytes)||maxResponseBytes<=0)
    throw new ComputeContractError("TRANSPORT_LIMIT_INVALID","Positive timeout and response limit are required");
  return {
    async invoke(provider,job){
      const endpoint=endpointMap.get(provider.id);
      if(!endpoint) return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"UNAVAILABLE",diagnostics:[{code:"ENDPOINT_NOT_CONFIGURED"}]};
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=await fetchImpl(endpoint,{
          method:"POST",headers:{"accept":"application/json","content-type":"application/json",...(headers[provider.id]||{})},
          body:JSON.stringify({protocol:COMPUTE_PROTOCOL,job}),signal:controller.signal,redirect:"error"
        });
        const declared=Number(response.headers?.get?.("content-length")||0);
        if(declared>maxResponseBytes) return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"FAILED",diagnostics:[{code:"RESPONSE_TOO_LARGE"}]};
        const body=await response.text();
        if(new TextEncoder().encode(body).length>maxResponseBytes)
          return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"FAILED",diagnostics:[{code:"RESPONSE_TOO_LARGE"}]};
        if(!response.ok) return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:response.status>=500?"UNAVAILABLE":"FAILED",
          diagnostics:[{code:"REMOTE_HTTP_ERROR",message:`Remote worker returned HTTP ${response.status}`} ]};
        let parsed;
        try{parsed=JSON.parse(body);}catch{return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"FAILED",diagnostics:[{code:"RESPONSE_JSON_INVALID"}]};}
        if(parsed.protocol!==COMPUTE_PROTOCOL||parsed.jobId!==job.jobId)
          return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"FAILED",diagnostics:[{code:"RESPONSE_CORRELATION_INVALID"}]};
        return parsed;
      }catch(e){
        return {protocol:COMPUTE_PROTOCOL,jobId:job.jobId,status:"UNAVAILABLE",
          diagnostics:[{code:e.name==="AbortError"?"REMOTE_TIMEOUT":"REMOTE_NETWORK_ERROR"}]};
      }finally{clearTimeout(timer);}
    }
  };
}
