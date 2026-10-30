/**
 * Iteration 35 – object SIR, loops, conditionals, open closures, traceability.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync, existsSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { runObjects } from "../site/components/sir/sir-objects.js";
import { CLOSURES } from "../site/components/core/open-closures.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
const project = kernel.upsert({ id: "p35", type: "Project", name: "P", provenance: { origin: "iter35" } });

const program = `this is a program named "demo"
let n be 2
if n is greater than 0
a Component called motor named "Motor"
end
repeat 2 times
a Component called part named "Part"
end`;

bibo("sirObjects", {
  below: { fn: () => runObjects(kernel, project.id, ""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => runObjects(kernel, project.id, "this is a program named \"edge\"\nrepeat 0 times\na Component called x named \"X\"\nend"), expect: (r) => r.outcome === "OK" && r.created.length === 0 },
  within: { fn: () => runObjects(kernel, project.id, program), expect: (r) => r.outcome === "OK" && r.created.includes("motor") && r.created.includes("part_1") },
  above: { fn: () => runObjects(kernel, project.id, "this is a program named \"x\"\nrepeat 1001 times\nend"), expect: (r) => r.outcome === "HOLD" }
});

bibo("closures", {
  below: { fn: () => CLOSURES.fidelity.reduce(-1), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => CLOSURES.fidelity.reduce(0), expect: (r) => r.outcome === "OK" && r.level === 0 },
  within: { fn: () => CLOSURES.fidelity.reduce(4), expect: (r) => r.outcome === "OK" },
  above: { fn: () => CLOSURES.fidelity.reduce(8), expect: (r) => r.outcome === "HOLD" }
});

assert(CLOSURES.aiProposal.reduce("do this").accepted === false, "AI stays a proposal");
assert(CLOSURES.secret.reduce("key AKIAIOSFODNN7EXAMPLE here").found === true, "Secret is redacted");
assert(CLOSURES.lifecycle.reduce(12).outcome === "OK", "G12 is inside");
assert(CLOSURES.lifecycle.reduce(13).outcome === "HOLD", "G13 holds");
assert(existsSync("docs/iterations/TRACEABILITY.md"), "Traceability document is produced");
assert(readFileSync("docs/iterations/TRACEABILITY.md", "utf8").includes("Iteration"), "Traceability has rows");

console.log("\n=== ALL ITERATION 35 TESTS PASSED ===");
