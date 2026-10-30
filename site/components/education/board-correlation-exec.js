/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/board-correlation-exec.js
 * FILE PURPOSE: Executable correlation. Maps a board, level, and subject to a concept id. Carries no syllabus text. An unregistered triple holds.
 * MRD 6: board and university correlation.
 */
export const BOARDS = ["CBSE", "ICSE", "GATE", "UNIVERSITY"];
export const DISCIPLINES = ["CSE", "ECE", "INSTRUMENTATION", "MECHANICAL", "ROBOTICS"];

// Correlation only. No topic text, no chapter, no outcome.
const ROWS = [
  { board: "CBSE", level: "10", subject: "Mathematics", concept: "algebra" },
  { board: "CBSE", level: "10", subject: "Science", concept: "mechanics" },
  { board: "ICSE", level: "10", subject: "Mathematics", concept: "algebra" },
  { board: "ICSE", level: "10", subject: "Physics", concept: "mechanics" },
  { board: "GATE", level: "CSE", subject: "Algorithms", concept: "complexity" },
  { board: "GATE", level: "ECE", subject: "Signals", concept: "sampling" },
  { board: "GATE", level: "INSTRUMENTATION", subject: "Sensors", concept: "transducer" },
  { board: "GATE", level: "MECHANICAL", subject: "Statics", concept: "equilibrium" },
  { board: "GATE", level: "ROBOTICS", subject: "Kinematics", concept: "pose" },
  { board: "UNIVERSITY", level: "UG", subject: "Robotics", concept: "pose" },
  { board: "UNIVERSITY", level: "PG", subject: "Automation", concept: "control" }
];

export function correlate(board, level, subject) {
  if (!board || !level || !subject) return { outcome: "HOLD", reason: "Correlation inputs are UNSPECIFIED" };
  if (!BOARDS.includes(board)) return { outcome: "HOLD", reason: "Board is not registered" };
  const hit = ROWS.find(r => r.board === board && r.level === level && r.subject === subject);
  if (!hit) return { outcome: "HOLD", reason: "No correlation for this triple" };
  return { outcome: "OK", concept: hit.concept };
}

export function shared(concept) {
  return ROWS.filter(r => r.concept === concept).map(r => ({ board: r.board, level: r.level, subject: r.subject }));
}
