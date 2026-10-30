/** Copyright © 1993-2026 Abhishek Choudhary. GPL-3.0-only.
 * Node/desktop host adapter for the optional Python geometry worker.
 * This file is intentionally separate from the browser-compatible fabrication core.
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKER = path.resolve(here, '../python/fabrication_geometry_worker.py');
const ALLOWED_IDS = new Set(['cadquery-occt','trimesh','shapely','scipy','fabrication-python-geometry']);
const ENV_ALLOWLIST = new Set(['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS','QT_QPA_PLATFORM']);

function runOne({ pythonExecutable, workerPath, allowedRoot, backendId, operation, payload, timeoutMs, signal, maxOutputBytes, maxInputBytes, environment }) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_IDS.has(backendId)) return reject(new Error(`Python worker backend ${backendId} is not allowlisted`));
    if (!allowedRoot || typeof allowedRoot !== 'string') return reject(new Error('allowedRoot must be explicitly configured'));
    const safeEnv = { ...(environment || {}), PATH:process.env.PATH || '', HOME:path.resolve(allowedRoot), LANG:'C.UTF-8', LC_ALL:'C.UTF-8', PYTHONNOUSERSITE:'1', PYTHONUNBUFFERED:'1', FABRICATION_ALLOWED_ROOT:path.resolve(allowedRoot), FABRICATION_MAX_INPUT_BYTES:String(maxInputBytes), ...(process.env.SYSTEMROOT ? {SYSTEMROOT:process.env.SYSTEMROOT} : {}) };
    const child = spawn(pythonExecutable, [workerPath], { shell:false, windowsHide:true, env:safeEnv, stdio:['pipe','pipe','pipe'] });
    let stdout='', stderr='', settled=false, timer;
    const finish = (err, value) => { if(settled)return; settled=true; clearTimeout(timer); signal?.removeEventListener('abort',abort); if(err)reject(err);else resolve(value); };
    const abort = () => { child.kill('SIGKILL'); finish(new Error('Python backend request aborted')); };
    signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error(`Python worker timed out after ${timeoutMs} ms`));},timeoutMs);
    child.stdout.on('data',chunk=>{stdout+=chunk.toString('utf8');if(Buffer.byteLength(stdout)>maxOutputBytes){child.kill('SIGKILL');finish(new Error('Python worker stdout exceeded configured limit'));}});
    child.stderr.on('data',chunk=>{stderr+=chunk.toString('utf8');if(Buffer.byteLength(stderr)>maxOutputBytes){child.kill('SIGKILL');finish(new Error('Python worker stderr exceeded configured limit'));}});
    child.on('error',err=>finish(err));
    child.on('close',(code,term)=>{
      if(settled)return;
      if(code!==0)return finish(new Error(`Python worker exited ${code ?? term}: ${stderr.slice(0,2000)}`));
      const lines=stdout.trim().split(/\r?\n/).filter(Boolean);
      if(lines.length!==1)return finish(new Error(`Expected exactly one JSON response, received ${lines.length}`));
      try { finish(null,JSON.parse(lines[0])); } catch(e) { finish(new Error(`Malformed worker JSON: ${e.message}`)); }
    });
    child.stdin.on('error',err=>finish(err));
    const requestLine=JSON.stringify({backendId,operation,payload})+'\n';
    if(Buffer.byteLength(requestLine)>maxInputBytes){child.kill('SIGKILL');return finish(new Error('Python worker request exceeds configured input limit'));}
    child.stdin.end(requestLine);
  });
}

export function createPythonGeometryHost({ pythonExecutable='python3', workerPath=DEFAULT_WORKER, allowedRoot, maxOutputBytes=4*1024*1024, maxInputBytes=10*1024*1024, defaultTimeoutMs=120000, environment={} }={}) {
  if(!allowedRoot) throw new TypeError('allowedRoot is mandatory; worker file access must be confined');
  const resolvedRoot=path.resolve(allowedRoot);
  if(!existsSync(resolvedRoot)||!statSync(resolvedRoot).isDirectory()) throw new TypeError('allowedRoot must be an existing directory');
  if(!Number.isSafeInteger(maxOutputBytes)||maxOutputBytes<1024) throw new TypeError('maxOutputBytes must be >= 1024');
  if(!Number.isSafeInteger(maxInputBytes)||maxInputBytes<1024||maxInputBytes>10*1024*1024) throw new TypeError('maxInputBytes must be 1024..10485760');
  if(!environment || typeof environment!=='object' || Array.isArray(environment) || Object.keys(environment).some(k=>!ENV_ALLOWLIST.has(k) || typeof environment[k]!=='string')) throw new TypeError('environment may contain only string values for OMP_NUM_THREADS, OPENBLAS_NUM_THREADS, MKL_NUM_THREADS, NUMEXPR_NUM_THREADS or QT_QPA_PLATFORM');
  const call = args => runOne({pythonExecutable,workerPath,allowedRoot:resolvedRoot,maxOutputBytes,maxInputBytes,environment,...args,timeoutMs:args.timeoutMs||defaultTimeoutMs});
  return Object.freeze({
    probe: async ({backendId}) => {
      const r=await call({backendId,operation:'probe',payload:{},timeoutMs:15000});
      if(r.protocol!=='PAI-FAB-BACKEND/1'||r.backendId!==backendId||r.status!=='COMPLETED') return {state:'UNAVAILABLE',reason:r.reason||'Invalid worker probe'};
      return r.result;
    },
    invoke: async ({backendId,operation,payload,timeoutMs,signal}) => call({backendId,operation,payload,timeoutMs,signal})
  });
}
