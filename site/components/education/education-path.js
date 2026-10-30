/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/education-path.js
 * FILE PURPOSE: Education path. Preschool to postdoc bands as increasing depth over one knowledge graph.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Education competency path - Iteration 10.
 *
 * A projection over the canonical semantic graph. The LMS is site/components/education/lms.js.
 * Course -> Lesson containment is canonical. Assessment Evidence is
 * identified by method EDUCATIONAL_ASSESSMENT and associated with its
 * Lesson through PRODUCES (preferred) or DERIVED_FROM (legacy-compatible
 * evidence provenance). Assessment evidence is not engineering verification.
 */

export class EducationPath {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /**
   * Query an education path in a project.
   *
   * @param {string} projectId canonical Project id
   * @param {string|null} courseId optional Course id; when omitted all courses
   * @returns {{
   *   status: "OK"|"HOLD",
   *   project: object|null,
   *   courses: object[],
   *   lessons: object[],
   *   assessments: object[],
   *   missingAssessments: object[],
   *   gaps: string[]
   * }}
   */
  path(projectId, courseId = null) {
    if (!projectId) {
      return {
        status: "HOLD",
        project: null,
        courses: [],
        lessons: [],
        assessments: [],
        missingAssessments: [],
        gaps: ["HOLD: projectId is required"]
      };
    }

    let graph;
    try {
      graph = this.kernel.getProjectGraph(projectId);
    } catch (error) {
      return {
        status: "HOLD",
        project: null,
        courses: [],
        lessons: [],
        assessments: [],
        missingAssessments: [],
        gaps: [`HOLD: unable to resolve project ${projectId}: ${error.message}`]
      };
    }

    const byId = new Map(graph.entities.map(entity => [entity.id, entity]));
    const project = byId.get(projectId) || null;

    let courses = graph.entities.filter(entity => entity.type === "Course");
    if (courseId) {
      courses = courses.filter(course => course.id === courseId);
    }

    const courseIds = new Set(courses.map(course => course.id));
    const lessonIds = new Set();

    for (const relation of graph.relations) {
      if (
        relation.relation === "CONTAINS" &&
        courseIds.has(relation.source) &&
        byId.get(relation.target)?.type === "Lesson"
      ) {
        lessonIds.add(relation.target);
      }
    }

    const lessons = [...lessonIds]
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));

    const assessmentIds = new Set();

    for (const relation of graph.relations) {
      const source = byId.get(relation.source);
      const target = byId.get(relation.target);

      // Preferred semantic expression: Lesson PRODUCES Evidence.
      if (
        relation.relation === "PRODUCES" &&
        lessonIds.has(relation.source) &&
        target?.type === "Evidence" &&
        target.method === "EDUCATIONAL_ASSESSMENT"
      ) {
        assessmentIds.add(target.id);
      }

      // Existing education closure expresses evidence provenance as
      // Evidence DERIVED_FROM Lesson. Preserve that meaning without
      // introducing another relation or ontology.
      if (
        relation.relation === "DERIVED_FROM" &&
        lessonIds.has(relation.target) &&
        source?.type === "Evidence" &&
        source.method === "EDUCATIONAL_ASSESSMENT"
      ) {
        assessmentIds.add(source.id);
      }
    }

    const assessments = [...assessmentIds]
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));

    const assessedLessonIds = new Set();

    for (const relation of graph.relations) {
      if (
        relation.relation === "PRODUCES" &&
        lessonIds.has(relation.source) &&
        assessmentIds.has(relation.target)
      ) {
        assessedLessonIds.add(relation.source);
      }

      if (
        relation.relation === "DERIVED_FROM" &&
        assessmentIds.has(relation.source) &&
        lessonIds.has(relation.target)
      ) {
        assessedLessonIds.add(relation.target);
      }
    }

    const missingAssessments = lessons
      .filter(lesson => !assessedLessonIds.has(lesson.id))
      .map(lesson => ({
        lessonId: lesson.id,
        lessonName: lesson.name || null,
        status: "HOLD",
        gap: "No EDUCATIONAL_ASSESSMENT evidence is linked to this lesson"
      }));

    const gaps = [];
    if (courseId && courses.length === 0) {
      gaps.push(`Course not found in project graph: ${courseId}`);
    }
    if (lessons.length === 0 && courses.length > 0) {
      gaps.push("No Lesson is contained by the selected course(s)");
    }
    if (missingAssessments.length > 0) {
      gaps.push(`${missingAssessments.length} lesson(s) have no educational assessment evidence`);
    }

    return {
      status: gaps.length === 0 ? "OK" : "HOLD",
      project,
      courses: courses.sort((a, b) => a.id.localeCompare(b.id)),
      lessons,
      assessments,
      missingAssessments,
      gaps
    };
  }

  /** query: Performs query for this module. */
  query(projectId, courseId = null) {
    return this.path(projectId, courseId);
  }
}

export default EducationPath;
