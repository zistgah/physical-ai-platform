/**
 * Iteration 48 – stitched drop-in packages and notebooks.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { bibo } from "../tests/bibo.mjs";
import { cfdStep } from "../drop-in/cfd/module.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const packages = readdirSync("drop-in").filter(d => existsSync(join("drop-in", d, "module.js")) || existsSync(join("drop-in", d, "module.py")));
assert(packages.length >= 13, "At least thirteen packages");

const good = { mesh: { cells: 8, height: 0.01 }, fluid: { density: 998, dynamicViscosity: 0.001 }, pressureGradient: -0.1, steps: 100 };
bibo("cfdStitch", {
  below: { fn: () => cfdStep({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => cfdStep(good), expect: (r) => r.outcome === "OK" },
  within: { fn: () => cfdStep(good).residual, expect: (r) => typeof r === "number" },
  above: { fn: () => cfdStep({ ...good, steps: 0 }), expect: (r) => r.outcome === "HOLD" }
});

const notebooks = ["COLAB_CAD_WORKBENCH.ipynb", "circuit-backend-lab.ipynb", "circuit-design-space-lab.ipynb"];
for (const n of notebooks) assert(existsSync(join("site/notebooks", n)), n + " is present");
assert(readFileSync("site/assets/js/app.js", "utf8").includes("/notebooks"), "Notebooks route is registered");
assert(readFileSync("site/index.html", "utf8").includes("#/notebooks"), "Notebooks link is in the nav");

console.log("\n=== ALL ITERATION 48 TESTS PASSED ===");
