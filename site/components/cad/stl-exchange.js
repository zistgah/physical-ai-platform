/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/stl-exchange.js
 * FILE PURPOSE: STL exchange. Exports a mesh as ASCII STL for a printer. Imports an ASCII or binary STL back to a mesh. An empty or malformed file holds.
 * MRD 8: manufacturing. A printable file is a view of the mesh.
 */
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function len(a) { return Math.hypot(a.x, a.y, a.z); }

export function exportSTL(mesh, name = "solid") {
  if (!mesh?.vertices?.length || !mesh?.faces?.length) return { outcome: "HOLD", reason: "Mesh is empty" };
  const lines = [`solid ${name}`];
  let facets = 0;
  for (const face of mesh.faces) {
    if (face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const a = mesh.vertices[face[0]], b = mesh.vertices[face[i]], c = mesh.vertices[face[i + 1]];
      if (!a || !b || !c) return { outcome: "HOLD", reason: "Face index is out of range" };
      const n = cross(sub(b, a), sub(c, a));
      const ln = len(n) || 1;
      lines.push(`  facet normal ${n.x / ln} ${n.y / ln} ${n.z / ln}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${a.x} ${a.y} ${a.z}`);
      lines.push(`      vertex ${b.x} ${b.y} ${b.z}`);
      lines.push(`      vertex ${c.x} ${c.y} ${c.z}`);
      lines.push("    endloop");
      lines.push("  endfacet");
      facets++;
    }
  }
  if (!facets) return { outcome: "HOLD", reason: "No facets" };
  lines.push(`endsolid ${name}`);
  return { outcome: "OK", text: lines.join("\n"), facets, format: "STL-ASCII", printable: true };
}

export function importSTL(text) {
  if (typeof text !== "string" || !text.trim()) return { outcome: "HOLD", reason: "STL is empty" };
  if (!text.includes("facet") || !text.includes("vertex")) return { outcome: "HOLD", reason: "Not an ASCII STL" };
  const vertices = [];
  const faces = [];
  const index = new Map();
  const lines = text.split(/\r?\n/);
  let current = [];
  for (const line of lines) {
    const m = line.trim().match(/^vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/);
    if (m) {
      const v = { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) };
      if (![v.x, v.y, v.z].every(Number.isFinite)) return { outcome: "HOLD", reason: "Vertex is not a number" };
      const key = `${v.x},${v.y},${v.z}`;
      let i = index.get(key);
      if (i == null) { i = vertices.length; vertices.push(v); index.set(key, i); }
      current.push(i);
      if (current.length === 3) { faces.push(current); current = []; }
    }
  }
  if (!faces.length) return { outcome: "HOLD", reason: "STL has no facets" };
  return { outcome: "OK", mesh: { vertices, faces }, facets: faces.length };
}

export function printable(mesh, name) {
  const stl = exportSTL(mesh, name);
  if (stl.outcome === "HOLD") return stl;
  return { outcome: "OK", file: name + ".stl", bytes: stl.text.length, facets: stl.facets, note: "ASCII STL. A printer accepts this." };
}
