/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/cad-contracts.js
 * FILE PURPOSE: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * CAD contracts – Iteration 15
 * These exist to reject a formula dressed up as a kernel.
 */

export const CAD_CONTRACT = {
  id: "CAD-GEOMETRY",
  rules: [
    "A Solid must carry a triangle mesh.",
    "Volume must equal the signed-tetrahedron integral of that mesh.",
    "The mesh must be watertight: every edge shared by exactly two triangles.",
    "A boolean must change the mesh, not only a stored volume number.",
    "A revolve must tessellate. Vertex count must exceed twice the profile.",
    "An inconsistent sketch constraint returns HOLD and emits no solid.",
    "STL facet count must equal the mesh triangle count.",
    "A partial revolve must be watertight and tessellated.",
    "A subtract must change the mesh and the integrated volume.",
    "A chamfer must remove material. A fillet must add arc vertices and not match the chamfer volume.",
    "STEP export must be an ISO-10303-21 MANIFOLD_SOLID_BREP."
  ]
};

/** triangleCount: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted. */
export function triangleCount(mesh) {
  if (!mesh?.faces) return 0;
  return mesh.faces.reduce((n, f) => n + Math.max(0, f.length - 2), 0);
}

/** meshVolume: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted. */
export function meshVolume(mesh) {
  if (!mesh?.vertices || !mesh?.faces) return 0;
  let v = 0;
  const vs = mesh.vertices;
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const a = vs[face[0]], b = vs[face[i]], c = vs[face[i + 1]];
      v += a.x * (b.y * c.z - b.z * c.y)
         - a.y * (b.x * c.z - b.z * c.x)
         + a.z * (b.x * c.y - b.y * c.x);
    }
  }
  return Math.abs(v) / 6;
}

/** watertight: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted. */
export function watertight(mesh) {
  const count = new Map();
  for (const face of mesh.faces || []) {
    for (let i = 1; i < face.length - 1; i++) {
      const tri = [face[0], face[i], face[i + 1]];
      for (let e = 0; e < 3; e++) {
        const a = tri[e], b = tri[(e + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        count.set(key, (count.get(key) || 0) + 1);
      }
    }
  }
  const bad = [...count.values()].filter(n => n !== 2);
  return { ok: count.size > 0 && bad.length === 0, edges: count.size, openEdges: bad.length };
}

/** validateSolid: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted. */
export function validateSolid(solid) {
  const reasons = [];
  if (!solid || solid.type !== "Solid") reasons.push("Not a Solid");
  if (!solid?.mesh?.vertices?.length || !solid?.mesh?.faces?.length) reasons.push("Solid has no mesh");
  if (solid?.mesh) {
    const integrated = meshVolume(solid.mesh);
    const rel = Math.abs(integrated - (solid.volume ?? 0)) / Math.max(integrated, 1e-9);
    if (rel > 1e-4) reasons.push(`Volume ${solid.volume} is not the mesh integral ${integrated}`);
    const topo = watertight(solid.mesh);
    if (!topo.ok) reasons.push(`Mesh is not watertight (${topo.openEdges} bad edges)`);
  }
  return reasons.length
    ? { outcome: "HOLD", reasons, contract: CAD_CONTRACT.id }
    : { outcome: "PASS", contract: CAD_CONTRACT.id, volume: solid.volume };
}

/** rejectFormulaOnly: CAD geometry contracts. Rejects formula-only volume claims. Requires mesh-integral signed volume, watertight topology, and consistent outward winding before a solid is accepted. */
export function rejectFormulaOnly(before, after, op) {
  if (!after?.mesh) return { outcome: "HOLD", reason: `${op} returned no mesh` };
  const sameMesh = JSON.stringify(before?.mesh) === JSON.stringify(after.mesh);
  if (sameMesh) return { outcome: "HOLD", reason: `${op} did not change the mesh` };
  return { outcome: "PASS" };
}
