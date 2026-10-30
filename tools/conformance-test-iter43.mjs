/**
 * Iteration 43 – eleven sample platforms, copyright, no other organization.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { PLATFORMS, humanoid, spacecraft } from "../site/samples/platforms.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { importSTL } from "../site/components/cad/stl-exchange.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
bibo("platforms", {
  below: { fn: () => { try { humanoid(null); return "threw"; } catch { return "HOLD"; } }, expect: (r) => r === "HOLD" },
  on: { fn: () => humanoid(kernel).mass, expect: (m) => m === 75 },
  within: { fn: () => kernel.getProjectGraph("sample-humanoid").entities.filter(e => e.type === "Component").length, expect: (n) => n === 8 },
  above: { fn: () => spacecraft(kernel).mass, expect: (m) => m === 250 }
});

assert(PLATFORMS.length === 11, "Eleven platforms");
const fresh = createKernel();
for (const fn of PLATFORMS) fn(fresh);
assert(fresh.store.all("Project").length === 11, "All eleven load");

const stl = `solid box
facet normal 0 0 -1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 1 1 0
endloop
endfacet
endsolid box`;
bibo("stlImport", {
  below: { fn: () => importSTL(""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => importSTL(stl), expect: (r) => r.outcome === "OK" && r.facets === 1 },
  within: { fn: () => importSTL(stl).mesh.vertices.length, expect: (n) => n === 3 },
  above: { fn: () => importSTL("not stl"), expect: (r) => r.outcome === "HOLD" }
});

const contract = readFileSync("docs/CONTRACT.md", "utf8");
assert(contract.includes("GPL-3.0-only"), "Contract names the license");
assert(contract.includes("No other organization is named"), "Contract forbids other organizations");
assert(contract.includes("Copyright © 1993-2026 Abhishek Choudhary"), "Contract names the copyright");

console.log("\n=== ALL ITERATION 43 TESTS PASSED ===");
