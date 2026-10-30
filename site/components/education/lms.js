/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/lms.js
 * FILE PURPOSE: Learning management. Enrollment, lesson completion, and hold when not enrolled.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * LMS – Iteration 18
 * Courses, lessons, and enrollments are canonical entities.
 * A lesson HOLDs if the person is not enrolled.
 * The course completes only when every lesson is done.
 */
export class LMS {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** course: Performs course for this module. */
  course(projectId, { id, name, lessons }) {
    if (!lessons?.length) return { outcome: "HOLD", reason: "Course has no lessons" };
    const course = this.kernel.upsert({
      id, type: "Course", name, status: "OPEN",
      provenance: { origin: "lms", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", course.id);
    course.lessonIds = [];
    for (const lesson of lessons) {
      const lid = lesson.id || `${id}_${lesson.name}`;
      this.kernel.upsert({
        id: lid, type: "Lesson", name: lesson.name || lid, courseId: id, done: false,
        provenance: { origin: "lms", derivedFrom: id }
      });
      this.kernel.link(course.id, "CONTAINS", lid);
      course.lessonIds.push(lid);
    }
    return course;
  }

  /** enroll: Performs enroll for this module. */
  enroll(courseId, personId) {
    const course = this.kernel.store.get(courseId);
    if (!course || course.type !== "Course") return { outcome: "HOLD", reason: "Course is UNSPECIFIED" };
    if (!personId) return { outcome: "HOLD", reason: "Person is UNSPECIFIED" };
    let person = this.kernel.store.get(personId);
    if (!person) {
      person = this.kernel.upsert({ id: personId, type: "Person", name: personId, provenance: { origin: "lms", derivedFrom: courseId } });
    }
    const enrollmentId = `enroll_${courseId}_${personId}`;
    const enrollment = this.kernel.upsert({
      id: enrollmentId, type: "Curriculum", name: `${personId} in ${courseId}`,
      courseId, personId, status: "ENROLLED",
      provenance: { origin: "lms", derivedFrom: courseId }
    });
    this.kernel.link(course.id, "CONTAINS", enrollment.id);
    course.enrolled = [...new Set([...(course.enrolled || []), personId])];
    return enrollment;
  }

  /** completeLesson: Performs complete lesson for this module. */
  completeLesson(courseId, lessonId, personId) {
    const course = this.kernel.store.get(courseId);
    const lesson = this.kernel.store.get(lessonId);
    if (!course || !lesson) return { outcome: "HOLD", reason: "Course or lesson is UNSPECIFIED" };
    if (!course.enrolled?.includes(personId)) return { outcome: "HOLD", reason: "Person is not enrolled" };
    const evidence = this.kernel.upsert({
      id: `ev_${lessonId}_${personId}`,
      type: "Evidence",
      name: `${lessonId} completed by ${personId}`,
      state: "EXECUTED",
      method: "EDUCATIONAL_ASSESSMENT",
      subject: lessonId,
      actor: personId,
      provenance: { origin: "lms", derivedFrom: lessonId }
    });
    this.kernel.link(lesson.id, "PRODUCES", evidence.id);
    lesson.done = true;
    lesson.completedBy = personId;
    const lessons = (course.lessonIds || []).map(id => this.kernel.store.get(id));
    course.status = lessons.every(l => l?.done) ? "COMPLETE" : "OPEN";
    return course.status === "COMPLETE" ? course : { ...lesson, outcome: "RECORDED", courseStatus: course.status };
  }

  /** progress: Performs progress for this module. */
  progress(courseId) {
    const course = this.kernel.store.get(courseId);
    if (!course) return { outcome: "HOLD", reason: "Course is UNSPECIFIED" };
    const lessons = (course.lessonIds || []).map(id => this.kernel.store.get(id));
    return {
      outcome: "OK",
      status: course.status,
      enrolled: course.enrolled || [],
      done: lessons.filter(l => l?.done).length,
      total: lessons.length
    };
  }
}
