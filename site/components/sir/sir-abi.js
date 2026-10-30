/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-abi.js
 * FILE PURPOSE: SIR IR and Robot ABI. IR version is separate from ABI version. EXECUTE only when all eight gates are valid.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * SIR IR and Robot ABI – Iteration 20
 * IR version is separate from ABI version.
 * EXECUTE iff every gate is valid. Otherwise REJECT or DEFER.
 */
export const IR_VERSION = "1.0.0";
export const ABI_VERSION = "1.0.0";

export const IR_SECTIONS = [
  "header", "identity", "mission", "components", "ports", "commands",
  "safety", "execution", "standards", "provenance"
];

/** compileIR: SIR IR and Robot ABI. IR version is separate from ABI version. EXECUTE only when all eight gates are valid. */
export function compileIR(doc) {
  const missing = IR_SECTIONS.filter(s => doc[s] == null);
  if (missing.length) return { outcome: "HOLD", reason: `IR missing ${missing.join(", ")}` };
  if (doc.header.irVersion !== IR_VERSION) return { outcome: "HOLD", reason: "IR version mismatch" };
  if (doc.header.abiVersion !== ABI_VERSION) return { outcome: "HOLD", reason: "ABI version mismatch" };
  return { outcome: "OK", ir: { ...doc, magic: "PAI-SIR" } };
}

/** commandPacket: SIR IR and Robot ABI. IR version is separate from ABI version. EXECUTE only when all eight gates are valid. */
export function commandPacket(fields) {
  const required = ["version", "source", "destination", "type", "authority", "intentRef", "policyRef", "deadline", "payload"];
  const missing = required.filter(k => fields[k] == null);
  if (missing.length) return { outcome: "HOLD", reason: `Command missing ${missing.join(", ")}` };
  if (fields.version !== ABI_VERSION) return { outcome: "HOLD", reason: "Command ABI version mismatch" };
  return { outcome: "OK", packet: { ...fields, abiVersion: ABI_VERSION } };
}

/** executeGate: SIR IR and Robot ABI. IR version is separate from ABI version. EXECUTE only when all eight gates are valid. */
export function executeGate(gates) {
  const names = ["intent", "policy", "authority", "capability", "state", "safety", "timing", "resource"];
  const failed = names.filter(n => gates[n] !== true);
  if (!failed.length) return { outcome: "EXECUTE", formula: names.join(" AND ") };
  const defer = failed.some(n => n === "timing" || n === "resource");
  return { outcome: defer ? "DEFER" : "REJECT", failed, formula: names.join(" AND ") };
}
