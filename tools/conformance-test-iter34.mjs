/**
 * Iteration 34 – executable correlation, standards classification, human SIR.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { correlate, shared, BOARDS } from "../site/components/education/board-correlation-exec.js";
import { classifyAll, unclassified } from "../site/components/compliance/standards-classify.js";
import { runHuman, toStatements } from "../site/components/sir/sir-human.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

bibo("correlate", {
  below: { fn: () => correlate("", "10", "Mathematics"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => correlate("CBSE", "10", "Mathematics"), expect: (r) => r.outcome === "OK" && r.concept === "algebra" },
  within: { fn: () => correlate("GATE", "ROBOTICS", "Kinematics"), expect: (r) => r.outcome === "OK" && r.concept === "pose" },
  above: { fn: () => correlate("IB", "10", "Mathematics"), expect: (r) => r.outcome === "HOLD" }
});

assert(shared("pose").length === 2, "Pose is shared by GATE and UNIVERSITY");
assert(BOARDS.includes("ICSE") && BOARDS.includes("GATE"), "ICSE and GATE are registered");
const src = readFileSync("site/components/education/board-correlation-exec.js", "utf8");
assert(!/chapter 1|learning outcome|unit 1/i.test(src), "Correlation carries no syllabus text");

const all = classifyAll();
bibo("classify", {
  below: { fn: () => all.find(r => r.outcome === "HOLD") || { outcome: "OK" }, expect: (r) => r.outcome === "OK" },
  on: { fn: () => all[0], expect: (r) => r.outcome === "OK" && r.topicClass },
  within: { fn: () => all.length, expect: (n) => n === 164 },
  above: { fn: () => unclassified().length, expect: (n) => n === 0 }
});

const kernel = createKernel();
const project = kernel.upsert({ id: "p34", type: "Project", name: "P", provenance: { origin: "iter34" } });
const human = `this is a program named "demo"
a Component called motor named "Motor"
a Requirement called spin named "Spins"
motor allocates spin`;

bibo("sirHuman", {
  below: { fn: () => runHuman(kernel, project.id, ""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => toStatements(["this is a program named \"edge\""]), expect: (r) => r.outcome === "OK" },
  within: { fn: () => runHuman(kernel, project.id, human), expect: (r) => r.outcome === "OK" && r.created.includes("motor") },
  above: { fn: () => runHuman(kernel, project.id, "this is not a sentence"), expect: (r) => r.outcome === "HOLD" }
});

console.log("\n=== ALL ITERATION 34 TESTS PASSED ===");
