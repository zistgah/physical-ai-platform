Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 16 Result

The CAD gaps from Iteration 15 are implemented as mesh geometry. Every new solid still has to pass CAD-GEOMETRY.

## Added

- Partial revolve, with end caps. Watertight. Tessellated.
- Subtract of a non-rectangular cutter. Triangle pocket volume is the mesh integral.
- Subtract when the cutter crosses the boundary. The intersection is cut as a notch.
- Chamfer. Removes material. Watertight.
- Fillet. Adds arc vertices. Volume is not the chamfer volume.
- Shell. Removes the interior.
- Draft. Tapers the profile. Volume drops.
- Arc and spline sketches. A spline extrudes to a solid.
- STEP AP203-style export. ISO-10303-21, CARTESIAN_POINT, MANIFOLD_SOLID_BREP.
- B-rep derived from the mesh.
- Assembly placements with interference.

## Contract

CAD-GEOMETRY now also rejects a partial revolve that is not tessellated, a subtract that does not change the mesh, a chamfer that does not remove material, and a STEP file that is not a manifold solid B-rep.
