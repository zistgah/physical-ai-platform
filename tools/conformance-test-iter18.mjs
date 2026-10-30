/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 18 – no drops, LMS on the graph, checklist.
 */
import { existsSync } from "node:fs";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { LMS } from "../site/components/education/lms.js";
import { FactoryExecutionEngine } from "../site/components/manufacturing/factory-execution.js";
import { FactoryResolution } from "../site/components/manufacturing/factory-resolution.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 18 ===");
  assert(!existsSync("docs/architecture/non-goals.md"), "Non-goals file stays gone");
  assert(existsSync("tools/regression-checklist.mjs"), "Checklist script exists");

  const kernel = createKernel();
  const project = kernel.upsert({ id: "p18", type: "Project", name: "LMS", provenance: { origin: "iter18" } });
  const lms = new LMS(kernel);
  const empty = lms.course(project.id, { id: "empty", name: "Empty", lessons: [] });
  assert(empty.outcome === "HOLD", "LMS holds a course with no lessons");

  const course = lms.course(project.id, { id: "safety", name: "Safety", lessons: [{ id: "hazard", name: "Hazard" }, { id: "stop", name: "Stop" }] });
  assert(kernel.store.get("hazard").type === "Lesson", "Lesson is a canonical entity");
  assert(lms.completeLesson(course.id, "hazard", "ada").outcome === "HOLD", "Lesson HOLDs if the person is not enrolled");
  const enrollment = lms.enroll(course.id, "ada");
  assert(enrollment.status === "ENROLLED", "Enrollment is recorded");
  lms.completeLesson(course.id, "hazard", "ada");
  assert(kernel.store.get(course.id).status === "OPEN", "Course stays open with a lesson left");
  assert(kernel.store.get("ev_hazard_ada").method === "EDUCATIONAL_ASSESSMENT", "Completed lesson produces assessment evidence");
  lms.completeLesson(course.id, "stop", "ada");
  assert(kernel.store.get(course.id).status === "COMPLETE", "Course completes only when every lesson is done");

  const factory = new FactoryExecutionEngine(kernel);
  const part = kernel.upsert({ id: "part-18", type: "Component", name: "Bracket", provenance: { origin: "iter18" } });
  kernel.link(project.id, "CONTAINS", part.id);
  const wo = factory.createWorkOrder(project.id, part.id, {});
  assert(wo.type === "WorkOrder", "Factory work order still creates");
  const resolution = new FactoryResolution(kernel);
  const recorded = resolution.record(project.id, { componentId: part.id, processName: "Mill" });
  assert(recorded.manufacturedBy === "proc_part-18", "Resolution still settles MANUFACTURED_BY");

  console.log("\n=== ALL ITERATION 18 TESTS PASSED ===");
}
run();
