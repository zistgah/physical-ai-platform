/**
 * Iteration 37 – billing, AI round trip, self-assurance, projections.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { Billing } from "../site/components/core/billing.js";
import { toProvider, fromProvider, accept } from "../site/components/core/ai-roundtrip.js";
import { SelfAssurance } from "../site/components/safety/self-assurance.js";
import { project } from "../site/components/graph/projections.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const kernel = createKernel();
const p = kernel.upsert({ id: "p37", type: "Project", name: "P", provenance: { origin: "iter37" } });
const billing = new Billing(kernel);
billing.meter(p.id, { id: "m", unit: "hour", rate: 10 });

bibo("billing", {
  below: { fn: () => billing.record("m", 0), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => billing.record("m", 1), expect: (r) => r.outcome === "OK" && r.amount === 10 },
  within: { fn: () => billing.invoice(p.id, "m", { id: "inv" }), expect: (r) => r.outcome === "OK" && r.invoice.amount === 10 },
  above: { fn: () => billing.pay("inv", 9), expect: (r) => r.outcome === "HOLD" }
});
assert(billing.pay("inv", 10).status === "PAID", "Exact payment settles");

bibo("ai", {
  below: { fn: () => toProvider(kernel, p.id, null, null), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => fromProvider(kernel, p.id, { id: "prop", text: "add a guard" }), expect: (r) => r.outcome === "PROPOSAL" && r.accepted === false },
  within: { fn: () => accept(kernel, "prop", "engineer"), expect: (r) => r.outcome === "OK" },
  above: { fn: () => accept(kernel, "prop", null), expect: (r) => r.outcome === "HOLD" }
});

const sa = new SelfAssurance(kernel);
sa.claim(p.id, { id: "claim", text: "Kernel is source of truth" });
bibo("assure", {
  below: { fn: () => sa.assess("missing"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => sa.assess("claim"), expect: (r) => r.outcome === "HOLD" },
  within: { fn: () => { const ev = kernel.upsert({ id: "ev", type: "Evidence", name: "t", state: "EXECUTED", provenance: { origin: "t" } }); sa.evidence("claim", "ev"); return sa.assess("claim"); }, expect: (r) => r.outcome === "SUPPORTED" },
  above: { fn: () => sa.evidence("claim", "p37"), expect: (r) => r.outcome === "HOLD" }
});

const graph = kernel.getProjectGraph(p.id);
bibo("project", {
  below: { fn: () => project(null, "commercial"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => project(graph, "commercial"), expect: (r) => r.outcome === "OK" && r.sameModel === true },
  within: { fn: () => project(graph, "architecture"), expect: (r) => r.outcome === "OK" },
  above: { fn: () => project(graph, "nope"), expect: (r) => r.outcome === "HOLD" }
});

const gap = readFileSync("docs/iterations/CAD-GAP.md", "utf8");
assert(gap.includes("What a full modeller has that we do not"), "CAD gap is named");

console.log("\n=== ALL ITERATION 37 TESTS PASSED ===");
