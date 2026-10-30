/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/prototyping/module.js
 * PURPOSE: Pure, fail-closed evaluation of a revision for prototype review.
 * LICENSE: GPL-3.0-only.
 *
 * Validates a proposed revision against a frozen configuration, revision
 * lineage, requirements, passing tests, evidence, configuration fingerprints,
 * fidelity declarations, and canonical graph relations. It does not persist,
 * promote evidence, authorize work, certify a system, or advance a lifecycle gate.
 */
import { validateBackendExecutionRecord } from "./backend-runtime.js";

const PASS = new Set(["PASS", "PASSED"]);
const TEST_FAIL = new Set(["FAIL", "FAILED", "REJECTED", "UNACCEPTABLE"]);
const EVIDENCE_FAIL = new Set(["FAIL", "FAILED", "REJECTED", "UNACCEPTABLE"]);
const EVIDENCE_STATES = new Set(["EXECUTED", "TESTED", "VERIFIED", "VALIDATED"]);
const METHODS = new Set(["SIMULATION", "SIL", "HIL", "PHIL", "RIL", "INSPECTION", "PHYSICAL_TEST"]);
const CONFIG_STATES = new Set(["FROZEN", "BASELINED", "APPROVED", "RELEASED"]);
const REALIZATIONS = new Set(["SIMULATED", "HIL", "REAL"]);
const FIDELITY = new Set(["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"]);
const isRecord = v => v !== null && typeof v === "object" && !Array.isArray(v);
const text = v => typeof v === "string" && v.trim().length > 0;
const norm = v => typeof v === "string" ? v.trim().toUpperCase() : "";
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const hold = (reason, missing = []) => ({ outcome: "HOLD", reason, missing });
const fail = (reason, details = {}) => ({ outcome: "FAIL", reason, ...details });

function hasResult(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0 && v.every(hasResult);
  if (isRecord(v)) {
    const entries = Object.entries(v);
    return entries.length > 0 && entries.every(([k, value]) => text(k) && hasResult(value));
  }
  return false;
}
function asRecords(v) { return Array.isArray(v) ? v : (isRecord(v) ? [v] : []); }
function relationKey(source, relation, target) { return `${source}\u0000${norm(relation)}\u0000${target}`; }
function fidelityValid(method, realization, level) {
  if (!REALIZATIONS.has(realization) || !FIDELITY.has(level)) return false;
  const n = Number(level.slice(1));
  if (method === "SIMULATION" || method === "SIL") return realization === "SIMULATED" && n <= 4;
  if (["HIL", "PHIL", "RIL"].includes(method)) return realization === "HIL" && n === 5;
  if (method === "PHYSICAL_TEST") return realization === "REAL" && n >= 6;
  if (method === "INSPECTION") return (realization === "SIMULATED" && n <= 4) || (realization === "HIL" && n === 5) || (realization === "REAL" && n >= 6);
  return false;
}

/**
 * Input contract:
 * config: {id,type:"Configuration",status,fingerprint}
 * revision: {id,configurationId,changes,parentRevisionId?,parentRevision?}
 * requirements: [{id,type:"Requirement"}]
 * tests: [{id,configurationId,revisionId,requirementIds,status|outcome,result}]
 * evidence: [{id,configurationId,configurationFingerprint,revisionId,testId,
 *            method,state,realization,fidelityLevel,result}]
 * relations: Test --VERIFIES--> Requirement;
 *            Evidence --CONFIGURED_BY--> Configuration;
 *            Evidence --DERIVED_FROM--> Test.
 * HOLD = missing/unknown/incomplete; FAIL = explicit failure/contradiction;
 * OK = this evaluator's checks only, never lifecycle-gate approval.
 */
export function prototype(input = {}) {
  if (!isRecord(input)) return hold("Prototype input must be an object", ["input"]);
  const { config, revision, requirements, tests, evidence, relations } = input;
  const missing = [];
  if (!isRecord(config)) missing.push("config");
  else {
    if (!text(config.id)) missing.push("config.id");
    if (config.type !== "Configuration") missing.push("config.type=Configuration");
    if (!CONFIG_STATES.has(norm(config.status))) missing.push("config.status (FROZEN/BASELINED/APPROVED/RELEASED)");
    if (!text(config.fingerprint)) missing.push("config.fingerprint");
  }
  if (!isRecord(revision)) missing.push("revision");
  else {
    if (!text(revision.id)) missing.push("revision.id");
    if (!text(revision.configurationId)) missing.push("revision.configurationId");
    if (!Array.isArray(revision.changes) || !revision.changes.length || revision.changes.some(x => !text(x))) missing.push("revision.changes (non-empty, non-blank)");
    if (text(revision.parentRevisionId)) {
      if (revision.parentRevisionId === revision.id) return fail("A revision cannot be its own parent", { revisionId: revision.id });
      if (!isRecord(revision.parentRevision) || revision.parentRevision.id !== revision.parentRevisionId) missing.push("revision.parentRevision (must resolve parentRevisionId)");
      else if (revision.parentRevision.configurationId !== revision.configurationId) return fail("Parent revision belongs to a different configuration", { parentRevisionId: revision.parentRevisionId });
    }
  }
  const reqs = asRecords(requirements), testRecords = asRecords(tests), evidenceRecords = asRecords(evidence);
  if (!reqs.length) missing.push("requirements (at least one)");
  if (!testRecords.length) missing.push("tests (at least one)");
  if (!evidenceRecords.length) missing.push("evidence (at least one)");
  if (!Array.isArray(relations) || !relations.length) missing.push("relations (canonical graph bindings)");
  if (missing.length) return hold("Prototype review package is incomplete", missing);
  if (revision.configurationId !== config.id) return fail("Revision is bound to a different configuration", { expected: config.id, actual: revision.configurationId });

  const relationSet = new Set();
  for (const r of relations) {
    if (!isRecord(r) || !text(r.source) || !text(r.relation) || !text(r.target)) return hold("Malformed canonical relation", ["relations contain invalid source/relation/target"]);
    relationSet.add(relationKey(r.source.trim(), r.relation, r.target.trim()));
  }
  const hasRel = (s, r, t) => relationSet.has(relationKey(s, r, t));
  const reqById = new Map();
  for (let i = 0; i < reqs.length; i++) {
    const req = reqs[i];
    if (!isRecord(req) || !text(req.id) || (req.type && req.type !== "Requirement")) return hold("Requirement record is malformed", [`requirements[${i}].id/type`]);
    if (reqById.has(req.id)) return fail("Duplicate requirement identity", { requirementId: req.id });
    reqById.set(req.id, req);
  }
  const testById = new Map();
  for (let i = 0; i < testRecords.length; i++) {
    const t = testRecords[i];
    if (!isRecord(t) || !text(t.id)) return hold("Test record has no valid identity", [`tests[${i}].id`]);
    if (testById.has(t.id)) return fail("Duplicate test identity", { testId: t.id });
    if (!text(t.configurationId) || !text(t.revisionId)) return hold("Test is not bound to the evaluated revision", [`test:${t.id}:configurationId/revisionId`]);
    if (t.configurationId !== config.id || t.revisionId !== revision.id) return fail("Test belongs to a different configuration or revision", { testId: t.id });
    if (!Array.isArray(t.requirementIds) || !t.requirementIds.length || t.requirementIds.some(id => !text(id))) return hold("Test must identify the requirements it verifies", [`test:${t.id}:requirementIds`]);
    for (const reqId of t.requirementIds) {
      if (!reqById.has(reqId)) return hold("Test references an unknown requirement", [`test:${t.id}:requirement:${reqId}`]);
      if (!hasRel(t.id, "VERIFIES", reqId)) return hold("Test lacks canonical requirement verification relation", [`relation:${t.id}:VERIFIES:${reqId}`]);
    }
    if (!own(t, "result") || !hasResult(t.result)) return hold("Test has no substantive result", [`test:${t.id}:result`]);
    testById.set(t.id, t);
  }
  const failedTests = testRecords.filter(t => TEST_FAIL.has(norm(t.status)) || TEST_FAIL.has(norm(t.outcome)) || t.failed === true);
  if (failedTests.length) return fail("One or more prototype tests failed", { failedTestIds: failedTests.map(t => t.id) });
  const notPassing = testRecords.filter(t => { const states = [norm(t.status), norm(t.outcome)].filter(Boolean); return !states.length || states.some(s => !PASS.has(s)); });
  if (notPassing.length) return hold("One or more prototype tests have no unambiguous passing result", { missing: notPassing.map(t => `test:${t.id}:PASS`) });

  const evidenceIds = new Set(), evidenceByTest = new Map(), accepted = [];
  for (let i = 0; i < evidenceRecords.length; i++) {
    const e = evidenceRecords[i];
    if (!isRecord(e) || !text(e.id) || !text(e.testId) || !text(e.configurationId) || !text(e.configurationFingerprint) || !text(e.revisionId) || !text(e.method) || !text(e.state) || !text(e.realization) || !text(e.fidelityLevel) || !own(e, "result") || !hasResult(e.result)) return hold("Evidence record is incomplete", [`evidence[${i}]: identity/bindings/method/state/fidelity/result`]);
    if (evidenceIds.has(e.id)) return fail("Duplicate evidence identity", { evidenceId: e.id });
    evidenceIds.add(e.id);
    if (e.configurationId !== config.id || e.revisionId !== revision.id) return fail("Evidence belongs to a different configuration or revision", { evidenceId: e.id });
    if (e.configurationFingerprint !== config.fingerprint) return hold("Evidence was produced against a different or unknown configuration fingerprint", [`evidence:${e.id}:configurationFingerprint`]);
    if (!testById.has(e.testId)) return hold("Evidence references a test that was not supplied", [`evidence:${e.id}:test:${e.testId}`]);
    if (e.stale === true || norm(e.status) === "STALE") return hold("Evidence is stale for the selected configuration", [`evidence:${e.id}:stale`]);
    const method = norm(e.method);
    if (!METHODS.has(method)) return hold("Evidence method is not recognized", [`evidence:${e.id}:method:${method || "UNKNOWN"}`]);
    if (method === "SIMULATION" || method === "SIL") {
      const backendCheck = validateBackendExecutionRecord(e.backendExecution);
      if (!backendCheck.ok) return hold("Simulation evidence lacks verified open-engine execution provenance", backendCheck.missing.map(x => `evidence:${e.id}:backendExecution:${x}`));
      const backendRun = e.backendExecution;
      if (backendRun.configurationId !== config.id || backendRun.configurationFingerprint !== config.fingerprint || backendRun.revisionId !== revision.id || backendRun.testId !== e.testId) {
        return fail("Simulation backend run is bound to a different configuration, revision, or test", { evidenceId: e.id, backendJobId: backendRun.jobId });
      }
    }
    const state = norm(e.state);
    if (EVIDENCE_FAIL.has(state) || EVIDENCE_FAIL.has(norm(e.status))) return fail("Rejected or failed evidence cannot support a prototype revision", { evidenceId: e.id, state });
    if (!EVIDENCE_STATES.has(state)) return hold("Evidence has not reached an executable/verified state", [`evidence:${e.id}:state:${state || "UNKNOWN"}`]);
    const realization = norm(e.realization), fidelityLevel = norm(e.fidelityLevel);
    if (!fidelityValid(method, realization, fidelityLevel)) return hold("Evidence realization and fidelity level are missing or inconsistent with its method", [`evidence:${e.id}:method=${method}:realization=${realization}:fidelityLevel=${fidelityLevel}`]);
    if (!hasRel(e.id, "CONFIGURED_BY", config.id)) return hold("Evidence lacks canonical configuration binding", [`relation:${e.id}:CONFIGURED_BY:${config.id}`]);
    if (!hasRel(e.id, "DERIVED_FROM", e.testId)) return hold("Evidence lacks canonical test provenance binding", [`relation:${e.id}:DERIVED_FROM:${e.testId}`]);
    accepted.push(e);
    if (!evidenceByTest.has(e.testId)) evidenceByTest.set(e.testId, []);
    evidenceByTest.get(e.testId).push(e);
  }
  const uncoveredTests = testRecords.filter(t => !evidenceByTest.has(t.id));
  if (uncoveredTests.length) return hold("Every passing test must produce linked evidence", { missing: uncoveredTests.map(t => `test:${t.id}:evidence`) });
  const coveredRequirements = new Set(testRecords.flatMap(t => t.requirementIds));
  const uncoveredRequirements = [...reqById.keys()].filter(id => !coveredRequirements.has(id));
  if (uncoveredRequirements.length) return hold("Every prototype requirement must be verified by at least one test", { missing: uncoveredRequirements.map(id => `requirement:${id}:test`) });
  const simulationOnlyRequirementIds = [];
  for (const reqId of reqById.keys()) {
    const reqEvidence = testRecords.filter(t => t.requirementIds.includes(reqId)).flatMap(t => evidenceByTest.get(t.id) || []);
    if (reqEvidence.length && reqEvidence.every(e => norm(e.realization) === "SIMULATED")) simulationOnlyRequirementIds.push(reqId);
  }
  return {
    outcome: "OK",
    prototype: {
      revisionId: revision.id, configurationId: config.id, configurationFingerprint: config.fingerprint,
      parentRevisionId: text(revision.parentRevisionId) ? revision.parentRevisionId : null,
      changes: revision.changes.map(x => x.trim()), requirementIds: [...reqById.keys()],
      testIds: testRecords.map(t => t.id), evidenceIds: accepted.map(e => e.id),
      evidenceMethods: [...new Set(accepted.map(e => norm(e.method)))],
      realizationStates: [...new Set(accepted.map(e => norm(e.realization)))],
      fidelityLevels: [...new Set(accepted.map(e => norm(e.fidelityLevel)))],
      simulationOnlyRequirementIds, bindingRelations: ["VERIFIES", "CONFIGURED_BY", "DERIVED_FROM"]
    },
    note: simulationOnlyRequirementIds.length
      ? "Prototype evidence is traceable, but listed requirements have simulation-only support; this is not physical verification or safety certification."
      : "Prototype evidence is traceable to the frozen configuration, revision, requirements, passing tests, and canonical evidence relations. This is not lifecycle-gate approval."
  };
}
