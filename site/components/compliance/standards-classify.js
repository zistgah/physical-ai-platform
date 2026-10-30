/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-classify.js
 * FILE PURPOSE: Classifies a standard by layer, tier, and topic class. Carries no standard text. A standard with no class holds.
 * MRD 7: standards corpus.
 */
import { STANDARDS_CORPUS } from "./standards-corpus.js";

const TOPIC_CLASS = [
  ["robot", "ROBOTICS"],
  ["safety", "SAFETY"],
  ["risk", "RISK"],
  ["quality", "QUALITY"],
  ["security", "SECURITY"],
  ["cyber", "SECURITY"],
  ["software", "SOFTWARE"],
  ["life cycle", "LIFECYCLE"],
  ["life-cycle", "LIFECYCLE"],
  ["data", "DATA"],
  ["metadata", "DATA"],
  ["identifier", "DATA"],
  ["ai", "AI"],
  ["artificial intelligence", "AI"],
  ["architecture", "ARCHITECTURE"],
  ["configuration", "CONFIGURATION"],
  ["verification", "VERIFICATION"],
  ["validation", "VERIFICATION"],
  ["test", "VERIFICATION"],
  ["audit", "QUALITY"],
  ["management system", "QUALITY"],
  ["environmental", "ENVIRONMENT"],
  ["energy", "ENVIRONMENT"],
  ["pollution", "ENVIRONMENT"],
  ["defence", "DEFENCE"],
  ["defense", "DEFENCE"],
  ["space", "SPACE"],
  ["medical", "MEDICAL"],
  ["ontology", "DATA"],
  ["workflow", "PROCESS"],
  ["process", "PROCESS"],
  ["notation", "PROCESS"],
  ["supply", "SUPPLY"],
  ["bom", "SUPPLY"],
  ["materials", "SUPPLY"],
  ["emi", "EMC"],
  ["electromagnetic", "EMC"],
  ["requirements", "REQUIREMENTS"],
  ["systems of systems", "SYSTEMS"],
  ["terminology", "TERMINOLOGY"],
  ["vocabulary", "TERMINOLOGY"],
  ["togaf", "ARCHITECTURE"],
  ["archimate", "ARCHITECTURE"],
  ["rdf", "DATA"],
  ["sparql", "DATA"],
  ["json", "DATA"],
  ["records", "RECORDS"],
  ["archival", "RECORDS"],
  ["privacy", "PRIVACY"],
  ["api", "INTERFACE"],
  ["openid", "IDENTITY"],
  ["oauth", "IDENTITY"],
  ["certificate", "IDENTITY"],
  ["obstacle", "SAFETY"],
  ["autonomous", "AUTONOMY"],
  ["automation", "AUTONOMY"],
  ["industrie", "ARCHITECTURE"],
  ["project assurance", "ASSURANCE"],
  ["recommended practices", "ASSURANCE"],
  ["citation", "DATA"],
  ["research", "DATA"],
  ["crate", "DATA"],
  ["document", "RECORDS"],
  ["packaging", "RECORDS"],
  ["file format", "RECORDS"],
  ["modeling", "PROCESS"],
  ["modelling", "PROCESS"],
  ["resource description", "DATA"],
  ["knowledge organization", "DATA"],
  ["journal", "DATA"]
];

export function classify(standard) {
  if (!standard?.id) return { outcome: "HOLD", reason: "Standard is UNSPECIFIED" };
  const topic = (standard.topic || "").toLowerCase();
  const cls = TOPIC_CLASS.find(([key]) => topic.includes(key));
  if (!cls) return { outcome: "HOLD", reason: "No class for this topic" };
  return {
    outcome: "OK",
    id: standard.id,
    layer: standard.layer || "UNSPECIFIED",
    tier: standard.tier || "UNSPECIFIED",
    topicClass: cls[1]
  };
}

export function classifyAll() {
  return STANDARDS_CORPUS.map(classify);
}

export function unclassified() {
  return STANDARDS_CORPUS.filter(s => classify(s).outcome === "HOLD");
}
