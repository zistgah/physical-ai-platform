/**
 * Iteration 29 – MRD traceability and code explanations.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

const mrd = readFileSync("docs/iterations/MRD-TRACEABILITY.md", "utf8");
assert(mrd.includes("| 10 | Cockpit states"), "MRD matrix covers cockpit");
assert(mrd.includes("content-address.js"), "Previously open identity row is now implemented");
assert(mrd.includes("Content-addressed identity"), "MRD matrix still names the identity requirement");

const trace = readFileSync("docs/iterations/TRACEABILITY.md", "utf8");
assert(trace.includes("## MRD traceability"), "Cross-iteration traceability includes MRD");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".js")) acc.push(p);
  }
  return acc;
}
const files = walk("site/components");
const explained = files.filter(f => readFileSync(f, "utf8").includes("FILE PURPOSE:"));
assert(explained.length === files.length, `Every component file explains itself (${explained.length}/${files.length})`);

console.log("\n=== ALL ITERATION 29 TESTS PASSED ===");
