/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/lifecycle-gates.js
 * FILE PURPOSE: Lifecycle gate evaluation. A gate holds when its preconditions or evidence are missing.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/** Canonical gate set. Shared so schema overlay does not cycle. */
export const GATES = [
  { id: "G0", name: "Opportunity", stage: "Discover" },
  { id: "G1", name: "Concept", stage: "Define" },
  { id: "G2", name: "Feasibility", stage: "Research" },
  { id: "G3", name: "Architecture", stage: "Architect" },
  { id: "G4", name: "Prototype", stage: "Prototype" },
  { id: "G5", name: "MVP", stage: "MVP" },
  { id: "G6", name: "Validation", stage: "Validate" },
  { id: "G7", name: "Funding / Production Decision", stage: "Fund" },
  { id: "G8", name: "Production Release", stage: "Manufacture" },
  { id: "G9", name: "Market Release", stage: "Deploy" },
  { id: "G10", name: "Operational Release", stage: "Operate" },
  { id: "G11", name: "Major Revision", stage: "Improve" },
  { id: "G12", name: "Retirement", stage: "Retire" }
];
