/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/role-views.js
 * FILE PURPOSE: Teacher, parent, and administrator views over the same course graph. A parent sees progress. A teacher sees gaps. An admin sees enrollment.
 * MRD 6: teacher, parent, administrator views.
 */
export class EducationViews {
  constructor(kernel) { this.kernel = kernel; }

  view(projectId, role) {
    const allowed = ["teacher", "parent", "admin", "student"];
    if (!allowed.includes(role)) return { outcome: "HOLD", reason: "Role is not registered" };
    const graph = this.kernel.getProjectGraph(projectId);
    const courses = graph.entities.filter(e => e.type === "Curriculum");
    const lessons = graph.entities.filter(e => e.type === "Lesson" || e.type === "Activity");
    if (role === "parent") return { outcome: "OK", role, progress: lessons.filter(l => l.status === "DONE").length, total: lessons.length };
    if (role === "teacher") return { outcome: "OK", role, gaps: lessons.filter(l => l.status !== "DONE").map(l => l.id) };
    if (role === "admin") return { outcome: "OK", role, courses: courses.length, enrolled: graph.entities.filter(e => e.type === "Person").length };
    return { outcome: "OK", role, lessons: lessons.length };
  }
}
