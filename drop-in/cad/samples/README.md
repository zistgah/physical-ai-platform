# CAD sample geometries

All sample coordinates use consistent arbitrary linear units (the fixtures use millimetres by convention). Each JSON file contains `base`, `cutter`, an optional analytical `expectedIntersectionVolume`, and the allowed absolute volume tolerance.

| File | Case | Expected behavior |
|---|---|---|
| `box-overlap.json` | Two overlapping 10 x 10 x 10 cubes | `OK`, volume 125 |
| `nonconvex-l-prism.json` | Concave L-prism and rectangular window | `OK`, volume 4.5 |
| `rotated-box.json` | Rotated non-axis-aligned cutter | `OK`, positive volume, topology and independent volume check |
| `identical-solids.json` | Coincident cubes | `OK`, volume 1000 |
| `contained-solid.json` | Unit cube inside a larger cube | `OK`, volume 1 |
| `disjoint-solids.json` | Separate cubes | `HOLD`, no volumetric result |
| `tangent-solids.json` | Face-only contact | `HOLD`, no positive volume |

Fixtures are triangulated closed surfaces, not CAD feature histories. They exercise the intersection adapter and geometric backend, not sketch constraints or parametric feature regeneration.
