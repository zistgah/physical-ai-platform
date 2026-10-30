/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/brep.js
 * FILE PURPOSE: Boundary representation. Vertices, edges, faces, and a shell. A closed solid has every edge used by exactly two faces. Volume is the face integral.
 * MRD 5: workbench as a B-rep kernel.
 */
function v3(x, y, z) { return { x, y, z }; }
function sub(a, b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

export function boxBrep(size = 10) {
  if (!(size > 0)) return { outcome: "HOLD", reason: "Size must be positive" };
  const s = size;
  const vertices = [
    v3(0, 0, 0), v3(s, 0, 0), v3(s, s, 0), v3(0, s, 0),
    v3(0, 0, s), v3(s, 0, s), v3(s, s, s), v3(0, s, s)
  ];
  // faces as vertex loops, outward
  const faces = [
    [0, 3, 2, 1], // bottom
    [4, 5, 6, 7], // top
    [0, 1, 5, 4], // front
    [1, 2, 6, 5], // right
    [2, 3, 7, 6], // back
    [3, 0, 4, 7]  // left
  ];
  return { outcome: "OK", solid: { vertices, faces, kind: "BREP" } };
}

export function edgeUse(solid) {
  const use = new Map();
  for (const face of solid.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const key = a < b ? a + ">" + b : b + ">" + a;
      use.set(key, (use.get(key) || 0) + 1);
    }
  }
  return use;
}

export function validateBrep(solid) {
  if (!solid?.vertices?.length || !solid?.faces?.length) return { ok: false, reason: "Empty B-rep" };
  const use = edgeUse(solid);
  const bad = [...use.entries()].filter(([, n]) => n !== 2);
  return { ok: bad.length === 0, edges: use.size, open: bad.length };
}

export function brepVolume(solid) {
  const check = validateBrep(solid);
  if (!check.ok) return { outcome: "HOLD", reason: "Open B-rep", open: check.open };
  let v = 0;
  for (const face of solid.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const A = solid.vertices[face[0]], B = solid.vertices[face[i]], C = solid.vertices[face[i + 1]];
      v += dot(A, cross(sub(B, A), sub(C, A)));
    }
  }
  return { outcome: "OK", volume: Math.abs(v) / 6 };
}

export function brepFromProfile(points, height) {
  if (!points || points.length < 3) return { outcome: "HOLD", reason: "Profile needs 3 points" };
  if (!(height > 0)) return { outcome: "HOLD", reason: "Height must be positive" };
  const n = points.length;
  const vertices = [];
  for (const p of points) vertices.push(v3(p.x, p.y, 0));
  for (const p of points) vertices.push(v3(p.x, p.y, height));
  const faces = [];
  faces.push([...Array(n).keys()].reverse()); // bottom, outward down
  faces.push([...Array(n).keys()].map(i => i + n)); // top
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, j + n, i + n]);
  }
  const solid = { vertices, faces, kind: "BREP" };
  const check = validateBrep(solid);
  if (!check.ok) return { outcome: "HOLD", reason: "Extrude is not closed", open: check.open };
  return { outcome: "OK", solid, volume: brepVolume(solid).volume };
}
