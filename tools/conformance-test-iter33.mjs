/**
 * Iteration 33 – SIR language, syllabus gaps, semantic independence.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { run } from "../site/components/sir/sir-language.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
const project = kernel.upsert({ id: "p33", type: "Project", name: "P", provenance: { origin: "iter33" } });

const good = `sir 1 "demo";
entity Component motor { name: "Motor"; };
entity Requirement spin { name: "Spins"; };
relation motor ALLOCATES spin;
`;

bibo("sir", {
  below: { fn: () => run(kernel, project.id, ""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => run(kernel, project.id, "sir 1 \"edge\";"), expect: (r) => r.outcome === "OK" && r.created.length === 0 },
  within: { fn: () => run(kernel, project.id, good), expect: (r) => r.outcome === "OK" && r.created.includes("motor") },
  above: { fn: () => run(kernel, project.id, "sir 1 \"x\"; entity NotAType z { name: \"z\"; };"), expect: (r) => r.outcome === "HOLD" }
});

assert(run(kernel, project.id, "sir").reason.includes("Version") || run(kernel, project.id, "not sir").outcome === "HOLD", "A program that does not start with sir holds");

const syllabus = readFileSync("docs/iterations/SYLLABUS-STATUS.md", "utf8");
assert(syllabus.includes("Gaps the closure created"), "Syllabus records the gaps the board closure created");
assert(syllabus.includes("Undergraduate to postdoc"), "Syllabus names the unclosed upper bands");

const rule = readFileSync("docs/iterations/SEMANTIC-INDEPENDENCE.md", "utf8");
assert(rule.includes("every cycle"), "Semantic independence is a cycle rule");

console.log("\n=== ALL ITERATION 33 TESTS PASSED ===");
