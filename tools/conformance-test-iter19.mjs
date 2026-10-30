/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 19 – general profile subtract and CAD workbench.
 */
import { readFileSync } from "node:fs";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { createCadSession } from "../site/components/cad/cad-workbench.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 19 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p19", type: "Project", name: "CAD", provenance: { origin: "iter19" } });
  const cad = new GeometryKernel(kernel);

  const hex = cad.sketch(project.id, { id: "hex", name: "Hex", points: [
    { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 50, y: 20 }, { x: 40, y: 40 }, { x: 0, y: 40 }, { x: -10, y: 20 }
  ] });
  const tri = cad.sketch(project.id, { id: "tri", name: "Tri", points: [
    { x: 10, y: 10 }, { x: 25, y: 10 }, { x: 18, y: 22 }
  ] });
  const base = cad.extrude(project.id, hex.id, 10);
  const cutter = cad.extrude(project.id, tri.id, 10);
  const sub = cad.boolean(project.id, base.id, cutter.id, "SUBTRACT");
  assert(sub.volume === base.volume - cutter.volume, "Subtract works for a triangle in a hexagon");
  assert(sub.triangleCount > 0, "Subtract changes the mesh");

  const page = readFileSync("site/assets/js/app.js", "utf8");
  assert(page.includes("createCadSession") && page.includes("cad-canvas") && page.includes("Feature tree"), "CAD page is a workbench, not a canned plate");
  assert(!page.includes("UI plate solid"), "Canned plate demo is gone");

  const session = createCadSession(kernel, project.id);
  const bad = session.addPoint("nope", 1);
  assert(bad.outcome === "HOLD", "Workbench holds a bad point");
  session.state.selectedId = base.id;
  const cut = session.subtract(cad);
  assert(cut.volume < base.volume, "Workbench subtract reduces volume");
  assert(session.features().some(f => f.type === "Solid"), "Feature tree lists solids");

  console.log("\n=== ALL ITERATION 19 TESTS PASSED ===");
}
run();
