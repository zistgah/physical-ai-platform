/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/education-closure.js
 * FILE PURPOSE: Education closure. Completes a course only when every lesson is done.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Education closure – Iteration 06
 * Course → Lesson → Competency linked to project/simulation. Not an LMS.
 */

export class EducationClosure {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createCourse: Performs create course for this module. */
  createCourse(projectId, { name, grade }) {
    const id = `course_${Date.now().toString(36)}`;
    const course = this.kernel.upsert({
      id,
      type: "Course",
      name,
      grade,
      status: "DRAFT",
      provenance: { origin: "education", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return course;
  }

  /** addLesson: Performs add lesson for this module. */
  addLesson(courseId, { name, concept }) {
    const id = `lesson_${Date.now().toString(36)}`;
    const lesson = this.kernel.upsert({
      id,
      type: "Lesson",
      name,
      concept,
      status: "DRAFT",
      provenance: { origin: "education", derivedFrom: courseId }
    });
    this.kernel.link(courseId, "CONTAINS", id);
    return lesson;
  }

  /** recordCompetency: Performs record competency for this module. */
  recordCompetency(lessonId, { learner, outcome, configurationId }) {
    const id = `comp_${Date.now().toString(36)}`;
    const ev = this.kernel.upsert({
      id,
      type: "Evidence",
      name: `Competency ${outcome}`,
      state: "EXECUTED",
      method: "EDUCATIONAL_ASSESSMENT",
      learner,
      configurationId: configurationId || null,
      provenance: { origin: "education-assessment", derivedFrom: lessonId, note: "Assessment evidence; not engineering verification" }
    });
    this.kernel.link(ev.id, "DERIVED_FROM", lessonId);
    return ev;
  }
}
