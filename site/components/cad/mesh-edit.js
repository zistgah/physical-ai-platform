/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/mesh-edit.js
 * FILE PURPOSE: Editable mesh. Vertices move. Faces are added. A sculpt brush displaces. UV and a material are per face. An index out of range holds.
 * MRD 5.
 */
export function mesh() {
  return { vertices: [], faces: [], uv: [], materials: [] };
}

export function addVertex(m, x, y, z) {
  if (![x, y, z].every(Number.isFinite)) return { outcome: "HOLD", reason: "Vertex is not a number" };
  m.vertices.push({ x, y, z });
  return { outcome: "OK", index: m.vertices.length - 1 };
}

export function addFace(m, indices, material = "default") {
  if (!indices || indices.length < 3) return { outcome: "HOLD", reason: "Face needs 3 vertices" };
  if (indices.some(i => i < 0 || i >= m.vertices.length)) return { outcome: "HOLD", reason: "Index out of range" };
  m.faces.push(indices);
  m.materials.push(material);
  m.uv.push(indices.map((_, k) => ({ u: k / indices.length, v: 0 })));
  return { outcome: "OK", face: m.faces.length - 1 };
}

export function moveVertex(m, index, dx, dy, dz) {
  const v = m.vertices[index];
  if (!v) return { outcome: "HOLD", reason: "Vertex is UNSPECIFIED" };
  v.x += dx; v.y += dy; v.z += dz;
  return { outcome: "OK", vertex: v };
}

export function sculpt(m, center, radius, amount) {
  if (!(radius > 0)) return { outcome: "HOLD", reason: "Radius must be positive" };
  let moved = 0;
  for (const v of m.vertices) {
    const d = Math.hypot(v.x - center.x, v.y - center.y, v.z - center.z);
    if (d <= radius) { v.z += amount * (1 - d / radius); moved++; }
  }
  return { outcome: "OK", moved };
}

export function setUV(m, face, coords) {
  if (!m.uv[face]) return { outcome: "HOLD", reason: "Face is UNSPECIFIED" };
  if (coords.length !== m.faces[face].length) return { outcome: "HOLD", reason: "UV count mismatch" };
  m.uv[face] = coords;
  return { outcome: "OK" };
}

export function setMaterial(m, face, material) {
  if (m.materials[face] == null) return { outcome: "HOLD", reason: "Face is UNSPECIFIED" };
  m.materials[face] = material;
  return { outcome: "OK" };
}
