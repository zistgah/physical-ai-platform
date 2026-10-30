/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-CHANGE-STALE
 *
 * Verifies that change impact marks only affected evidence stale, while
 * preserving evidence in the canonical graph.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { applyStale } from "../site/components/core/change-stale.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

function add(kernel, entity) {
  return kernel.upsert({
    ...entity,
    provenance: {
      origin: "WP-CHANGE-STALE-test",
      derivedFrom: entity.derivedFrom || null,
      timestamp: kernel._now()
    }
  });
}

function run() {
  console.log("=== WP-CHANGE-STALE ===");

  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Change stale conformance",
    provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
  });

  const configuration = add(kernel, {
    id: "cfg-1",
    type: "Configuration",
    name: "Bound configuration"
  });

  const affectedComponent = add(kernel, {
    id: "component-affected",
    type: "Component",
    name: "Affected component"
  });

  const unaffectedComponent = add(kernel, {
    id: "component-unaffected",
    type: "Component",
    name: "Unaffected component"
  });

  const evidenceByConfiguration = add(kernel, {
    id: "ev-config",
    type: "Evidence",
    name: "Evidence bound to cfg-1",
    method: "PHYSICAL_TEST",
    state: "TESTED",
    subject: "component-unaffected",
    configurationId: "cfg-1",
    stale: false
  });

  const evidenceBySubject = add(kernel, {
    id: "ev-subject",
    type: "Evidence",
    name: "Evidence about affected component",
    method: "INSPECTION",
    state: "TESTED",
    subject: "component-affected",
    configurationId: "cfg-1",
    stale: false
  });

  const unaffectedEvidence = add(kernel, {
    id: "ev-unaffected",
    type: "Evidence",
    name: "Unaffected evidence",
    method: "FIELD",
    state: "TESTED",
    subject: "component-unaffected",
    configurationId: "cfg-1-unrelated",
    stale: false
  });

  kernel.link(project.id, "CONTAINS", configuration.id);
  kernel.link(project.id, "CONTAINS", affectedComponent.id);
  kernel.link(project.id, "CONTAINS", unaffectedComponent.id);
  kernel.link(project.id, "CONTAINS", evidenceByConfiguration.id);
  kernel.link(project.id, "CONTAINS", evidenceBySubject.id);
  kernel.link(project.id, "CONTAINS", unaffectedEvidence.id);

  // The evidence/configuration binding is represented in the canonical graph.
  kernel.link(evidenceByConfiguration.id, "CONFIGURED_BY", configuration.id);
  kernel.link(evidenceBySubject.id, "CONFIGURED_BY", configuration.id);

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.id === evidenceByConfiguration.id), "Configuration-bound evidence is in project graph");
  assert(graph.entities.some(e => e.id === evidenceBySubject.id), "Subject-bound evidence is in project graph");
  assert(graph.relations.some(r =>
    r.source === evidenceByConfiguration.id &&
    r.relation === "CONFIGURED_BY" &&
    r.target === configuration.id
  ), "Canonical CONFIGURED_BY binding is present");

  const result = applyStale(
    kernel,
    [configuration.id, affectedComponent.id],
    "change request CR-1 affects cfg-1 and component-affected"
  );

  assert(result.status === "APPLIED", "Change impact was applied");
  assert(result.staleEvidenceIds.includes("ev-config"), "Evidence bound to affected configuration is stale");
  assert(result.staleEvidenceIds.includes("ev-subject"), "Evidence whose subject is affected is stale");
  assert(!result.staleEvidenceIds.includes("ev-unaffected"), "Unaffected evidence stays fresh");

  assert(kernel.store.get("ev-config").stale === true, "Bound evidence remains stored and is marked stale");
  assert(kernel.store.get("ev-subject").stale === true, "Subject evidence remains stored and is marked stale");
  assert(kernel.store.get("ev-unaffected").stale === false, "Unaffected evidence remains fresh");

  const after = kernel.getProjectGraph(project.id);
  assert(after.entities.some(e => e.id === "ev-config"), "Stale evidence is not deleted from project graph");
  assert(after.entities.some(e => e.id === "ev-subject"), "Subject evidence is not deleted from project graph");

  // Required impact input cannot be guessed. Surface an explicit HOLD.
  const hold = applyStale(kernel, undefined, "missing impact analysis");
  assert(hold.status === "HOLD", "Missing affectedIds produces explicit HOLD");
  assert(hold.staleEvidenceIds.length === 0, "HOLD does not guess affected evidence");

  console.log("\n=== WP-CHANGE-STALE PASSED ===");
}

run();
