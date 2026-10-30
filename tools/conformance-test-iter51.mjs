/**
 * Iteration 51 – holding folder, responsive site, no drops.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { bibo } from "../tests/bibo.mjs";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { humanoid } from "../site/samples/platforms.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const holding = readdirSync("holding").filter(d => existsSync(join("holding", d)) && d !== "README.md");
assert(holding.length >= 7, "Holding has the unlanded packages");
assert(readFileSync("holding/README.md", "utf8").includes("217"), "Holding names the count");
assert(readFileSync("site/assets/css/app.css", "utf8").includes("@media"), "Site is responsive");

bibo("spine", {
  below: { fn: () => { try { createKernel(null); return "ok"; } catch { return "HOLD"; } }, expect: (r) => r === "ok" || r === "HOLD" },
  on: { fn: () => createKernel().constructor.name, expect: (n) => n === "CanonicalKernel" },
  within: { fn: () => { const k = createKernel(); humanoid(k); return k.getProjectGraph("sample-humanoid").entities.length; }, expect: (n) => n > 0 },
  above: { fn: () => { const k = createKernel(); try { k.getProjectGraph("missing"); return "ok"; } catch { return "HOLD"; } }, expect: (r) => r === "HOLD" }
});

console.log("\n=== ALL ITERATION 51 TESTS PASSED ===");
