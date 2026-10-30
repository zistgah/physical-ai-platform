/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/nurbs-surface.js
 * FILE PURPOSE: NURBS surface. Evaluated from a control grid, weights, and two knot vectors. A bad grid holds.
 * MRD 5.
 */
function basis(i, p, u, knots) {
  if (p === 0) return u >= knots[i] && u < knots[i + 1] ? 1 : 0;
  const d1 = knots[i + p] - knots[i];
  const d2 = knots[i + p + 1] - knots[i + 1];
  const a = d1 === 0 ? 0 : ((u - knots[i]) / d1) * basis(i, p - 1, u, knots);
  const b = d2 === 0 ? 0 : ((knots[i + p + 1] - u) / d2) * basis(i + 1, p - 1, u, knots);
  return a + b;
}

export function nurbsSurface(grid, weights, knotsU, knotsV, degree, samples = 4) {
  if (!grid?.length || !grid[0]?.length) return { outcome: "HOLD", reason: "Grid is empty" };
  const nu = grid.length, nv = grid[0].length;
  if (nu < degree + 1 || nv < degree + 1) return { outcome: "HOLD", reason: "Grid is too small" };
  const u0 = knotsU[degree], u1 = knotsU[knotsU.length - degree - 1];
  const v0 = knotsV[degree], v1 = knotsV[knotsV.length - degree - 1];
  const points = [];
  for (let s = 0; s < samples; s++) {
    const row = [];
    const u = Math.min(u0 + ((u1 - u0) * s) / (samples - 1 || 1), u1 - 1e-9);
    for (let t = 0; t < samples; t++) {
      const v = Math.min(v0 + ((v1 - v0) * t) / (samples - 1 || 1), v1 - 1e-9);
      let x = 0, y = 0, z = 0, w = 0;
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const b = basis(i, degree, u, knotsU) * basis(j, degree, v, knotsV) * weights[i][j];
        x += b * grid[i][j].x; y += b * grid[i][j].y; z += b * grid[i][j].z; w += b;
      }
      if (w === 0) return { outcome: "HOLD", reason: "Weight sum is zero" };
      row.push({ x: x / w, y: y / w, z: z / w });
    }
    points.push(row);
  }
  return { outcome: "OK", points, samples };
}
