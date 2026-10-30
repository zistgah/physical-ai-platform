/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/curriculum-engine.js
 * FILE PURPOSE: Curriculum engine. Projects a learning path from concepts. AI is not the authority.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Education / Curriculum Engine – Iteration 04
 * Maps concepts to the canonical graph. Produces learning paths as projections.
 */

export class CurriculumEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createPath: Projects a learning path from concepts. Does not authorize. */
  createPath(projectId, { grade = "secondary", concepts = [], safetyRequired = true } = {}) {
    const id = `curr_${grade}_${Date.now().toString(36)}`;
    const path = this.kernel.upsert({
      id,
      type: "Curriculum",
      name: `${grade} learning path`,
      grade,
      concepts,
      safetyRequired,
      status: "DRAFT",
      activities: concepts.map(c => ({ concept: c, activity: `Explore ${c} via simulation first` })),
      provenance: { origin: "education", derivedFrom: projectId, note: "Curriculum projection; AI is not the authority" }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return path;
  }

  /** plan: Returns a draft plan. AI is not the authority. */
  plan(input) {
    return {
      grade: input.grade,
      subject: input.subject,
      objectives: input.objectives || [],
      prerequisites: input.prerequisites || [],
      activities: input.activities || [],
      assessment: input.assessment || [],
      safety: input.safety || ["simulation-before-physical"],
      state: "DRAFT"
    };
  }
}
