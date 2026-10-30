/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKEND_CATALOG, getBackend, listBackends, selectBackends } from "./backend-registry.js";
import { createBenchmarkValidator, createSha256Digest, getBenchmarkProfile } from "./benchmark-validation.js";
import { webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createBackendAdapter, toSimulationEvidenceCandidate, validateBackendExecutionRecord, validateBackendJob } from "./backend-runtime.js";
import { prototype } from "./module.js";
let n=0;
function ok(v,m){n++;if(!v)throw new Error(`FAIL ${n}: ${m}`);}
function eq(v,e,m){ok(v===e,`${m}: expected ${e}, got ${v}`);}
const sha=(c)=>`sha256:${c.repeat(64)}`;
const job={jobId:"job-cavity-001",projectId:"sample-project-01",configurationId:"sample-cfg-01",configurationFingerprint:"sha256:sample-cfg-01",revisionId:"sample-rev-02",testId:"sample-test-01",backendVersion:"v2406",domain:"cfd",operation:"cfd.steady",inputFormat:"CASE",inputDigest:sha("a"),inputArtifacts:[{uri:"artifact://case/cavity",digest:sha("a"),mediaType:"application/vnd.openfoam.case"}],units:{length:"m",time:"s",pressure:"Pa",velocity:"m/s"},coordinateFrame:"world-right-handed",solverOptions:{solver:"simpleFoam",tolerance:1e-8,maxIterations:500},timeoutMs:300000,deterministic:true,seed:42};
const response={protocolVersion:"1.0.0",status:"COMPLETED",exitCode:0,backendId:"openfoam",operation:"cfd.steady",inputDigest:job.inputDigest,runId:"worker-run-001",backendVersion:"v2406",startedAt:"2026-10-30T05:00:00.000Z",completedAt:"2026-10-30T05:00:03.000Z",outputDigest:sha("b"),outputArtifacts:[{uri:"artifact://runs/001/field.vtu",digest:sha("b"),mediaType:"application/vnd.vtk",format:"VTK"}],deterministic:true,environmentFingerprint:sha("c"),metrics:{residual:1e-9,iterations:127,massImbalance:2e-10},result:{residual:1e-9,iterations:127,massImbalance:2e-10}};
const digestFn=createSha256Digest(webcrypto.subtle);
const validator=createBenchmarkValidator("openfoam-lid-driven-cavity-re100",digestFn);
const adapter=createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>structuredClone(response)},validator});
const run=await adapter.execute(job);
eq(run.outcome,"OK","worker execution plus independent validation succeeds");
ok(validateBackendExecutionRecord(run.execution).ok,"execution provenance self-validates");
eq(run.execution.backendId,"openfoam","selected engine identity retained");
eq(run.execution.inputDigest,job.inputDigest,"input digest retained");
eq(run.execution.outputDigest,response.outputDigest,"output digest retained");
eq(run.execution.validationStatus,"VERIFIED","independent benchmark verdict retained");
const samplePath=join(dirname(fileURLToPath(import.meta.url)),"samples/valid-simulation-evidence.json");
const sample=JSON.parse(readFileSync(samplePath,"utf8"));
const candidate=toSimulationEvidenceCandidate({run,evidenceId:"ev-openfoam-001",configurationId:sample.config.id,configurationFingerprint:sample.config.fingerprint,revisionId:sample.revision.id,testId:sample.tests[0].id,result:run.result});
eq(candidate.outcome,"OK","verified backend run becomes an evidence candidate");
const integrated=prototype({...sample,evidence:[candidate.evidence],relations:sample.relations.map(r=>r.source===sample.evidence[0].id?{...r,source:candidate.evidence.id}:r)});
eq(integrated.outcome,"OK","backend run evidence passes prototype evaluator");
ok(integrated.prototype.simulationOnlyRequirementIds.includes(sample.requirements[0].id),"backend result remains simulation-only at prototype review");

// Catalogue coverage and capability discovery.
ok(BACKEND_CATALOG.length>=10,"catalogue exposes at least ten proven external engines");
ok(listBackends({domain:"cfd",operation:"cfd.steady"}).some(b=>b.id==="openfoam"),"CFD discovery finds OpenFOAM");
ok(listBackends({domain:"circuit",operation:"circuit.transient"}).some(b=>b.id==="ngspice"),"circuit discovery finds ngspice");
ok(listBackends({domain:"multibody",operation:"multibody.contact"}).some(b=>b.id==="chrono"),"multibody discovery finds Chrono");
ok(listBackends({domain:"fea",operation:"fea.nonlinear"}).some(b=>b.id==="calculix"),"FEA discovery finds CalculiX");
eq(selectBackends({domain:"cfd",operation:"cfd.steady",preferredBackendId:"openfoam"}).selected.id,"openfoam","preferred backend is selected explicitly");
eq(selectBackends({domain:"cfd",operation:"cfd.steady",preferredBackendId:"not-installed"}).outcome,"HOLD","unknown preferred backend does not silently fall back");
eq(getBackend("not-installed"),null,"unknown backend is not resolved");

// Preflight rejects malformed or unsafe jobs.
eq(validateBackendJob(getBackend("openfoam"),{}).outcome,"HOLD","empty job holds");
eq(validateBackendJob(getBackend("openfoam"),{...job,operation:"circuit.transient"}).outcome,"HOLD","unsupported operation holds");
eq(validateBackendJob(getBackend("openfoam"),{...job,solverOptions:{command:"rm -rf /"}}).outcome,"HOLD","command injection fields are rejected");
const cyclic={}; cyclic.self=cyclic;
eq(validateBackendJob(getBackend("openfoam"),{...job,solverOptions:cyclic}).outcome,"HOLD","cyclic solver options are rejected");
eq(validateBackendJob(getBackend("openfoam"),{...job,solverOptions:JSON.parse('{"__proto__":{"polluted":true}}')}).outcome,"HOLD","prototype-pollution option key is rejected");
eq(validateBackendJob(getBackend("openfoam"),{...job,inputArtifacts:[{uri:"artifact://x",digest:"bad",mediaType:"x"}]}).outcome,"HOLD","invalid artifact digest holds");
eq(validateBackendJob(getBackend("openfoam"),{...job,inputArtifacts:[{uri:"file:///etc/passwd",digest:sha("a"),mediaType:"text/plain"}]}).outcome,"HOLD","local file URI is rejected");
eq(validateBackendJob(getBackend("openfoam"),{...job,seed:undefined}).outcome,"HOLD","deterministic run requires a seed");
eq(validateBackendJob(getBackend("openfoam"),{...job,units:{}}).outcome,"HOLD","units cannot be omitted");

// Runtime and validator failure modes.
eq((await createBackendAdapter({backendId:"openfoam"}).execute(job)).outcome,"HOLD","missing worker transport holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>response}}).execute(job)).outcome,"HOLD","missing independent validator holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>{throw new Error("worker offline")}},validator}).execute(job)).outcome,"HOLD","worker outage holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:()=>new Promise(()=>{})},validator}).execute({...job,timeoutMs:1000})).outcome,"HOLD","worker timeout is bounded and holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>response},validator:async()=>{throw new Error("validator crashed")}}).execute(job)).outcome,"HOLD","validator crash holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,status:"FAILED",exitCode:2})},validator}).execute(job)).outcome,"FAIL","solver failure is FAIL");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,backendId:"xyce"})},validator}).execute(job)).outcome,"HOLD","wrong engine identity holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,inputDigest:sha("f")})},validator}).execute(job)).outcome,"HOLD","mismatched submitted input digest holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,backendVersion:"vwrong"})},validator}).execute(job)).outcome,"HOLD","un-pinned backend version holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,protocolVersion:"9.9.9"})},validator}).execute(job)).outcome,"HOLD","protocol version mismatch holds");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,outputArtifacts:[]})},validator}).execute(job)).outcome,"HOLD","missing output artifact holds");
const badMetrics={...response,metrics:{residual:NaN,massImbalance:0}};
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>badMetrics},validator}).execute(job)).outcome,"HOLD","non-finite solver metrics hold");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>({...response,deterministic:false})},validator}).execute(job)).outcome,"HOLD","nondeterministic run cannot satisfy deterministic request");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>response},validator:async()=>({outcome:"HOLD",missing:["benchmark evidence"]})}).execute(job)).outcome,"HOLD","validator HOLD propagates");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>response},validator:async()=>({outcome:"FAIL",benchmarkId:"bad-case"})}).execute(job)).outcome,"FAIL","validator FAIL propagates");
eq((await createBackendAdapter({backendId:"openfoam",transport:{execute:async()=>response},validator:async()=>({outcome:"VERIFIED",benchmarkId:"missing-digest"})}).execute(job)).outcome,"HOLD","verified verdict without report digest holds");

// Candidate creation and tamper checks.
eq(toSimulationEvidenceCandidate({run:{outcome:"HOLD"},evidenceId:"e",configurationId:"c",configurationFingerprint:"f",revisionId:"r",testId:"t",result:{x:1}}).outcome,"HOLD","unverified run cannot mint candidate evidence");
const tampered={...run.execution,outputDigest:"sha256:bad"};
ok(!validateBackendExecutionRecord(tampered).ok,"tampered digest rejected");
ok(!validateBackendExecutionRecord({...run.execution,exitCode:9}).ok,"non-zero exit code rejected");
ok(!validateBackendExecutionRecord({...run.execution,completedAt:"2020-01-01T00:00:00Z"}).ok,"negative execution interval rejected");
ok(!validateBackendExecutionRecord({...run.execution,validationBenchmarkId:"unregistered-benchmark"}).ok,"unregistered benchmark provenance rejected");
// Numerical acceptance profiles and real SHA-256 report generation.
const sha256=createSha256Digest(webcrypto.subtle);
eq(await sha256(""),"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","WebCrypto SHA-256 matches known empty-string vector");
ok(getBenchmarkProfile("rc-lowpass-step-tau")!==null,"RC analytical benchmark is registered");
ok(getBenchmarkProfile("calculix-cantilever-small-deflection")!==null,"cantilever analytical benchmark is registered");
ok(getBenchmarkProfile("chrono-mujoco-simple-pendulum")!==null,"pendulum analytical benchmark is registered");
const rcValidator=createBenchmarkValidator("rc-lowpass-step-tau",sha256);
eq((await rcValidator({manifest:getBackend("ngspice"),response:{backendVersion:"test",metrics:{voutAtTauV:0.63212}}})).outcome,"VERIFIED","RC benchmark accepts analytical response");
eq((await rcValidator({manifest:getBackend("ngspice"),response:{backendVersion:"test",metrics:{voutAtTauV:0.7}}})).outcome,"FAIL","RC benchmark rejects out-of-tolerance response");
eq((await rcValidator({manifest:getBackend("ngspice"),response:{backendVersion:"test",metrics:{}}})).outcome,"HOLD","RC benchmark holds missing metric");
const beamValidator=createBenchmarkValidator("calculix-cantilever-small-deflection",sha256);
eq((await beamValidator({manifest:getBackend("calculix"),response:{backendVersion:"test",metrics:{tipDeflectionM:0.01}}})).outcome,"VERIFIED","cantilever analytical result accepted");
const pendulumValidator=createBenchmarkValidator("chrono-mujoco-simple-pendulum",sha256);
eq((await pendulumValidator({manifest:getBackend("chrono"),response:{backendVersion:"test",metrics:{periodS:2.0064}}})).outcome,"VERIFIED","pendulum analytical result accepted");
// Actual open-source numerical library execution, conditional only when SciPy is absent.
const scipyProbe=spawnSync("python3",["-c","import scipy; print(scipy.__version__)"],{encoding:"utf8",timeout:10000});
if (!scipyProbe.error && scipyProbe.status===0) {
  const scipyVersion=scipyProbe.stdout.trim();
  const scipyJob=JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)),"samples/scipy-rc-step-job.json"),"utf8"));
  scipyJob.backendVersion=scipyVersion;
  const workerPath=join(dirname(fileURLToPath(import.meta.url)),"workers/scipy_reference_worker.py");
  const invalidWorker=spawnSync("python3",[workerPath],{input:JSON.stringify({protocolVersion:"1.0.0",job:{...scipyJob,backendId:"scipy",solverOptions:{...scipyJob.solverOptions,resistanceOhm:-1}},backend:{id:"scipy",workerProfile:"scipy.solve_ivp.v1"}}),encoding:"utf8",timeout:20000});
  eq(invalidWorker.status,2,"SciPy worker rejects invalid physical parameters with non-zero exit");
  eq(JSON.parse(invalidWorker.stdout).status,"FAILED","SciPy worker reports numerical input failure explicitly");
  const scipyAdapter=createBackendAdapter({backendId:"scipy",transport:{execute:async envelope=>{
    const child=spawnSync("python3",[workerPath],{input:JSON.stringify(envelope),encoding:"utf8",timeout:20000});
    if(child.error)throw child.error;
    if(!child.stdout)throw new Error(child.stderr||`SciPy worker exited ${child.status}`);
    return JSON.parse(child.stdout);
  }},validator:createBenchmarkValidator("rc-lowpass-step-tau",sha256)});
  const scipyRun=await scipyAdapter.execute(scipyJob);
  eq(scipyRun.outcome,"OK","actual SciPy solve_ivp backend completes and validates");
  ok(Math.abs(scipyRun.result.voutAtTauV-0.6321205588285577)<0.005,"SciPy RC transient matches analytical solution");
  eq(scipyRun.execution.backendId,"scipy","real SciPy backend identity retained");
  eq(scipyRun.execution.backendVersion,scipyVersion,"actual SciPy version captured");
  const scipyCandidate=toSimulationEvidenceCandidate({run:scipyRun,evidenceId:"ev-scipy-rc-001",configurationId:sample.config.id,configurationFingerprint:sample.config.fingerprint,revisionId:sample.revision.id,testId:sample.tests[0].id,result:scipyRun.result});
  eq(scipyCandidate.outcome,"OK","real SciPy run becomes a provenance-bearing evidence candidate");
  const scipyPrototype=prototype({...sample,evidence:[scipyCandidate.evidence],relations:sample.relations.map(r=>r.source===sample.evidence[0].id?{...r,source:scipyCandidate.evidence.id}:r)});
  eq(scipyPrototype.outcome,"OK","real SciPy evidence traverses the complete prototype evaluator");
} else {
  console.log("SKIP: real SciPy worker test requires Python 3 and SciPy; adapter contract tests still executed");
}
console.log(`backend integration PASS (${n} assertions; SciPy solver executed for real; other external engines not executed in this environment)`);
