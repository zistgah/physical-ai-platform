/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-display.js
 * FILE PURPOSE: Renders a standard for the UI. Infers authority and refuses to show null or undefined fields.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Standards display – Iteration 21
 * A record never presents as null. Missing title uses topic, then name.
 */
export function inferAuthority(name = "") {
  if (/ISO\/IEC\/IEEE/i.test(name)) return "ISO/IEC/IEEE";
  if (/ISO\/IEC/i.test(name)) return "ISO/IEC";
  const head = name.split(/[\s/]/)[0];
  return head || "UNSPECIFIED";
}

/** displayStandard: Renders a standard for the UI. Infers authority and refuses to show null or undefined fields. */
export function displayStandard(std) {
  const title = std.title || std.topic || std.name;
  const topic = std.topic || std.title || std.name;
  const layer = std.layer || std.category || "UNCLASSIFIED";
  const recorded = Boolean(std.authority);
  const authority = std.authority || inferAuthority(std.name);
  return { ...std, title, topic, layer, authority, authorityProvenance: recorded ? "RECORDED" : "INFERRED", editionStatus: std.editionStatus || "PROFILED" };
}

/** assertDisplayable: Renders a standard for the UI. Infers authority and refuses to show null or undefined fields. */
export function assertDisplayable(std) {
  const d = displayStandard(std);
  const bad = ["title", "topic", "layer", "authority"].filter(k => d[k] == null || d[k] === "null");
  return bad.length ? { outcome: "HOLD", reason: `${std.id} missing ${bad.join(", ")}` } : { outcome: "OK", standard: d };
}
