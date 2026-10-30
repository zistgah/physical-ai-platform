/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/cad/module.js
 * FILE PURPOSE: Convex-polyhedron intersection clipping with a closed, welded,
 * tessellated output. Inputs may be polygonal B-reps or triangulated convex
 * boundary meshes; coplanar facets are reconstructed before clipping. Unsupported,
 * malformed, open, non-planar, or non-convex solids HOLD.
 * License: GPL-3.0-only.
 */


function finitePoint(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
}
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function scale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function length(a) { return Math.hypot(a.x, a.y, a.z); }
function normalize(a) {
  const n = length(a);
  return n > 0 ? scale(a, 1 / n) : null;
}
function centroid(points) {
  const c = { x: 0, y: 0, z: 0 };
  const n = points.length;
  // Divide before summing to avoid overflow in large but finite coordinates.
  for (const p of points) { c.x += p.x / n; c.y += p.y / n; c.z += p.z / n; }
  return c;
}
function uniquePoints(points, tol) {
  const out = [];
  for (const p of points) {
    if (!out.some(q => length(sub(p, q)) <= tol)) out.push(p);
  }
  return out;
}
function signedVolume(solid) {
  // Translate to a local reference before integrating. This avoids catastrophic
  // cancellation when a small part is located far from the global origin.
  const origin = centroid(solid.vertices);
  let v = 0;
  for (const face of solid.faces) {
    const a = sub(solid.vertices[face[0]], origin);
    for (let i = 1; i < face.length - 1; i++) {
      const b = sub(solid.vertices[face[i]], origin);
      const c = sub(solid.vertices[face[i + 1]], origin);
      v += dot(a, cross(b, c)) / 6;
    }
  }
  return v;
}
function edgeIncidence(faces) {
  const edges = new Map();
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return edges;
}
function directedEdgeAudit(faces) {
  const edges = new Map();
  for (const face of faces) for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const item = edges.get(key) || { count: 0, balance: 0 };
    item.count++; item.balance += a < b ? 1 : -1; edges.set(key, item);
  }
  const bad = [...edges.values()].filter(e => e.count !== 2 || e.balance !== 0).length;
  return { edges, bad };
}
function connectedVertexCount(faces) {
  const adjacency = new Map();
  for (const face of faces) for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b); adjacency.get(b).add(a);
  }
  if (!adjacency.size) return 0;
  const seen = new Set(), stack = [adjacency.keys().next().value];
  while (stack.length) { const v = stack.pop(); if (seen.has(v)) continue; seen.add(v); for (const n of adjacency.get(v) || []) if (!seen.has(n)) stack.push(n); }
  return seen.size;
}
function faceIsConvex(vertices, face, normal, tol) {
  let sign = 0;
  for (let i = 0; i < face.length; i++) {
    const a = vertices[face[i]], b = vertices[face[(i + 1) % face.length]], c = vertices[face[(i + 2) % face.length]];
    const turn = dot(cross(sub(b, a), sub(c, b)), normal);
    if (Math.abs(turn) <= tol * tol) continue;
    const next = Math.sign(turn);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return sign !== 0;
}

function faceNormal(vertices, face) {
  const a = vertices[face[0]];
  for (let i = 1; i < face.length - 1; i++) {
    const e1 = sub(vertices[face[i]], a), e2 = sub(vertices[face[i + 1]], a);
    const n = cross(e1, e2);
    const edgeScale = Math.max(length(e1), length(e2), Number.MIN_VALUE);
    if (length(n) > Number.EPSILON * edgeScale * edgeScale * 16) return normalize(n);
  }
  return null;
}
function mergeCoplanarFaces(vertices, faces, planes, tol) {
  const groups = [];
  for (let i = 0; i < faces.length; i++) {
    const p = planes[i];
    let group = groups.find(g => dot(g.normal, p.normal) >= 1 - 1e-8 && Math.abs(g.d - p.d) <= tol * 10);
    if (!group) { group = { normal: p.normal, d: p.d, faces: [] }; groups.push(group); }
    group.faces.push(faces[i]);
  }
  const mergedFaces = [], mergedPlanes = [];
  for (const group of groups) {
    const directed = new Map();
    for (const face of group.faces) for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const reverse = `${b}:${a}`, forward = `${a}:${b}`;
      if (directed.has(reverse)) directed.delete(reverse);
      else directed.set(forward, [a, b]);
    }
    const edges = [...directed.values()];
    const outgoing = new Map(), incoming = new Map();
    for (const [a, b] of edges) {
      if (outgoing.has(a) || incoming.has(b)) return { error: "Coplanar face patch has branching boundary edges" };
      outgoing.set(a, b); incoming.set(b, a);
    }
    if (!edges.length || outgoing.size !== incoming.size) return { error: "Coplanar face patch has an invalid boundary" };
    const starts = [...outgoing.keys()].sort((a, b) => a - b);
    const visited = new Set();
    for (const start of starts) {
      if (visited.has(start)) continue;
      const loop = []; let current = start; let guard = edges.length + 1;
      while (guard-- > 0 && !visited.has(current)) {
        visited.add(current); loop.push(current);
        if (!outgoing.has(current)) return { error: "Coplanar face patch boundary is open" };
        current = outgoing.get(current);
        if (current === start) break;
      }
      if (current !== start || loop.length < 3) return { error: "Coplanar face patch does not form a simple loop" };
      if (!faceIsConvex(vertices, loop, group.normal, tol)) return { error: "Merged coplanar face is not convex" };
      mergedFaces.push(loop);
      mergedPlanes.push({ normal: group.normal, d: group.d });
    }
  }
  return { faces: mergedFaces, planes: mergedPlanes };
}

function bounds(vertices) {
  const b = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity }
  };
  for (const p of vertices) for (const k of ["x", "y", "z"]) {
    b.min[k] = Math.min(b.min[k], p[k]);
    b.max[k] = Math.max(b.max[k], p[k]);
  }
  return b;
}
function diagonal(b) {
  return Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
}

/**
 * Validate a closed convex polygonal B-rep and derive outward half-spaces.
 * The centroid is an interior reference for a convex solid.
 */
function prepareSolid(solid, tol, label) {
  if (!solid || !Array.isArray(solid.vertices) || !Array.isArray(solid.faces) ||
      solid.vertices.length < 4 || solid.faces.length < 4) {
    return { error: `${label} is UNSPECIFIED or empty` };
  }
  if (!solid.vertices.every(finitePoint)) return { error: `${label} has a non-finite vertex` };
  const vertices = solid.vertices.map(p => ({ x: p.x, y: p.y, z: p.z }));
  let faces = [];
  const incidenceInput = [];
  for (let fi = 0; fi < solid.faces.length; fi++) {
    const raw = solid.faces[fi];
    if (!Array.isArray(raw) || raw.length < 3 ||
        raw.some(i => !Number.isInteger(i) || i < 0 || i >= vertices.length) ||
        new Set(raw).size !== raw.length) {
      return { error: `${label} face ${fi} has invalid indices` };
    }
    const n = faceNormal(vertices, raw);
    if (!n) return { error: `${label} face ${fi} is degenerate` };
    const origin = vertices[raw[0]];
    if (raw.some(i => Math.abs(dot(n, sub(vertices[i], origin))) > tol * 10)) {
      return { error: `${label} face ${fi} is not planar` };
    }
    faces.push([...raw]);
    incidenceInput.push([...raw]);
  }
  const incidence = edgeIncidence(incidenceInput);
  const open = [...incidence.values()].filter(n => n !== 2).length;
  if (!incidence.size || open) return { error: `${label} is not closed (${open} non-manifold edges)` };

  const insidePoint = centroid(vertices);
  let planes = [];
  for (let fi = 0; fi < faces.length; fi++) {
    let face = faces[fi];
    let n = faceNormal(vertices, face);
    let d = -dot(n, vertices[face[0]]);
    if (dot(n, insidePoint) + d > 0) {
      face = [...face].reverse();
      faces[fi] = face;
      n = scale(n, -1);
      d = -dot(n, vertices[face[0]]);
    }
    if (vertices.some(p => dot(n, p) + d > tol * 10)) {
      return { error: `${label} is not convex at face ${fi}` };
    }
    if (!faceIsConvex(vertices, face, n, tol)) return { error: `${label} face ${fi} is not a simple convex loop` };
    planes.push({ normal: n, d });
  }
  const inputOrientation = directedEdgeAudit(faces);
  if (inputOrientation.bad) return { error: `${label} has ${inputOrientation.bad} inconsistently oriented edges` };
  const merged = mergeCoplanarFaces(vertices, faces, planes, tol);
  if (merged.error) return { error: `${label}: ${merged.error}` };
  faces = merged.faces; planes = merged.planes;
  const topology = directedEdgeAudit(faces);
  if (topology.bad) return { error: `${label} has ${topology.bad} invalid edges after coplanar reconstruction` };
  const used = new Set(faces.flat());
  if (connectedVertexCount(faces) !== used.size) return { error: `${label} has disconnected shells` };
  if (vertices.length !== used.size) return { error: `${label} contains unused vertices` };
  if (vertices.length - topology.edges.size + faces.length !== 2) return { error: `${label} is not a genus-zero closed shell` };
  const volume = Math.abs(signedVolume({ vertices, faces }));
  if (!Number.isFinite(volume)) return { error: `${label} has non-finite volume at this coordinate scale` };
  if (!(volume > tol * tol * tol)) return { error: `${label} has zero volume` };
  return { solid: { vertices, faces }, planes, volume };
}

function clipPolygon(poly, plane, tol) {
  if (!poly.length) return { polygon: [], crossings: [] };
  const out = [], crossings = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = dot(plane.normal, a) + plane.d;
    const db = dot(plane.normal, b) + plane.d;
    const aIn = da <= tol, bIn = db <= tol;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      const t = da / (da - db);
      const p = add(a, scale(sub(b, a), t));
      out.push(p); crossings.push(p);
    } else if (!aIn && bIn) {
      const t = da / (da - db);
      const p = add(a, scale(sub(b, a), t));
      out.push(p, b); crossings.push(p);
    }
  }
  const cleaned = [];
  for (const p of out) {
    if (!cleaned.length || length(sub(p, cleaned[cleaned.length - 1])) > tol) cleaned.push(p);
  }
  if (cleaned.length > 1 && length(sub(cleaned[0], cleaned[cleaned.length - 1])) <= tol) cleaned.pop();
  return { polygon: cleaned.length >= 3 ? cleaned : [], crossings };
}

function capFace(points, normal, tol) {
  const pts = uniquePoints(points, tol);
  if (pts.length < 3) return null;
  const c = centroid(pts);
  let seed = Math.abs(normal.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(seed, normal));
  const v = cross(normal, u);
  pts.sort((a, b) => {
    const da = sub(a, c), db = sub(b, c);
    return Math.atan2(dot(da, v), dot(da, u)) - Math.atan2(dot(db, v), dot(db, u));
  });
  // u x v = normal, so the sorted loop faces outward along normal.
  let areaVector = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < pts.length; i++) {
    areaVector = add(areaVector, cross(sub(pts[i], c), sub(pts[(i + 1) % pts.length], c)));
  }
  if (dot(areaVector, normal) < 0) pts.reverse();
  return pts;
}

function removeCollinear(face, vertices, tol) {
  let out = [...face], changed = true, guard = out.length * out.length;
  while (changed && out.length > 3 && guard-- > 0) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = vertices[out[(i + out.length - 1) % out.length]];
      const b = vertices[out[i]];
      const c = vertices[out[(i + 1) % out.length]];
      const ac = sub(c, a), ab = sub(b, a);
      const crossMagnitude = length(cross(ab, ac));
      if (crossMagnitude <= tol * Math.max(length(ac), tol) && dot(sub(b, a), sub(c, b)) >= -tol * tol) {
        out.splice(i, 1); changed = true; break;
      }
    }
  }
  return out;
}

function weldFaces(polygons, tol) {
  const vertices = [], buckets = new Map(), faces = [];
  const cell = p => [Math.floor(p.x / tol), Math.floor(p.y / tol), Math.floor(p.z / tol)];
  const key = (x, y, z) => `${x}:${y}:${z}`;
  function id(p) {
    const [cx, cy, cz] = cell(p);
    // Search adjacent cells as well: points within tolerance can straddle a
    // quantization boundary and must still weld deterministically.
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const i of buckets.get(key(cx + dx, cy + dy, cz + dz)) || []) {
        if (length(sub(vertices[i], p)) <= tol) return i;
      }
    }
    const i = vertices.length; vertices.push({ x: p.x, y: p.y, z: p.z });
    const k = key(cx, cy, cz); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i);
    return i;
  }
  const seenFaces = new Set();
  for (const poly of polygons) {
    const face = [];
    for (const p of poly) { const i = id(p); if (!face.length || face[face.length - 1] !== i) face.push(i); }
    if (face.length > 1 && face[0] === face[face.length - 1]) face.pop();
    if (new Set(face).size < 3) continue;
    const cleaned = removeCollinear(face, vertices, tol);
    if (cleaned.length < 3) continue;
    const canonical = cleaned.map(String).sort().join(":");
    if (seenFaces.has(canonical)) continue;
    seenFaces.add(canonical); faces.push(cleaned);
  }
  return { vertices, faces };
}
function triangulate(solid) {
  const faces = [];
  for (const face of solid.faces) {
    for (let i = 1; i < face.length - 1; i++) faces.push([face[0], face[i], face[i + 1]]);
  }
  return { vertices: solid.vertices.map(p => ({ ...p })), faces };
}
function validateMesh(mesh, tol) {
  if (mesh.faces.length < 4) return { ok: false, reason: "Triangle tessellation is incomplete" };
  for (const tri of mesh.faces) {
    const a = mesh.vertices[tri[0]], b = mesh.vertices[tri[1]], c = mesh.vertices[tri[2]];
    if (!a || !b || !c || length(cross(sub(b, a), sub(c, a))) <= tol * tol) {
      return { ok: false, reason: "Triangle tessellation contains a degenerate triangle" };
    }
  }
  const audit = directedEdgeAudit(mesh.faces);
  if (audit.bad) return { ok: false, reason: `Triangle tessellation has ${audit.bad} non-manifold or inconsistently oriented edges` };
  if (mesh.vertices.length - audit.edges.size + mesh.faces.length !== 2) {
    return { ok: false, reason: "Triangle tessellation is not a single genus-zero shell" };
  }
  const volume = signedVolume(mesh);
  return volume > tol * tol * tol ? { ok: true, volume } : { ok: false, reason: "Triangle tessellation has non-positive volume" };
}
function platformInwardPlanes(solid) {
  return solid.faces.map(face => {
    const outward = faceNormal(solid.vertices, face);
    const d = -dot(outward, solid.vertices[face[0]]);
    // GeometryKernel.clipMesh retains the non-negative side of each plane.
    return { normal: scale(outward, -1), d: -d };
  });
}
function validateOutput(solid, tol) {
  if (solid.vertices.length < 4 || solid.faces.length < 4) return { ok: false, reason: "Intersection is degenerate" };
  const audit = directedEdgeAudit(solid.faces);
  if (audit.bad) return { ok: false, reason: `Intersection tessellation has ${audit.bad} open, non-manifold, or inconsistently oriented edges` };
  const used = new Set(solid.faces.flat());
  if (used.size !== solid.vertices.length) return { ok: false, reason: "Intersection contains unused vertices" };
  if (connectedVertexCount(solid.faces) !== used.size) return { ok: false, reason: "Intersection contains disconnected shells" };
  if (solid.vertices.length - audit.edges.size + solid.faces.length !== 2) return { ok: false, reason: "Intersection topology is not genus-zero" };
  const volume = signedVolume(solid);
  if (!(volume > tol * tol * tol)) return { ok: false, reason: "Intersection orientation or volume is invalid" };
  return { ok: true, volume };
}

/**
 * Intersect two closed convex polygonal solids.
 *
 * Returns HOLD for absent/invalid inputs, unsupported non-convex geometry,
 * tangential contact (zero-volume result), or a result that fails topology checks.
 * Successful output includes a polygonal B-rep and a triangle tessellation.
 */
export function cadClip(base, cutter, options = {}) {
  if (!base || !cutter) return { outcome: "HOLD", reason: "Solids are UNSPECIFIED" };
  const requestedTolerance = options?.tolerance;
  if (requestedTolerance != null && (!Number.isFinite(requestedTolerance) || requestedTolerance <= 0)) {
    return { outcome: "HOLD", reason: "Tolerance must be a positive finite number" };
  }
  const rawPoints = [
    ...(Array.isArray(base.vertices) ? base.vertices : []),
    ...(Array.isArray(cutter.vertices) ? cutter.vertices : [])
  ];
  const validRaw = Array.isArray(base.vertices) && Array.isArray(cutter.vertices) && rawPoints.length && rawPoints.every(finitePoint);
  const scaleHint = validRaw ? diagonal(bounds(rawPoints)) : 1;
  const coordinateMagnitude = validRaw ? rawPoints.reduce((m, p) => Math.max(m, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)), 0) : 1;
  if (validRaw && !Number.isFinite(scaleHint)) return { outcome: "HOLD", reason: "Coordinate span exceeds the stable floating-point range" };
  const tol = requestedTolerance ?? Math.max(scaleHint * 1e-9, coordinateMagnitude * Number.EPSILON * 64, Number.MIN_VALUE);
  if (!Number.isFinite(tol)) return { outcome: "HOLD", reason: "Effective tolerance is outside the finite numeric range" };
  if (validRaw && tol < coordinateMagnitude * Number.EPSILON * 4) {
    return { outcome: "HOLD", reason: "Tolerance is below the floating-point resolution of the input coordinates" };
  }
  const a = prepareSolid(base, tol, "Base solid");
  if (a.error) return { outcome: "HOLD", reason: a.error };
  const b = prepareSolid(cutter, tol, "Cutter solid");
  if (b.error) return { outcome: "HOLD", reason: b.error };

  let polygons = a.solid.faces.map(face => face.map(i => a.solid.vertices[i]));
  for (const plane of b.planes) {
    const next = [], capPoints = [];
    for (const polygon of polygons) {
      const clipped = clipPolygon(polygon, plane, tol);
      if (clipped.polygon.length) next.push(clipped.polygon);
      capPoints.push(...clipped.crossings);
    }
    const cap = capFace(capPoints, plane.normal, tol * 4);
    if (cap) next.push(cap);
    polygons = next;
    if (!polygons.length) return { outcome: "HOLD", reason: "Solids do not have a volumetric intersection" };
  }

  const solid = weldFaces(polygons, tol * 4);
  const checked = validateOutput(solid, tol);
  if (!checked.ok) return { outcome: "HOLD", reason: checked.reason };
  const mesh = triangulate(solid);
  const meshCheck = validateMesh(mesh, tol);
  if (!meshCheck.ok) return { outcome: "HOLD", reason: meshCheck.reason };
  return {
    outcome: "OK",
    operation: "INTERSECTION",
    solid: { ...solid, kind: "BREP" },
    mesh,
    // Inward half-spaces match the existing GeometryKernel.clipMesh convention.
    planes: platformInwardPlanes(solid),
    volume: checked.volume,
    triangleCount: mesh.faces.length,
    topology: { watertight: true, vertices: solid.vertices.length, faces: solid.faces.length, triangles: mesh.faces.length },
    tolerance: tol,
    note: "Convex polygonal intersection; clipped faces and generated cap faces are tessellated and topology-checked."
  };
}

/**
 * Backend-assisted intersection for general closed triangulated solids.
 * The injected backend must implement intersect(base, cutter, options) and return
 * the OCCT protocol result. Keeping the backend injected preserves the static-first
 * browser build and avoids a mandatory native dependency.
 */
function validateManifoldMesh(mesh, tolerance = 1e-9) {
  if (!mesh || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces) ||
      mesh.vertices.length < 4 || mesh.faces.length < 4 || !mesh.vertices.every(finitePoint)) {
    return { ok: false, reason: "Backend returned an empty or malformed triangle mesh" };
  }
  const edges = new Map(), used = new Set();
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const f = mesh.faces[fi];
    if (!Array.isArray(f) || f.length !== 3 || f.some(i => !Number.isInteger(i) || i < 0 || i >= mesh.vertices.length) || new Set(f).size !== 3) {
      return { ok: false, reason: `Backend triangle ${fi} has invalid indices` };
    }
    const [a,b,c] = f.map(i => mesh.vertices[i]);
    if (length(cross(sub(b,a), sub(c,a))) <= tolerance * tolerance) return { ok: false, reason: `Backend triangle ${fi} is degenerate` };
    for (let j = 0; j < 3; j++) {
      const u = f[j], v = f[(j+1)%3], key = u < v ? `${u}:${v}` : `${v}:${u}`;
      const e = edges.get(key) || { count: 0, balance: 0 };
      e.count++; e.balance += u < v ? 1 : -1; edges.set(key,e); used.add(u);
    }
  }
  const bad = [...edges.values()].filter(e => e.count !== 2 || e.balance !== 0).length;
  if (bad) return { ok: false, reason: `Backend mesh has ${bad} open, non-manifold or misoriented edges` };
  if (used.size !== mesh.vertices.length) return { ok: false, reason: "Backend mesh contains unused vertices" };
  const volume = signedVolume(mesh);
  if (!(volume > tolerance ** 3) || !Number.isFinite(volume)) return { ok: false, reason: "Backend mesh has non-positive or non-finite signed volume" };
  return { ok: true, volume };
}

export async function cadClipRobust(base, cutter, options = {}) {
  const backend = options.backend;
  if (!backend || typeof backend.intersect !== "function") {
    // Dependency-free convex implementation remains available for static/browser use.
    return cadClip(base, cutter, options);
  }
  const tolerance = options.tolerance ?? 1e-7;
  const deflection = options.deflection ?? Math.max(tolerance * 10, 1e-3);
  if (![tolerance, deflection].every(v => Number.isFinite(v) && v > 0)) {
    return { outcome: "HOLD", reason: "Backend tolerance and deflection must be positive finite numbers" };
  }
  try {
    const result = await backend.intersect(base, cutter, { tolerance, deflection, angularDeflection: options.angularDeflection ?? 0.25 });
    if (!result || result.outcome !== "OK") return result?.outcome === "HOLD" ? result : { outcome: "HOLD", reason: "Geometry backend returned an invalid response" };
    if (result.operation !== "INTERSECTION" || !result.mesh || !Number.isFinite(result.volume) || result.volume <= 0) {
      return { outcome: "HOLD", reason: "Geometry backend response violates the CAD intersection contract" };
    }
    const checked = validateManifoldMesh(result.mesh, Math.max(tolerance, 1e-12));
    if (!checked.ok) return { outcome: "HOLD", reason: checked.reason };
    const relativeError = Math.abs(checked.volume - result.volume) / Math.max(result.volume, Number.MIN_VALUE);
    const allowed = options.volumeRelativeTolerance ?? 1e-5;
    if (!Number.isFinite(allowed) || allowed <= 0 || relativeError > allowed) {
      return { outcome: "HOLD", reason: `Backend B-rep/mesh volume mismatch (${relativeError})` };
    }
    return {
      ...result,
      solid: { ...result.solid, kind: result.solid?.kind || "BREP_MESH" },
      mesh: { vertices: result.mesh.vertices.map(p => ({ x:p.x, y:p.y, z:p.z })), faces: result.mesh.faces.map(f => [...f]) },
      topology: { ...(result.topology || {}), watertight: true, vertices: result.mesh.vertices.length, triangles: result.mesh.faces.length },
      meshVolume: checked.volume,
      volumeRelativeError: relativeError,
      tolerance,
      deflection
    };
  } catch (error) {
    return { outcome: "HOLD", reason: `Geometry backend failed: ${String(error?.message || error)}` };
  }
}
