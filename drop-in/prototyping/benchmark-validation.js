/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Analytical/verification benchmark validators. Validation reports are SHA-256 digested by an injected platform crypto provider. */
import { BENCHMARK_PROFILES, getBenchmarkProfile } from "./benchmark-profiles.js";
const isObj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const digest=v=>typeof v==="string"&&/^sha256:[a-f0-9]{64}$/i.test(v);
const hold=(reason,missing=[])=>({outcome:"HOLD",reason,missing});
const fail=(reason,diagnostics=[])=>({outcome:"FAIL",reason,diagnostics});
function stable(v){
  if(Array.isArray(v))return `[${v.map(stable).join(",")}]`;
  if(isObj(v))return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function metricAt(obj,path){return path.split(".").reduce((v,k)=>isObj(v)?v[k]:undefined,obj);}
export function createSha256Digest(subtleCrypto){
  if(!subtleCrypto||typeof subtleCrypto.digest!=="function")throw new TypeError("A WebCrypto-compatible subtle.digest provider is required");
  return async value=>{
    const bytes=new TextEncoder().encode(String(value));
    const hash=await subtleCrypto.digest("SHA-256",bytes);
    return `sha256:${[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}`;
  };
}
export function createBenchmarkValidator(profileId,digestFn){
  const profile=getBenchmarkProfile(profileId);
  if(!profile)throw new TypeError(`Unknown benchmark profile: ${profileId}`);
  if(typeof digestFn!=="function")throw new TypeError("A cryptographic SHA-256 digest function is required");
  return async ({manifest,response}={})=>{
    if(!isObj(response)||!isObj(response.metrics))return hold("Benchmark response has no numeric metrics",["response.metrics"]);
    if(!profile.backends.includes(manifest?.id))return hold("Benchmark profile is not approved for this backend",[`benchmark:${profileId}:backend:${manifest?.id||"unknown"}`]);
    const missing=[],violations=[],observed={};
    for(const rule of profile.metrics){
      const value=metricAt(response.metrics,rule.path);
      if(typeof value!=="number"||!Number.isFinite(value)){missing.push(`metrics.${rule.path}:finite-number`);continue;}
      observed[rule.path]=value;
      if(rule.expected!==undefined&&Math.abs(value-rule.expected)>rule.absTolerance)violations.push({metric:rule.path,observed:value,expected:rule.expected,absTolerance:rule.absTolerance});
      if(rule.min!==undefined&&value<rule.min)violations.push({metric:rule.path,observed:value,min:rule.min});
      if(rule.max!==undefined&&value>rule.max)violations.push({metric:rule.path,observed:value,max:rule.max});
    }
    if(missing.length)return hold("Benchmark metrics are incomplete",missing);
    const report={profileId,backendId:manifest.id,backendVersion:response.backendVersion||null,metrics:observed,violations,benchmarkSource:profile.reference};
    const reportDigest=await digestFn(stable(report));
    if(!digest(reportDigest))return hold("Digest provider did not return a SHA-256 digest",["reportDigest:sha256"]);
    if(violations.length)return {outcome:"FAIL",benchmarkId:profileId,reportDigest,diagnostics:violations,summary:"One or more benchmark metrics are outside the declared tolerance."};
    return {outcome:"VERIFIED",benchmarkId:profileId,reportDigest,summary:`${profile.metrics.length} benchmark metrics satisfy declared acceptance limits.`,observed};
  };
}
export { BENCHMARK_PROFILES, getBenchmarkProfile };
