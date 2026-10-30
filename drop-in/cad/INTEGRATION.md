# Integration guide

Read `STITCH-INSTRUCTIONS.md` for the exact Iteration 47 adapter seam and integration sequence. Read `backends/README.md` for optional native backend installation, selection, protocol, and licensing.

This package deliberately does not edit `site/components/cad/geometry-kernel.js`, the canonical kernel, the CAD schema, or the acceptance script. It supplies a backend-neutral operation and integration seam for Grok to register in the canonical Boolean dispatch.

The current source-level integration test is `integration-test.mjs`. It exercises the existing canonical sketch/extrusion path, convex JavaScript intersection, OCCT-backed non-convex-capable host intersection, canonical `_solid` persistence, `validateSolid`, watertightness and mesh-integral volume.
