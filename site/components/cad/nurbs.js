/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/nurbs.js
 * FILE PURPOSE: NURBS curve evaluation and freeform extrude. A closed curve is capped so the extrude is a closed solid.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * NURBS curve and freeform extrude – Iteration 20
 * Evaluated from control points, weights, and knots. Volume from the mesh.
 */
function basis(i, p, u, knots) {
  if (p === 0) return u >= knots[i] && u < knots[i + 1] ? 1 : 0;
  const d1 = knots[i + p] - knots[i];
  const d2 = knots[i + p + 1] - knots[i + 1];
  const a = d1 === 0 ? 0 : ((u - knots[i]) / d1) * basis(i, p - 1, u, knots);
  const b = d2 === 0 ? 0 : ((knots[i + p + 1] - u) / d2) * basis(i + 1, p - 1, u, knots);
  return a + b;
}

/** nurbsCurve: NURBS curve evaluation and freeform extrude. A closed curve is capped so the extrude is a closed solid. */
export function nurbsCurve(controls, weights, knots, degree, samples = 16) {
  if (!controls || controls.length < degree + 1) return { outcome: "HOLD", reason: "Not enough control points" };
  if (weights.length !== controls.length) return { outcome: "HOLD", reason: "Weight count mismatch" };
  const n = controls.length - 1;
  if (knots.length !== n + degree + 2) return { outcome: "HOLD", reason: "Knot vector length mismatch" };
  const u0 = knots[degree], u1 = knots[knots.length - degree - 1];
  const points = [];
  for (let s = 0; s < samples; s++) {
    const u = u0 + ((u1 - u0) * s) / (samples - 1 || 1);
    const uu = Math.min(u, u1 - 1e-9);
    let x = 0, y = 0, wsum = 0;
    for (let i = 0; i <= n; i++) {
      const b = basis(i, degree, uu, knots) * weights[i];
      x += b * controls[i].x;
      y += b * controls[i].y;
      wsum += b;
    }
    if (wsum === 0) return { outcome: "HOLD", reason: "Degenerate basis" };
    points.push({ x: x / wsum, y: y / wsum });
  }
  return { outcome: "OK", points };
}

/** nurbsExtrude: NURBS curve evaluation and freeform extrude. A closed curve is capped so the extrude is a closed solid. */
export function nurbsExtrude(controls, weights, knots, degree, height, samples = 12) {
  const curve = nurbsCurve(controls, weights, knots, degree, samples);
  if (curve.outcome === "HOLD") return curve;
  let pts = curve.points.map(p => ({ x: p.x, y: p.y, z: 0 }));
  if (Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) > 1e-6) pts.push({ ...pts[0] });
  const n = pts.length - 1;
  const vertices = [...pts.slice(0, n), ...pts.slice(0, n).map(p => ({ ...p, z: height }))];
  const faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j]);
    faces.push([i, n + j, n + i]);
  }
  for (let i = 1; i < n - 1; i++) faces.push([0, i + 1, i]);
  for (let i = 1; i < n - 1; i++) faces.push([n, n + i, n + i + 1]);
  return { outcome: "OK", mesh: { vertices, faces }, closed: true, points: pts };
}

