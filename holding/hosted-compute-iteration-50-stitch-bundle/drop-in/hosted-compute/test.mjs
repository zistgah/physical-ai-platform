/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. SPDX-License-Identifier: GPL-3.0-only */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  HOSTED_COMPUTE_VERSION, COMPUTE_BACKEND_CATALOG, listComputeBackends,
  createComputePlan, validateComputeResult, validateComputeResultAsync, verifyComputeResultDigest, toCanonicalEvidenceDraft
} from './module.js';
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function eq(a, b, message) { assert.equal(a, b, message); checks++; }
function has(xs, code) { ok(xs.some((x) => x.code === code), `expected diagnostic ${code}`); }
const HASH = 'a'.repeat(64), OUT = 'b'.repeat(64);
const baseInput = {
  projectId:'PAP-DEMO-001', configurationId:'CFG-REV-7', runId:'RUN-0001',
  solverId:'poisson-2d-cg', backendId:'numpy-scipy', domain:'sparse', accelerator:'cpu',
  requirements:['REQ-NUM-001','REQ-TRACE-002','REQ-NUM-001'], inputHash:HASH,
  resources:{maxWallSeconds:60,maxMemoryGiB:2,maxGpuCount:0}, tolerance:1e-3,
  createdAt:'2026-10-30T00:00:00.000Z'
};
const planned = createComputePlan(baseInput);
eq(planned.status,'READY','valid plan ready');
eq(planned.plan.requirements.length,2,'requirements deduplicated');
eq(planned.plan.resources.maxWallSeconds,60,'resource cap retained');
eq(planned.plan.backendContractVersion,HOSTED_COMPUTE_VERSION,'contract version bound');
assert.throws(()=>planned.plan.requirements.push('MUTATION'),TypeError); checks++;
assert.throws(()=>COMPUTE_BACKEND_CATALOG[0].domain.push('MUTATION'),TypeError); checks++;
const clonedCatalog=listComputeBackends(); clonedCatalog[0].domain.push('LOCAL-ONLY');
ok(!COMPUTE_BACKEND_CATALOG[0].domain.includes('LOCAL-ONLY'),'catalog query returns defensive clones');

// Catalog integrity and query boundaries.
ok(COMPUTE_BACKEND_CATALOG.length >= 14,'catalog has broad solver ecosystem');
eq(new Set(COMPUTE_BACKEND_CATALOG.map((b)=>b.id)).size,COMPUTE_BACKEND_CATALOG.length,'backend ids unique');
for (const b of COMPUTE_BACKEND_CATALOG) {
  ok(b.id && b.name && b.domain.length && b.accelerators.length && b.url && b.license,'catalog entry complete');
  ok(['established','emerging'].includes(b.maturity),'maturity classified');
}
ok(listComputeBackends({accelerator:'nvidia-gpu'}).length >= 5,'GPU catalogue query');
ok(listComputeBackends({domain:'cfd'}).some((b)=>b.id==='openfoam'),'CFD query includes OpenFOAM');
eq(listComputeBackends({domain:'not-a-domain'}).length,0,'unknown domain empty');
eq(listComputeBackends({hostedFit:'native-build-or-container'}).length >= 2,true,'native/container filter');

// Plan missing/invalid inputs.
for (const [field,code] of [['projectId','PROJECT_ID_REQUIRED'],['configurationId','CONFIGURATION_ID_REQUIRED'],['solverId','SOLVER_ID_REQUIRED'],['runId','RUN_ID_REQUIRED'],['backendId','BACKEND_UNKNOWN'],['inputHash','INPUT_HASH_INVALID'],['requirements','REQUIREMENTS_REQUIRED']]) {
  const x={...baseInput}; delete x[field]; const r=createComputePlan(x); eq(r.status,'HOLD',`${field} missing holds`); has(r.diagnostics,code);
}
for (const [field,value,code] of [
  ['inputHash','xyz','INPUT_HASH_INVALID'],['requirements',[],'REQUIREMENTS_REQUIRED'],
  ['requirements',['ok',''],'REQUIREMENTS_REQUIRED'],['resources',{maxWallSeconds:0},'WALL_LIMIT_INVALID'],
  ['resources',{maxMemoryGiB:-1},'MEMORY_LIMIT_INVALID'],['resources',{maxGpuCount:-1},'GPU_COUNT_INVALID'],
  ['resources',{maxGpuCount:1.5},'GPU_COUNT_INVALID'],['resources',{maxGpuMemoryGiB:0},'GPU_MEMORY_LIMIT_INVALID'],['tolerance',0,'TOLERANCE_INVALID'],
  ['tolerance',Infinity,'TOLERANCE_INVALID'],['executionMode','LOCAL_DESKTOP','EXECUTION_MODE_UNSUPPORTED'],
  ['domain','cfd','BACKEND_DOMAIN_MISMATCH'],['accelerator','nvidia-gpu','BACKEND_ACCELERATOR_MISMATCH']
]) { const r=createComputePlan({...baseInput,[field]:value}); eq(r.status,'HOLD',`${field} boundary holds`); has(r.diagnostics,code); }
// Inclusive valid boundaries.
eq(createComputePlan({...baseInput,resources:{maxWallSeconds:Number.MIN_VALUE,maxMemoryGiB:Number.MIN_VALUE,maxGpuCount:0}}).status,'READY','smallest positive resource caps accepted');
eq(createComputePlan({...baseInput,tolerance:Number.MIN_VALUE}).status,'READY','smallest positive tolerance accepted');
eq(createComputePlan({...baseInput,accelerator:'cpu'}).status,'READY','CPU boundary accepted');
eq(createComputePlan({...baseInput,executionMode:'EXTERNAL_HOSTED'}).status,'READY','external hosted accepted');

const resultBase = {
  schema:'pap.hosted-compute-result/1.0', planId:planned.plan.planId,
  projectId:planned.plan.projectId, configurationId:planned.plan.configurationId, runId:planned.plan.runId,
  solverId:planned.plan.solverId, backendId:planned.plan.backendId, backendVersion:'1.17.2', metadata:{platform:'Physical AI Platform',iteration:50,license:'GPL-3.0-only',copyright:'Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.',notebook:'notebooks/PAP_Hosted_Compute_Backends.ipynb'}, status:'COMPLETED',
  runtime:'Python 3.12 / hosted notebook', device:'CPU', precision:'float64',
  inputHash:HASH, outputHash:OUT,
  startedAt:'2026-10-30T00:00:01.000Z', finishedAt:'2026-10-30T00:00:02.000Z',
  checks:[{id:'MMS-L2-ERROR',passed:true},{id:'RESIDUAL',passed:true}],
  metrics:{relativeL2Error:1.2e-4,relativeResidual:1.1e-12,iterations:42},
  validation:{passed:true,error:1.2e-4,method:'manufactured-solution-grid-refinement'},
  resourceUsage:{wallSeconds:1.2,peakMemoryGiB:0.2,gpuCount:0}, executionMode:'COLAB_HOSTED'
};
const good = validateComputeResult(resultBase,planned,{digestVerified:true});
eq(good.status,'ACCEPTED','valid result accepted');
eq(good.evidenceDraft.metadata.license,'GPL-3.0-only','project licensing metadata retained');
eq(good.evidenceDraft.method,'SIMULATION','result stays simulation');
eq(good.evidenceDraft.fidelity,'UNVERIFIED','fidelity remains unverified');
eq(good.evidenceDraft.claims.hil,false,'no HIL claim');
eq(good.evidenceDraft.claims.l5,false,'no L5 claim');
eq(good.evidenceDraft.claims.physicalVerification,false,'no physical verification');
eq(good.evidenceDraft.state,'EXECUTED','execution state only after result accepted');

// Every critical result field is independently fail-closed.
const mutations = [
  ['planId','wrong','PLAN_ID_MISMATCH'],['projectId','wrong','PROJECT_ID_MISMATCH'],
  ['configurationId','wrong','CONFIGURATION_ID_MISMATCH'],['runId','wrong','RUN_ID_MISMATCH'],
  ['backendId','wrong','BACKEND_ID_MISMATCH'],['solverId','wrong','SOLVER_ID_MISMATCH'],['status','RUNNING','EXECUTION_NOT_COMPLETED'],
  ['backendVersion','','BACKEND_VERSION_REQUIRED'],['metadata',null,'PROJECT_METADATA_REQUIRED'],['runtime','','RUNTIME_REQUIRED'],
  ['device','','DEVICE_REQUIRED'],['precision','','PRECISION_REQUIRED'],
  ['inputHash','bad','RESULT_INPUT_HASH_INVALID'],['inputHash','c'.repeat(64),'INPUT_HASH_MISMATCH'],
  ['outputHash','bad','OUTPUT_HASH_INVALID'],['startedAt','bad-date','TIMESTAMP_RANGE_INVALID'],
  ['finishedAt','2020-01-01T00:00:00Z','TIMESTAMP_RANGE_INVALID'],
  ['checks',[],'VALIDATION_CHECKS_REQUIRED'],['checks',[{id:'bad',passed:false}],'VALIDATION_CHECK_FAILED'],
  ['metrics',{bad:NaN},'METRIC_NONFINITE'],['metrics',{},'METRICS_EMPTY'],['validation',{passed:false,error:0,method:'m'},'VALIDATION_NOT_PASSED'],
  ['validation',{passed:true,error:NaN,method:'m'},'VALIDATION_METRIC_INVALID'],['resourceUsage',null,'RESOURCE_USAGE_INVALID'],['resourceUsage',{wallSeconds:1,peakMemoryGiB:1,gpuCount:0.5},'RESOURCE_USAGE_INVALID'],['resourceUsage',{wallSeconds:1,peakMemoryGiB:1,gpuCount:0,peakDeviceMemoryGiB:NaN},'GPU_MEMORY_USAGE_INVALID'],
  ['validation',{passed:true,error:2},'VALIDATION_TOLERANCE_EXCEEDED'],
  ['resourceUsage',{wallSeconds:61,peakMemoryGiB:0.2,gpuCount:0},'WALL_BUDGET_EXCEEDED'],
  ['resourceUsage',{wallSeconds:1,peakMemoryGiB:3,gpuCount:0},'MEMORY_BUDGET_EXCEEDED'],
  ['resourceUsage',{wallSeconds:1,peakMemoryGiB:1,gpuCount:1},'GPU_BUDGET_EXCEEDED'],
  ['executionMode','EXTERNAL_HOSTED','EXECUTION_MODE_MISMATCH']
];
for (const [field,value,code] of mutations) {
  const r=validateComputeResult({...resultBase,[field]:value},planned,{digestVerified:true});
  eq(r.status,'HOLD',`${field} tampering holds`); has(r.diagnostics,code);
}
eq(validateComputeResult(resultBase,planned,{digestVerified:false}).status,'HOLD','digest not verified holds');
has(validateComputeResult(resultBase,planned,{digestVerified:false}).diagnostics,'RESULT_DIGEST_NOT_VERIFIED');
eq(validateComputeResult(resultBase,{plan:null},{digestVerified:true}).status,'HOLD','missing plan holds');
has(validateComputeResult(resultBase,{plan:null},{digestVerified:true}).diagnostics,'PLAN_INVALID');
eq(toCanonicalEvidenceDraft(resultBase,planned,{digestVerified:true}).status,'ACCEPTED','canonical adapter delegates validation');

// Cross-runtime digest envelope: exact canonical JSON is hashed, then independently verified.
function stable(v) { if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`; if (v && typeof v==='object') return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`; return JSON.stringify(v); }
const digestPayload=stable(resultBase);
const digest=createHash('sha256').update(digestPayload,'utf8').digest('hex');
const sealed={...resultBase,digestPayload,resultDigest:digest};
eq(await verifyComputeResultDigest(sealed),true,'valid detached digest verifies');
eq((await validateComputeResultAsync(sealed,planned)).status,'ACCEPTED','async digest validation accepts');
eq(await verifyComputeResultDigest({...sealed,metrics:{relativeL2Error:999}}),false,'payload tampering fails digest binding');
eq((await validateComputeResultAsync({...sealed,resultDigest:'0'.repeat(64)},planned)).status,'HOLD','bad digest forces HOLD');

// Non-finite/unknown metrics and all boundary cases.
for (const bad of [NaN,Infinity,-Infinity,'0',null]) {
  const r=validateComputeResult({...resultBase,metrics:{residual:bad}},planned,{digestVerified:true});
  eq(r.status,'HOLD',`metric ${String(bad)} holds`); has(r.diagnostics,'METRIC_NONFINITE');
}
// Resource budgets are inclusive at the exact boundary.
eq(validateComputeResult({...resultBase,resourceUsage:{wallSeconds:60,peakMemoryGiB:2,gpuCount:0}},planned,{digestVerified:true}).status,'ACCEPTED','resource cap equality accepted');
const gpuPlan=createComputePlan({...baseInput,backendId:'pytorch',domain:'tensor',accelerator:'nvidia-gpu',resources:{maxWallSeconds:60,maxMemoryGiB:2,maxGpuCount:1,maxGpuMemoryGiB:4}});
eq(gpuPlan.status,'READY','GPU memory budget accepted');
const gpuResult={...resultBase,backendId:'pytorch',executionMode:'COLAB_HOSTED',device:'cuda:0',resourceUsage:{wallSeconds:1,peakMemoryGiB:1,gpuCount:1,peakDeviceMemoryGiB:4}};
eq(validateComputeResult(gpuResult,gpuPlan,{digestVerified:true}).status,'ACCEPTED','GPU memory budget equality accepted');
eq(validateComputeResult({...gpuResult,resourceUsage:{...gpuResult.resourceUsage,peakDeviceMemoryGiB:4.0001}},gpuPlan,{digestVerified:true}).status,'HOLD','GPU memory above budget holds');
eq(validateComputeResult({...gpuResult,resourceUsage:{wallSeconds:1,peakMemoryGiB:1,gpuCount:1}},gpuPlan,{digestVerified:true}).status,'HOLD','missing GPU memory measurement holds when GPU memory budget is set');
eq(validateComputeResult({...resultBase,validation:{passed:true,error:planned.plan.tolerance,method:'boundary'}},planned,{digestVerified:true}).status,'ACCEPTED','validation tolerance equality accepted');
eq(validateComputeResult({...resultBase,validation:{passed:true,error:planned.plan.tolerance+Number.EPSILON,method:'boundary'}},planned,{digestVerified:true}).status,'HOLD','just-above tolerance fails');
eq(validateComputeResult({...resultBase,startedAt:resultBase.finishedAt,finishedAt:resultBase.finishedAt},planned,{digestVerified:true}).status,'ACCEPTED','zero-duration timestamp boundary accepted');
eq(createComputePlan({...baseInput,createdAt:'not-a-date'}).status,'HOLD','invalid plan timestamp holds');
// Solver result may not smuggle HIL/physical claims into payload; output is canonicalised.
const claimSmuggle=validateComputeResult({...resultBase,claims:{hil:true,l5:true,physicalVerification:true}},planned,{digestVerified:true});
eq(claimSmuggle.evidenceDraft.claims.hil,false,'payload claim cannot elevate HIL');
eq(claimSmuggle.evidenceDraft.claims.l5,false,'payload claim cannot elevate L5');

console.log(`Hosted Compute Iteration 50 PASS: ${checks} assertions; ${COMPUTE_BACKEND_CATALOG.length} backend descriptors; plan/result/evidence contract fail-closed.`);
