/**
 * Iteration 50 – provenance, standards exercise, optional HIL.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { selectHil } from "../site/components/simulation/hil-selector.js";
import { exerciseStandards, corpusSize } from "../site/components/compliance/standards-exercise.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { humanoid } from "../site/samples/platforms.js";
import { SelfAssurance } from "../site/components/safety/self-assurance.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

assert(corpusSize() === 164, "Corpus has 164 standards");

bibo("hilSelect", {
  below: { fn: () => selectHil(), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => selectHil("spine"), expect: (r) => r.impl === "spine" },
  within: { fn: () => selectHil("dropin"), expect: (r) => r.impl === "dropin" },
  above: { fn: () => selectHil("other"), expect: (r) => r.outcome === "HOLD" }
});

const kernel = createKernel();
humanoid(kernel);
bibo("standards", {
  below: { fn: () => exerciseStandards(kernel, null, ["std-iso-15288"]), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => exerciseStandards(kernel, "sample-humanoid", ["std-iso-15288"]), expect: (r) => r.outcome === "OK" && r.results[0].status === "PROJECT_ADOPTED" },
  within: { fn: () => exerciseStandards(kernel, "sample-humanoid", ["std-iso-15288", "not-a-standard"]).results[1].outcome, expect: (o) => o === "HOLD" },
  above: { fn: () => exerciseStandards(kernel, "sample-humanoid", []), expect: (r) => r.outcome === "HOLD" }
});

const assure = new SelfAssurance(kernel);
bibo("assure", {
  below: { fn: () => assure.claim("sample-humanoid", {}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => assure.claim("sample-humanoid", { id: "claim-1", text: "The platform has a kernel" }), expect: (r) => r.outcome === "OK" || r.id },
  within: { fn: () => kernel.store.get("claim-1")?.type, expect: (t) => t === "Claim" },
  above: { fn: () => assure.evidence("claim-1", "missing"), expect: (r) => r.outcome === "HOLD" }
});

const provenance = readFileSync("docs/iterations/PROVENANCE.md", "utf8");
assert(provenance.includes("SHA256"), "Provenance has hashes");
assert(provenance.includes("NOT LANDED"), "Provenance names what did not land");

console.log("\n=== ALL ITERATION 50 TESTS PASSED ===");
console.log("EXECUTION LOG");
console.log("corpus", corpusSize());
console.log("standards exercised", exerciseStandards(kernel, "sample-humanoid", ["std-iso-15288"]).exercised);
console.log("hil spine", selectHil("spine").impl, "hil dropin", selectHil("dropin").impl);
console.log("claim", kernel.store.get("claim-1").text);
