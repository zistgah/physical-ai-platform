import assert from 'node:assert/strict';
import { uncertaintyStudy, UNCERTAINTY_LIMITS } from '../module.js';
const base = { parameters:[{name:'mass',distribution:'uniform',min:1,max:2}], samples:32, seed:47, metrics:['response'] };
const runner = async p => ({outcome:'OK',metrics:{response:p.mass*2}});
let r = await uncertaintyStudy(base,{runner}); assert.equal(r.outcome,'OK'); assert.equal(r.study.samples,32);
const r2 = await uncertaintyStudy(base,{runner}); assert.deepEqual(r.study,r2.study);
assert.ok(r.study.metrics.response.min >= 2 && r.study.metrics.response.max <= 4);
assert.ok(r.study.metrics.response.p05 <= r.study.metrics.response.median && r.study.metrics.response.median <= r.study.metrics.response.p95);
assert.equal((await uncertaintyStudy({...base,seed:48},{runner})).study.metrics.response.mean === r.study.metrics.response.mean,false);
// Boundary and malformed input coverage.
for (const [label, spec] of [
  ['no parameters',{...base,parameters:[]}], ['too many parameters',{...base,parameters:Array.from({length:33},(_,i)=>({name:`p${i}`,distribution:'uniform',min:0,max:1}))}],
  ['zero samples',{...base,samples:0}], ['sample above boundary',{...base,samples:10001}],
  ['negative seed',{...base,seed:-1}], ['seed above uint32',{...base,seed:4294967296}],
  ['duplicate parameter',{...base,parameters:[...base.parameters,...base.parameters]}],
  ['uniform lower bound inverted',{...base,parameters:[{name:'x',distribution:'uniform',min:2,max:1}]}],
  ['normal negative stddev',{...base,parameters:[{name:'x',distribution:'normal',mean:1,stddev:-1,min:0,max:2}]}],
  ['unsupported distribution',{...base,parameters:[{name:'x',distribution:'triangular',min:0,max:1}]}],
  ['metrics empty',{...base,metrics:[]}], ['duplicate metrics',{...base,metrics:['response','response']}],
  ['metrics > limit',{...base,metrics:Array.from({length:33},(_,i)=>`m${i}`)}]
]) { const x=await uncertaintyStudy(spec,{runner}); assert.equal(x.outcome,'HOLD',label); }
assert.equal((await uncertaintyStudy(base,{})).outcome,'HOLD');
assert.equal((await uncertaintyStudy(base,{runner,timeoutMs:0})).outcome,'HOLD');
assert.equal((await uncertaintyStudy(base,{runner:async()=>({outcome:'HOLD',reason:'test'})})).outcome,'HOLD');
assert.equal((await uncertaintyStudy(base,{runner:async()=>({outcome:'OK'})})).outcome,'HOLD');
assert.equal((await uncertaintyStudy(base,{runner:async()=>({outcome:'OK',metrics:{response:NaN}})})).outcome,'HOLD');
const failAt = await uncertaintyStudy({...base,samples:10},{runner:async(_p,{sampleIndex})=>sampleIndex===4?{outcome:'HOLD',reason:'injected'}:{outcome:'OK',metrics:{response:1}}});
assert.equal(failAt.outcome,'HOLD'); assert.equal(failAt.completedSamples,4);
const timed = await uncertaintyStudy({...base,samples:1},{runner:()=>new Promise(r=>setTimeout(()=>r({outcome:'OK',metrics:{response:1}}),30)),timeoutMs:1});
assert.equal(timed.outcome,'HOLD');
const exact = await uncertaintyStudy({...base,parameters:[{name:'x',distribution:'uniform',min:2,max:2}],samples:1},{runner:p=>({outcome:'OK',metrics:{response:p.x}})});
assert.equal(exact.study.metrics.response.min,2); assert.equal(exact.study.metrics.response.max,2);
const maxSamples = await uncertaintyStudy({...base,samples:10000},{runner:async()=>({outcome:'OK',metrics:{response:1}})}); assert.equal(maxSamples.outcome,'OK');
const maxParams = await uncertaintyStudy({...base,parameters:Array.from({length:32},(_,i)=>({name:`p${i}`,distribution:'uniform',min:0,max:1}))},{runner:async p=>({outcome:'OK',metrics:{response:Object.values(p).reduce((a,b)=>a+b,0)}})}); assert.equal(maxParams.outcome,'OK');
const maxMetrics = Array.from({length:32},(_,i)=>`m${i}`); const metricBoundary = await uncertaintyStudy({...base,metrics:maxMetrics},{runner:async()=>({outcome:'OK',metrics:Object.fromEntries(maxMetrics.map(m=>[m,1]))})}); assert.equal(metricBoundary.outcome,'OK');
const maxSeed = await uncertaintyStudy({...base,seed:4294967295},{runner}); assert.equal(maxSeed.outcome,'OK');
assert.deepEqual(UNCERTAINTY_LIMITS,{parameters:32,samples:10000,metrics:32,magnitude:1e50});
console.log('uncertainty tests: PASS (25 assertions/groups)');
