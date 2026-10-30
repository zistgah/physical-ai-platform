/* Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
 * SPDX-License-Identifier: GPL-3.0-only
 * Browser Worker runtime for deterministic CPU Monte Carlo reliability.
 * GPU acceleration is provided by the separate Colab PyTorch notebook.
 */
const PROTOCOL="ayeai.compute.job/v1";
const VERSION="1.0.0";

function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")}}`;
  return JSON.stringify(value);
}
async function digest(value){
  const bytes=new TextEncoder().encode(stable(value));
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function xorshift32(seed){
  let x=seed>>>0;if(x===0)x=0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}

/** Run the series-system exponential lifetime model and compare against its analytic solution. */
export async function runReliabilityMonteCarlo(job,subtle=globalThis.crypto?.subtle){
  const p=job?.payload||{};
  const rates=p.failureRatesPerHour, mission=p.missionTimeHours, samples=p.samples, seed=p.seed;
  const errors=[];
  if(job?.protocol!==PROTOCOL)errors.push("PROTOCOL_UNSUPPORTED");
  if(typeof job?.jobId!=="string"||!job.jobId)errors.push("JOB_ID_REQUIRED");
  if(job?.capability!=="reliability.series.monte-carlo")errors.push("CAPABILITY_UNSUPPORTED");
  if(job?.executionClass!=="simulation")errors.push("EXECUTION_CLASS_INVALID");
  if(!Array.isArray(rates)||rates.length<1||rates.length>256||rates.some(x=>!Number.isFinite(x)||x<=0))errors.push("FAILURE_RATES_INVALID");
  if(!Number.isFinite(mission)||mission<=0)errors.push("MISSION_TIME_INVALID");
  if(!Number.isInteger(samples)||samples<1000||samples>5_000_000)errors.push("SAMPLE_COUNT_INVALID");
  if(Array.isArray(rates)&&Number.isInteger(samples)&&samples*rates.length>50_000_000)errors.push("WORKLOAD_TOO_LARGE");
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)errors.push("SEED_INVALID");
  if(errors.length)return {protocol:PROTOCOL,jobId:job?.jobId||null,status:"INVALID",diagnostics:errors.map(code=>({code}))};
  const actualInput=await digest(p);
  if(actualInput.toLowerCase()!==String(job.inputDigest||"").toLowerCase())
    return {protocol:PROTOCOL,jobId:job.jobId,status:"INVALID",diagnostics:[{code:"INPUT_DIGEST_MISMATCH"}]};
  const random=xorshift32(seed);let success=0;
  const started=performance.now();
  for(let i=0;i<samples;i++){
    let systemLife=Infinity;
    for(const rate of rates){
      const u=Math.max(random(),Number.MIN_VALUE);
      const life=-Math.log(u)/rate;
      if(life<systemLife)systemLife=life;
    }
    if(systemLife>mission)success++;
  }
  const estimate=success/samples;
  const standardError=Math.sqrt(estimate*(1-estimate)/samples);
  const analytic=Math.exp(-mission*rates.reduce((a,b)=>a+b,0));
  const absoluteError=Math.abs(estimate-analytic);
  const tolerance=5*standardError+0.002;
  const validation=absoluteError<=tolerance?"PASS":"HOLD";
  const result={
    model:"independent-exponential-series-system",componentCount:rates.length,
    missionTimeHours:mission,samples,seed,estimatedReliability:estimate,
    analyticReliability:analytic,standardError,
    confidenceInterval95:[Math.max(0,estimate-1.96*standardError),Math.min(1,estimate+1.96*standardError)],
    absoluteError,acceptanceTolerance:tolerance,validation,device:"browser-worker-cpu",
    gpuUsed:false,elapsedMilliseconds:performance.now()-started
  };
  const outputDigest=await digest(result);
  return {protocol:PROTOCOL,jobId:job.jobId,inputDigest:actualInput,outputDigest,
    providerId:"browser-js-worker",providerVersion:VERSION,status:validation==="PASS"?"SUCCEEDED":"FAILED",
    evidenceState:"SIMULATED",result,diagnostics:[{code:"ANALYTIC_CROSSCHECK",message:"Monte Carlo estimate compared with closed-form reliability."}]};
}

if(typeof self!=="undefined"&&typeof self.addEventListener==="function"){
  self.addEventListener("message",async event=>{
    const message=event.data||{};
    if(message.protocol!==PROTOCOL||!message.job){self.postMessage({protocol:PROTOCOL,status:"INVALID",diagnostics:[{code:"WORKER_MESSAGE_INVALID"}]});return;}
    try{self.postMessage(await runReliabilityMonteCarlo(message.job));}
    catch(e){self.postMessage({protocol:PROTOCOL,jobId:message.job?.jobId||null,status:"FAILED",diagnostics:[{code:"WORKER_EXCEPTION",message:e.message}]});}
  });
}
