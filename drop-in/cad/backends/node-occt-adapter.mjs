// Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
/** Node-only adapter. Browser code must import module.js, never this file. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
function invoke(python, script, payload, { timeout = 120000, maxBuffer = 256 * 1024 * 1024 } = {}) {
  const r = spawnSync(python, [script], { input: JSON.stringify(payload), encoding: 'utf8', timeout, maxBuffer });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Backend process exited ${r.status}: ${(r.stderr || '').slice(0, 2000)}`);
  try { return JSON.parse(r.stdout); }
  catch { throw new Error(`Backend returned invalid JSON: ${(r.stdout || '').slice(0, 1000)}`); }
}
export function createOcctBackend({ python = process.env.PYTHON || 'python3', script = join(here, 'occt_backend.py'), timeout = 120000 } = {}) {
  return {
    name: 'OCCT', kind: 'brep', capabilities: ['intersection','non-convex-polyhedral','multi-solid-output','brep-validation'],
    probe() { try { const r=invoke(python,script,{action:'probe'}); return r.available===true; } catch { return false; } },
    intersect(base,cutter,options={}) { return invoke(python,script,{base,cutter,...options},{timeout}); }
  };
}
export function createManifoldBackend({ python = process.env.PYTHON || 'python3', script = join(here, 'manifold_backend.py'), timeout = 120000 } = {}) {
  return {
    name: 'Manifold3D', kind: 'mesh', capabilities: ['intersection','manifold-mesh-output'],
    probe() { try { const r=invoke(python,script,{action:'probe'}); return r.available===true; } catch { return false; } },
    intersect(base,cutter,options={}) { return invoke(python,script,{base,cutter,...options},{timeout}); }
  };
}
export function createCgalBackend({ executable = process.env.CAD_CGAL_BACKEND || 'cad-cgal-boolean', timeout = 120000 } = {}) {
  return {
    name: 'CGAL-EPECK', kind: 'mesh', capabilities: ['intersection','exact-predicates','exact-constructions'],
    probe() { try { const r=spawnSync(executable,[],{input:'{"action":"probe"}',encoding:'utf8',timeout:5000}); return r.status===0 && JSON.parse(r.stdout).available===true; } catch { return false; } },
    intersect(base,cutter,options={}) { const r=spawnSync(executable,[],{input:JSON.stringify({base,cutter,...options}),encoding:'utf8',timeout,maxBuffer:256*1024*1024}); if(r.error) throw r.error; if(r.status!==0) throw new Error(`CGAL backend exited ${r.status}: ${(r.stderr||'').slice(0,2000)}`); try{return JSON.parse(r.stdout);}catch{throw new Error('CGAL backend returned invalid JSON');} }
  };
}
