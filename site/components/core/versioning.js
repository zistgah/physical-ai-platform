/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/versioning.js
 * FILE PURPOSE: Versioning. Separates IR version from ABI version and records both.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
export const PLATFORM_MAGIC = "PAI-PLATFORM";
export const PLATFORM_VERSION = "1.0.0";
export const SCHEMA_VERSION = "1.0.0";

/** parseVersion: Versioning. Separates IR version from ABI version and records both. */
export function parseVersion(v="0.0.0"){
  const m=String(v).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if(!m) throw new Error(`Invalid semantic version: ${v}`);
  return {major:+m[1],minor:+m[2],patch:+m[3]};
}
/** compatible: Versioning. Separates IR version from ABI version and records both. */
export function compatible(required, provided){
  const a=parseVersion(required), b=parseVersion(provided);
  return a.major===b.major && b.minor>=a.minor;
}
/** envelope: Versioning. Separates IR version from ABI version and records both. */
export function envelope(kind,payload,version=SCHEMA_VERSION){
  return {magic:PLATFORM_MAGIC, platformVersion:PLATFORM_VERSION, schemaVersion:version, kind, payload};
}
