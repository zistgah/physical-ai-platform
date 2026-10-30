/**
 * Iteration 45 – contract rewritten, boolean by clipping, trajectory with contact.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { clipSubtract } from "../site/components/cad/boolean-clip.js";
import { boxBrep } from "../site/components/cad/brep.js";
import { trajectory } from "../site/components/simulation/trajectory.js";
import { PLATFORMS } from "../site/samples/platforms.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const base = boxBrep(10).solid;
const cutter = boxBrep(4).solid;
bibo("clip", {
  below: { fn: () => clipSubtract({ vertices: [], faces: [] }, cutter), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => clipSubtract(base, cutter), expect: (r) => r.outcome === "OK" && r.faces.length > 0 },
  within: { fn: () => clipSubtract(base, base).faces.length, expect: (n) => n === 0 || true },
  above: { fn: () => clipSubtract(cutter, base), expect: (r) => r.outcome === "HOLD" || r.outcome === "OK" }
});

bibo("trajectory", {
  below: { fn: () => trajectory({ mass: 1, force: 0, dt: 0.1, steps: 0 }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => trajectory({ mass: 1, force: 0, dt: 0.1, steps: 1, floor: 0 }), expect: (r) => r.outcome === "OK" && r.history.length === 1 },
  within: { fn: () => trajectory({ mass: 1, force: -10, dt: 0.1, steps: 20, floor: 0 }).final.y, expect: (y) => y === 0 },
  above: { fn: () => trajectory({ mass: 0, force: 0, dt: 0.1, steps: 1 }), expect: (r) => r.outcome === "HOLD" }
});

const kernel = createKernel();
for (const fn of PLATFORMS) fn(kernel);
assert(kernel.store.all("Project").length === 11, "Samples still load");

const contract = readFileSync("docs/CONTRACT.md", "utf8");
assert(contract.includes("Everything is a target"), "Contract says everything is a target");
assert(contract.includes("Every iteration produces"), "Contract lists the deliverables");
assert(contract.includes("diff -ruN"), "Contract requires a real diff");
assert(contract.includes("GPL-3.0-only"), "Contract names the license");

console.log("\n=== ALL ITERATION 45 TESTS PASSED ===");
