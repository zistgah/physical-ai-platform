/**
 * Iteration 44 – handoff packager and honest suite gaps.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { pack, accept } from "../site/components/core/handoff.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
bibo("handoff", {
  below: { fn: () => pack({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => pack({ component: "cad/brep-boolean.js", gap: "intersection" }), expect: (r) => r.outcome === "OK" && r.zipName === "cad-brep-boolean.js.zip" },
  within: { fn: () => accept(kernel, "cad/brep-boolean.js", "added intersection"), expect: (r) => r.outcome === "OK" },
  above: { fn: () => accept(kernel, "x", ""), expect: (r) => r.outcome === "HOLD" }
});

const gaps = readFileSync("docs/iterations/SUITE-GAPS.md", "utf8");
assert(gaps.includes("SHALLOW"), "Suite gaps name the shallow domains");
assert(gaps.includes("What is a bluff if claimed"), "Suite gaps name the bluff line");
assert(!gaps.includes("Blender") && !gaps.includes("Google"), "No other organization named");

console.log("\n=== ALL ITERATION 44 TESTS PASSED ===");
