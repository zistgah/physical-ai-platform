/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/acceptance.js
 * FILE PURPOSE: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Architectural acceptance – Iteration 26
 * The build-guideline checks. Each one is a behaviour, not a label.
 */
export function replaceSimulator(kernel, projectId, next) {
  if (!next?.run) return { outcome: "HOLD", reason: "Replacement has no run" };
  kernel.upsert({ id: "sim-adapter", type: "Simulation", name: next.name || "replacement", provenance: { origin: "acceptance" } });
  kernel.link(projectId, "CONTAINS", "sim-adapter");
  return { outcome: "OK", result: next.run() };
}

/** adaptInterface: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function adaptInterface(a, b) {
  if (!a?.unit || !b?.unit) return { outcome: "HOLD", reason: "Units are UNSPECIFIED" };
  if (a.unit === b.unit) return { outcome: "OK", adapter: false };
  return { outcome: "OK", adapter: true, from: a.unit, to: b.unit };
}

/** migrateSchema: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function migrateSchema(doc, from, to) {
  if (!doc || !from || !to) return { outcome: "HOLD", reason: "Migration inputs are UNSPECIFIED" };
  if (from === to) return { outcome: "OK", schema: to, migrated: false, reason: "Already at target" };
  const next = { ...doc, schema: to, migratedFrom: from };
  if (next.id !== doc.id) return { outcome: "HOLD", reason: "Migration changed identity" };
  return { outcome: "OK", schema: to, migrated: true, doc: next };
}

/** replay: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function replay(seed, run) {
  const a = run(seed), b = run(seed);
  return a === b ? { outcome: "OK", seed } : { outcome: "HOLD", reason: "Replay diverged" };
}

/** domainProfile: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function domainProfile(profile = {}) {
  const domains = ["TERRESTRIAL", "MARINE", "AERIAL", "ORBITAL", "INDUSTRIAL"];
  const embodiments = ["FIXED", "WHEELED", "TRACKED", "LEGGED", "SOFT"];
  if (!domains.includes(profile.domain)) return { outcome: "HOLD", reason: "Domain is not a profile" };
  if (!embodiments.includes(profile.embodiment)) return { outcome: "HOLD", reason: "Embodiment is not a profile" };
  return { outcome: "OK", domain: profile.domain, embodiment: profile.embodiment, profile: profile.domain + ":" + profile.embodiment };
}

/** replaceProvider: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function replaceProvider(current, next) {
  if (!next?.id) return { outcome: "HOLD", reason: "Provider is UNSPECIFIED" };
  return { outcome: "OK", provider: next.id, previous: current };
}

/** rejectIncompatible: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function rejectIncompatible(a, b) {
  if (a.domain && b.domain && a.domain !== b.domain) return { outcome: "REJECT", reason: "Incompatible domains" };
  return { outcome: "OK" };
}

/** v1ToV2: Architectural acceptance experiments. Replace simulator, adapt interface, migrate schema, replay, domain profile, replace AI provider, reject incompatible component, and preserve V1 entities in V2. */
export function v1ToV2(v1) {
  if (!v1?.schema) return { outcome: "HOLD", reason: "V1 schema is UNSPECIFIED" };
  return { outcome: "OK", schema: "v2", entities: v1.entities || [], preserved: true };
}
