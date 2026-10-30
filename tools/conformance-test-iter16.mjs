/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 16 – complete the CAD feature set under the mesh contract.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { validateSolid, meshVolume } from "../site/components/cad/cad-contracts.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 16 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p16", type: "Project", name: "CAD16", provenance: { origin: "iter16" } });
  const cad = new GeometryKernel(kernel);

  const plate = cad.sketch(project.id, {
    id: "sk-plate",
    name: "Plate",
    points: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }]
  });
  const base = cad.extrude(project.id, plate.id, 12, { name: "Plate body" });
  assert(validateSolid(base).outcome === "PASS" && Math.abs(base.volume - 28800) < 1e-4, "Base plate volume is the mesh integral");

  const partial = cad.revolvePartial(project.id, plate.id, 90, { name: "Quarter revolve" });
  assert(partial.type === "Solid", "Partial revolve returns a solid");
  assert(validateSolid(partial).outcome === "PASS", "Partial revolve is watertight");
  assert(partial.mesh.vertices.length > plate.points.length * 2, "Partial revolve tessellates");
  assert(partial.volume > 0, "Partial revolve has mesh volume");

  const triHole = cad.sketch(project.id, {
    id: "sk-tri",
    name: "Triangle hole",
    points: [{ x: 10, y: 10 }, { x: 25, y: 10 }, { x: 18, y: 24 }]
  });
  const cutter = cad.extrude(project.id, triHole.id, 12, { name: "Triangle cutter" });
  const cut = cad.boolean(project.id, base.id, cutter.id, "SUBTRACT", { name: "Plate minus triangle" });
  assert(cut.type === "Solid", "Non-rectangular subtract returns a solid");
  assert(validateSolid(cut).outcome === "PASS", "Non-rectangular pocket is watertight");
  assert(cut.volume < base.volume - 1, "Triangle pocket reduces volume");

  const overlapSketch = cad.sketch(project.id, {
    id: "sk-over",
    name: "Crossing cutter",
    points: [{ x: 50, y: 30 }, { x: 80, y: 30 }, { x: 80, y: 50 }, { x: 50, y: 50 }]
  });
  const overlapCutter = cad.extrude(project.id, overlapSketch.id, 12, { name: "Crossing cutter" });
  const overlap = cad.boolean(project.id, base.id, overlapCutter.id, "SUBTRACT", { name: "Partial overlap" });
  assert(overlap.type === "Solid" && validateSolid(overlap).outcome === "PASS", "Partial-overlap subtract is watertight");
  assert(overlap.volume < base.volume - 1, "Partial-overlap subtract removes the intersection");

  const cham = cad.chamfer(project.id, plate.id, 4, 12, { name: "Chamfered plate" });
  assert(cham.type === "Solid" && validateSolid(cham).outcome === "PASS", "Chamfer is a watertight solid");
  assert(cham.volume < base.volume - 1, "Chamfer removes material");

  const fil = cad.fillet(project.id, plate.id, 4, 12, { name: "Filleted plate" });
  assert(fil.type === "Solid" && validateSolid(fil).outcome === "PASS", "Fillet is a watertight solid");
  assert(fil.mesh.vertices.length > base.mesh.vertices.length, "Fillet adds arc vertices");
  assert(Math.abs(fil.volume - cham.volume) > 1, "Fillet volume is not the chamfer volume");

  const shelled = cad.shell(project.id, base.id, 3, { name: "Shelled plate" });
  assert(shelled.type === "Solid" && validateSolid(shelled).outcome === "PASS", "Shell is watertight");
  assert(shelled.volume < base.volume - 100, "Shell removes the interior");

  const drafted = cad.draft(project.id, plate.id, 12, 5, { name: "Drafted plate" });
  assert(drafted.type === "Solid" && validateSolid(drafted).outcome === "PASS", "Draft is watertight");
  assert(drafted.volume < base.volume, "Draft reduces volume");

  const arc = cad.arcSketch(project.id, { id: "sk-arc", center: { x: 0, y: 0 }, radius: 10, startDeg: 0, endDeg: 180 });
  assert(arc.type === "Sketch" && arc.points.some(p => p.curve === "ARC" || arc.points.length > 4), "Arc sketch samples a curve");

  const spline = cad.splineSketch(project.id, {
    id: "sk-spl",
    controls: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 5 }, { x: 40, y: 15 }]
  });
  assert(spline.type === "Sketch" && spline.points.length > 4, "Spline sketch samples the curve");
  const splSolid = cad.extrude(project.id, spline.id, 5, { name: "Spline solid" });
  assert(splSolid.type === "Solid" && validateSolid(splSolid).outcome === "PASS", "Spline extrude is a solid");

  const step = cad.step(base.id);
  assert(step.outcome === "OK", "STEP export succeeds");
  assert(step.step.includes("ISO-10303-21;") && step.step.includes("MANIFOLD_SOLID_BREP") && step.step.includes("CARTESIAN_POINT"), "STEP is a manifold solid B-rep");
  assert(step.brep.edges.length > 0 && step.brep.faces.length === base.mesh.faces.length, "B-rep matches the mesh");

  const a = cad.translate(project.id, base.id, 0, 0, 0, { id: "placed-a" });
  const b = cad.translate(project.id, base.id, 30, 0, 0, { id: "placed-b" });
  const c = cad.translate(project.id, base.id, 200, 0, 0, { id: "placed-c" });
  const hit = cad.assembly(project.id, { name: "Overlap", placements: [{ solidId: a.id }, { solidId: b.id, x: 30 }] });
  const miss = cad.assembly(project.id, { name: "Clear", placements: [{ solidId: a.id }, { solidId: c.id, x: 200 }] });
  assert(hit.interference[0].interferes === true, "Overlapping placement interferes");
  assert(miss.interference[0].interferes === false, "Separated placement does not interfere");

  console.log("\n=== ALL ITERATION 16 TESTS PASSED ===");
}
run();
