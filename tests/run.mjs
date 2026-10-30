/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Regression checklist – Iteration 18
 * Nothing may be less than the previous version.
 * A failing prior suite fails this checklist.
 * Nothing is a non-goal.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createKernel, CANONICAL_ENTITY_TYPES } from "../site/components/core/canonical-kernel.js";
import { LMS } from "../site/components/education/lms.js";
import { CAD_CONTRACT } from "../site/components/cad/cad-contracts.js";
import { relationStatus } from "../site/components/core/relation-registry.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

const required = [
  "site/components/cad/geometry-kernel.js",
  "site/components/cad/cad-workbench.js",
  "site/components/cad/nurbs.js",
  "site/components/sir/sir-abi.js",
  "site/components/graph/graph-editor.js",
  "site/components/simulation/fidelity-levels.js",
  "site/components/simulation/hil-realtime.js",
  "site/components/education/board-correlation.js",
  "site/components/manufacturing/package-export.js",
  "site/components/core/component-model.js",
  "site/components/cad/cad-features.js",
  "site/components/cad/cad-contracts.js",
  "site/components/sir/sir-runtime.js",
  "site/components/sir/sir-lang.js",
  "site/components/manufacturing/mes.js",
  "site/components/manufacturing/factory-execution.js",
  "site/components/manufacturing/factory-resolution.js",
  "site/components/core/erp.js",
  "site/components/education/lms.js",
  "site/components/education/education-path.js",
  "site/components/core/prover.js",
  "site/components/simulation/multiphysics.js",
  "site/components/core/distributed.js",
  "site/components/simulation/hil-loop.js",
  "site/components/core/fleet-ops.js",
  "site/components/teleoperation/remote-stack.js",
  "site/components/core/cockpit-exec.js",
  "site/components/compliance/standards-binding.js",
  "site/components/compliance/standards-display.js",
  "site/components/compliance/compliance-automation.js",
  "site/components/compliance/standards-corpus.js",
  "site/components/core/canonical-kernel.js",
  "site/components/core/persistence-privacy.js",
  "site/components/core/lifecycle-engine.js"
];

function run() {
  console.log("=== Regression checklist ===");
  assert(!existsSync("docs/architecture/non-goals.md"), "No non-goals document");
  for (const file of required) assert(existsSync(file), `Present: ${file}`);

  const banned = [];
  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${name.name}`;
      if (name.isDirectory()) walk(path);
      else if (/\.(md|js|mjs)$/.test(name.name)) {
        const text = readFileSync(path, "utf8");
        if (/non-goal|non goal/i.test(text)) banned.push(path);
      }
    }
  }
  walk("docs");
  walk("site");
  assert(banned.length === 0, `No non-goal markers (${banned.join(", ") || "none"})`);

  assert(CAD_CONTRACT.rules.length >= 7, "CAD contract is not weaker");
  assert(CANONICAL_ENTITY_TYPES.has("Sketch") && CANONICAL_ENTITY_TYPES.has("Solid"), "CAD types remain canonical");
  const made = relationStatus("MANUFACTURED_BY");
  assert(made.defined && made.def.source.includes("WorkOrder") && made.def.source.includes("Component"), "Both manufacturing directions remain");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "chk", type: "Project", name: "Check", provenance: { origin: "checklist" } });
  const lms = new LMS(kernel);
  const course = lms.course(project.id, { id: "chk-course", name: "Check", lessons: [{ id: "chk-l1" }, { id: "chk-l2" }] });
  assert(lms.completeLesson(course.id, "chk-l1", "ada").outcome === "HOLD", "LMS still holds an unenrolled lesson");
  lms.enroll(course.id, "ada");
  lms.completeLesson(course.id, "chk-l1", "ada");
  assert(kernel.store.get(course.id).status === "OPEN", "LMS still keeps an unfinished course open");
  lms.completeLesson(course.id, "chk-l2", "ada");
  assert(kernel.store.get(course.id).status === "COMPLETE", "LMS still completes only when every lesson is done");
  assert(kernel.store.get("chk-l1").type === "Lesson", "Lessons are canonical entities");

  const suites = readdirSync("tools").filter(f => f.startsWith("conformance-test") && f.endsWith(".mjs")).sort();
  suites.push("test-components.mjs");
  let failed = 0;
  for (const suite of suites) {
    if (suite === "regression-checklist.mjs") continue;
    const result = spawnSync("node", [`tools/${suite}`], { encoding: "utf8" });
    if (result.status !== 0) {
      failed++;
      console.log(`FAIL SUITE ${suite}`);
      console.log((result.stderr || result.stdout || "").split("\n").slice(-6).join("\n"));
    } else {
      console.log(`PASS SUITE ${suite}`);
    }
  }
  assert(failed === 0, `All prior suites pass (${suites.length - failed}/${suites.length})`);
  console.log("\n=== CHECKLIST PASSED ===");
}
run();
