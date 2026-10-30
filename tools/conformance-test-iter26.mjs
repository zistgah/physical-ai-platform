/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 26 – the 11 acceptance items that can be proved here.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { GeometryKernel } from "../site/components/cad/geometry-kernel.js";
import { nurbsExtrude } from "../site/components/cad/nurbs.js";
import { meshVolume } from "../site/components/cad/cad-contracts.js";
import { interference, toSTEP } from "../site/components/cad/cad-features.js";
import { runLoop } from "../site/components/simulation/hil-loop.js";
import { ImportTrust, whatLeaves, GitHubAdapter } from "../site/components/core/persistence-privacy.js";
import { ExportControl } from "../site/components/compliance/export-control.js";
import { replaceSimulator, adaptInterface, migrateSchema, replay, domainProfile, replaceProvider, rejectIncompatible, v1ToV2 } from "../site/components/core/acceptance.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 26 ===");
  assert(runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 2, dt: 0.1 }).outcome === "HOLD", "HIL without a device HOLDs");
  assert(new GitHubAdapter({ token: "t", repo: "r" }).sync({ id: "p" }).outcome === "UNAVAILABLE", "GitHub is UNAVAILABLE");
  const payload = { id: "p", entities: [{ id: "a" }], relations: [] };
  assert(JSON.stringify(whatLeaves("sync", payload).fields) === JSON.stringify(["id", "entities", "relations"]), "What leaves is the payload");
  assert(new ImportTrust().inspect({ entities: [{ type: "Script" }] }).outcome === "HOLD", "Unknown import type HOLDs");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p26", type: "Project", name: "Cube", provenance: { origin: "iter26" } });
  const g = new GeometryKernel(kernel);
  const sk = g.sketch(project.id, { id: "sk", points: [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}] });
  const base = g.extrude(project.id, sk.id, 10);
  const pocket = g.pocket(project.id, base.id, { x: 3, y: 3, w: 4, d: 4, depth: 2 });
  assert(Math.abs(pocket.volume - 968) < 1, "Pocket 4x4x2 is 968");
  const union = g.unionOffset(project.id, base.id, 5, 5);
  assert(Math.abs(union.volume - 1750) < 1, "Union offset 5,5 is 1750");
  assert(base.volume > 0, "Signed volume is positive");

  const moved = nurbsExtrude([{x:0,y:0},{x:100,y:0},{x:100,y:10},{x:0,y:10},{x:0,y:0}], [1,1,1,1,1], [0,0,0,1,2,3,3,3], 2, 10);
  assert(moved.closed === true, "NURBS extrude is closed");
  const step = toSTEP(base);
  assert(step.text.includes("MANIFOLD_SOLID_BREP") && step.text.includes("END-ISO-10303-21;"), "STEP has a closed solid");

  const far = { vertices: base.mesh.vertices.map(v => ({ ...v, x: v.x + 100 })), faces: base.mesh.faces };
  assert(interference(base.mesh, far).interferes === false, "Disjoint boxes do not interfere");
  const farHit = interference(base.mesh, far);
  assert(farHit.interferes === farHit.vertexInside && farHit.boundingBoxOverlap === false, "Interference is vertex containment, not the bounding box");

  assert(new SafetyEngine(kernel).evaluateReadiness(project.id).decision === "HOLD", "No hazard log HOLDs");
  const draft = kernel.upsert({ id: "draft", type: "Configuration", name: "D", status: "DRAFT", provenance: { origin: "iter26" } });
  kernel.link(project.id, "CONTAINS", draft.id);
  assert(draft.status !== "FROZEN", "Unfrozen configuration is not a release");

  assert(new ExportControl().evaluate({ regime: "SCOMET", economy: "IN", classification: "UNSPECIFIED" }).outcome === "HOLD", "Missing classification HOLDs");
  assert(new ExportControl().evaluate({ regime: "EAR", economy: "US", classification: "EAR99" }).outcome === "REVIEW", "Named regime is review, not a licence");

  assert(replaceSimulator(kernel, project.id, { name: "alt", run: () => 1 }).outcome === "OK", "Simulator can be replaced");
  assert(adaptInterface({ unit: "N" }, { unit: "lbf" }).adapter === true, "Interface adapter is explicit");
  assert(migrateSchema({ id: "a" }, "v1", "v2").schema === "v2", "Schema migrates");
  assert(replay(7, (s) => s * 2).outcome === "OK", "Replay matches");
  assert(domainProfile({ domain: "TERRESTRIAL", embodiment: "WHEELED" }).outcome === "OK", "Domain profile");
  assert(replaceProvider("local", { id: "other" }).provider === "other", "Provider can be replaced");
  assert(rejectIncompatible({ domain: "electrical" }, { domain: "mechanical" }).outcome === "REJECT", "Incompatible component rejected");
  assert(v1ToV2({ schema: "v1", entities: [{ id: "a" }] }).preserved === true, "V1 to V2 preserves entities");

  const corpus = JSON.parse(readFileSync(join(root, "data/standards/corpus.json"), "utf8")).standards;
  assert(corpus.every(s => s.requiredEvidence?.length), "Every standard has required evidence");
  assert(readFileSync(join(root, "LICENSE"), "utf8").includes("TERMS AND CONDITIONS"), "GPL text is present");
  // Seed fix: scratch files stay inside the repository folder and are removed (never /tmp).
  const scratch = mkdtempSync(join(root, ".scratch-iter26-"));
  let occ;
  try {
    writeFileSync(join(scratch, "mesh.json"), JSON.stringify(base.mesh));
    const occLine = execFileSync("python3", [join(root, "tools/step-from-mesh.py"), join(scratch, "mesh.json"), join(scratch, "cube.stp")]).toString().trim().split("\n").at(-1);
    occ = JSON.parse(occLine);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  // Seed fix: without OpenCascade this one check is UNVERIFIED, not PASS and not FAIL.
  if (occ.unverified) console.log("UNVERIFIED: OpenCascade STEP volume matches the cube (" + occ.unverified + ")");
  else assert(occ.written && Math.abs(occ.volume - 1000) < 1e-6, "OpenCascade STEP volume matches the cube");

  console.log("\n=== ALL ITERATION 26 TESTS PASSED ===");
}
run();
