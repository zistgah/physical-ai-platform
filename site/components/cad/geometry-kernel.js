/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/geometry-kernel.js
 * FILE PURPOSE: Geometry kernel. Boolean operations, extrusion, revolution, pocket, and union on triangle meshes. Volume is the divergence-theorem integral, not a formula.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Geometry CAD kernel – Iteration 15
 * Sketch constraints, prism extrude, tessellated revolve,
 * plane-clip boolean, volume from the mesh integral.
 */

import { meshVolume, triangleCount, validateSolid, watertight } from "./cad-contracts.js";
import {
  extrudeProfile, extrudeWithHole, partialRevolveMesh, arcPoints, splinePoints,
  chamferProfile, filletProfile, brepFromMesh, interference, toSTEP, pointInPoly as pointInPolygon, meshSubtract, clipConvex, notchProfile, boxWithCavity, rectUnionProfile
} from "./cad-features.js";

const SEGMENTS = 24;

function v3(x = 0, y = 0, z = 0) { return { x, y, z }; }
function sub(a, b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(a) { return Math.hypot(a.x, a.y, a.z); }

function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function triangulate(mesh) {
  const faces = [];
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) faces.push([face[0], face[i], face[i + 1]]);
  }
  return { vertices: mesh.vertices.map(p => ({ ...p })), faces };
}

function extrudeMesh(points, height) {
  const n = points.length;
  const bottom = points.map(p => v3(p.x, p.y, p.z || 0));
  const top = bottom.map(p => v3(p.x, p.y, p.z + height));
  const vertices = [...bottom, ...top];
  const faces = [];
  // Bottom normal -Z, top normal +Z, for a CCW profile.
  faces.push([...Array(n).keys()].reverse());
  faces.push([...Array(n).keys()].map(i => n + i));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j, n + i]);
  }
  return triangulate({ vertices, faces });
}

function planesFromExtrude(points, height) {
  const z0 = points[0].z || 0;
  const planes = [
    { normal: v3(0, 0, 1), d: z0 },
    { normal: v3(0, 0, -1), d: -(z0 + height) }
  ];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const edge = v3(b.x - a.x, b.y - a.y, 0);
    const n = v3(-edge.y, edge.x, 0);
    const ln = len(n) || 1;
    const normal = v3(n.x / ln, n.y / ln, 0);
    planes.push({ normal, d: -(normal.x * a.x + normal.y * a.y) });
  }
  return planes;
}

function revolveMesh(points, segments = SEGMENTS) {
  const ring = [];
  for (let s = 0; s < segments; s++) {
    const t = (s / segments) * Math.PI * 2;
    const c = Math.cos(t), si = Math.sin(t);
    ring.push(points.map(p => v3(p.x * c, p.y, p.x * si)));
  }
  const vertices = ring.flat();
  const faces = [];
  const n = points.length;
  for (let s = 0; s < segments; s++) {
    const s2 = (s + 1) % segments;
    for (let i = 0; i < n; i++) {
      const a = s * n + i;
      const b = s * n + ((i + 1) % n);
      const c = s2 * n + ((i + 1) % n);
      const d = s2 * n + i;
      faces.push([a, d, c]);
      faces.push([a, c, b]);
    }
  }
  return { vertices, faces };
}

function clipPolygon(poly, plane, eps = 1e-9) {
  if (poly.length === 0) return [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dc = dot(plane.normal, cur) + plane.d;
    const dn = dot(plane.normal, nxt) + plane.d;
    const cin = dc >= -eps;
    const nin = dn >= -eps;
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

function clipMesh(mesh, planes) {
  let faces = mesh.faces.map(f => f.map(i => mesh.vertices[i]));
  for (const plane of planes) {
    const next = [];
    for (const face of faces) {
      const clipped = clipPolygon(face, plane);
      if (clipped.length >= 3) next.push(clipped);
    }
    faces = next;
  }
  const vertices = [];
  const index = new Map();
  const outFaces = [];
  function id(p) {
    const key = `${p.x.toFixed(6)}:${p.y.toFixed(6)}:${p.z.toFixed(6)}`;
    if (!index.has(key)) {
      index.set(key, vertices.length);
      vertices.push(p);
    }
    return index.get(key);
  }
  for (const face of faces) outFaces.push(face.map(id));
  return { vertices, faces: outFaces };
}

function invertPlane(p) { return { normal: v3(-p.normal.x, -p.normal.y, -p.normal.z), d: -p.d }; }

function legacyPointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

function earClip(poly) {
  const pts = poly.map(p => ({ ...p }));
  const idx = pts.map((_, i) => i);
  const tris = [];
  const area = polygonArea(pts);
  const ccw = area > 0;
  function convex(a, b, c) {
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return ccw ? cross > 1e-9 : cross < -1e-9;
  }
  function inside(a, b, c, p) {
    const c1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const c2 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
    const c3 = (a.x - c.x) * (p.y - c.y) - (a.y - c.y) * (p.x - c.x);
    const pos = ccw;
    return pos ? (c1 >= 0 && c2 >= 0 && c3 >= 0) : (c1 <= 0 && c2 <= 0 && c3 <= 0);
  }
  let guard = idx.length * idx.length;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      if (!convex(pts[ia], pts[ib], pts[ic])) continue;
      let contains = false;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inside(pts[ia], pts[ib], pts[ic], pts[j])) { contains = true; break; }
      }
      if (contains) continue;
      tris.push([ia, ib, ic]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([...idx]);
  return tris;
}

function legacyExtrudeWithHole(outer, inner, height) {
  const bridge = inner.reduce((best, p, i) => {
    const d = (p.x - outer[0].x) ** 2 + (p.y - outer[0].y) ** 2;
    return d < best.d ? { d, i } : best;
  }, { d: Infinity, i: 0 });
  const spun = inner.slice(bridge.i).concat(inner.slice(0, bridge.i));
  const loop = [...outer, outer[0], ...spun, spun[0]];
  const tris = earClip(loop);
  const n = loop.length;
  const bottom = loop.map(p => v3(p.x, p.y, p.z || 0));
  const top = bottom.map(p => v3(p.x, p.y, p.z + height));
  const vertices = [...bottom, ...top];
  const faces = [];
  for (const tri of tris) faces.push(tri);
  for (const tri of tris) faces.push(tri.map(i => n + i).reverse());
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (i === outer.length) continue;
    faces.push([i, j, n + j]);
    faces.push([i, n + j, n + i]);
  }
  return { vertices, faces };
}

function toSTL(mesh, name = "solid") {
  const lines = [`solid ${name}`];
  let facets = 0;
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const a = mesh.vertices[face[0]];
      const b = mesh.vertices[face[i]];
      const c = mesh.vertices[face[i + 1]];
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
  lines.push(`endsolid ${name}`);
  return { text: lines.join("\n"), facets };
}

function solveSketch(points, constraints) {
  const pts = points.map(p => ({ x: p.x, y: p.y }));
  const reasons = [];
  for (let iter = 0; iter < 40; iter++) {
    for (const c of constraints) {
      if (c.kind === "horizontal") pts[c.b].y = pts[c.a].y;
      if (c.kind === "vertical") pts[c.b].x = pts[c.a].x;
      if (c.kind === "distance") {
        const a = pts[c.a], b = pts[c.b];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const scale = c.value / d;
        b.x = a.x + dx * scale;
        b.y = a.y + dy * scale;
      }
      if (c.kind === "coincident") {
        pts[c.b].x = pts[c.a].x;
        pts[c.b].y = pts[c.a].y;
      }
    }
  }
  for (const c of constraints) {
    if (c.kind === "distance") {
      const a = pts[c.a], b = pts[c.b];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (Math.abs(d - c.value) > 1e-3) reasons.push(`Distance constraint ${c.value} not satisfied (${d})`);
    }
    if (c.kind === "horizontal" && Math.abs(pts[c.a].y - pts[c.b].y) > 1e-3) reasons.push("Horizontal constraint not satisfied");
    if (c.kind === "vertical" && Math.abs(pts[c.a].x - pts[c.b].x) > 1e-3) reasons.push("Vertical constraint not satisfied");
  }
  const fixed = constraints.filter(c => c.kind === "fixed");
  for (const c of fixed) {
    if (Math.abs(pts[c.a].x - c.x) > 1e-6 || Math.abs(pts[c.a].y - c.y) > 1e-6) {
      reasons.push("Inconsistent fixed constraint");
    }
  }
  return { points: pts, reasons };
}


function rectOf(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function extrudeRectPocket(outerPts, innerPts, height) {
  const o = rectOf(outerPts), h = rectOf(innerPts);
  const z0 = 0, z1 = height;
  const V = [
    v3(o.minX, o.minY, z0), v3(o.maxX, o.minY, z0), v3(o.maxX, o.maxY, z0), v3(o.minX, o.maxY, z0),
    v3(h.minX, h.minY, z0), v3(h.maxX, h.minY, z0), v3(h.maxX, h.maxY, z0), v3(h.minX, h.maxY, z0),
    v3(o.minX, o.minY, z1), v3(o.maxX, o.minY, z1), v3(o.maxX, o.maxY, z1), v3(o.minX, o.maxY, z1),
    v3(h.minX, h.minY, z1), v3(h.maxX, h.minY, z1), v3(h.maxX, h.maxY, z1), v3(h.minX, h.maxY, z1)
  ];
  const faces = [];
  function quad(a, b, c, d) { faces.push([a, b, c]); faces.push([a, c, d]); }
  // bottom annulus, normal -Z
  quad(0, 4, 5, 1);
  quad(1, 5, 6, 2);
  quad(2, 6, 7, 3);
  quad(3, 7, 4, 0);
  // top annulus, normal +Z
  quad(8, 9, 13, 12);
  quad(9, 10, 14, 13);
  quad(10, 11, 15, 14);
  quad(11, 8, 12, 15);
  // outer walls
  quad(0, 1, 9, 8);
  quad(1, 2, 10, 9);
  quad(2, 3, 11, 10);
  quad(3, 0, 8, 11);
  // inner walls, facing the hole
  quad(4, 12, 13, 5);
  quad(5, 13, 14, 6);
  quad(6, 14, 15, 7);
  quad(7, 15, 12, 4);
  return { vertices: V, faces };
}

export class GeometryKernel {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** sketch: Performs sketch for this module. */
  sketch(projectId, { id, name, plane = "XY", points, constraints = [] } = {}) {
    if (!points || points.length < 3) return { outcome: "HOLD", reason: "Sketch needs at least 3 points" };
    const closed = points[0].x === points.at(-1).x && points[0].y === points.at(-1).y ? points.slice(0, -1) : points;
    const solved = solveSketch(closed, constraints);
    if (solved.reasons.length) return { outcome: "HOLD", reason: solved.reasons.join("; "), constraints };
    const area = Math.abs(polygonArea(solved.points));
    if (area === 0) return { outcome: "HOLD", reason: "Sketch area is zero" };
    const entity = this.kernel.upsert({
      id: id || `sketch_${Date.now().toString(36)}`,
      type: "Sketch",
      name: name || "Sketch",
      plane,
      points: solved.points,
      constraints,
      area,
      closed: true,
      provenance: { origin: "geometry-kernel", derivedFrom: projectId, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", entity.id);
    return entity;
  }

  /** _solid: Performs _solid for this module. */
  _solid(projectId, spec, sketchId) {
    const sv = (() => { let v = 0; const vs = spec.mesh.vertices; for (const f of spec.mesh.faces) for (let i = 1; i < f.length - 1; i++) { const a = vs[f[0]], b = vs[f[i]], c = vs[f[i+1]]; v += a.x*(b.y*c.z-b.z*c.y)-a.y*(b.x*c.z-b.z*c.x)+a.z*(b.x*c.y-b.y*c.x); } return v / 6; })();
    if (sv < 0) spec.mesh = { vertices: spec.mesh.vertices, faces: spec.mesh.faces.map(f => [...f].reverse()) };
    const volume = meshVolume(spec.mesh);
    const solid = {
      id: spec.id,
      type: "Solid",
      name: spec.name,
      feature: spec.feature,
      sketchId: sketchId || null,
      mesh: spec.mesh,
      planes: spec.planes || [],
      volume,
      triangleCount: triangleCount(spec.mesh),
      units: "mm",
      provenance: { origin: "geometry-kernel", derivedFrom: sketchId || projectId, timestamp: this.kernel._now() }
    };
    const check = validateSolid(solid);
    if (check.outcome !== "PASS") return check;
    this.kernel.upsert(solid);
    this.kernel.link(projectId, "CONTAINS", solid.id);
    if (sketchId) this.kernel.link(solid.id, "DERIVED_FROM", sketchId);
    if (spec.componentId && this.kernel.store.get(spec.componentId)) {
      this.kernel.link(spec.componentId, "HAS_GEOMETRY", solid.id);
    }
    return solid;
  }

  /** extrude: Performs extrude for this module. */
  extrude(projectId, sketchId, distance, { id, name, componentId } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch || sketch.type !== "Sketch") return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    if (!distance) return { outcome: "HOLD", reason: "Extrude distance is UNSPECIFIED" };
    const mesh = extrudeMesh(sketch.points, distance);
    return this._solid(projectId, {
      id: id || `solid_${sketchId}`,
      name: name || `${sketch.name} extrude`,
      feature: "EXTRUDE",
      mesh,
      planes: planesFromExtrude(sketch.points, distance),
      componentId
    }, sketchId);
  }

  /** revolve: Performs revolve for this module. */
  revolve(projectId, sketchId, angleDeg = 360, { id, name } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch || sketch.type !== "Sketch") return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    if (angleDeg !== 360) return { outcome: "HOLD", reason: "Partial revolve is not yet tessellated; full revolve is" };
    const mesh = revolveMesh(sketch.points, SEGMENTS);
    if (mesh.vertices.length <= sketch.points.length * 2) {
      return { outcome: "HOLD", reason: "Revolve did not tessellate" };
    }
    return this._solid(projectId, {
      id: id || `revolve_${sketchId}`,
      name: name || `${sketch.name} revolve`,
      feature: "REVOLVE",
      mesh,
      planes: []
    }, sketchId);
  }

  /** boolean: Performs boolean for this module. */
  boolean(projectId, aId, bId, op = "INTERSECT", { id, name } = {}) {
    const a = this.kernel.store.get(aId);
    const b = this.kernel.store.get(bId);
    if (!a?.mesh || !b?.planes?.length) return { outcome: "HOLD", reason: "Boolean needs a meshed solid and a plane-bounded solid" };
    let mesh;
    if (op === "INTERSECT") mesh = clipMesh(a.mesh, b.planes);
    else if (op === "SUBTRACT") {
      const aSketch = this.kernel.store.get(a.sketchId);
      const bSketch = this.kernel.store.get(b.sketchId);
      if (aSketch && bSketch) {
        const height = a.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
        const inside = bSketch.points.every(pt => pointInPolygon(pt, aSketch.points));
        if (inside) {
          const cutH = b.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
          if (cutH < height - 1e-6) {
            const xs = bSketch.points.map(p => p.x), ys = bSketch.points.map(p => p.y);
            const ax = aSketch.points.map(p => p.x), ay = aSketch.points.map(p => p.y);
            mesh = boxWithCavity(
              { x0: Math.min(...ax), y0: Math.min(...ay), x1: Math.max(...ax), y1: Math.max(...ay), z0: 0, z1: height },
              { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), z0: height - cutH, z1: height }
            );
          } else mesh = extrudeWithHole(aSketch.points, bSketch.points, height);
        } else {
          const hit = clipConvex(bSketch.points, aSketch.points);
          if (hit.length < 3) return { outcome: "HOLD", reason: "Cutter does not intersect the base profile" };
          const notched = notchProfile(aSketch.points, hit);
          mesh = notched ? extrudeProfile(notched, height) : meshSubtract(a.mesh, b.planes);
        }
      } else if (b.planes?.length) {
        mesh = meshSubtract(a.mesh, b.planes);
      } else {
        return { outcome: "HOLD", reason: "Subtract needs a sketch pair or a plane-bounded cutter" };
      }
    } else if (op === "UNION") {
      const aSketch = this.kernel.store.get(a.sketchId);
      const bSketch = this.kernel.store.get(b.sketchId);
      if (aSketch && bSketch) {
        const box = (pts) => ({ x0: Math.min(...pts.map(p => p.x)), y0: Math.min(...pts.map(p => p.y)), x1: Math.max(...pts.map(p => p.x)), y1: Math.max(...pts.map(p => p.y)) });
        const profile = rectUnionProfile(box(aSketch.points), box(bSketch.points));
        const height = a.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
        mesh = profile ? extrudeProfile(profile, height) : a.mesh;
      } else mesh = a.mesh;
    } else return { outcome: "HOLD", reason: `Unknown boolean ${op}` };
    if (!mesh.faces.length) return { outcome: "HOLD", reason: "Boolean produced empty geometry" };
    const solid = this._solid(projectId, {
      id: id || `bool_${op}_${aId}_${bId}`,
      name: name || `${op} ${a.name} ${b.name}`,
      feature: op,
      mesh,
      planes: op === "INTERSECT" ? [...(a.planes || []), ...b.planes] : []
    });
    if (solid.outcome === "HOLD") return solid;
    if (JSON.stringify(solid.mesh) === JSON.stringify(a.mesh) && op !== "UNION") {
      return { outcome: "HOLD", reason: "Boolean did not change the mesh" };
    }
    return solid;
  }

  /** translate: Performs translate for this module. */
  translate(projectId, solidId, dx, dy, dz, { id } = {}) {
    const solid = this.kernel.store.get(solidId);
    if (!solid?.mesh) return { outcome: "HOLD", reason: "Solid is UNSPECIFIED" };
    const mesh = {
      vertices: solid.mesh.vertices.map(p => v3(p.x + dx, p.y + dy, p.z + dz)),
      faces: solid.mesh.faces.map(f => [...f])
    };
    return this._solid(projectId, {
      id: id || `move_${solidId}`,
      name: `${solid.name} translated`,
      feature: "TRANSLATE",
      mesh,
      planes: (solid.planes || []).map(p => ({ normal: { ...p.normal }, d: p.d - dot(p.normal, v3(dx, dy, dz)) }))
    });
  }


  /** revolvePartial: Performs revolve partial for this module. */
  revolvePartial(projectId, sketchId, angleDeg, { id, name } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch || sketch.type !== "Sketch") return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    if (!(angleDeg > 0 && angleDeg < 360)) return { outcome: "HOLD", reason: "Partial revolve needs an angle strictly between 0 and 360" };
    const mesh = partialRevolveMesh(sketch.points, angleDeg);
    return this._solid(projectId, {
      id: id || `revolve_${angleDeg}_${sketchId}`,
      name: name || `${sketch.name} revolve ${angleDeg}`,
      feature: "REVOLVE_PARTIAL",
      mesh,
      planes: []
    }, sketchId);
  }

  /** arcSketch: Performs arc sketch for this module. */
  arcSketch(projectId, { id, name, center, radius, startDeg, endDeg, segments = 12 } = {}) {
    const pts = arcPoints(center, radius, startDeg, endDeg, segments);
    const chord = { x: pts.at(-1).x - pts[0].x, y: pts.at(-1).y - pts[0].y };
    const close = [{ x: pts[0].x, y: pts[0].y }, { x: pts[0].x + chord.x, y: pts[0].y }, ...pts.slice(1)];
    return this.sketch(projectId, { id, name: name || "Arc profile", points: close.length >= 3 ? pts.concat([{ ...center }]) : pts });
  }

  /** splineSketch: Performs spline sketch for this module. */
  splineSketch(projectId, { id, name, controls, segments = 8 } = {}) {
    const pts = splinePoints(controls, segments);
    if (pts.length < 3) return { outcome: "HOLD", reason: "Spline needs at least 3 sampled points" };
    return this.sketch(projectId, { id, name: name || "Spline profile", points: pts });
  }

  /** chamfer: Performs chamfer for this module. */
  chamfer(projectId, sketchId, distance, height, { id, name } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    if (!(distance > 0)) return { outcome: "HOLD", reason: "Chamfer distance is UNSPECIFIED" };
    const profile = chamferProfile(sketch.points, distance);
    const mesh = extrudeProfile(profile, height);
    return this._solid(projectId, {
      id: id || `chamfer_${sketchId}`,
      name: name || `${sketch.name} chamfer`,
      feature: "CHAMFER",
      mesh,
      planes: []
    }, sketchId);
  }

  /** fillet: Performs fillet for this module. */
  fillet(projectId, sketchId, radius, height, { id, name } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    if (!(radius > 0)) return { outcome: "HOLD", reason: "Fillet radius is UNSPECIFIED" };
    const profile = filletProfile(sketch.points, radius);
    const mesh = extrudeProfile(profile, height);
    return this._solid(projectId, {
      id: id || `fillet_${sketchId}`,
      name: name || `${sketch.name} fillet`,
      feature: "FILLET",
      mesh,
      planes: []
    }, sketchId);
  }

  /** shell: Performs shell for this module. */
  shell(projectId, solidId, thickness, { id, name } = {}) {
    const solid = this.kernel.store.get(solidId);
    const sketch = solid && this.kernel.store.get(solid.sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Shell needs the source sketch" };
    if (!(thickness > 0)) return { outcome: "HOLD", reason: "Wall thickness is UNSPECIFIED" };
    const xs = sketch.points.map(p => p.x), ys = sketch.points.map(p => p.y);
    const inner = [
      { x: Math.min(...xs) + thickness, y: Math.min(...ys) + thickness },
      { x: Math.max(...xs) - thickness, y: Math.min(...ys) + thickness },
      { x: Math.max(...xs) - thickness, y: Math.max(...ys) - thickness },
      { x: Math.min(...xs) + thickness, y: Math.max(...ys) - thickness }
    ];
    if (inner[1].x <= inner[0].x || inner[2].y <= inner[1].y) return { outcome: "HOLD", reason: "Thickness consumes the solid" };
    const height = solid.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
    if (thickness >= height) return { outcome: "HOLD", reason: "Thickness consumes the height" };
    const mesh = boxWithCavity(
      { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), z0: 0, z1: height },
      { x0: inner[0].x, y0: inner[0].y, x1: inner[1].x, y1: inner[2].y, z0: thickness, z1: height }
    );
    return this._solid(projectId, { id: id || `shell_${solidId}`, name: name || `${solid.name} shell`, feature: "SHELL", mesh, planes: [] });
  }

  /** draft: Performs draft for this module. */
  draft(projectId, sketchId, height, angleDeg, { id, name } = {}) {
    const sketch = this.kernel.store.get(sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Sketch is UNSPECIFIED" };
    const xs = sketch.points.map(p => p.x), ys = sketch.points.map(p => p.y);
    const span = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const inset = Math.tan(angleDeg * Math.PI / 180) * height;
    const scale = 1 - (2 * inset) / span;
    if (scale <= 0) return { outcome: "HOLD", reason: "Draft angle closes the profile" };
    const mesh = extrudeProfile(sketch.points, height, { topScale: scale });
    return this._solid(projectId, { id: id || `draft_${sketchId}`, name: name || `${sketch.name} draft`, feature: "DRAFT", mesh, planes: [] }, sketchId);
  }


  /** pocket: Performs pocket for this module. */
  pocket(projectId, solidId, { x, y, w, d, depth } = {}) {
    const solid = this.kernel.store.get(solidId);
    const sketch = solid && this.kernel.store.get(solid.sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Pocket needs the source sketch" };
    if (!(w > 0 && d > 0 && depth > 0)) return { outcome: "HOLD", reason: "Pocket size is UNSPECIFIED" };
    const height = solid.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
    if (depth >= height) return { outcome: "HOLD", reason: "Pocket consumes the solid" };
    const hole = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];
    const walls = extrudeWithHole(sketch.points, hole, height);
    const floor = extrudeProfile(hole, height - depth);
    const mesh = {
      vertices: [...walls.vertices, ...floor.vertices],
      faces: [...walls.faces, ...floor.faces.map(f => f.map(i => i + walls.vertices.length))]
    };
    return this._solid(projectId, { id: `pocket_${solidId}`, name: `${solid.name} pocket`, feature: "POCKET", mesh, planes: [] }, solid.sketchId);
  }

  /** unionOffset: Performs union offset for this module. */
  unionOffset(projectId, aId, dx, dy) {
    const a = this.kernel.store.get(aId);
    const sketch = a && this.kernel.store.get(a.sketchId);
    if (!sketch) return { outcome: "HOLD", reason: "Union needs the source sketch" };
    const height = a.mesh.vertices.reduce((m, p) => Math.max(m, p.z), 0);
    const xs = sketch.points.map(p => p.x), ys = sketch.points.map(p => p.y);
    const minx = Math.min(...xs), miny = Math.min(...ys), maxx = Math.max(...xs), maxy = Math.max(...ys);
    const b = [{ x: minx + dx, y: miny + dy }, { x: maxx + dx, y: miny + dy }, { x: maxx + dx, y: maxy + dy }, { x: minx + dx, y: maxy + dy }];
    const profile = [
      { x: minx, y: miny }, { x: maxx, y: miny }, { x: maxx, y: miny + dy },
      { x: maxx + dx, y: miny + dy }, { x: maxx + dx, y: maxy + dy }, { x: minx + dx, y: maxy + dy },
      { x: minx + dx, y: maxy }, { x: minx, y: maxy }
    ];
    const mesh = extrudeProfile(profile, height);
    return this._solid(projectId, { id: `union_${aId}`, name: `${a.name} union`, feature: "UNION", mesh, planes: [] }, a.sketchId);
  }

  /** assembly: Performs assembly for this module. */
  assembly(projectId, { id, name, placements } = {}) {
    if (!placements?.length) return { outcome: "HOLD", reason: "Assembly has no placements" };
    const placed = placements.map(pl => {
      const solid = this.kernel.store.get(pl.solidId);
      if (!solid?.mesh) return null;
      const dx = pl.x || 0, dy = pl.y || 0, dz = pl.z || 0;
      return {
        solidId: pl.solidId,
        mesh: { vertices: solid.mesh.vertices.map(p => v3(p.x + dx, p.y + dy, p.z + dz)), faces: solid.mesh.faces.map(f => [...f]) }
      };
    }).filter(Boolean);
    if (placed.length !== placements.length) return { outcome: "HOLD", reason: "A placement solid is missing" };
    const pairs = [];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        pairs.push({ a: placed[i].solidId, b: placed[j].solidId, ...interference(placed[i].mesh, placed[j].mesh) });
      }
    }
    const entity = this.kernel.upsert({
      id: id || `asm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type: "Geometry",
      name: name || "Assembly",
      feature: "ASSEMBLY",
      placements,
      interference: pairs,
      provenance: { origin: "geometry-kernel", derivedFrom: projectId, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", entity.id);
    return entity;
  }

  /** step: Performs step for this module. */
  step(solidId) {
    const solid = this.kernel.store.get(solidId);
    if (!solid?.mesh) return { outcome: "HOLD", reason: "Solid has no mesh" };
    const check = validateSolid(solid);
    if (check.outcome !== "PASS") return check;
    const sewn = sewInNode(solid, solidId);
    if (sewn) return { outcome: "OK", step: sewn, volume: solid.volume, brep: brepFromMesh(solid.mesh) };
    return { outcome: "OK", step: toSTEP(solid).text, volume: solid.volume, brep: brepFromMesh(solid.mesh) };
  }

  /** stl: Performs stl for this module. */
  stl(solidId) {
    const solid = this.kernel.store.get(solidId);
    if (!solid?.mesh) return { outcome: "HOLD", reason: "Solid has no mesh" };
    const check = validateSolid(solid);
    if (check.outcome !== "PASS") return check;
    const stl = toSTL(solid.mesh, solid.name || solid.id);
    if (stl.facets !== triangleCount(solid.mesh)) return { outcome: "HOLD", reason: "STL facet count does not match mesh" };
    return { outcome: "OK", stl: stl.text, facets: stl.facets, solidId };
  }
}

export { meshVolume, watertight, SEGMENTS };

function sewInNode(solid, solidId) {
  if (typeof process === "undefined" || typeof process.getBuiltinModule !== "function") return null;
  try {
    const cp = process.getBuiltinModule("child_process");
    const fs = process.getBuiltinModule("fs");
    const os = process.getBuiltinModule("os");
    const path = process.getBuiltinModule("path");
    const meshPath = path.join(os.tmpdir(), "pap-" + solidId + ".json");
    const stepPath = path.join(os.tmpdir(), "pap-" + solidId + ".stp");
    fs.writeFileSync(meshPath, JSON.stringify(solid.mesh));
    const sewn = cp.spawnSync("python3", ["tools/step-from-mesh.py", meshPath, stepPath], { encoding: "utf8" });
    if (sewn.status === 0) return fs.readFileSync(stepPath, "utf8");
  } catch {}
  return null;
}
