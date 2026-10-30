/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Read-only integration probe against the Iteration 47 canonical CAD APIs.
 * It does not edit the kernel or acceptance scripts; it exercises the adapter seam.
 */
import { cadClip, cadClipRobust } from "./module.js";
import { createOcctBackend } from "./backends/node-occt-adapter.mjs";
import { createKernel } from "../../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../../site/components/cad/geometry-kernel.js";
import { validateSolid, meshVolume, watertight } from "../../site/components/cad/cad-contracts.js";

function assert(condition, message) { if (!condition) throw new Error(`FAIL: ${message}`); }
const kernel = createKernel();
const project = kernel.upsert({ id: "cad-dropin-integration", type: "Project", name: "CAD drop-in integration", provenance: { origin: "cad-integration-test" } });
const geometry = new GeometryKernel(kernel);
function makePrism(id, x, y, width, depth, height) {
  const sketch = geometry.sketch(project.id, { id: `${id}-sketch`, name: id, points: [
    { x, y }, { x: x + width, y }, { x: x + width, y: y + depth }, { x, y: y + depth }
  ] });
  assert(sketch?.type === "Sketch", `${id} sketch is canonical`);
  const solid = geometry.extrude(project.id, sketch.id, height, { id, name: id });
  assert(solid?.type === "Solid", `${id} prism is canonical and validated`);
  return solid;
}
const base = makePrism("base", 0, 0, 10, 10, 10);
const cutter = makePrism("cutter", 5, 5, 10, 10, 10);
const clipped = cadClip(base.mesh, cutter.mesh);
assert(clipped.outcome === "OK", `dependency-free convex path accepts canonical mesh inputs: ${clipped.reason || ""}`);
assert(Math.abs(clipped.volume - 250) < 1e-6, "convex path volume is the expected 250 mm³");

// The native host backend exercises the full OCCT B-rep Boolean and tessellation path.
const robust = await cadClipRobust(base.mesh, cutter.mesh, {
  backend: createOcctBackend(), tolerance: 1e-7, deflection: 1e-3
});
assert(robust.outcome === "OK", `OCCT-backed intersection accepts canonical mesh inputs: ${robust.reason || ""}`);
assert(robust.engine === "OCCT", "native geometry engine is identified in result provenance");
assert(Math.abs(robust.volume - 250) < 1e-6, "OCCT B-rep volume is the expected 250 mm³");
assert(Math.abs(robust.meshVolume - 250) < 1e-6, "OCCT tessellation volume independently matches B-rep volume");
assert(robust.topology.watertight === true, "OCCT output mesh passes manifold edge audit");
const integrated = geometry._solid(project.id, {
  id: "base-cutter-intersection", name: "Base/cutter intersection", feature: "INTERSECT",
  mesh: robust.mesh, planes: []
});
assert(integrated?.type === "Solid", `canonical Solid contract accepts the tessellation: ${integrated?.reasons || integrated?.reason || ""}`);
assert(validateSolid(integrated).outcome === "PASS", "canonical CAD geometry contract passes");
assert(watertight(integrated.mesh).ok, "canonical triangle mesh is watertight");
assert(Math.abs(meshVolume(integrated.mesh) - 250) < 1e-6, "canonical mesh-integral volume matches 250 mm³");
assert(kernel.store.get(integrated.id)?.type === "Solid", "result is persisted through the canonical store");
console.log("cad integration PASS: canonical sketches -> extruded solids -> JS convex + OCCT B-rep intersection -> indexed tessellation -> canonical Solid -> CAD contract -> mesh volume/topology");
