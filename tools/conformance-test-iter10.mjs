/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 10 – standards provenance incorporation and SIR language draft.
 */
import { readFileSync } from "node:fs";
import { STANDARDS_CORPUS, StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject } from "../site/components/simulation/canonical-mobile-robot.js";
import { compileSource } from "../site/components/sir/sir-lang.js";
import { SIRCompiler } from "../site/components/core/sir-compiler.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

function run() {
  console.log("=== Iteration 10 ===");

  // Corpus
  assert(STANDARDS_CORPUS.length === 164, `Corpus is 164, got ${STANDARDS_CORPUS.length}`);
  assert(STANDARDS_CORPUS.every(s => s.status === "INFORMATIONAL"), "Platform status remains INFORMATIONAL");
  assert(new Set(STANDARDS_CORPUS.map(s => s.id)).size === 164, "Ids unique");
  const withUrl = STANDARDS_CORPUS.filter(s => s.provenance?.source_url || s.provenance?.official_source_url);
  assert(withUrl.length >= 160, `Official URL on ${withUrl.length} records`);
  const iso = STANDARDS_CORPUS.find(s => s.id === "std-iso-15288");
  assert(iso.provenance.source.includes("MRD"), "Original MRD provenance preserved on 15288");
  assert(iso.provenance.official_source_url, "Official URL added without dropping provenance");
  const newRec = STANDARDS_CORPUS.find(s => s.id === "std-iso-21423");
  assert(newRec && newRec.provenance.source_url && newRec.editionStatus === "Published", "Supplement record incorporated with edition status");

  const { kernel, project } = createCanonicalMobileRobotProject();
  const eng = new StandardsCorpusEngine(kernel);
  const adopted = eng.adopt(project.id, "std-iso-15288");
  assert(adopted.status === "PROJECT_ADOPTED", "Adoption still works");
  assert(STANDARDS_CORPUS.find(s => s.id === "std-iso-15288").status === "INFORMATIONAL", "Corpus not mutated");

  // Provenance files present
  const watch = readFileSync("data/standards/provenance/edition-watchlist.csv", "utf8");
  assert(watch.includes("12207") && watch.includes("withdrawn"), "Edition watchlist records 12207 withdrawal");
  const registry = JSON.parse(readFileSync("data/standards/provenance/provenance-registry.json", "utf8"));
  assert(registry.length === 164, "Provenance registry matches corpus");

  // SIR language
  const src = `
    sir 0.1 "Mobile robot inspect";
    project mobile_inspect { name: "Mobile robot inspect"; }
    entity Requirement req_inspect { name: "Inspect area"; status: OPEN; }
    entity Component motor { name: "Drive motor"; capabilities: [DRIVE]; }
    relation req_inspect ALLOCATED_TO motor;
    require evidence req_inspect { method: SIMULATION; state: EXECUTED; configuration: cfg-mobile-v1; }
  `;
  const sir = compileSource(src);
  assert(sir.magic === "PAI-SIR" && sir.header.projectId === "mobile_inspect", "SIR compiles to PAI-SIR");
  assert(sir.graph.entities.length === 3 && sir.graph.relations.length === 1, "Entities and relation emitted");
  assert(sir.constraints[0].method === "SIMULATION" && sir.constraints[0].subject === "req_inspect", "Evidence requirement is a constraint, not invented evidence");
  let threw = false;
  try { compileSource(`sir 0.1 "x"; project p { name: "p"; } relation missing ALLOCATED_TO p;`); } catch (e) { threw = true; }
  assert(threw, "Dangling relation fails the compile");

  // Compiled SIR still passes the existing SIR compiler checks
  const compiler = new SIRCompiler(kernel);
  const errors = compiler.validate(sir);
  assert(errors.length === 0, "Compiled SIR validates against the interchange compiler");

  console.log("\n=== ALL ITERATION 10 TESTS PASSED ===");
}

run();
