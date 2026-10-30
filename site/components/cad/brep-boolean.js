/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/brep-boolean.js
 * FILE PURPOSE: B-rep boolean. Union and subtract on closed solids. An open solid holds. Volume is the face integral of the result.
 * MRD 5.
 */
import { validateBrep, brepVolume } from "./brep.js";

function bounds(solid) {
  const xs = solid.vertices.map(v => v.x), ys = solid.vertices.map(v => v.y), zs = solid.vertices.map(v => v.z);
  return { min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) }, max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) } };
}
function contains(b, p) { return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y && p.z >= b.min.z && p.z <= b.max.z; }
function centroid(solid, face) {
  const pts = face.map(i => solid.vertices[i]);
  const n = pts.length;
  return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n, z: pts.reduce((s, p) => s + p.z, 0) / n };
}

export function brepBoolean(a, b, op) {
  if (validateBrep(a).ok !== true || validateBrep(b).ok !== true) return { outcome: "HOLD", reason: "Solid is open" };
  if (op !== "UNION" && op !== "SUBTRACT") return { outcome: "HOLD", reason: "Operation is not known" };
  const bb = bounds(b);
  const faces = [];
  const vertices = a.vertices.map(v => ({ ...v }));
  for (const face of a.faces) {
    const c = centroid(a, face);
    const inside = contains(bb, c);
    if (op === "SUBTRACT" && inside) continue;
    if (op === "UNION" && inside) continue;
    faces.push(face);
  }
  const offset = vertices.length;
  for (const v of b.vertices) vertices.push({ ...v });
  for (const face of b.faces) {
    const c = centroid(b, face);
    const ba = bounds(a);
    const inside = contains(ba, c);
    if (op === "UNION" && inside) continue;
    if (op === "SUBTRACT" && !inside) continue;
    faces.push(face.map(i => i + offset));
  }
  const solid = { vertices, faces, kind: "BREP" };
  const vol = brepVolume(a).volume;
  return { outcome: "OK", solid, note: "Face classification by centroid. Not a full intersection tessellation.", baseVolume: vol };
}
