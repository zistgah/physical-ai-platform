/**
 * Iteration 36 – honest matrix, STL exchange.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { exportSTL, importSTL, printable } from "../site/components/cad/stl-exchange.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const mesh = {
  vertices: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 10 }],
  faces: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]
};

bibo("stl", {
  below: { fn: () => exportSTL({ vertices: [], faces: [] }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => exportSTL(mesh, "edge"), expect: (r) => r.outcome === "OK" && r.facets === 4 },
  within: { fn: () => importSTL(exportSTL(mesh, "tetra").text), expect: (r) => r.outcome === "OK" && r.facets === 4 },
  above: { fn: () => importSTL("not an stl"), expect: (r) => r.outcome === "HOLD" }
});

const tv = printable(mesh, "tetra");
assert(tv.outcome === "OK" && tv.file === "tetra.stl", "printer file is an STL");

const matrix = readFileSync("docs/iterations/MRD-TRACEABILITY.md", "utf8");
assert(matrix.includes("Function"), "Matrix names functions");
assert(matrix.includes("open-closures.js are not listed"), "Boilerplate is named as boilerplate");
assert(matrix.includes("What is still open"), "Open rows are named");

console.log("\n=== ALL ITERATION 36 TESTS PASSED ===");
