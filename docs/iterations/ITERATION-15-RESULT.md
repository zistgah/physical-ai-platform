Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 15 Result

Iteration 14 was not CAD. It stored area times height. This iteration adds a contract that rejects that, and a kernel that satisfies the contract.

## Contract

`site/components/cad/cad-contracts.js` and `schemas/cad-contract.schema.json`.

A solid must:
- carry a triangle mesh
- have volume equal to the signed-tetrahedron integral of that mesh
- be watertight
- change the mesh on boolean, not only a number
- tessellate a revolve
- reject an inconsistent sketch constraint
- emit an STL whose facet count matches the mesh

A solid with a volume and no mesh is HOLD.

## Kernel

- Sketch constraints: horizontal, vertical, distance, coincident. Inconsistent constraint HOLDs.
- Extrude builds a triangulated prism. Volume comes from the mesh.
- Revolve tessellates the profile around the axis. 24 segments.
- Subtract of a contained rectangular cutter builds a watertight pocket mesh. 40×20×10 minus 10×10×10 is 7000.
- Intersect clips the mesh against the cutter planes.
- Translate moves vertices and preserves volume.
- STL is generated from the mesh triangles.
