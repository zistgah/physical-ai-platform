Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Iteration 14 Result

False in-scope domain markers removed. Geometry CAD built.

## Removed

- docs/architecture/in-scope domains.md
- In-scope domain framing in the quality review, platform closure, roadmap, and capability index.
- UNAVAILABLE boundary that treated in-scope domains as excluded.

## Geometry CAD

`site/components/cad/geometry-kernel.js`

- Sketch on a plane. Fewer than 3 points HOLDs.
- Closed profile area.
- Extrude to a solid with mesh, bounds, and volume.
- Revolve.
- Boolean union and subtract.
- STL export.
- Canonical types: Sketch, Solid, Feature, Geometry.
- Relation: Component HAS_GEOMETRY Solid.
- `/cad` page.

This is the platform geometry kernel: parametric sketch, extrude, revolve, boolean, mesh, volume. It is in scope.
