/**
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { cadClip } from "./module.js";

function assert(condition, message) {
  if (!condition) throw new Error("FAIL: " + message);
}
function close(actual, expected, tolerance = 1e-7) {
  return Math.abs(actual - expected) <= tolerance;
}
function box(x0, y0, z0, x1, y1, z1) {
  const vertices = [
    { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 },
    { x: x1, y: y1, z: z0 }, { x: x0, y: y1, z: z0 },
    { x: x0, y: y0, z: z1 }, { x: x1, y: y0, z: z1 },
    { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 }
  ];
  return { vertices, faces: [
    [0, 3,  2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
    [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]
  ] };
}
function edgeCounts(solid) {
  const counts = new Map();
  for (const f of solid.faces) for (let i = 0; i < f.length; i++) {
    const a = f[i], b = f[(i + 1) % f.length];
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.values()];
}

// Preserve the original missing-input gate.
const missing = cadClip(null, null);
assert(missing.outcome === "HOLD", "missing solids remain HOLD");

// BIBO-style boundary and range characterization for positive tolerance.
assert(cadClip(box(0,0,0,10,10,10), box(5,5,5,15,15,15), { tolerance: 0 }).outcome === "HOLD",
  "zero tolerance is below the valid range");
const onBoundary = cadClip(box(0,0,0,10,10,10), box(5,5,5,15,15,15), { tolerance: 1e-8 });
assert(onBoundary.outcome === "OK", "positive tolerance boundary is accepted");
const within = cadClip(box(0,0,0,10,10,10), box(5,5,5,15,15,15), { tolerance: 1e-6 });
assert(within.outcome === "OK", "valid tolerance interior is accepted");
assert(cadClip(box(0,0,0,10,10,10), box(5,5,5,15,15,15), { tolerance: Infinity }).outcome === "HOLD",
  "infinite tolerance is above the valid range");

// Exact geometric oracle: [5,10]^3 has volume 125.
const result = cadClip(box(0,0,0,10,10,10), box(5,5,5,15,15,15));
assert(result.outcome === "OK", "overlapping boxes produce an intersection");
assert(close(result.volume, 125), "intersection volume is 125");
assert(result.operation === "INTERSECTION", "operation is explicit");
assert(result.mesh.faces.length === result.triangleCount, "tessellation count matches triangle array");
assert(result.topology.watertight === true, "result is reported watertight");
assert(edgeCounts(result.solid).every(n => n === 2), "every B-rep edge has exactly two incident faces");
assert(Array.isArray(result.planes) && result.planes.length === result.solid.faces.length,
  "platform-compatible inward half-spaces are returned for every output face");
const interior = { x: 7.5, y: 7.5, z: 7.5 };
assert(result.planes.every(p => p.normal.x*interior.x + p.normal.y*interior.y + p.normal.z*interior.z + p.d >= -1e-7),
  "returned planes use the platform's non-negative-inside convention");

const contained = cadClip(box(0,0,0,10,10,10), box(2,2,2,8,8,8));
assert(contained.outcome === "OK" && close(contained.volume, 216), "contained cutter returns its complete volume");
const identical = cadClip(box(0,0,0,10,10,10), box(0,0,0,10,10,10));
assert(identical.outcome === "OK" && close(identical.volume, 1000), "coincident solids do not create duplicate cap faces");

// Deterministic overlap sweep: the intersection side length is (10 - shift).
for (const shift of [0, 0.5, 2, 5, 9, 9.5]) {
  const swept = cadClip(box(0,0,0,10,10,10), box(shift,shift,shift,shift+10,shift+10,shift+10));
  const expected = (10 - shift) ** 3;
  assert(swept.outcome === "OK" && close(swept.volume, expected, 1e-6),
    `overlap sweep at shift ${shift} has volume ${expected}`);
}

// Input winding is normalized from the geometry, not trusted as an orientation oracle.
const reversed = box(5,5,5,15,15,15);
reversed.faces = reversed.faces.map(f => [...f].reverse());
const reverseResult = cadClip(box(0,0,0,10,10,10), reversed);
assert(reverseResult.outcome === "OK" && close(reverseResult.volume, 125), "reversed cutter winding is normalized");

// Disjoint and tangential-only contact have no volumetric intersection.
assert(cadClip(box(0,0,0,10,10,10), box(11,0,0,21,10,10)).outcome === "HOLD",
  "disjoint solids HOLD");
assert(cadClip(box(0,0,0,10,10,10), box(10,0,0,20,10,10)).outcome === "HOLD",
  "zero-volume face contact HOLD");

// Invalid topology and unsupported non-convex input must not become OK.
const open = box(0,0,0,10,10,10);
open.faces.pop();
assert(cadClip(open, box(1,1,1,9,9,9)).outcome === "HOLD", "open B-rep HOLD");
const nonConvex = box(0,0,0,10,10,10);
nonConvex.vertices[6].x = 30;
assert(cadClip(nonConvex, box(1,1,1,9,9,9)).outcome === "HOLD", "non-convex B-rep HOLD");
assert(cadClip(box(0,0,0,10,10,10), box(1,1,1,9,9,9), { tolerance: -1 }).outcome === "HOLD",
  "negative tolerance HOLD");

// Boundary-focused contact and tolerance cases: face, edge and vertex tangency are zero-volume.
assert(cadClip(box(0,0,0,1,1,1), box(1,1,0,2,2,1)).outcome === "HOLD",
  "edge-only contact has no volumetric intersection");
assert(cadClip(box(0,0,0,1,1,1), box(1,1,1,2,2,2)).outcome === "HOLD",
  "vertex-only contact has no volumetric intersection");
const unit = box(0,0,0,1,1,1);
const belowTol = cadClip(unit, box(1-1e-8,0,0,2,1,1), { tolerance: 1e-8 });
const aboveTol = cadClip(unit, box(1-1e-7,0,0,2,1,1), { tolerance: 1e-8 });
assert(belowTol.outcome === "HOLD", "sliver at the tolerance boundary is rejected as degenerate");
assert(aboveTol.outcome === "OK" && close(aboveTol.volume, 1e-7, 1e-12),
  "positive overlap above tolerance is retained with its analytic volume");
const clearGap = cadClip(unit, box(1+1e-5,0,0,2,1,1), { tolerance: 1e-9 });
assert(clearGap.outcome === "HOLD", "gap above tolerance does not create a false positive");

console.log("cad boundary PASS: face/edge/vertex tangency, tolerance-boundary sliver rejection, above-tolerance overlap and clear-gap HOLD");

console.log("cad PASS: HOLD gates, BIBO tolerance, convex intersection, exact volume, winding normalization, tessellation and topology");

// Additional geometric and adversarial coverage.
const tetra = (dx = 0, dy = 0, dz = 0, s = 1) => ({
  vertices: [
    { x: dx, y: dy, z: dz }, { x: dx + s, y: dy, z: dz },
    { x: dx, y: dy + s, z: dz }, { x: dx, y: dy, z: dz + s }
  ],
  faces: [[0,2,1], [0,1,3], [1,2,3], [2,0,3]]
});
const tet = cadClip(tetra(), tetra(0.2, 0, 0));
assert(tet.outcome === "OK" && close(tet.volume, (0.8 ** 3) / 6, 1e-8),
  "oblique tetrahedron intersection matches analytic volume");

// Non-cubic dimensions and asymmetric overlap catch axis/coordinate assumptions.
const asymmetric = cadClip(box(-3, 2, 1, 7, 8, 5), box(1, 4, -2, 9, 10, 3));
assert(asymmetric.outcome === "OK" && close(asymmetric.volume, 6 * 4 * 2),
  "asymmetric boxes produce the exact 48-unit intersection");

// Translation invariance at large coordinates and scale invariance at small units.
const far = cadClip(box(1e9, -1e9, 1e9, 1e9 + 10, -1e9 + 10, 1e9 + 10),
  box(1e9 + 5, -1e9 + 5, 1e9 + 5, 1e9 + 15, -1e9 + 15, 1e9 + 15));
assert(far.outcome === "OK" && close(far.volume, 125, 1e-5),
  "large-coordinate intersection remains numerically stable");
const tiny = cadClip(box(0,0,0,1e-6,1e-6,1e-6), box(0.5e-6,0.5e-6,0.5e-6,1.5e-6,1.5e-6,1.5e-6));
assert(tiny.outcome === "OK" && close(tiny.volume, 0.125e-18, 1e-8),
  "microscale intersection uses scale-aware tolerance");

// A single reversed face is normalized, but invalid topology is never accepted.
const oneReversed = box(0,0,0,10,10,10);
oneReversed.faces[2] = [...oneReversed.faces[2]].reverse();
const normalized = cadClip(oneReversed, box(2,2,2,8,8,8));
assert(normalized.outcome === "OK" && close(normalized.volume, 216),
  "one independently reversed face is normalized");
const nonPlanar = box(0,0,0,10,10,10);
nonPlanar.vertices[6].z += 0.1;
assert(cadClip(nonPlanar, box(1,1,1,9,9,9)).outcome === "HOLD", "non-planar face HOLD");
const badIndex = box(0,0,0,10,10,10);
badIndex.faces[0][0] = 999;
assert(cadClip(badIndex, box(1,1,1,9,9,9)).outcome === "HOLD", "out-of-range index HOLD");
const nonFinite = box(0,0,0,10,10,10);
nonFinite.vertices[0].x = NaN;
assert(cadClip(nonFinite, box(1,1,1,9,9,9)).outcome === "HOLD", "non-finite coordinate HOLD");
const duplicateFace = box(0,0,0,10,10,10);
duplicateFace.faces.push([...duplicateFace.faces[0]]);
assert(cadClip(duplicateFace, box(1,1,1,9,9,9)).outcome === "HOLD", "duplicate face / non-manifold shell HOLD");
const disconnected = box(0,0,0,10,10,10);
const other = box(20,20,20,30,30,30);
const offset = disconnected.vertices.length;
disconnected.vertices.push(...other.vertices);
disconnected.faces.push(...other.faces.map(f => f.map(i => i + offset)));
assert(cadClip(disconnected, box(1,1,1,9,9,9)).outcome === "HOLD", "disconnected shell HOLD");

// Deterministic property sweep across unequal extents and all three axes.
for (let i = 1; i <= 24; i++) {
  const x = (i % 7) * 0.37, y = (i % 5) * 0.41, z = (i % 3) * 0.29;
  const ax = 4 + (i % 4), ay = 5 + (i % 3), az = 6 + (i % 2);
  const bx = 4 + (i % 4), by = 5 + (i % 3), bz = 6 + (i % 2);
  const r = cadClip(box(0,0,0,ax,ay,az), box(x,y,z,x+bx,y+by,z+bz));
  const expected = Math.max(0, Math.min(ax,x+bx)-x) * Math.max(0, Math.min(ay,y+by)-y) * Math.max(0, Math.min(az,z+bz)-z);
  assert(r.outcome === "OK" && close(r.volume, expected, 1e-7), `deterministic property case ${i}`);
  assert(r.topology.watertight && edgeCounts(r.solid).every(n => n === 2), `property case ${i} remains watertight`);
}

// Repeatability: identical inputs must produce identical topology and coordinates.
const repeatA = cadClip(box(0,0,0,10,10,10), box(3,2,1,11,9,8));
const repeatB = cadClip(box(0,0,0,10,10,10), box(3,2,1,11,9,8));
assert(JSON.stringify(repeatA.solid) === JSON.stringify(repeatB.solid), "identical inputs are deterministic");

console.log("cad extended PASS: tetrahedra, asymmetric and scaled geometry, translated coordinates, adversarial topology, 24-case property sweep, determinism");

// Seeded randomized axis-aligned property tests: symmetry, boundedness and topology.
let seed = 0x47cad;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; }
for (let i = 0; i < 128; i++) {
  const a = [random()*4, random()*4, random()*4];
  const as = [0.5+random()*8, 0.5+random()*8, 0.5+random()*8];
  const b = [random()*8-2, random()*8-2, random()*8-2];
  const bs = [0.5+random()*8, 0.5+random()*8, 0.5+random()*8];
  const A = box(a[0],a[1],a[2],a[0]+as[0],a[1]+as[1],a[2]+as[2]);
  const B = box(b[0],b[1],b[2],b[0]+bs[0],b[1]+bs[1],b[2]+bs[2]);
  const expected = [0,1,2].map(k => Math.max(0, Math.min(a[k]+as[k],b[k]+bs[k])-Math.max(a[k],b[k]))).reduce((x,y)=>x*y,1);
  const ab = cadClip(A,B), ba = cadClip(B,A);
  if (expected > 1e-12) {
    assert(ab.outcome === "OK" && ba.outcome === "OK", `random overlap ${i} accepted in both operand orders`);
    assert(close(ab.volume, expected, 1e-6) && close(ba.volume, expected, 1e-6), `random overlap ${i} matches exact oracle`);
    assert(ab.topology.watertight && ba.topology.watertight, `random overlap ${i} remains watertight`);
  } else {
    assert(ab.outcome === "HOLD" && ba.outcome === "HOLD", `random zero-volume overlap ${i} holds in both operand orders`);
  }
  const minVolume = Math.min(as[0]*as[1]*as[2], bs[0]*bs[1]*bs[2]);
  if (ab.outcome === "OK") assert(ab.volume <= minVolume + 1e-6, `random overlap ${i} is volume-bounded`);
}
console.log("cad randomized PASS: 128 seeded cases, operand symmetry, analytic oracle, volume bounds and watertightness");

// Numeric range and malformed-container guards must fail closed, not throw.
assert(cadClip({ vertices: {}, faces: [] }, box(0,0,0,1,1,1)).outcome === "HOLD", "non-array vertex container HOLD without throwing");
assert(cadClip(box(-1e308,0,0,1e308,1,1), box(0,0,0,1,1,1)).outcome === "HOLD", "overflowing coordinate span HOLD");
assert(cadClip(box(1e9,1e9,1e9,1e9+10,1e9+10,1e9+10), box(1e9+2,1e9+2,1e9+2,1e9+8,1e9+8,1e9+8), { tolerance: 1e-12 }).outcome === "HOLD", "sub-ULP explicit tolerance HOLD");
const nano = cadClip(box(0,0,0,1e-9,1e-9,1e-9), box(0.5e-9,0.5e-9,0.5e-9,1.5e-9,1.5e-9,1.5e-9));
assert(nano.outcome === "OK" && close(nano.volume, 0.125e-27, 1e-7), "nanometre-scale geometry remains supported");
console.log("cad numeric guards PASS: malformed containers, coordinate overflow, sub-ULP tolerance and nanometre-scale geometry");
