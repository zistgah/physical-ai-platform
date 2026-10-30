/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 07 – close "standards remain informational".
 * Project-scoped acceptance is non-informational.
 * Regulatory certification is still not claimed.
 */

import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject } from "../site/components/simulation/canonical-mobile-robot.js";
import { StandardsCorpusEngine, STANDARDS_CORPUS } from "../site/components/compliance/standards-corpus.js";
import { StandardsAcceptance } from "../site/components/compliance/standards-acceptance.js";
import { EvidencePromotion } from "../site/components/core/evidence-promotion.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

async function run() {
  console.log("=== Iteration 07 Standards Acceptance Tests ===");
  const { kernel, project } = createCanonicalMobileRobotProject();
  const corpus = new StandardsCorpusEngine(kernel);
  const acc = new StandardsAcceptance(kernel);
  const ep = new EvidencePromotion(kernel);

  // Corpus entries themselves stay informational
  assert(STANDARDS_CORPUS.every(s => s.status === "INFORMATIONAL"), "Corpus entries remain informational");
  const hits = corpus.query({ domain: "TERRESTRIAL", embodiment: "WHEELED" });
  assert(hits.length > 0, "Applicability returns candidates");

  // Before acceptance, project is informational-only
  assert(acc.isInformationalOnly(project.id), "Project starts informational-only");

  // Profile → adopt
  const profiled = acc.profile(project.id, hits[0].id);
  assert(profiled.status === "PROFILED" && profiled.regulatoryAuthority === false, "Profiled, not regulatory");
  const adopted = acc.adopt(project.id, profiled.id);
  assert(adopted.status === "PROJECT_ADOPTED", "Project-adopted");

  // Evidence required for review
  const ev = ep.recordPhysicalTest(project.id, {
    subjectId: "comp-motor",
    configurationId: "cfg-mobile-v1",
    outcome: "PASS",
    authority: "test-lead"
  });
  let threw = false;
  try { acc.review(adopted.id, { reviewer: "compliance-lead", evidenceIds: [] }); } catch (e) { threw = true; }
  assert(threw, "Review without evidence rejected");

  const reviewed = acc.review(adopted.id, { reviewer: "compliance-lead", evidenceIds: [ev.id] });
  assert(reviewed.status === "REVIEWED", "Reviewed with evidence");

  // Acceptance requires authority and rationale
  threw = false;
  try { acc.accept(reviewed.id, { authority: "pm" }); } catch (e) { threw = true; }
  assert(threw, "Acceptance without rationale rejected");

  const accepted = acc.accept(reviewed.id, {
    authority: "project-authority",
    rationale: "Evidence covers required artifacts for this project profile"
  });
  assert(accepted.status === "ACCEPTED", "Project-scoped acceptance achieved");
  assert(accepted.regulatoryAuthority === false, "Acceptance is not regulatory authority");
  assert(accepted.acceptance.notRegulatoryCertification === true, "Explicitly not a certification");
  assert(!acc.isInformationalOnly(project.id), "Project is no longer informational-only");
  assert(acc.projectAccepted(project.id).length === 1, "Accepted standard discoverable");

  // Corpus entry itself unchanged
  assert(STANDARDS_CORPUS.find(s => s.id === hits[0].id).status === "INFORMATIONAL", "Corpus entry not mutated");

  console.log("\n=== ALL ITERATION 07 TESTS PASSED ===");
}

run().catch(err => { console.error(err); process.exit(1); });
