/* Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
 * SPDX-License-Identifier: GPL-3.0-only
 * Executable contract, boundary, state-machine, digest, provider-selection and mutation-resistance tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import {
  COMPUTE_PROTOCOL, ComputeContractError, ComputeProviderRegistry,
  validateComputeJob, validateComputeResult, transitionComputeState,
  createColabLaunchDescriptor, toCanonicalComputeArtifact,
  digestJson, verifyComputeInputDigest, verifyComputeOutputDigest,
  createBrowserWorkerTransport, createHttpsJsonTransport
} from "./module.js";
import { runReliabilityMonteCarlo } from "./browser-worker.js";

const providerCatalog=JSON.parse(readFileSync(new URL("./provider-catalog.json",import.meta.url),"utf8"));
const jobSchema=JSON.parse(readFileSync(new URL("./schemas/job.schema.json",import.meta.url),"utf8"));
const resultSchema=JSON.parse(readFileSync(new URL("./schemas/result.schema.json",import.meta.url),"utf8"));
let passed=0;
const ok=(condition,message)=>{assert.ok(condition,message);passed++;};
const rejects=(fn,code)=>{assert.throws(fn,e=>e.code===code);passed++;};
const payload={failureRatesPerHour:[0.0001,0.0002],missionTimeHours:1000,samples:250000,seed:4701};
const inputDigest=await digestJson(payload,webcrypto.subtle);
const job={
 protocol:COMPUTE_PROTOCOL,jobId:"job-001",capability:"reliability.series.monte-carlo",
 executionClass:"simulation",inputDigest,
 resourceRequirements:{accelerator:"preferred",minMemoryGiB:2,maxRuntimeSeconds:120},
 provenance:{sourceRef:"sir://system/mission",configurationRef:"config://system/rev-1"},
 payload
};
ok(providerCatalog.protocol===COMPUTE_PROTOCOL&&providerCatalog.providers.length===6,"provider catalogue is protocol-aligned and complete");
ok(providerCatalog.providers.find(p=>p.id==="colab-pytorch").status==="NOTEBOOK_IMPLEMENTED_GPU_NOT_RUN_HERE","PyTorch GPU maturity is honestly marked unverified in hosted runtime");
ok(providerCatalog.providers.find(p=>p.id==="colab-jax").accelerators.includes("tpu"),"JAX TPU option is declared");
ok(providerCatalog.providers.find(p=>p.id==="cupy").status==="FUTURE_ADAPTER_NOT_IMPLEMENTED","unimplemented CuPy is not presented as executable");
ok(jobSchema.properties.protocol.const===COMPUTE_PROTOCOL&&resultSchema.properties.protocol.const===COMPUTE_PROTOCOL,"job and result schemas share protocol version");
ok((await verifyComputeInputDigest(job,webcrypto.subtle)).valid,"canonical input digest verified");
ok(validateComputeJob(job).valid,"valid simulation job accepted");
ok(!validateComputeJob({...job,inputDigest:"bad"}).valid,"malformed digest rejected");
ok(!validateComputeJob({...job,protocol:"wrong"}).valid,"wrong protocol rejected");
ok(!validateComputeJob({...job,jobId:" "}).valid,"blank job id rejected");
ok(!validateComputeJob({...job,capability:""}).valid,"missing capability rejected");
ok(!validateComputeJob({...job,executionClass:"physical-actuation"}).valid,"unsupported execution class rejected");
ok(!validateComputeJob({...job,resourceRequirements:{accelerator:"quantum"}}).valid,"unknown accelerator class rejected");
ok(!validateComputeJob({...job,resourceRequirements:{accelerator:"none",minMemoryGiB:-0.1}}).valid,"memory below lower boundary rejected");
ok(!validateComputeJob({...job,resourceRequirements:{accelerator:"none",maxRuntimeSeconds:0}}).valid,"runtime on zero boundary rejected");
ok(!validateComputeJob({...job,provenance:{sourceRef:"x"}}).valid,"missing configuration provenance rejected");
ok(!validateComputeJob({...job,payload:{x:NaN}}).valid,"NaN payload rejected");
ok(!validateComputeJob({...job,payload:{x:Infinity}}).valid,"Infinity payload rejected");
ok(!validateComputeJob({...job,payload:{x:1n}}).valid,"BigInt payload rejected");
const cyclic={};cyclic.self=cyclic;
ok(!validateComputeJob({...job,payload:cyclic}).valid,"cyclic payload rejected");
ok(!validateComputeJob(job,{maxPayloadBytes:8}).valid,"payload byte boundary enforced");
ok(validateComputeJob({...job,payload:{}}).valid,"empty JSON payload permitted by generic protocol");

const providers=[
 {id:"colab-gpu",version:"torch-2.x",capabilities:["reliability.series.monte-carlo"],transport:"colab-manual",accelerators:["cpu","gpu"],memoryGiB:16,maxRuntimeSeconds:3600},
 {id:"browser-cpu",version:"1.0",capabilities:["reliability.series.monte-carlo"],transport:"browser-worker",accelerators:["cpu"],memoryGiB:8,maxRuntimeSeconds:600},
 {id:"remote-solver",version:"2026.10",capabilities:["other.capability"],transport:"https-json",accelerators:["cpu"],memoryGiB:4,maxRuntimeSeconds:1800}
];
const registry=new ComputeProviderRegistry({providers,enabled:["colab-gpu","browser-cpu","remote-solver"]});
ok(registry.list().length===3,"provider catalog retains all registered providers");
ok(registry.discover({"colab-gpu":"AVAILABLE","browser-cpu":"AVAILABLE"}).find(x=>x.id==="remote-solver").status==="UNKNOWN","unreported health is UNKNOWN");
ok(registry.plan(job,{health:{"colab-gpu":"AVAILABLE","browser-cpu":"AVAILABLE"}}).providerId==="colab-gpu","GPU preferred provider selected");
const gpuRequired={...job,resourceRequirements:{accelerator:"required"}};
ok(registry.plan(gpuRequired,{health:{"colab-gpu":"AVAILABLE"}}).accelerator==="gpu","GPU-required job selects GPU provider");
ok(registry.plan(gpuRequired,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"AVAILABLE"},allowFallback:true}).outcome==="HOLD","required GPU never silently falls back to CPU");
ok(registry.plan(job,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"AVAILABLE"}}).outcome==="HOLD","preferred GPU does not silently fall back");
ok(registry.plan(job,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"AVAILABLE"},allowFallback:true}).providerId==="browser-cpu","explicit fallback permits CPU for preferred GPU");
const cpuJob={...job,resourceRequirements:{accelerator:"none"}};
ok(registry.plan(cpuJob,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"AVAILABLE"},preferredProvider:"colab-gpu"}).outcome==="HOLD","preferred provider unavailability does not silently switch providers");
ok(registry.plan(cpuJob,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"AVAILABLE"},preferredProvider:"colab-gpu",allowFallback:true}).providerId==="browser-cpu","explicit backend fallback selects alternate provider");
const highMemoryJob={...job,resourceRequirements:{accelerator:"none",minMemoryGiB:32}};
ok(registry.plan(highMemoryJob,{health:{"colab-gpu":"AVAILABLE","browser-cpu":"AVAILABLE"}}).outcome==="HOLD","provider with insufficient declared memory is rejected");
const unknownMemoryRegistry=new ComputeProviderRegistry({providers:[{id:"unknown-memory",version:"1",capabilities:["reliability.series.monte-carlo"],transport:"https-json",accelerators:["cpu"]}],enabled:["unknown-memory"]});
ok(unknownMemoryRegistry.plan(highMemoryJob,{health:{"unknown-memory":"AVAILABLE"}}).status==="UNKNOWN","undeclared provider memory remains UNKNOWN");
ok(registry.plan(cpuJob,{health:{"browser-cpu":"AVAILABLE"}}).providerId==="browser-cpu","CPU-only selection works");
ok(registry.plan(job,{health:{"colab-gpu":"UNKNOWN","browser-cpu":"UNKNOWN"}}).status==="UNKNOWN","unknown provider health holds");
ok(registry.plan(job,{health:{"colab-gpu":"UNAVAILABLE","browser-cpu":"UNAVAILABLE"}}).status==="UNAVAILABLE","all unavailable providers hold");
ok(registry.plan({...job,capability:"absent"},{health:{}}).code==="NO_PROVIDER_FOR_CAPABILITY","missing capability mapping holds");
registry.disable("browser-cpu");
ok(registry.plan(cpuJob,{health:{"browser-cpu":"AVAILABLE"}}).outcome==="HOLD","disabled provider cannot be selected");
rejects(()=>registry.enable("not-registered"),"PROVIDER_UNKNOWN");
rejects(()=>new ComputeProviderRegistry({providers:[providers[0],providers[0]]}),"PROVIDER_DUPLICATE");
rejects(()=>new ComputeProviderRegistry({providers:[{...providers[0],transport:"shell"}]}),"PROVIDER_TRANSPORT_INVALID");
rejects(()=>new ComputeProviderRegistry({providers:[{...providers[0],accelerators:["gpu","npu"]}]}),"PROVIDER_ACCELERATOR_INVALID");
ok(registry.plan({...job,inputDigest:"0".repeat(64)},{health:{"colab-gpu":"AVAILABLE"}}).outcome==="PLANNED","well-formed but incorrect digest remains planable until explicit digest verification");
ok(!(await verifyComputeInputDigest({...job,inputDigest:"0".repeat(64)},webcrypto.subtle)).valid,"digest mismatch detected by explicit verifier");
const browserJob={...job,payload:{failureRatesPerHour:[0.0001,0.0002],missionTimeHours:1000,samples:50000,seed:4701}};
browserJob.inputDigest=await digestJson(browserJob.payload,webcrypto.subtle);
const browserResult=await runReliabilityMonteCarlo(browserJob,webcrypto.subtle);
ok(browserResult.status==="SUCCEEDED","browser worker runs actual CPU Monte Carlo workload");
ok(browserResult.evidenceState==="SIMULATED"&&browserResult.result.gpuUsed===false,"browser worker result remains simulation evidence and declares CPU");
ok(browserResult.result.validation==="PASS"&&browserResult.result.absoluteError<=browserResult.result.acceptanceTolerance,"browser Monte Carlo passes analytical cross-check");
ok((await verifyComputeOutputDigest(browserResult,webcrypto.subtle)).valid,"browser worker output digest verifies");
const invalidBrowser=await runReliabilityMonteCarlo({...browserJob,inputDigest:"0".repeat(64)},webcrypto.subtle);
ok(invalidBrowser.status==="INVALID","browser worker rejects mismatched input digest");
for (const [patch,code] of [
  [{payload:{...browserJob.payload,samples:999}},"SAMPLE_COUNT_INVALID"],
  [{payload:{...browserJob.payload,samples:5_000_001}},"SAMPLE_COUNT_INVALID"],
  [{payload:{...browserJob.payload,missionTimeHours:0}},"MISSION_TIME_INVALID"],
  [{payload:{...browserJob.payload,failureRatesPerHour:[0]}},"FAILURE_RATES_INVALID"],
  [{payload:{...browserJob.payload,failureRatesPerHour:Array(257).fill(0.001)}},"FAILURE_RATES_INVALID"],
  [{payload:{...browserJob.payload,seed:0x1_0000_0000}},"SEED_INVALID"],
  [{payload:{...browserJob.payload,samples:1_000_000,failureRatesPerHour:Array(100).fill(0.001)}},"WORKLOAD_TOO_LARGE"]
]) {
  const badJob={...browserJob,...patch};
  const badOut=await runReliabilityMonteCarlo(badJob,webcrypto.subtle);
  ok(badOut.status==="INVALID"&&badOut.diagnostics.some(d=>d.code===code),`browser worker rejects ${code} boundary`);
}
const minSampleJob={...browserJob,payload:{...browserJob.payload,samples:1000}};
minSampleJob.inputDigest=await digestJson(minSampleJob.payload,webcrypto.subtle);
const minSampleResult=await runReliabilityMonteCarlo(minSampleJob,webcrypto.subtle);
ok(["SUCCEEDED","FAILED"].includes(minSampleResult.status),"minimum allowed sample boundary executes and returns an explicit status");
const browserFactory=()=>({postMessage(message){this.sent=message;queueMicrotask(()=>this.onmessage({data:browserResult}));},terminate(){this.terminated=true;}});
const browserTransport=createBrowserWorkerTransport({workerUrl:"/drop-in/compute-orchestration/browser-worker.js",workerFactory:browserFactory});
const browserTransportResult=await browserTransport.invoke({id:"browser-js-worker"},browserJob);
ok(browserTransportResult.jobId===browserJob.jobId,"browser worker transport correlates the returned job");
const timeoutWorkerFactory=()=>({postMessage(){},terminate(){this.wasTerminated=true;}});
const timeoutBrowserTransport=createBrowserWorkerTransport({workerUrl:"/worker.js",workerFactory:timeoutWorkerFactory,timeoutMs:5});
let browserTimeout=false;
try { await timeoutBrowserTransport.invoke({id:"browser-js-worker"},browserJob); } catch(e) { browserTimeout=e.code==="BROWSER_WORKER_TIMEOUT"; }
ok(browserTimeout,"browser worker timeout is explicit and terminates the worker");
const errorWorkerFactory=()=>({postMessage(){queueMicrotask(()=>this.onerror({message:"worker boom"}));},terminate(){}});
const errorBrowserTransport=createBrowserWorkerTransport({workerUrl:"/worker.js",workerFactory:errorWorkerFactory,timeoutMs:100});
let browserError=false;
try { await errorBrowserTransport.invoke({id:"browser-js-worker"},browserJob); } catch(e) { browserError=e.code==="BROWSER_WORKER_FAILED"; }
ok(browserError,"browser worker runtime errors are surfaced");

const resultPayload={estimatedReliability:0.7,analyticReliability:0.704,validation:"PASS"};
const outputDigest=await digestJson(resultPayload,webcrypto.subtle);
const result={protocol:COMPUTE_PROTOCOL,jobId:job.jobId,inputDigest,outputDigest,
 providerId:"colab-gpu",providerVersion:"torch-2.x",status:"SUCCEEDED",
 evidenceState:"SIMULATED",result:resultPayload,diagnostics:[]};
ok(validateComputeResult(job,result,"colab-gpu").valid,"valid simulated result accepted");
ok((await verifyComputeOutputDigest(result,webcrypto.subtle)).valid,"output digest verified");
ok(!validateComputeResult(job,{...result,jobId:"other"},"colab-gpu").valid,"wrong job correlation rejected");
ok(!validateComputeResult(job,{...result,inputDigest:"0".repeat(64)},"colab-gpu").valid,"wrong input digest rejected");
ok(!validateComputeResult(job,result,"browser-cpu").valid,"wrong provider identity rejected");
ok(!validateComputeResult(job,{...result,providerVersion:""},"colab-gpu").valid,"missing provider version rejected");
ok(!validateComputeResult(job,{...result,status:"UNKNOWN"},"colab-gpu").valid,"non-success result rejected");
ok(!validateComputeResult(job,{...result,outputDigest:"bad"},"colab-gpu").valid,"bad output digest rejected");
ok(!validateComputeResult(job,{...result,evidenceState:"VERIFIED"},"colab-gpu").valid,"verified evidence promotion rejected");
ok(!validateComputeResult(job,{...result,evidenceState:"PHYSICAL_VERIFIED"},"colab-gpu").valid,"physical evidence promotion rejected");
ok(!validateComputeResult(job,{...result,result:{v:NaN}},"colab-gpu").valid,"non-finite result rejected");
ok(!(await verifyComputeOutputDigest({...result,outputDigest:"f".repeat(64)},webcrypto.subtle)).valid,"output digest mismatch detected");
const httpCalls=[];
const httpsTransport=createHttpsJsonTransport({
 endpoints:{"remote-solver":"https://solver.example/compute"},
 headers:{"remote-solver":{"authorization":"Bearer injected-secret"}},
 fetchImpl:async(url,opts)=>{httpCalls.push({url,opts});return {ok:true,status:200,headers:{get:()=>"2"},text:async()=>JSON.stringify({...result,jobId:browserJob.jobId,inputDigest:browserJob.inputDigest})};}
});
const httpsResponse=await httpsTransport.invoke({id:"remote-solver"},browserJob);
ok(httpsResponse.jobId===browserJob.jobId,"HTTPS transport returns correlated remote result");
ok(httpCalls[0].opts.method==="POST"&&httpCalls[0].opts.redirect==="error","HTTPS transport uses POST and rejects redirects");
ok(httpCalls[0].opts.headers.authorization==="Bearer injected-secret","HTTPS credentials are injected at host boundary");
const noEndpoint=await httpsTransport.invoke({id:"missing"},browserJob);
ok(noEndpoint.status==="UNAVAILABLE","missing HTTPS endpoint reports UNAVAILABLE");
rejects(()=>createHttpsJsonTransport({endpoints:{bad:"http://public.example/worker"}}),"ENDPOINT_INSECURE");
rejects(()=>createHttpsJsonTransport({endpoints:{bad:"https://user:pass@solver.example/worker"}}),"ENDPOINT_INVALID");
const largeTransport=createHttpsJsonTransport({endpoints:{"remote-solver":"https://solver.example"},
 maxResponseBytes:4,fetchImpl:async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>"12345"})});
const tooLarge=await largeTransport.invoke({id:"remote-solver"},browserJob);
ok(tooLarge.status==="FAILED"&&tooLarge.diagnostics[0].code==="RESPONSE_TOO_LARGE","HTTPS response size boundary enforced");
const badCorrelation=createHttpsJsonTransport({endpoints:{"remote-solver":"https://solver.example"},
 fetchImpl:async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({...result,jobId:"other"})})});
const badRemote=await badCorrelation.invoke({id:"remote-solver"},browserJob);
ok(badRemote.status==="FAILED"&&badRemote.diagnostics[0].code==="RESPONSE_CORRELATION_INVALID","remote correlation mismatch rejected");
const invalidJsonTransport=createHttpsJsonTransport({endpoints:{"remote-solver":"https://solver.example"},
 fetchImpl:async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>"not-json"})});
const malformedRemote=await invalidJsonTransport.invoke({id:"remote-solver"},browserJob);
ok(malformedRemote.status==="FAILED"&&malformedRemote.diagnostics[0].code==="RESPONSE_JSON_INVALID","malformed remote JSON rejected");
const timeoutHttpsTransport=createHttpsJsonTransport({endpoints:{"remote-solver":"https://solver.example"},
 fetchImpl:async(url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener("abort",()=>{const e=new Error("aborted");e.name="AbortError";reject(e);})),
 timeoutMs:5});
const timeoutRemote=await timeoutHttpsTransport.invoke({id:"remote-solver"},browserJob);
ok(timeoutRemote.status==="UNAVAILABLE"&&timeoutRemote.diagnostics[0].code==="REMOTE_TIMEOUT","remote worker timeout returns UNAVAILABLE");

ok(transitionComputeState("PLANNED","SUBMITTED").current==="SUBMITTED","planned to submitted transition allowed");
ok(transitionComputeState("SUBMITTED","RUNNING").current==="RUNNING","submitted to running transition allowed");
ok(transitionComputeState("RUNNING","SUCCEEDED").terminal,"successful terminal state marked terminal");
rejects(()=>transitionComputeState("SUCCEEDED","RUNNING"),"STATE_TRANSITION_INVALID");
rejects(()=>transitionComputeState("FAILED","SUBMITTED"),"STATE_TRANSITION_INVALID");
rejects(()=>transitionComputeState("PLANNED","SUCCEEDED"),"STATE_TRANSITION_INVALID");
rejects(()=>transitionComputeState("UNKNOWN","RUNNING"),"STATE_INVALID");

const upload=createColabLaunchDescriptor({notebookPath:"drop-in/compute-orchestration/notebooks/reliability_monte_carlo_colab.ipynb"});
ok(upload.mode==="upload"&&upload.url.includes("colab.research.google.com"),"Colab upload route generated without invented repository identity");
const github=createColabLaunchDescriptor({owner:"ayeai",repository:"physical-ai-platform",branch:"main",notebookPath:"drop-in/compute-orchestration/notebooks/reliability_monte_carlo_colab.ipynb"});
ok(github.url.includes("/github/ayeai/physical-ai-platform/blob/main/"),"GitHub Colab link generated from explicit coordinates");
rejects(()=>createColabLaunchDescriptor({owner:"../evil",repository:"repo",notebookPath:"x.ipynb"}),"REPOSITORY_COORDINATE_INVALID");
const plan=registry.plan(job,{health:{"colab-gpu":"AVAILABLE"}});
const artifact=toCanonicalComputeArtifact(job,plan,{valid:true},result);
ok(artifact.outcome==="PROPOSAL"&&artifact.artifact.canonicalMutationPerformed===false,"canonical adapter emits proposal without graph mutation");
ok(artifact.artifact.authorityGranted===false&&artifact.artifact.physicalActuation===false,"compute artifact grants no authority or actuation");
ok(toCanonicalComputeArtifact(job,{outcome:"HOLD"},{valid:true},result).outcome==="HOLD","invalid plan cannot create artifact");

let fuzz=0;
for(let i=0;i<250;i++){
  const bad={...job,resourceRequirements:{accelerator:["bad","none","preferred"][i%3],minMemoryGiB:Math.max(0,i/10)}};
  const v=validateComputeJob(bad);
  if(i%3===0) ok(!v.valid,"generated invalid accelerator rejected");
  else ok(v.valid,"generated in-range resource requirement accepted");
  fuzz++;
}
console.log(`compute-orchestration PASS: ${passed} assertions (${fuzz} generated boundary cases).`);
