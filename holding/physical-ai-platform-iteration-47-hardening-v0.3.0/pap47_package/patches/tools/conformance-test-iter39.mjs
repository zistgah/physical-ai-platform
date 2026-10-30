/**
 * Iteration 39 – packaging, coupled solver, HIL transport, inequality prover.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { packageImprovement } from "../site/components/core/improve.js";
import { couple } from "../site/components/simulation/coupled-iterate.js";
import { HilTransport } from "../site/components/simulation/hil-transport.js";
import { proveIneq } from "../site/components/core/prover-ineq.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

bibo("improve", {
  below: { fn: () => packageImprovement({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => packageImprovement({ component: "cad/brep.js", change: "add intersect" }), expect: (r) => r.outcome === "OK" && r.prompt.includes("cad/brep.js") },
  within: { fn: () => packageImprovement({ component: "x", change: "y", repository: "repo" }), expect: (r) => r.prompt.includes("repo") },
  above: { fn: () => packageImprovement({ component: "x" }), expect: (r) => r.outcome === "HOLD" }
});

bibo("coupled", {
  below: { fn: () => couple({ temperature: 1, alpha: 1, length: 1, load: 1, stiffness: 0 }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => couple({ temperature: 0, alpha: 0, length: 1, load: 0, stiffness: 1 }), expect: (r) => r.outcome === "OK" && r.strain === 0 },
  within: { fn: () => couple({ temperature: 100, alpha: 1e-5, length: 10, load: 5, stiffness: 100 }), expect: (r) => r.converged === true },
  above: { fn: () => couple({ temperature: 1, alpha: 1, length: 1, load: 1, stiffness: 1, tolerance: -1 }), expect: (r) => r.outcome === "HOLD" }
});

const hil = new HilTransport();
const hardware = { id: "dev-1", bound: true, hardwareBacked: true, transport: { kind: "hardware", bus: "CAN", readState: () => ({ value: 1 }), writeCommand: () => true }, safety: { interlockClosed: true, emergencyStopClear: true }, authority: { verified: true, authorized: true, subject: "operator-1", policyRef: "policy-1" } };
bibo("hil", {
  below: { fn: () => hil.step(1, 0.01, 10), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => hil.bind({ tick: () => 1 }), expect: (r) => r.outcome === "HOLD" },
  within: { fn: () => { hil.bind(hardware, ({ bus, deviceId }) => ({ verified: true, bus, deviceId })); return hil.step(1, 0.01, 10); }, expect: (r) => r.method === "HIL" && r.outcome === "OK" && r.qualification === "UNQUALIFIED_ADAPTER_ATTESTATION" },
  above: { fn: () => hil.bind({}), expect: (r) => r.outcome === "HOLD" }
});

bibo("proveIneq", {
  below: { fn: () => proveIneq("", "x < 1"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => proveIneq("x <= 3", "x <= 3"), expect: (r) => r.outcome === "PROVED" },
  within: { fn: () => proveIneq("x < 3", "x <= 5"), expect: (r) => r.outcome === "PROVED" },
  above: { fn: () => proveIneq("x >= 5", "x > 5"), expect: (r) => r.outcome === "HOLD" }
});

assert(readFileSync("docs/iterations/GAP-ANALYSIS.md", "utf8").includes("62 PASS"), "Gap analysis records the acceptance run");

console.log("\n=== ALL ITERATION 39 TESTS PASSED ===");
