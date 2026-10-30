/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 25 – site loads, import payloads, honest adapters, CAD volumes, safety.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { ImportTrust, GitHubAdapter } from "../site/components/core/persistence-privacy.js";
import { ComplianceAutomation } from "../site/components/compliance/compliance-automation.js";
import { StandardsCorpusEngine } from "../site/components/compliance/standards-corpus.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { CockpitMachine } from "../site/components/safety/cockpit-machine.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 25 ===");
  const src = read("site/assets/js/app.js");
  new Function(src.replace(/^import .*$/gm, "").replace("window.addEventListener", "globalThis.addEventListener"));
  assert(true, "app.js parses");
  assert(read("site/index.html").includes("Content-Security-Policy"), "CSP is on the page");

  const trust = new ImportTrust();
  assert(trust.inspect({ name: "<img src=x onerror =alert(1)>" }).outcome === "HOLD", "Spaced onerror HOLDs");
  assert(trust.inspect({ name: "<svg><animate onbegin=alert(1)>" }).outcome === "HOLD", "SVG onbegin HOLDs");

  assert(new GitHubAdapter({ token: "t", repo: "r" }).sync({ id: "p" }).outcome === "UNAVAILABLE", "GitHub does not pretend to sync");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p25", type: "Project", name: "Cube", provenance: { origin: "iter25" } });
  const g = new GeometryKernel(kernel);
  const sk = g.sketch(project.id, { id: "sk", points: [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}] });
  const base = g.extrude(project.id, sk.id, 10);
  assert(Math.abs(g.chamfer(project.id, sk.id, 1, 10).volume - 980) < 0.1, "Chamfer 1 mm is 980");
  assert(Math.abs(g.fillet(project.id, sk.id, 2, 10).volume - 966) < 2, "Fillet r2 is about 966");
  assert(Math.abs(g.draft(project.id, sk.id, 10, 5).volume - 835) < 1, "5 degree draft is about 835");
  assert(Math.abs(g.shell(project.id, base.id, 1).volume - 424) < 0.1, "1 mm shell with floor is 424");

  assert(new SafetyEngine(kernel).evaluateReadiness(project.id).decision === "HOLD", "No hazard log HOLDs");

  const adopted = new StandardsCorpusEngine(kernel).adopt(project.id, "std-iso-15288");
  const sim = kernel.upsert({ id: "sim", type: "Evidence", name: "run", state: "EXECUTED", method: "SIMULATION", provenance: { origin: "iter25" } });
  kernel.link(project.id, "CONTAINS", sim.id);
  const auto = new ComplianceAutomation(kernel);
  auto.bind(adopted.id, sim.id, adopted.requiredEvidence[0]);
  assert(auto.run(project.id).outcome === "HOLD", "Unpromoted simulation does not clear compliance");
  assert(auto.waive(adopted.id, adopted.requiredEvidence[1], { reason: "n/a", role: "x" }).outcome === "HOLD", "Unknown waiver role HOLDs");

  const config = kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter25" } });
  kernel.link(project.id, "CONTAINS", config.id);
  const machine = new CockpitMachine(kernel, project.id, { configurationId: config.id });
  machine.start();
  machine.advance("S1_CONFIGURATION_VERIFIED");
  machine.advance("S2_POWER_ISOLATED_CHECK");
  assert(machine.advance("S3_SYSTEM_POWER_UP").status === "HOLD", "Entering S2 does not confirm isolation");

  const license = read("LICENSE");
  assert(license.includes("TERMS AND CONDITIONS") && license.split("\n").length > 100, "LICENSE is the GPL text");
  assert(read("CITATION.cff").includes("0009-0002-0684-8320"), "ORCID is recorded");
  assert(!read("CITATION.cff").includes("repository-code"), "No repository URL until one exists");

  const corpus = JSON.parse(read("data/standards/corpus.json")).standards;
  assert(corpus.some(s => s.name === "SysML"), "SysML is in the corpus");
  assert(corpus.filter(s => s.name === "ISO 19011:2026").length === 1, "ISO 19011:2026 is not duplicated");

  console.log("\n=== ALL ITERATION 25 TESTS PASSED ===");
}
run();
