/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 15 – CAD must satisfy the geometry contract.
 * A formula-only solid fails.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { CAD_CONTRACT, validateSolid, meshVolume, rejectFormulaOnly } from "../site/components/cad/cad-contracts.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 15 ===");
  assert(CAD_CONTRACT.rules.length >= 6, "CAD contract has anti-toy rules");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p15", type: "Project", name: "CAD15", provenance: { origin: "iter15" } });
  const part = kernel.upsert({ id: "part-15", type: "Component", name: "Housing", provenance: { origin: "iter15" } });
  kernel.link(project.id, "CONTAINS", part.id);
  const cad = new GeometryKernel(kernel);

  const bad = cad.sketch(project.id, {
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
    constraints: [{ kind: "distance", a: 0, b: 1, value: 10 }, { kind: "distance", a: 0, b: 1, value: 25 }]
  });
  assert(bad.outcome === "HOLD", "Inconsistent sketch constraint HOLDs and emits no solid");

  const sketch = cad.sketch(project.id, {
    id: "sk-15",
    name: "Plate",
    points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }],
    constraints: [{ kind: "horizontal", a: 0, b: 1 }, { kind: "distance", a: 0, b: 1, value: 40 }]
  });
  assert(sketch.type === "Sketch" && sketch.area === 800, "Constrained rectangle solves to area 800");

  const solid = cad.extrude(project.id, sketch.id, 10, { componentId: part.id, name: "Plate body" });
  assert(solid.type === "Solid", "Extrude returns a Solid");
  assert(validateSolid(solid).outcome === "PASS", "Extrude passes the CAD contract");
  assert(Math.abs(solid.volume - 8000) < 1e-6, "Extrude volume is 8000, from the mesh");
  assert(Math.abs(solid.volume - meshVolume(solid.mesh)) < 1e-6, "Volume is the mesh integral");
  assert(solid.triangleCount >= 12, "Extrude mesh is triangulated");

  const toy = { type: "Solid", volume: 8000, mesh: null };
  assert(validateSolid(toy).outcome === "HOLD", "Formula-only solid with no mesh is rejected");

  const holeSketch = cad.sketch(project.id, {
    id: "sk-hole",
    name: "Hole",
    points: [{ x: 10, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 15 }, { x: 10, y: 15 }]
  });
  const cutter = cad.extrude(project.id, holeSketch.id, 10, { name: "Cutter" });
  const cut = cad.boolean(project.id, solid.id, cutter.id, "SUBTRACT", { name: "Plate minus pocket" });
  assert(cut.type === "Solid", "Subtract returns a solid");
  assert(rejectFormulaOnly(solid, cut, "SUBTRACT").outcome === "PASS", "Subtract changes the mesh");
  assert(Math.abs(cut.volume - 7000) < 1e-6, "Pocket volume is base minus cutter");
  assert(validateSolid(cut).outcome === "PASS", "Subtract result is watertight");

  const revSketch = cad.sketch(project.id, {
    id: "sk-rev",
    name: "Profile",
    points: [{ x: 5, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 12 }, { x: 5, y: 12 }]
  });
  const rev = cad.revolve(project.id, revSketch.id, 360);
  assert(rev.type === "Solid", "Revolve returns a solid");
  assert(rev.mesh.vertices.length > revSketch.points.length * 2, "Revolve tessellates");
  assert(validateSolid(rev).outcome === "PASS", "Revolve mesh passes the contract");

  const stl = cad.stl(solid.id);
  assert(stl.outcome === "OK" && stl.facets === solid.triangleCount, "STL facet count matches the mesh");

  const moved = cad.translate(project.id, solid.id, 100, 0, 0);
  assert(moved.mesh.vertices[0].x === solid.mesh.vertices[0].x + 100, "Translate moves vertices");
  assert(Math.abs(moved.volume - solid.volume) < 1e-6, "Translate preserves volume");

  console.log("\n=== ALL ITERATION 15 TESTS PASSED ===");
}
run();
