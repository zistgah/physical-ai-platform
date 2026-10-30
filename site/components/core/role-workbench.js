/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/role-workbench.js
 * FILE PURPOSE: Role-resolved workbench. A role sees its views. An unknown role holds. The graph is not copied.
 * MRD 12.
 */
const ROLE_VIEWS = {
  engineer: ["architecture", "physical", "manufacturing"],
  operator: ["cockpit", "physical"],
  regulator: ["regulatory", "assurance"],
  funder: ["commercial"]
};

export function viewsFor(role) {
  if (!role) return { outcome: "HOLD", reason: "Role is UNSPECIFIED" };
  const views = ROLE_VIEWS[role];
  if (!views) return { outcome: "HOLD", reason: "Role is not known" };
  return { outcome: "OK", role, views };
}
