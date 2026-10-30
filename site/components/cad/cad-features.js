/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/cad-features.js
 * FILE PURPOSE: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * CAD feature geometry – Iteration 16
 * Partial revolve, general pocket, chamfer, fillet, shell, draft,
 * arc/spline profiles, assembly interference, STEP B-rep.
 * Every solid still has to pass the mesh contract.
 */

import { meshVolume, triangleCount } from "./cad-contracts.js";

/** v3: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function v3(x = 0, y = 0, z = 0) { return { x, y, z }; }
function nz(v) { return v ?? 0; }
function sub(a, b) { return v3(a.x - b.x, a.y - b.y, nz(a.z) - nz(b.z)); }
function add(a, b) { return v3(a.x + b.x, a.y + b.y, nz(a.z) + nz(b.z)); }
function scale(a, s) { return v3(a.x * s, a.y * s, nz(a.z) * s); }
function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(a) { return Math.hypot(a.x, a.y, a.z); }

/** polygonArea: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** ensureCCW: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function ensureCCW(points) {
  return polygonArea(points) < 0 ? [...points].reverse() : points.map(p => ({ ...p }));
}
/** ensureCW: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function ensureCW(points) {
  return polygonArea(points) > 0 ? [...points].reverse() : points.map(p => ({ ...p }));
}

function triangulate(mesh) {
  const faces = [];
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) faces.push([face[0], face[i], face[i + 1]]);
  }
  return { vertices: mesh.vertices.map(p => ({ ...p })), faces };
}


/** boxWithCavity: Performs box with cavity for this module. */
export function boxWithCavity(outer, cavity) {
  // outer/cavity: {x0,y0,x1,y1,z0,z1}. Cavity opens through the top of the outer box.
  const v = [];
  const add = (x, y, z) => { v.push({ x, y, z }); return v.length - 1; };
  const o = outer, c = cavity;
  const faces = [];
  const quad = (a, b, c1, d) => { faces.push([a, b, c1]); faces.push([a, c1, d]); };
  // outer bottom
  const ob = [add(o.x0,o.y0,o.z0), add(o.x1,o.y0,o.z0), add(o.x1,o.y1,o.z0), add(o.x0,o.y1,o.z0)];
  quad(ob[0], ob[3], ob[2], ob[1]);
  // outer sides
  const ot = [add(o.x0,o.y0,o.z1), add(o.x1,o.y0,o.z1), add(o.x1,o.y1,o.z1), add(o.x0,o.y1,o.z1)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(ob[i], ob[j], ot[j], ot[i]);
  }
  // cavity floor
  const cf = [add(c.x0,c.y0,c.z0), add(c.x1,c.y0,c.z0), add(c.x1,c.y1,c.z0), add(c.x0,c.y1,c.z0)];
  quad(cf[0], cf[1], cf[2], cf[3]);
  // cavity walls
  const ct = [add(c.x0,c.y0,c.z1), add(c.x1,c.y0,c.z1), add(c.x1,c.y1,c.z1), add(c.x0,c.y1,c.z1)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(ct[i], ct[j], cf[j], cf[i]);
  }
  // top annulus as four quads
  const top = [
    [ot[0], ot[1], ct[1], ct[0]],
    [ot[1], ot[2], ct[2], ct[1]],
    [ot[2], ot[3], ct[3], ct[2]],
    [ot[3], ot[0], ct[0], ct[3]]
  ];
  for (const q of top) quad(...q);
  return { vertices: v, faces };
}

/** rectUnionProfile: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function rectUnionProfile(a, b) {
  const x0 = Math.min(a.x0, b.x0), y0 = Math.min(a.y0, b.y0);
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const ix0 = Math.max(a.x0, b.x0), iy0 = Math.max(a.y0, b.y0);
  const ix1 = Math.min(a.x1, b.x1), iy1 = Math.min(a.y1, b.y1);
  if (ix0 >= ix1 || iy0 >= iy1) return null;
  return [
    { x: a.x0, y: a.y0 }, { x: a.x1, y: a.y0 }, { x: a.x1, y: b.y0 },
    { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 },
    { x: b.x0, y: a.y1 }, { x: a.x0, y: a.y1 }
  ];
}

/** extrudeProfile: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function extrudeProfile(points, height, { topScale = 1, topOffset = { x: 0, y: 0 } } = {}) {
  const loop = ensureCCW(points);
  const n = loop.length;
  const cx = loop.reduce((s, p) => s + p.x, 0) / n;
  const cy = loop.reduce((s, p) => s + p.y, 0) / n;
  const bottom = loop.map(p => v3(p.x, p.y, p.z || 0));
  const top = loop.map(p => v3(
    cx + (p.x - cx) * topScale + (topOffset.x || 0),
    cy + (p.y - cy) * topScale + (topOffset.y || 0),
    (p.z || 0) + height
  ));
  const vertices = [...bottom, ...top];
  const faces = [];
  faces.push([...Array(n).keys()].reverse());
  faces.push([...Array(n).keys()].map(i => n + i));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j, n + i]);
  }
  return triangulate({ vertices, faces });
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

function earClip(poly) {
  const pts = poly.map(p => ({ x: p.x, y: p.y }));
  const idx = pts.map((_, i) => i);
  const tris = [];
  const ccw = polygonArea(pts) > 0;
  const convex = (a, b, c) => {
    const cr = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return ccw ? cr > 1e-8 : cr < -1e-8;
  };
  const insideTri = (a, b, c, p) => {
    const s1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const s2 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
    const s3 = (a.x - c.x) * (p.y - c.y) - (a.y - c.y) * (p.x - c.x);
    return ccw ? (s1 >= -1e-8 && s2 >= -1e-8 && s3 >= -1e-8) : (s1 <= 1e-8 && s2 <= 1e-8 && s3 <= 1e-8);
  };
  let guard = idx.length * idx.length + 5;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      if (!convex(pts[ia], pts[ib], pts[ic])) continue;
      if (idx.some(j => j !== ia && j !== ib && j !== ic && insideTri(pts[ia], pts[ib], pts[ic], pts[j]))) continue;
      tris.push([ia, ib, ic]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push([...idx]);
  return tris;
}

function earClipIndexed(poly) {
  const pts = poly.map(p => ({ x: p.x, y: p.y }));
  const idx = pts.map((_, i) => i);
  const tris = [];
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const same = (a, b) => Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.y - b.y) < 1e-8;
  let guard = 500;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      const cr = cross(pts[ia], pts[ib], pts[ic]);
      if (Math.abs(cr) < 1e-6) { idx.splice(i, 1); cut = true; break; }
      if (cr <= 0) continue;
      let bad = false;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        const p = pts[j];
        if (same(p, pts[ia]) || same(p, pts[ib]) || same(p, pts[ic])) continue;
        const c1 = cross(pts[ia], pts[ib], p), c2 = cross(pts[ib], pts[ic], p), c3 = cross(pts[ic], pts[ia], p);
        if (c1 >= -1e-8 && c2 >= -1e-8 && c3 >= -1e-8) { bad = true; break; }
      }
      if (bad) continue;
      tris.push([ia, ib, ic]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push([...idx]);
  return tris;
}

/** extrudeWithHole: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function extrudeWithHole(outerIn, innerIn, height) {
  const O = ensureCCW(outerIn);
  const I = ensureCW(innerIn);
  const n = O.length, m = I.length;
  let bi = 0, bj = 0, best = Infinity;
  O.forEach((p, i) => I.forEach((q, j) => {
    const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
    if (d < best) { best = d; bi = i; bj = j; }
  }));
  const poly = [];
  const map = [];
  for (let k = 0; k < n; k++) { poly.push(O[(bi + k) % n]); map.push((bi + k) % n); }
  poly.push(O[bi]); map.push(bi);
  for (let k = 0; k < m; k++) { poly.push(I[(bj + k) % m]); map.push(n + (bj + k) % m); }
  poly.push(I[bj]); map.push(n + bj);
  const V = [
    ...O.map(p => v3(p.x, p.y, 0)),
    ...I.map(p => v3(p.x, p.y, 0)),
    ...O.map(p => v3(p.x, p.y, height)),
    ...I.map(p => v3(p.x, p.y, height))
  ];
  const faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + m + j]);
    faces.push([i, n + m + j, n + m + i]);
  }
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const a = n + i, b = n + j, c = n + m + n + j, d = n + m + n + i;
    faces.push([a, c, d]);
    faces.push([a, b, c]);
  }
  for (const tri of earClipIndexed(poly)) {
    const mapped = tri.map(i => map[i]);
    if (new Set(mapped).size < 3) continue;
    faces.push(mapped);
    faces.push(mapped.map(i => i + n + m));
  }
  return { vertices: V, faces };
}

/** partialRevolveMesh: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function partialRevolveMesh(points, angleDeg, segments = 24) {
  const angle = Math.max(1, Math.min(360, angleDeg)) * Math.PI / 180;
  const steps = Math.max(2, Math.round(segments * angle / (Math.PI * 2)));
  const closed = Math.abs(angleDeg - 360) < 1e-6;
  const rings = [];
  for (let s = 0; s <= (closed ? steps - 1 : steps); s++) {
    const t = closed ? (s / steps) * Math.PI * 2 : (s / steps) * angle;
    const c = Math.cos(t), si = Math.sin(t);
    rings.push(points.map(p => v3(p.x * c, p.y, p.x * si)));
  }
  const n = points.length;
  const vertices = rings.flat();
  const faces = [];
  const ringCount = rings.length;
  for (let s = 0; s < (closed ? ringCount : ringCount - 1); s++) {
    const s2 = (s + 1) % ringCount;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const a = s * n + i, b = s * n + i2, c = s2 * n + i2, d = s2 * n + i;
      faces.push([a, d, c]);
      faces.push([a, c, b]);
    }
  }
  if (!closed) {
    const start = points.map((_, i) => i);
    const endBase = (ringCount - 1) * n;
    const end = points.map((_, i) => endBase + i);
    for (let i = 1; i < n - 1; i++) faces.push([start[0], start[i + 1], start[i]]);
    for (let i = 1; i < n - 1; i++) faces.push([end[0], end[i], end[i + 1]]);
  }
  return { vertices, faces };
}

/** arcPoints: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function arcPoints(center, radius, startDeg, endDeg, segments = 16) {
  let a0 = startDeg * Math.PI / 180;
  let a1 = endDeg * Math.PI / 180;
  if (a1 < a0) a1 += Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = a0 + (a1 - a0) * (i / segments);
    pts.push({ x: center.x + radius * Math.cos(t), y: center.y + radius * Math.sin(t), curve: "ARC" });
  }
  return pts;
}

/** splinePoints: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function splinePoints(controls, segments = 16) {
  if (controls.length < 2) return controls.map(p => ({ ...p, curve: "SPLINE" }));
  const pts = [];
  for (let i = 0; i < controls.length - 1; i++) {
    const p0 = controls[Math.max(0, i - 1)];
    const p1 = controls[i];
    const p2 = controls[i + 1];
    const p3 = controls[Math.min(controls.length - 1, i + 2)];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      pts.push({ x, y, curve: "SPLINE" });
    }
  }
  pts.push({ ...controls.at(-1), curve: "SPLINE" });
  return pts;
}

/** chamferProfile: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function chamferProfile(points, distance) {
  const loop = ensureCCW(points);
  const out = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const prev = loop[(i + n - 1) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const e1 = sub(cur, prev), e2 = sub(next, cur);
    const l1 = len(e1) || 1, l2 = len(e2) || 1;
    const d = Math.min(distance, l1 / 2 - 1e-6, l2 / 2 - 1e-6);
    out.push(add(cur, scale(e1, -d / l1)));
    out.push(add(cur, scale(e2, d / l2)));
  }
  return out;
}

/** filletProfile: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function filletProfile(points, radius, arcSegments = 8) {
  const loop = ensureCCW(points);
  const out = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const prev = loop[(i + n - 1) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const v1 = scale(sub(prev, cur), 1 / (len(sub(prev, cur)) || 1));
    const v2 = scale(sub(next, cur), 1 / (len(sub(next, cur)) || 1));
    const start = add(cur, scale(v1, radius));
    const end = add(cur, scale(v2, radius));
    const center = add(start, scale(v2, radius));
    const a0 = Math.atan2(start.y - center.y, start.x - center.x);
    let a1 = Math.atan2(end.y - center.y, end.x - center.x);
    while (a1 < a0) a1 += Math.PI * 2;
    if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    const steps = Math.max(2, arcSegments);
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * (s / steps);
      out.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a), curve: "FILLET" });
    }
  }
  return out;
}

/** brepFromMesh: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function brepFromMesh(mesh) {
  const edges = new Map();
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const tri = [face[0], face[i], face[i + 1]];
      for (let e = 0; e < 3; e++) {
        const a = tri[e], b = tri[(e + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!edges.has(key)) edges.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
        edges.get(key).faces.push(face);
      }
    }
  }
  return {
    vertices: mesh.vertices.map((p, i) => ({ id: i, ...p })),
    edges: [...edges.values()],
    faces: mesh.faces.map((f, i) => ({ id: i, loop: f }))
  };
}

/** interference: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function interference(meshA, meshB, eps = 1e-6) {
  const box = (mesh) => {
    const xs = mesh.vertices.map(p => p.x), ys = mesh.vertices.map(p => p.y), zs = mesh.vertices.map(p => p.z);
    return { min: v3(Math.min(...xs), Math.min(...ys), Math.min(...zs)), max: v3(Math.max(...xs), Math.max(...ys), Math.max(...zs)) };
  };
  const ba = box(meshA), bb = box(meshB);
  const overlap = ba.min.x <= bb.max.x && ba.max.x >= bb.min.x
    && ba.min.y <= bb.max.y && ba.max.y >= bb.min.y
    && ba.min.z <= bb.max.z && ba.max.z >= bb.min.z;
  if (!overlap) return { interferes: false, boundingBoxOverlap: false, vertexInside: false, reason: "bounding boxes disjoint" };
  const pointIn = (p, mesh) => {
    let hits = 0;
    for (const face of mesh.faces) {
      const a = mesh.vertices[face[0]], b = mesh.vertices[face[1]], c = mesh.vertices[face[2]];
      if (Math.abs(b.z - a.z) < eps && Math.abs(c.z - a.z) < eps) continue;
      const denom = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y);
      if (Math.abs(denom) < eps) continue;
      const t = ((p.y - a.y) * (c.z - a.z) - (p.z - a.z) * (c.y - a.y)) / denom;
      const u = ((p.z - a.z) * (b.y - a.y) - (p.y - a.y) * (b.z - a.z)) / denom;
      if (t >= 0 && u >= 0 && t + u <= 1 && a.x + t * (b.x - a.x) + u * (c.x - a.x) > p.x) hits++;
    }
    return hits % 2 === 1;
  };
  const inside = meshA.vertices.some(p => pointIn(p, meshB)) || meshB.vertices.some(p => pointIn(p, meshA));
  return { interferes: inside, boundingBoxOverlap: overlap, vertexInside: inside };
}

/** toSTEP: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function toSTEP(solid) {
  const lines = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('Physical AI Platform geometry CAD'),'2;1');",
    `FILE_NAME('${solid.name || solid.id}.stp','2026-10-28T00:00:00',('platform'),(''),' ','geometry-kernel','');`,
    "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));",
    "ENDSEC;",
    "DATA;"
  ];
  let id = 1;
  const pointIds = solid.mesh.vertices.map(p => {
    const n = id++;
    lines.push(`#${n}=CARTESIAN_POINT('',(${p.x},${p.y},${p.z}));`);
    return n;
  });
  const faceIds = [];
  for (const face of solid.mesh.faces) {
    const loopPts = [face[0], face[1], face[2]].map(i => pointIds[i]);
    const poly = id++;
    lines.push(`#${poly}=POLY_LOOP('',(${loopPts.map(n => `#${n}`).join(",")}));`);
    const bound = id++;
    lines.push(`#${bound}=FACE_BOUND('',#${poly},.T.);`);
    const plane = id++;
    lines.push(`#${plane}=PLANE('',#${pointIds[face[0]]});`);
    const adv = id++;
    lines.push(`#${adv}=ADVANCED_FACE('',(#${bound}),#${plane},.T.);`);
    faceIds.push(adv);
  }
  const shell = id++;
  lines.push(`#${shell}=CLOSED_SHELL('',(${faceIds.map(n => `#${n}`).join(",")})));`);
  const brep = id++;
  lines.push(`#${brep}=MANIFOLD_SOLID_BREP('${solid.name || "solid"}',#${shell});`);
  const shape = id++;
  lines.push(`#${shape}=ADVANCED_BREP_SHAPE_REPRESENTATION('',(#${brep}),#${id});`);
  lines.push(`#${id}=AXIS2_PLACEMENT_3D('',#${pointIds[0]},#${id+1},#${id+2});`);
  lines.push(`#${id+1}=DIRECTION('',(0.,0.,1.));`);
  lines.push(`#${id+2}=DIRECTION('',(1.,0.,0.));`);
  lines.push("ENDSEC;");
  lines.push("END-ISO-10303-21;");
  return { text: lines.join("\n"), entities: id + 2, points: pointIds.length, faces: faceIds.length };
}

export { meshVolume, triangleCount, pointInPoly };

function clipPolygon(poly, plane, eps = 1e-8) {
  if (!poly.length) return [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], nxt = poly[(i + 1) % poly.length];
    const dc = dot(plane.normal, cur) + plane.d;
    const dn = dot(plane.normal, nxt) + plane.d;
    const cin = dc >= -eps, nin = dn >= -eps;
    if (cin && nin) out.push(nxt);
    else if (cin && !nin) {
      const t = dc / (dc - dn);
      out.push(v3(cur.x + (nxt.x - cur.x) * t, cur.y + (nxt.y - cur.y) * t, cur.z + (nxt.z - cur.z) * t));
    } else if (!cin && nin) {
      const t = dc / (dc - dn);
      out.push(v3(cur.x + (nxt.x - cur.x) * t, cur.y + (nxt.y - cur.y) * t, cur.z + (nxt.z - cur.z) * t));
      out.push(nxt);
    }
  }
  return out;
}

function clipMeshToPlanes(mesh, planes) {
  let faces = mesh.faces.map(f => f.map(i => ({ ...mesh.vertices[i] })));
  for (const plane of planes) {
    faces = faces.map(face => clipPolygon(face, plane)).filter(face => face.length >= 3);
  }
  const vertices = [];
  const index = new Map();
  const out = [];
  const id = (p) => {
    const key = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`;
    if (!index.has(key)) { index.set(key, vertices.length); vertices.push(p); }
    return index.get(key);
  };
  for (const face of faces) out.push(face.map(id));
  return { vertices, faces: out.flatMap(f => { const t=[]; for (let i=1;i<f.length-1;i++) t.push([f[0],f[i],f[i+1]]); return t; }) };
}

function invertPlane(p) { return { normal: v3(-p.normal.x, -p.normal.y, -p.normal.z), d: -p.d }; }

function triKey(mesh, face) {
  const pts = face.map(i => mesh.vertices[i]);
  return pts.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).sort().join("|");
}

/** meshSubtract: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function meshSubtract(meshA, planesB) {
  const pieces = planesB.map(p => clipMeshToPlanes(meshA, [invertPlane(p)])).filter(m => m.faces.length);
  const bag = new Map();
  for (const piece of pieces) {
    for (const face of piece.faces) {
      const key = triKey(piece, face);
      const rec = bag.get(key) || { count: 0, piece, face };
      rec.count++;
      bag.set(key, rec);
    }
  }
  const vertices = [];
  const index = new Map();
  const faces = [];
  const id = (p) => {
    const key = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`;
    if (!index.has(key)) { index.set(key, vertices.length); vertices.push({ ...p }); }
    return index.get(key);
  };
  for (const rec of bag.values()) {
    if (rec.count !== 1) continue;
    faces.push(rec.face.map(i => id(rec.piece.vertices[i])));
  }
  return { vertices, faces };
}

/** clipConvex: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function clipConvex(subject, clip) {
  let output = subject.map(p => ({ x: p.x, y: p.y }));
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j], prev = input[(j + input.length - 1) % input.length];
      const cross = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const cin = cross(cur) >= -1e-8, pin = cross(prev) >= -1e-8;
      if (cin) {
        if (!pin) {
          const dc = cross(prev), dn = cross(cur);
          const t = dc / (dc - dn);
          output.push({ x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t });
        }
        output.push(cur);
      } else if (pin) {
        const dc = cross(prev), dn = cross(cur);
        const t = dc / (dc - dn);
        output.push({ x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t });
      }
    }
  }
  return output;
}

function onSeg(p, a, b) {
  const cr = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cr) > 1e-6) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot >= -1e-6 && dot <= len2 + 1e-6;
}

/** notchProfile: CAD feature builders. Constructs chamfer, fillet, draft, shell, pocket, and union meshes from profiles. Produces closed, outward-facing solids whose volumes match analytic expectations. */
export function notchProfile(outer, intersection) {
  const O = ensureCCW(outer);
  const bite = ensureCW(intersection);
  const touches = bite.some(p => O.some((a, i) => onSeg(p, a, O[(i + 1) % O.length])));
  if (!touches) return null;
  const out = [];
  for (let i = 0; i < O.length; i++) {
    const a = O[i], b = O[(i + 1) % O.length];
    out.push(a);
    const hits = bite.filter(p => onSeg(p, a, b));
    hits.sort((p, q) => (p.x - a.x) ** 2 + (p.y - a.y) ** 2 - ((q.x - a.x) ** 2 + (q.y - a.y) ** 2));
    if (hits.length >= 2) {
      out.push(hits[0]);
      const start = bite.findIndex(p => Math.abs(p.x - hits[0].x) < 1e-6 && Math.abs(p.y - hits[0].y) < 1e-6);
      for (let k = 1; k < bite.length; k++) out.push(bite[(start + k) % bite.length]);
      out.push(hits[hits.length - 1]);
    } else if (hits.length === 1) {
      out.push(hits[0]);
    }
  }
  const dedup = out.filter((p, i) => i === 0 || Math.abs(p.x - out[i - 1].x) > 1e-6 || Math.abs(p.y - out[i - 1].y) > 1e-6);
  return dedup.length >= 3 ? dedup : null;
}
