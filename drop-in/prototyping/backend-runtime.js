/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Backend execution boundary. Engine processes live behind a trusted worker/RPC adapter. */
import { getBackend, BACKEND_PROTOCOL_VERSION, ADAPTER_VERSION } from "./backend-registry.js";
import { getBenchmarkProfile } from "./benchmark-profiles.js";

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const nonempty = v => typeof v === "string" && v.trim().length > 0;
const digest = v => typeof v === "string" && /^sha256:[a-f0-9]{64}$/i.test(v);
const artifactUri = v => typeof v === "string" && /^(artifact|cas|https|s3|gs|inline):/i.test(v);
const iso = v => typeof v === "string" && Number.isFinite(Date.parse(v));
const forbiddenKeys = new Set(["command","shell","exec","executable","binary","argv","script","__proto__","prototype","constructor"]);
function safeJson(value, seen = new Set()) {
  if (value === null || ["string","boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  const ok = Array.isArray(value)
    ? value.every(v => safeJson(v, seen))
    : Object.entries(value).every(([k,v]) => !forbiddenKeys.has(k.toLowerCase()) && safeJson(v, seen));
  seen.delete(value);
  return ok;
}
function finiteJson(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  const ok = Array.isArray(value) ? value.every(v => finiteJson(v, seen)) : Object.values(value).every(v => finiteJson(v, seen));
  seen.delete(value);
  return ok;
}
function hold(reason, missing=[]) { return {outcome:"HOLD",reason,missing}; }
function fail(reason, details={}) { return {outcome:"FAIL",reason,...details}; }

export function validateBackendExecutionRecord(r) {
  const required = ["jobId","projectId","configurationId","configurationFingerprint","revisionId","testId","backendId","backendVersion","adapterVersion","inputDigest","outputDigest","resultArtifactUri","workerRunId","environmentFingerprint","status","validationStatus","validationBenchmarkId","validationReportDigest","startedAt","completedAt"];
  if (!isObj(r)) return {ok:false,missing:["backendExecution"]};
  const missing = required.filter(k => !nonempty(r[k]));
  if (!digest(r.inputDigest)) missing.push("inputDigest:sha256");
  if (!digest(r.outputDigest)) missing.push("outputDigest:sha256");
  if (!digest(r.validationReportDigest)) missing.push("validationReportDigest:sha256");
  if (!digest(r.environmentFingerprint)) missing.push("environmentFingerprint:sha256");
  if (!artifactUri(r.resultArtifactUri)) missing.push("resultArtifactUri:approved-scheme");
  if (r.exitCode !== 0) missing.push("exitCode=0");
  if (r.status !== "COMPLETED") missing.push("status=COMPLETED");
  if (r.validationStatus !== "VERIFIED") missing.push("validationStatus=VERIFIED");
  if (!iso(r.startedAt) || !iso(r.completedAt) || (iso(r.startedAt) && iso(r.completedAt) && Date.parse(r.completedAt)<Date.parse(r.startedAt))) missing.push("valid startedAt/completedAt interval");
  const backend=getBackend(r.backendId);
  if (!backend) missing.push("registered backendId");
  const profile=getBenchmarkProfile(r.validationBenchmarkId);
  if (!profile || (backend && !profile.backends.includes(backend.id))) missing.push("registered benchmark profile compatible with backendId");
  if (!Array.isArray(r.outputArtifacts) || !r.outputArtifacts.length) missing.push("outputArtifacts");
  else if (r.outputArtifacts[0]?.uri !== r.resultArtifactUri) missing.push("resultArtifactUri matches first output artifact");
  return {ok:missing.length===0,missing:[...new Set(missing)]};
}

export function validateBackendJob(manifest, request) {
  if (!manifest) return hold("Backend is not registered",["backendId"]);
  if (!isObj(request)) return hold("Backend job must be an object",["request"]);
  const missing=[];
  for (const k of ["jobId","projectId","configurationId","configurationFingerprint","revisionId","testId","backendVersion","domain","operation","inputFormat","inputDigest"]) if (!nonempty(request[k])) missing.push(k);
  if (!digest(request.inputDigest)) missing.push("inputDigest:sha256");
  if (request.inputFormat && !manifest.inputFormats.includes(request.inputFormat)) missing.push(`inputFormat:${request.inputFormat}`);
  if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs < 1000 || request.timeoutMs > 3600000) missing.push("timeoutMs:1000..3600000");
  if (request.domain && ["cad","cfd","fea","meshing","multibody","robotics"].includes(request.domain) && !nonempty(request.coordinateFrame)) missing.push("coordinateFrame:required-for-spatial-domain");
  if (request.domain && !manifest.domains.includes(request.domain)) return hold("Backend does not support this domain",[`domain:${request.domain}`]);
  if (request.operation && !manifest.operations.includes(request.operation)) return hold("Backend does not support this operation",[`operation:${request.operation}`]);
  if (!Array.isArray(request.inputArtifacts) || !request.inputArtifacts.length) missing.push("inputArtifacts");
  else request.inputArtifacts.forEach((a,i)=>{
    if (!isObj(a) || !artifactUri(a.uri) || !digest(a.digest) || !nonempty(a.mediaType)) missing.push(`inputArtifacts[${i}]:approved-uri/digest/mediaType`);
  });
  if (!isObj(request.units) || !Object.keys(request.units).length) missing.push("units");
  if (!isObj(request.solverOptions) || !Object.keys(request.solverOptions).length) missing.push("solverOptions:non-empty-object-required");
  if (request.solverOptions && !safeJson(request.solverOptions)) missing.push("solverOptions:finite-JSON-no-executable-fields-or-cycles");
  if (request.deterministic === true && !Number.isSafeInteger(request.seed)) missing.push("seed:integer-for-deterministic-run");
  if (missing.length) return hold("Backend job preflight is incomplete or unsafe",[...new Set(missing)]);
  return {outcome:"OK",manifest};
}

/**
 * Creates an adapter without importing or vendoring any solver. `transport.execute`
 * is supplied by the host worker service and must invoke a pinned engine image or
 * installed engine binary without evaluating user-provided shell strings.
 * `validator` independently checks the numerical result against an acceptance
 * criterion/benchmark and returns VERIFIED, HOLD, or FAIL.
 */
export function createBackendAdapter({ backendId, transport, validator, adapterVersion=ADAPTER_VERSION }={}) {
  const manifest=getBackend(backendId);
  if (!manifest) throw new TypeError(`Unknown backend: ${backendId}`);
  return Object.freeze({
    manifest,
    async execute(request) {
      const preflight=validateBackendJob(manifest,request);
      if (preflight.outcome!=="OK") return preflight;
      if (!isObj(transport) || typeof transport.execute!=="function") return hold("No trusted backend worker transport is connected",["transport.execute"]);
      if (typeof validator!=="function") return hold("No independent result validator is configured",["validator"]);
      let response;
      let timer;
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      try {
        const envelope={
          protocolVersion:BACKEND_PROTOCOL_VERSION,
          job:{...request,backendId:manifest.id},
          backend:{id:manifest.id,workerProfile:manifest.workerProfile,source:manifest.source,license:manifest.license,mode:manifest.mode}
        };
        const work=Promise.resolve().then(()=>transport.execute(envelope,{signal:controller?.signal||null,timeoutMs:request.timeoutMs}));
        const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();reject(new Error(`Backend worker timed out after ${request.timeoutMs} ms`));},request.timeoutMs);});
        response=await Promise.race([work,deadline]);
      } catch (error) {
        return hold("Backend worker unavailable, timed out, or execution transport failed",[String(error?.message||error)]);
      } finally {
        if(timer)clearTimeout(timer);
      }
      if (!isObj(response)) return hold("Backend worker returned a malformed response",["response object"]);
      if (response.status==="FAILED" || (Number.isInteger(response.exitCode) && response.exitCode!==0)) {
        return fail("Backend execution failed",{backendId:manifest.id,exitCode:response.exitCode??null,diagnostics:response.diagnostics||[]});
      }
      const missing=[];
      if (response.status!=="COMPLETED") missing.push("response.status=COMPLETED");
      if (response.exitCode!==0) missing.push("response.exitCode=0");
      if (response.protocolVersion!==BACKEND_PROTOCOL_VERSION) missing.push("response.protocolVersion matches adapter protocol");
      if (response.backendId!==manifest.id) missing.push("response.backendId matches selected backend");
      if (response.operation!==request.operation) missing.push("response.operation matches request");
      if (response.inputDigest!==request.inputDigest) missing.push("response.inputDigest matches submitted input");
      if (response.backendVersion!==request.backendVersion) missing.push("response.backendVersion matches pinned version");
      if (!nonempty(response.environmentFingerprint)) missing.push("response.environmentFingerprint");
      if (!nonempty(response.runId)) missing.push("response.runId");
      if (!nonempty(response.backendVersion)) missing.push("response.backendVersion");
      if (!iso(response.startedAt)||!iso(response.completedAt)||(iso(response.startedAt)&&iso(response.completedAt)&&Date.parse(response.completedAt)<Date.parse(response.startedAt))) missing.push("response timestamps");
      if (!Array.isArray(response.outputArtifacts)||!response.outputArtifacts.length) missing.push("response.outputArtifacts");
      else response.outputArtifacts.forEach((a,i)=>{if(!isObj(a)||!artifactUri(a.uri)||!digest(a.digest)||!nonempty(a.mediaType)||!manifest.outputFormats.includes(a.format))missing.push(`outputArtifacts[${i}]:approved-uri/digest/mediaType/allowed-format`);});
      if (request.deterministic===true && (response.deterministic!==true || !nonempty(response.environmentFingerprint))) missing.push("deterministic execution/environment fingerprint");
      if (missing.length) return hold("Backend worker result is incomplete or inconsistent",missing);
      if (!finiteJson(response.metrics) || !finiteJson(response.result ?? response.metrics)) return hold("Backend metrics/result contain non-finite, cyclic, or non-JSON values",["response.metrics/result"]);
      let validation;
      try { validation=await validator({manifest,request,response}); }
      catch(error) { return hold("Independent numerical validation failed to execute",[String(error?.message||error)]); }
      if (!isObj(validation) || !["VERIFIED","HOLD","FAIL"].includes(validation.outcome)) return hold("Validator returned no recognized verdict",["validator.outcome"]);
      if (validation.outcome==="FAIL") return fail("Backend result failed independent acceptance validation",{backendId:manifest.id,benchmarkId:validation.benchmarkId||null,diagnostics:validation.diagnostics||[]});
      if (validation.outcome!=="VERIFIED") return hold("Backend result has not passed independent acceptance validation",validation.missing||["validator.outcome=VERIFIED"]);
      if (!nonempty(validation.benchmarkId)||!digest(validation.reportDigest)) return hold("Verified result lacks benchmark/report provenance",["validation.benchmarkId","validation.reportDigest:sha256"]);
      const outputDigest=response.outputDigest || (response.outputArtifacts.length===1?response.outputArtifacts[0].digest:null);
      if (!digest(outputDigest)) return hold("Backend result lacks an aggregate output digest",["response.outputDigest:sha256"]);
      const execution={
        jobId:request.jobId,projectId:request.projectId,configurationId:request.configurationId,
        configurationFingerprint:request.configurationFingerprint,revisionId:request.revisionId,testId:request.testId,
        backendId:manifest.id,backendVersion:response.backendVersion,adapterVersion,
        inputDigest:request.inputDigest,outputDigest,resultArtifactUri:response.outputArtifacts[0].uri,
        exitCode:0,status:"COMPLETED",validationStatus:"VERIFIED",validationBenchmarkId:validation.benchmarkId,
        validationReportDigest:validation.reportDigest,startedAt:response.startedAt,completedAt:response.completedAt,
        deterministic:response.deterministic===true,environmentFingerprint:response.environmentFingerprint,
        outputArtifacts:response.outputArtifacts,metrics:isObj(response.metrics)?response.metrics:{},
        workerRunId:response.runId
      };
      const checked=validateBackendExecutionRecord(execution);
      if (!checked.ok) return hold("Generated backend execution record failed its own integrity check",checked.missing);
      return {outcome:"OK",execution,result:response.result??response.metrics??{artifactCount:response.outputArtifacts.length},validation:{benchmarkId:validation.benchmarkId,reportDigest:validation.reportDigest,summary:validation.summary||null}};
    }
  });
}

/** Build a simulation evidence candidate. Host still persists it and creates graph edges. */
export function toSimulationEvidenceCandidate({run,evidenceId,configurationId,configurationFingerprint,revisionId,testId,result}={}) {
  const missing=[];
  for(const [k,v] of Object.entries({evidenceId,configurationId,configurationFingerprint,revisionId,testId})) if(!nonempty(v)) missing.push(k);
  const check=validateBackendExecutionRecord(run?.execution);
  if(!check.ok) missing.push(...check.missing.map(x=>`backendExecution.${x}`));
  if(run?.outcome!=="OK") missing.push("run.outcome=OK");
  if(run?.execution && (run.execution.configurationId!==configurationId || run.execution.configurationFingerprint!==configurationFingerprint || run.execution.revisionId!==revisionId || run.execution.testId!==testId)) missing.push("backendExecution configuration/revision/test binding mismatch");
  if(!isObj(result)||!Object.keys(result).length) missing.push("result");
  if(missing.length) return hold("Cannot construct simulation evidence from an unverified backend run",[...new Set(missing)]);
  return {outcome:"OK",evidence:{id:evidenceId,configurationId,configurationFingerprint,revisionId,testId,method:"SIMULATION",state:"EXECUTED",realization:"SIMULATED",fidelityLevel:"L4",result,backendExecution:run.execution}};
}
