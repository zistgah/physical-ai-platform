/**
 * Iteration 47 – ten drop-in packages, each tested.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { bibo } from "../tests/bibo.mjs";
import { cfdStep } from "../drop-in/cfd/module.js";
import { hilStep } from "../drop-in/hil/module.js";
import { supply } from "../drop-in/logistics/module.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const dirs = readdirSync("drop-in").filter(d => readFileSync(join("drop-in", d, "EXPLAINER.md"), "utf8").includes("What an industry leader has"));
assert(dirs.length === 10, "Ten packages");

const good = { mesh: { cells: 8, height: 0.01 }, fluid: { density: 998, dynamicViscosity: 0.001 }, pressureGradient: -0.1, steps: 100 };
bibo("cfd", {
  below: { fn: () => cfdStep({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => cfdStep(good), expect: (r) => r.outcome === "OK" },
  within: { fn: () => cfdStep(good).residual, expect: (r) => typeof r === "number" },
  above: { fn: () => cfdStep({ ...good, steps: 0 }), expect: (r) => r.outcome === "HOLD" }
});

const hilEmpty = await hilStep({});
assert(hilEmpty.outcome === "HOLD", "HIL holds without a hardware adapter");
const hilMock = await hilStep({ transport: { kind: "software", read: () => 0, write: () => true }, dt: 0.001 });
assert(hilMock.outcome === "HOLD", "A software mock is not HIL");

bibo("logistics", {
  below: { fn: () => supply({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => supply({ part: "bolt", qty: 10, lead: 2 }), expect: (r) => r.outcome === "OK" && r.qty === 10 },
  within: { fn: () => supply({ part: "bolt", qty: 10, lead: 0 }).lead, expect: (l) => l === 0 },
  above: { fn: () => supply({ part: "bolt", qty: 0, lead: 1 }), expect: (r) => r.outcome === "HOLD" }
});

for (const d of dirs) {
  const explainer = readFileSync(join("drop-in", d, "EXPLAINER.md"), "utf8");
  assert(explainer.includes("Do not flatten the canonical kernel"), d + " names the constraints");
  assert(!explainer.includes("Blender") && !explainer.includes("Google"), d + " names no organization");
}

console.log("\n=== ALL ITERATION 47 TESTS PASSED ===");
