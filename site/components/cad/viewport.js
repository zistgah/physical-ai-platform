/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/viewport.js
 * FILE PURPOSE: Viewport. Projects a mesh to 2D and rasterizes to a pixel buffer. Selection is a pick by nearest projected vertex. An empty mesh holds.
 * MRD 5.
 */
export function project(mesh, width = 64, height = 64) {
  if (!mesh?.vertices?.length) return { outcome: "HOLD", reason: "Mesh is empty" };
  const buf = new Uint8Array(width * height);
  const projected = mesh.vertices.map(v => ({
    x: Math.round((v.x + 1) * 0.5 * (width - 1)),
    y: Math.round((1 - (v.y + 1) * 0.5) * (height - 1)),
    z: v.z
  }));
  for (const p of projected) {
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
    buf[p.y * width + p.x] = 255;
  }
  return { outcome: "OK", buffer: buf, width, height, projected };
}

export function pick(projected, x, y) {
  if (!projected?.length) return { outcome: "HOLD", reason: "Nothing projected" };
  let best = null, bestD = Infinity;
  projected.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return { outcome: "OK", index: best, distance: bestD };
}
