/**
 * Iteration 42 – samples and real status.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { wheeledRobot } from "../site/samples/wheeled-robot.js";
import { staticSensor } from "../site/samples/static-sensor.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { Billing } from "../site/components/core/billing.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
bibo("samples", {
  below: { fn: () => { try { wheeledRobot(null); return "threw"; } catch { return "HOLD"; } }, expect: (r) => r === "HOLD" },
  on: { fn: () => wheeledRobot(kernel), expect: (r) => r.type === "Project" },
  within: { fn: () => kernel.getProjectGraph("sample-wheeled").entities.filter(e => e.type === "Component").length, expect: (n) => n === 4 },
  above: { fn: () => staticSensor(kernel).type, expect: (t) => t === "Project" }
});

const billing = new Billing(kernel);
billing.meter("sample-wheeled", { id: "meter", unit: "hour", rate: 10 });
billing.record("meter", 2);
assert(billing.invoice("sample-wheeled", "meter", { id: "inv" }).invoice.amount === 20, "Sample has a bill");

const matrix = readFileSync("docs/iterations/MRD-TRACEABILITY.md", "utf8");
assert(matrix.includes("| PASS |"), "Matrix has PASS rows");
assert(!matrix.includes("| PRESENT |") || matrix.includes("PRESENT is not a status"), "PRESENT is named as not a status");
assert(readFileSync("docs/CONTRACT.md", "utf8").includes("Sample projects"), "Contract requires samples");

console.log("\n=== ALL ITERATION 42 TESTS PASSED ===");
