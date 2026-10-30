/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 22 – evidence integrity. The Iteration 21 false-PASS probes must HOLD.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { ComplianceAutomation } from "../site/components/compliance/compliance-automation.js";
import { displayStandard } from "../site/components/compliance/standards-display.js";
import { LifecycleEngine } from "../site/components/core/lifecycle-engine.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 22 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p22", type: "Project", name: "Integrity", provenance: { origin: "iter22" } });
  kernel.upsert({ id: "sys-a", type: "System", name: "Other", domain: "AERIAL", provenance: { origin: "iter22" } });
  kernel.upsert({ id: "sys-b", type: "System", name: "This", domain: "INDUSTRIAL", provenance: { origin: "iter22" } });
  kernel.link(project.id, "CONTAINS", "sys-b");
  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.find(e => e.type === "System").id === "sys-b", "Project graph resolves its own system");

  const adopted = new StandardsCorpusEngine(kernel).adopt(project.id, "std-iso-15288");
  assert(adopted.requiredEvidence.includes("Requirements traceability"), "ISO 15288 keeps its evidence requirements");
  const auto = new ComplianceAutomation(kernel);
  assert(auto.run(project.id).outcome === "HOLD", "Adopted standard with no evidence HOLDs");

  const rejected = kernel.upsert({
    id: "rej", type: "Evidence", name: "Requirements traceability unrelated",
    state: "REJECTED", method: "SIMULATION", provenance: { origin: "iter22" }
  });
  kernel.link(project.id, "CONTAINS", rejected.id);
  assert(auto.run(project.id).outcome === "HOLD", "Rejected evidence does not clear the check");

  const unbound = kernel.upsert({
    id: "unb", type: "Evidence", name: "Requirements traceability",
    state: "EXECUTED", method: "REVIEW", provenance: { origin: "iter22" }
  });
  kernel.link(project.id, "CONTAINS", unbound.id);
  assert(auto.run(project.id).outcome === "HOLD", "Unbound evidence does not clear the check");

  const stale = kernel.upsert({
    id: "stale", type: "Evidence", name: "trace", state: "EXECUTED", stale: true,
    provenance: { origin: "iter22" }
  });
  kernel.link(project.id, "CONTAINS", stale.id);
  auto.bind(adopted.id, stale.id, "Requirements traceability");
  assert(auto.run(project.id).outcome === "HOLD", "Stale evidence does not clear the check");

  const wrong = kernel.upsert({
    id: "wrong", type: "Evidence", name: "other", state: "EXECUTED",
    configurationId: "cfg-other", provenance: { origin: "iter22" }
  });
  kernel.link(project.id, "CONTAINS", wrong.id);
  adopted.configurationId = "cfg-this";
  auto.bind(adopted.id, wrong.id, "Verification records");
  assert(auto.run(project.id).outcome === "HOLD", "Wrong configuration does not clear the check");

  for (const need of adopted.requiredEvidence) {
    const id = "ok_" + need.slice(0, 8).replace(/\s/g, "_");
    kernel.upsert({
      id, type: "Evidence", name: need, state: "EXECUTED", method: "REVIEW",
      configurationId: "cfg-this", provenance: { origin: "iter22" }
    });
    kernel.link(project.id, "CONTAINS", id);
    auto.bind(adopted.id, id, need);
  }
  assert(auto.run(project.id).outcome === "PASS", "Only bound valid evidence advances the check");

  const waived = new StandardsCorpusEngine(kernel).adopt(project.id, "std-iso-12207");
  assert(auto.waive(waived.id, waived.requiredEvidence[0], {}).outcome === "HOLD", "Waiver without a reason HOLDs");
  auto.waive(waived.id, waived.requiredEvidence[0], { reason: "not in scope", role: "compliance-lead" });
  assert(auto.run(project.id).gaps.some(g => g.need === waived.requiredEvidence[0]) === false, "A reasoned waiver closes that requirement");

  assert(displayStandard({ id: "x", name: "Local rule", title: null, layer: null }).layer === "UNCLASSIFIED", "Missing layer is unclassified, not Global");
  assert(displayStandard({ id: "x", name: "ISO 1", authority: "ISO" }).authorityProvenance === "RECORDED", "Recorded authority is marked recorded");
  assert(displayStandard({ id: "x", name: "ISO 1" }).authorityProvenance === "INFERRED", "Inferred authority is marked inferred");

  console.log("\n=== ALL ITERATION 22 TESTS PASSED ===");
}
run();
