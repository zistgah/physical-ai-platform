/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 09 – full standards corpus and cross-iteration traceability.
 */
import { readFileSync } from "node:fs";
import { STANDARDS_CORPUS, StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { createCanonicalMobileRobotProject } from "../site/components/simulation/canonical-mobile-robot.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

const NAMED = [
  "ISO/IEC/IEEE 15288", "ISO/IEC/IEEE 12207", "ISO/IEC/IEEE 42010",
  "ISO/IEC/IEEE 24748", "ISO/IEC/IEEE 15939", "EIA-632",
  "IEEE 1012", "IEEE 1028", "IEEE 828",
  "ISO 9001", "ISO 19011", "IEC 61508", "ISO 13849",
  "ISO 10218", "ISO 10218-1", "ISO 10218-2", "ISO 13482", "IEC 62443",
  "NASA NPR 7120.5", "MIL-STD-882", "MIL-STD-810", "MIL-STD-461",
  "MIL-STD-883", "MIL-STD-202", "MIL-STD-961", "MIL-STD-963"
];

function run() {
  console.log("=== Iteration 09 Standards and Traceability ===");
  assert(STANDARDS_CORPUS.length >= NAMED.length, `Corpus has ${STANDARDS_CORPUS.length} entries`);
  for (const name of NAMED) {
    assert(STANDARDS_CORPUS.some(s => s.name === name), `Corpus contains ${name}`);
  }
  assert(STANDARDS_CORPUS.every(s => s.status === "INFORMATIONAL"), "All corpus entries informational");
  assert(STANDARDS_CORPUS.every(s => s.provenance && s.provenance.source), "Every entry has provenance source");

  const { kernel, project } = createCanonicalMobileRobotProject();
  const eng = new StandardsCorpusEngine(kernel);
  const hits = eng.query({ domain: "TERRESTRIAL" });
  assert(hits.length >= 5, "Terrestrial query returns multiple standards");
  const defence = eng.query({ domain: "DEFENCE" });
  assert(defence.some(s => s.name === "MIL-STD-882"), "Defence query returns MIL-STD-882");
  const adopted = eng.adopt(project.id, "std-iso-15288");
  assert(adopted.status === "PROJECT_ADOPTED", "Named standard can be project-adopted");
  assert(STANDARDS_CORPUS.find(s => s.id === "std-iso-15288").status === "INFORMATIONAL", "Adoption does not mutate corpus");

  const trace = readFileSync("docs/iterations/TRACEABILITY.md", "utf8");
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08", "09"]) {
    assert(trace.includes(`| ${n} |`), `Traceability has iteration ${n}`);
  }
  assert(trace.includes("MIL-STD-882") && trace.includes("ISO/IEC/IEEE 15288"), "Traceability lists standards");

  console.log("\n=== ALL ITERATION 09 TESTS PASSED ===");
}

run();
