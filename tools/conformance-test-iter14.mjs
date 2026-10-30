/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 14 – geometry CAD. Non-goals removed.
 */
import { createKernel, CANONICAL_ENTITY_TYPES } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { existsSync } from "node:fs";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 14 ===");
  assert(!existsSync("docs/architecture/non-goals.md"), "non-goals.md is removed");
  assert(CANONICAL_ENTITY_TYPES.has("Sketch") && CANONICAL_ENTITY_TYPES.has("Solid"), "Geometry types are canonical");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p14", type: "Project", name: "CAD", provenance: { origin: "iter14" } });
  const part = kernel.upsert({ id: "part-1", type: "Component", name: "Bracket", provenance: { origin: "iter14" } });
  kernel.link(project.id, "CONTAINS", part.id);

  const cad = new GeometryKernel(kernel);
  const hold = cad.sketch(project.id, { points: [{ x: 0, y: 0 }] });
  assert(hold.outcome === "HOLD", "Open sketch HOLDs");

  const sketch = cad.sketch(project.id, {
    id: "sk-1",
    name: "Base",
    points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }]
  });
  assert(sketch.area === 800, "Rectangle area is 800");

  const solid = cad.extrude(project.id, sketch.id, 10, { componentId: part.id, name: "Bracket body" });
  assert(solid.type === "Solid" && solid.volume === 8000, "Extrude volume is area times height");
  assert(solid.mesh.vertices.length === 8, "Extrude mesh has 8 vertices");

  const stl = cad.stl(solid.id);
  assert(stl.outcome === "OK" && stl.stl.includes("vertex"), "STL export writes geometry");

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.type === "Solid"), "Solid is on the canonical graph");
  assert(graph.relations.some(r => r.relation === "HAS_GEOMETRY" && r.source === part.id), "Component has geometry");

  const rev = cad.revolve(project.id, sketch.id, 360);
  assert(rev.feature === "REVOLVE" && rev.volume > 0, "Revolve produces a solid");

  console.log("\n=== ALL ITERATION 14 TESTS PASSED ===");
}
run();
