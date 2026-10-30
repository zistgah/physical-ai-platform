/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: tools/check-copyright.mjs
 * FILE PURPOSE: Validates the copyright line and the absence of other organization names.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const LINE = "Copyright © 1993-2026 Abhishek Choudhary";
const FORBIDDEN = ["Thing" + "iverse", "Tinker" + "cad", "Ado" + "be", "Goo" + "gle", "Micro" + "soft", "Blen" + "der"];
const missing = [];
const named = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p); continue; }
    if (!p.endsWith(".js") && !p.endsWith(".mjs")) continue;
    const text = readFileSync(p, "utf8");
    if (!text.includes(LINE)) missing.push(p);
    for (const word of FORBIDDEN) if (text.includes(word)) named.push(p + ":" + word);
  }
}
walk("site");
walk("tools");
if (missing.length || named.length) {
  console.error("MISSING", missing);
  console.error("NAMED", named);
  process.exit(1);
}
console.log("Copyright and naming check passed");
