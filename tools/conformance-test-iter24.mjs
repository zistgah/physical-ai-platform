/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 24 – role pages, persistence, import trust, cockpit shutdown, housekeeping.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { escapeHtml, ImportTrust, IndexedDbAdapter, GitHubAdapter, whatLeaves } from "../site/components/core/persistence-privacy.js";
import { CockpitMachine } from "../site/components/safety/cockpit-machine.js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 24 ===");
  assert(existsSync(join(root, "templates/project.pap.json")), "templates/ exists");
  assert(existsSync(join(root, "tests/run.mjs")), "tests/ exists");

  const escaped = escapeHtml("<script>alert(1)</script>");
  assert(escaped.indexOf("<") === -1, "Names are escaped");
  assert(new ImportTrust().inspect({ name: "<script>x</script>" }).outcome === "HOLD", "Import with script HOLDs");
  assert(new ImportTrust().inspect({ name: "clean" }).outcome === "OK", "Clean import passes trust");

  const db = new IndexedDbAdapter();
  awaitSave(db);
  assert(whatLeaves("save-local").leaves === false, "Save local leaves nothing");
  assert(whatLeaves("publish", { project: "id" }).leaves === true, "Publish is reviewed before it leaves");
  assert(new GitHubAdapter().sync({ id: "p" }).outcome === "HOLD", "Unconfigured GitHub HOLDs");
  assert(new GitHubAdapter({ token: "t", repo: "r" }).publish({ id: "p" }).outcome === "HOLD", "Publish without confirmation HOLDs");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p24", type: "Project", name: "Ops", provenance: { origin: "iter24" } });
  const config = kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter24" } });
  kernel.link(project.id, "CONTAINS", config.id);
  const machine = new CockpitMachine(kernel, project.id, { configurationId: config.id });
  machine.start();
  machine.advance("S1_CONFIGURATION_VERIFIED");
  machine.advance("S2_POWER_ISOLATED_CHECK");
  kernel.upsert({ id: "iso-ev", type: "Evidence", name: "Isolation", state: "VERIFIED", method: "REVIEW", configurationId: config.id, provenance: { origin: "iter24" } });
  kernel.link(project.id, "CONTAINS", "iso-ev");
  machine.isolationRole = "safety-authority";
  machine.isolationEvidenceId = "iso-ev";
  machine.advance("S3_SYSTEM_POWER_UP");
  machine.advance("S4_SELF_TEST");
  machine.advance("S5_CONTROL_AUTHORITY_VERIFIED");
  machine.advance("S6_LOW_ENERGY_COMMISSIONING");
  machine.advance("S7_CONTROLLED_OPERATION");
  const blocked = machine.advance("S9_SHUTDOWN");
  assert(blocked.status === "HOLD", "Shutdown without a role HOLDs");
  machine.shutdownRole = "operator";
  const shut = machine.advance("S9_SHUTDOWN");
  assert(shut.state === "S9_SHUTDOWN", "S7 can shut down without FULL");

  const cff = readFileSync(join(root, "CITATION.cff"), "utf8");
  assert(cff.includes("message:"), "CITATION has a message");
  assert(cff.includes("AyeAI"), "CITATION has AyeAI affiliation");
  assert(!cff.includes("https://github.com/\n"), "CITATION has no bare placeholder URL");
  const license = readFileSync(join(root, "LICENSE"), "utf8");
  assert(license.includes("GNU GENERAL PUBLIC LICENSE") && license.includes("Version 3"), "LICENSE is GPL text");
  assert(!license.includes("or later"), "LICENSE matches GPL-3.0-only");

  console.log("\n=== ALL ITERATION 24 TESTS PASSED ===");
}

async function awaitSave(db) {
  // adapter is synchronous over a Map in tests
  return db.save("p", { id: "p" }).then(r => assert(r.outcome === "SAVED", "IndexedDB adapter saves"));
}
run();
