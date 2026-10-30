/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-EDUCATION-PATH
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { EducationPath } from "../site/components/education/education-path.js";

function assert(condition, message) {
  if (!condition) throw new Error("FAIL: " + message);
  console.log("PASS: " + message);
}

function entity(kernel, id, type, name, fields = {}) {
  return kernel.upsert({
    id,
    type,
    name,
    ...fields,
    provenance: {
      origin: "package-test",
      derivedFrom: "proj-education",
      timestamp: kernel._now()
    }
  });
}

function run() {
  const kernel = createKernel();

  const project = kernel.upsert({
    id: "proj-education",
    type: "Project",
    name: "Education path conformance",
    provenance: {
      origin: "package-test",
      derivedFrom: null,
      timestamp: kernel._now()
    }
  });

  const course = entity(kernel, "course-1", "Course", "Physical AI Foundations");
  const lessonComplete = entity(kernel, "lesson-1", "Lesson", "Graph Foundations");
  const lessonMissing = entity(kernel, "lesson-2", "Lesson", "Safety Foundations");

  const learner = entity(kernel, "person-learner", "Person", "Learner");
  const configuration = entity(kernel, "config-1", "Configuration", "Assessment Configuration");

  const assessment = entity(kernel, "evidence-1", "Evidence", "Competency: Graph Foundations", {
    state: "EXECUTED",
    method: "EDUCATIONAL_ASSESSMENT",
    learner: learner.id,
    configurationId: configuration.id
  });

  kernel.link(project.id, "CONTAINS", course.id);
  kernel.link(course.id, "CONTAINS", lessonComplete.id);
  kernel.link(course.id, "CONTAINS", lessonMissing.id);
  kernel.link(lessonComplete.id, "PRODUCES", assessment.id);

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.id === course.id), "project graph contains course");
  assert(graph.entities.some(e => e.id === lessonComplete.id), "project graph contains complete lesson");
  assert(graph.entities.some(e => e.id === lessonMissing.id), "project graph contains missing-assessment lesson");
  assert(graph.entities.some(e => e.id === assessment.id), "project graph contains assessment evidence");
  assert(graph.relations.some(r =>
    r.source === lessonComplete.id &&
    r.relation === "PRODUCES" &&
    r.target === assessment.id
  ), "project graph contains lesson PRODUCES assessment");

  const path = new EducationPath(kernel).path(project.id, course.id);
  assert(path.courses.length === 1, "path returns course");
  assert(path.lessons.length === 2, "path returns both lessons");
  assert(path.assessments.length === 1, "path returns educational assessment");
  assert(path.missingAssessments.length === 1, "lesson with no assessment is reported missing");
  assert(path.missingAssessments[0].lessonId === lessonMissing.id, "missing assessment identifies lesson");
  assert(path.missingAssessments[0].status === "HOLD", "missing assessment is HOLD");
  assert(path.status === "HOLD", "path is HOLD while a required assessment is missing");

  assert(path.assessments[0].method === "EDUCATIONAL_ASSESSMENT", "assessment method is educational assessment");
  assert(!graph.relations.some(r =>
    r.source === assessment.id &&
    r.relation === "VERIFIES"
  ), "assessment evidence is not engineering verification");

  const noProject = new EducationPath(kernel).path();
  assert(noProject.status === "HOLD", "missing required project input produces HOLD");

  console.log("\n=== WP-EDUCATION-PATH CONFORMANCE PASSED ===");
}

run();
