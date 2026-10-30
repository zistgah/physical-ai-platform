/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 21 – no null standard display, automated compliance.
 */
import { STANDARDS_CORPUS } from "../site/components/compliance/standards-corpus.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { ComplianceAutomation } from "../site/components/compliance/compliance-automation.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 21 ===");
  const nullish = STANDARDS_CORPUS.filter(s => [s.title, s.topic, s.layer, s.authority].some(v => v == null || v === "null"));
  assert(nullish.length === 0, `No standard displays as null (${nullish.length})`);
  assert(STANDARDS_CORPUS.length === 164, "Corpus size unchanged");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p21", type: "Project", name: "Std", provenance: { origin: "iter21" } });
  kernel.upsert({ id: "sys", type: "System", name: "Bot", domain: "TERRESTRIAL", embodiment: "WHEELED", provenance: { origin: "iter21" } });
  kernel.link(project.id, "CONTAINS", "sys");
  const hits = new StandardsCorpusEngine(kernel).query({ domain: "TERRESTRIAL", embodiment: "WHEELED" });
  assert(hits.every(s => s.layer && s.topic && s.title), "Query results have layer, topic, and title");

  const eng = new StandardsCorpusEngine(kernel);
  const adopted = eng.adopt(project.id, "std-iso-15288");
  assert(adopted.requiredEvidence?.length === 3, "Adoption copies required evidence");
  const auto = new ComplianceAutomation(kernel);
  assert(auto.run(project.id).outcome === "HOLD", "Adopted standard without evidence HOLDs");
  for (const need of adopted.requiredEvidence) {
    const id = "ev_" + need.slice(0, 6);
    kernel.upsert({ id, type: "Evidence", name: need, state: "EXECUTED", method: "REVIEW", provenance: { origin: "iter21" } });
    kernel.link(project.id, "CONTAINS", id);
    auto.bind(adopted.id, id, need);
  }
  assert(auto.run(project.id).outcome === "PASS", "Bound valid evidence clears the check");

  const bare = createKernel();
  const p2 = bare.upsert({ id: "p2", type: "Project", name: "Bare", provenance: { origin: "iter21" } });
  assert(new ComplianceAutomation(bare).run(p2.id).outcome === "OK", "No adoption does not invent a hold");

  console.log("\n=== ALL ITERATION 21 TESTS PASSED ===");
}
run();
