/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/board-import.js
 * FILE PURPOSE: Imports a board curriculum. A topic without a concept holds. A grade outside the board holds. The course is the imported board, not a hand-written list.
 * MRD 6: education as an imported board curriculum.
 */
export const BOARDS = {
  CBSE: {
    grades: ["9", "10", "11", "12"],
    subjects: {
      "9": ["Mathematics", "Science"],
      "10": ["Mathematics", "Science"],
      "11": ["Physics", "Chemistry"],
      "12": ["Physics", "Chemistry"]
    }
  }
};

export class BoardImport {
  constructor(kernel) { this.kernel = kernel; this.concepts = new Map(); }

  map(board, grade, subject, conceptId) {
    if (!BOARDS[board]) return { outcome: "HOLD", reason: "Board is not registered" };
    if (!BOARDS[board].grades.includes(String(grade))) return { outcome: "HOLD", reason: "Grade is outside the board" };
    if (!BOARDS[board].subjects[String(grade)]?.includes(subject)) return { outcome: "HOLD", reason: "Subject is not on this grade" };
    if (!conceptId) return { outcome: "HOLD", reason: "Concept is UNSPECIFIED" };
    this.concepts.set(`${board}:${grade}:${subject}`, conceptId);
    return { outcome: "OK", board, grade, subject, conceptId };
  }

  import(projectId, board, grade) {
    if (!BOARDS[board]) return { outcome: "HOLD", reason: "Board is not registered" };
    const subjects = BOARDS[board].subjects[String(grade)];
    if (!subjects) return { outcome: "HOLD", reason: "Grade is outside the board" };
    const missing = subjects.filter(s => !this.concepts.has(`${board}:${grade}:${s}`));
    if (missing.length) return { outcome: "HOLD", reason: "Unmapped subjects", missing };
    const courseId = `board_${board}_${grade}`;
    const course = this.kernel.upsert({
      id: courseId, type: "Course", name: `${board} grade ${grade}`, board, grade, status: "IMPORTED",
      provenance: { origin: "board-import", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", course.id);
    for (const subject of subjects) {
      const lid = `${courseId}_${subject}`;
      this.kernel.upsert({ id: lid, type: "Lesson", name: subject, courseId, conceptId: this.concepts.get(`${board}:${grade}:${subject}`), done: false, provenance: { origin: "board-import" } });
      this.kernel.link(course.id, "CONTAINS", lid);
    }
    return { outcome: "OK", course, subjects };
  }
}
