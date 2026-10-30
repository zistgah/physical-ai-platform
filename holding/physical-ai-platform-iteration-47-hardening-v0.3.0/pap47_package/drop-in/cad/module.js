/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Clips a triangulated surface against the half-space n·x >= offset. This is surface clipping, not a closed-solid Boolean. */
const finite3 = p => p && [p.x,p.y,p.z].every(Number.isFinite);
function validate(mesh) {
  if (!mesh || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces) || !mesh.vertices.length || !mesh.faces.length) return 'Mesh requires vertices and faces';
  if (!mesh.vertices.every(finite3)) return 'Vertices must be finite 3D points';
  for (const f of mesh.faces) if (!Array.isArray(f) || f.length < 3 || f.some(i => !Number.isInteger(i) || i < 0 || i >= mesh.vertices.length)) return 'Faces must contain valid vertex indices';
  return null;
}
export function cadClip(base, cutter, {epsilon=1e-9}={}) {
  const e=validate(base); if(e) return {outcome:'HOLD',reason:`Base: ${e}`};
  if (!cutter || !finite3(cutter.normal) || Math.hypot(cutter.normal.x,cutter.normal.y,cutter.normal.z) <= epsilon || !Number.isFinite(cutter.offset)) return {outcome:'HOLD',reason:'Cutter must define a finite plane normal and offset'};
  if (!(epsilon>0) || !Number.isFinite(epsilon)) return {outcome:'HOLD',reason:'epsilon must be finite and positive'};
  const n=cutter.normal, mag=Math.hypot(n.x,n.y,n.z), unit={x:n.x/mag,y:n.y/mag,z:n.z/mag};
  const vertices=[], faces=[], cache=new Map();
  const dist=p=>unit.x*p.x+unit.y*p.y+unit.z*p.z-cutter.offset/mag;
  const add=p=>{const k=[p.x,p.y,p.z].map(v=>Math.round(v/epsilon)).join(':'); if(cache.has(k)) return cache.get(k); const id=vertices.length; vertices.push(p); cache.set(k,id); return id;};
  const intersect=(a,b,da,db)=>{const t=da/(da-db); return {x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)};};
  for(const face of base.faces){
    const poly=face.map(i=>base.vertices[i]); let out=[];
    for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=dist(a),db=dist(b),ina=da>=-epsilon,inb=db>=-epsilon;
      if(ina&&inb) out.push(b); else if(ina&&!inb) out.push(intersect(a,b,da,db)); else if(!ina&&inb){out.push(intersect(a,b,da,db));out.push(b);}}
    if(out.length>=3){const ids=out.map(add); for(let i=1;i<ids.length-1;i++) if(new Set([ids[0],ids[i],ids[i+1]]).size===3) faces.push([ids[0],ids[i],ids[i+1]]);}
  }
  return {outcome:'OK',operation:'TRIANGLE_MESH_HALFSPACE_CLIP',vertices,faces,diagnostics:{inputFaces:base.faces.length,outputFaces:faces.length,epsilon,plane:{normal:unit,offset:cutter.offset/mag}},qualification:'SURFACE_CLIP_ONLY'};
}
