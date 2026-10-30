/**
 * Iteration 41 – contract, workflow gate, fault domain, sovereignty view, scanner, cross-link, role workbench.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { WorkflowGate } from "../site/components/core/workflow-gate.js";
import { inject } from "../site/components/simulation/fault-domain.js";
import { exposure } from "../site/components/manufacturing/sovereignty-view.js";
import { scan } from "../site/components/core/secret-scan.js";
import { crossLink } from "../site/components/core/cross-link.js";
import { viewsFor } from "../site/components/core/role-workbench.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const wf = new WorkflowGate();
bibo("workflow", {
  below: { fn: () => wf.add(""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => wf.add("review", () => true), expect: (r) => r.outcome === "OK" },
  within: { fn: () => wf.advance(), expect: (r) => r.outcome === "OK" && r.step === "review" },
  above: { fn: () => { wf.add("blocked", () => false); return wf.advance(); }, expect: (r) => r.outcome === "HOLD" }
});

bibo("fault", {
  below: { fn: () => inject("unknown", 1), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => inject("sensor", 0, 1), expect: (r) => r.outcome === "INJECTED" && r.after === 1 },
  within: { fn: () => inject("actuator", 10, 0.5), expect: (r) => r.after === 5 },
  above: { fn: () => inject("sensor", NaN), expect: (r) => r.outcome === "HOLD" }
});

bibo("exposure", {
  below: { fn: () => exposure(null), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => exposure({ entities: [] }), expect: (r) => r.outcome === "OK" && r.count === 0 },
  within: { fn: () => exposure({ entities: [{ id: "c", type: "Component", externalControl: true }] }), expect: (r) => r.count === 1 },
  above: { fn: () => exposure({}), expect: (r) => r.outcome === "HOLD" }
});

bibo("scan", {
  below: { fn: () => scan(null), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => scan("clean"), expect: (r) => r.found === 0 },
  within: { fn: () => scan("key AKIAIOSFODNN7EXAMPLE here"), expect: (r) => r.found === 1 && r.redacted.includes("[AWS_KEY]") },
  above: { fn: () => scan("Bearer abc.def"), expect: (r) => r.redacted.includes("[TOKEN]") }
});

const kernel = createKernel();
const a = kernel.upsert({ id: "pa", type: "Project", name: "A", provenance: { origin: "t" } });
const b = kernel.upsert({ id: "pb", type: "Project", name: "B", provenance: { origin: "t" } });
bibo("crossLink", {
  below: { fn: () => crossLink(kernel, "missing", "pb"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => crossLink(kernel, "pa", "pb"), expect: (r) => r.outcome === "OK" },
  within: { fn: () => kernel.store.get("link_pa_pb")?.type, expect: (v) => v === "Connection" },
  above: { fn: () => crossLink(kernel, "pa", "pa"), expect: (r) => r.outcome === "OK" }
});

bibo("role", {
  below: { fn: () => viewsFor(""), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => viewsFor("engineer"), expect: (r) => r.views.includes("architecture") },
  within: { fn: () => viewsFor("regulator"), expect: (r) => r.views.includes("regulatory") },
  above: { fn: () => viewsFor("stranger"), expect: (r) => r.outcome === "HOLD" }
});

const contract = readFileSync("docs/CONTRACT.md", "utf8");
assert(contract.includes("Do not exclude a requirement"), "Contract forbids excluding a requirement");
assert(contract.includes("Do not give a boilerplate"), "Contract forbids boilerplate");
assert(contract.includes("Every iteration produces"), "Contract requires the artifacts");

console.log("\n=== ALL ITERATION 41 TESTS PASSED ===");
