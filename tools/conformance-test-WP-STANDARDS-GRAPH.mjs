/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { STANDARDS_CORPUS } from "../site/components/compliance/standards-corpus.js";
import { StandardsGraph } from "../site/components/compliance/standards-graph.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

function run() {
  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Standards graph slice",
    provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
  });

  const sg = new StandardsGraph(kernel);

  const corpusBefore = JSON.stringify(STANDARDS_CORPUS);
  const stdId = "std-iso-15288";

  const applicability = sg.recordApplicabilityRule(project.id, stdId, {
    domain: "INDUSTRIAL",
    embodiment: "WHEELED",
    risk: "MEDIUM"
  });
  assert(applicability.outcome === "RECORDED", "Applicability rule recorded");
  assert(STANDARDS_CORPUS.find(s => s.id === stdId).status === "INFORMATIONAL", "Corpus status remains INFORMATIONAL");
  assert(JSON.stringify(STANDARDS_CORPUS) === corpusBefore, "Corpus was not mutated");

  const candidates = sg.applicable(project.id, {
    domain: "INDUSTRIAL",
    embodiment: "WHEELED",
    risk: "MEDIUM"
  });
  assert(candidates.outcome === "CANDIDATES", "Applicability returns candidates");
  assert(candidates.candidates.some(c => c.id === stdId), "15288 is an applicability candidate");

  const sup = sg.recordSupersession(project.id, stdId, {
    supersedes: ["std-ieee-828"]
  });
  assert(sup.outcome === "RECORDED", "Supersession recorded");
  const queried = sg.supersession(project.id, stdId);
  assert(queried.supersedes.includes("std-ieee-828"), "Supersession is queryable");

  const clause = sg.addClausePlaceholder(project.id, stdId, {
    id: "clause-1.1",
    title: "Example clause placeholder",
    requiredEvidence: ["Requirements traceability"]
  });
  assert(clause.outcome === "RECORDED", "Clause placeholder recorded");
  const clauseEntity = kernel.store.get(`sg_${project.id}_${stdId}`);
  assert(clauseEntity.clauses[0].body === undefined, "Clause placeholder has no body");
  assert(sg.clauses(project.id, stdId)[0].body === undefined, "Clause query exposes no body");

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.id === clauseEntity.id), "Project graph contains canonical Standard record");
  assert(graph.relations.some(r => r.source === project.id && r.target === clauseEntity.id && r.relation === "CONTAINS"), "Standard record is linked in canonical graph");

  const hold = sg.applicable(project.id, { embodiment: "WHEELED", risk: "MEDIUM" });
  assert(hold.outcome === "HOLD", "Missing applicability domain produces HOLD");
  assert(hold.missing.includes("domain"), "HOLD identifies missing domain as UNSPECIFIED");

  const badSup = sg.recordSupersession(project.id, stdId, { supersedes: ["std-does-not-exist"] });
  assert(badSup.outcome === "HOLD", "Missing supersession target produces HOLD");

  console.log("\n=== WP-STANDARDS-GRAPH PASSED ===");
}

run();
