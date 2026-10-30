/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-human.js
 * FILE PURPOSE: Human surface for SIR. Reads sentences and emits the existing statements. Does not change the kernel or the language engine.
 * MRD 4: SIR.
 *
 *   this is a program named "demo"
 *   a Component called motor named "Motor"
 *   a Requirement called spin named "Spins"
 *   motor allocates spin
 */
import { run } from "./sir-language.js";

const RELATIONS = {
  allocates: "ALLOCATES",
  contains: "CONTAINS",
  connects: "CONNECTS_TO",
  verifies: "VERIFIES",
  governs: "GOVERNED_BY"
};

export function toStatements(lines) {
  if (!lines?.length) return { outcome: "HOLD", reason: "No lines" };
  const out = [];
  let named = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m = line.match(/^this is a program named "([^"]+)"$/);
    if (m) { out.unshift(`sir 1 "${m[1]}";`); named = true; continue; }
    m = line.match(/^a ([A-Za-z]+) called ([A-Za-z0-9_]+) named "([^"]+)"$/);
    if (m) { out.push(`entity ${m[1]} ${m[2]} { name: "${m[3]}"; };`); continue; }
    m = line.match(/^([A-Za-z0-9_]+) ([a-z]+) ([A-Za-z0-9_]+)$/);
    if (m && RELATIONS[m[2]]) { out.push(`relation ${m[1]} ${RELATIONS[m[2]]} ${m[3]};`); continue; }
    return { outcome: "HOLD", reason: "Not a sentence: " + line };
  }
  if (!named) return { outcome: "HOLD", reason: "Program is not named" };
  return { outcome: "OK", source: out.join("\n") };
}

export function runHuman(kernel, projectId, text) {
  if (typeof text !== "string" || !text.trim()) return { outcome: "HOLD", reason: "Source is empty" };
  const translated = toStatements(text.split("\n"));
  if (translated.outcome === "HOLD") return translated;
  return run(kernel, projectId, translated.source);
}
