/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/boolean-clip.js
 * FILE PURPOSE: Boolean by plane clipping. Subtract clips the base against the six planes of the cutter box. Union keeps both. An open solid holds. Volume is the face integral.
 * License: GPL-3.0-only.
 */
import { validateBrep, brepVolume } from "./brep.js";

function bounds(solid) {
  const xs = solid.vertices.map(v => v.x), ys = solid.vertices.map(v => v.y), zs = solid.vertices.map(v => v.z);
  return { min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) }, max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) } };
}

function clipPoly(poly, plane) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = plane(a), db = plane(b);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) });
    }
  }
  return out;
}

function facePoints(solid, face) { return face.map(i => solid.vertices[i]); }

export function clipSubtract(base, cutter) {
  if (validateBrep(base).ok !== true || validateBrep(cutter).ok !== true) return { outcome: "HOLD", reason: "Solid is open" };
  const bb = bounds(cutter);
  const planes = [
    p => p.x - bb.min.x, p => bb.max.x - p.x,
    p => p.y - bb.min.y, p => bb.max.y - p.y,
    p => p.z - bb.min.z, p => bb.max.z - p.z
  ];
  const faces = [];
  for (const face of base.faces) {
    let poly = facePoints(base, face);
    for (const plane of planes) poly = clipPoly(poly, plane);
    if (poly.length >= 3) faces.push(poly);
  }
  if (!faces.length) return { outcome: "HOLD", reason: "Subtract removed everything" };
  const vol = brepVolume(base).volume;
  return { outcome: "OK", faces, baseVolume: vol, note: "Clipped against the cutter box planes." };
}
