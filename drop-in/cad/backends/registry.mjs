// Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
import { createOcctBackend, createManifoldBackend, createCgalBackend } from './node-occt-adapter.mjs';
const extensions = new Map();
/** Register a third-party adapter without changing cadClip or the canonical kernel. */
export function registerCadBackend(backend,{priority=0}={}) {
  if(!backend||typeof backend.name!=='string'||!backend.name.trim()||typeof backend.intersect!=='function'||typeof backend.probe!=='function') throw new TypeError('Backend requires a non-empty name, probe(), and intersect()');
  if(extensions.has(backend.name)) throw new Error(`CAD backend already registered: ${backend.name}`);
  if(!Array.isArray(backend.capabilities)) throw new TypeError('Backend capabilities must be an array');
  extensions.set(backend.name,{backend,priority:Number.isFinite(priority)?priority:0});
  return ()=>extensions.delete(backend.name);
}
/** Discover built-in and registered engines. Probe failures are unavailable, never success. */
export async function discoverCadBackends(options={}) {
  const candidates=[
    {backend:createCgalBackend(options.cgal),priority:300},
    {backend:createOcctBackend(options.occt),priority:200},
    {backend:createManifoldBackend(options.manifold),priority:100},
    ...[...extensions.values()].map(x=>x)
  ].sort((a,b)=>b.priority-a.priority);
  const records=[];
  for(const {backend} of candidates){
    let available=false,detail='not detected';
    try{available=await backend.probe();detail=available?'available':'dependency or executable not installed';}
    catch(e){detail=String(e.message||e);}
    records.push({name:backend.name,kind:backend.kind||'mesh',capabilities:backend.capabilities,available,detail,backend:available?backend:null});
  }
  return records;
}
/**
 * `auto` selects CGAL EPECK, then OCCT, then Manifold3D, then any registered
 * extension according to priority. A requested missing backend is not silently
 * replaced by another one; selected remains null and reason is explicit.
 */
export async function selectCadBackend({preferred='auto',...options}={}) {
  const discovered=await discoverCadBackends(options);
  const found=discovered.filter(x=>x.available);
  const selected=preferred==='auto'?found[0]:found.find(x=>x.name===preferred);
  return {selected:selected?.backend||null,selectedName:selected?.name||null,available:discovered.map(({backend,...r})=>r),reason:selected?null:`Requested CAD backend '${preferred}' is unavailable`};
}
