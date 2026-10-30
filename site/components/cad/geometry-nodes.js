/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/geometry-nodes.js
 * FILE PURPOSE: Geometry nodes. A graph of operations on a mesh. Evaluate walks the nodes in order. An unknown node holds.
 * MRD 5.
 */
const OPS = {
  translate: (mesh, p) => ({ ...mesh, vertices: mesh.vertices.map(v => ({ x: v.x + p.x, y: v.y + p.y, z: v.z + p.z })) }),
  scale: (mesh, p) => ({ ...mesh, vertices: mesh.vertices.map(v => ({ x: v.x * p, y: v.y * p, z: v.z * p })) })
};

export function evaluate(mesh, nodes) {
  if (!mesh?.vertices) return { outcome: "HOLD", reason: "Mesh is UNSPECIFIED" };
  if (!nodes?.length) return { outcome: "HOLD", reason: "No nodes" };
  let current = mesh;
  for (const node of nodes) {
    const op = OPS[node.op];
    if (!op) return { outcome: "HOLD", reason: "Node is not known: " + node.op };
    current = op(current, node.param);
  }
  return { outcome: "OK", mesh: current };
}
