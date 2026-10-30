/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/secret-scan.js
 * FILE PURPOSE: Secret scanner. AWS key, private key block, bearer token. A match is redacted. A clean text passes.
 * MRD 11.
 */
const SHAPES = [
  [/AKIA[0-9A-Z]{16}/g, "[AWS_KEY]"],
  [/-----BEGIN [A-Z ]+PRIVATE KEY-----/g, "[PRIVATE_KEY]"],
  [/Bearer [A-Za-z0-9._\-]+/g, "Bearer [TOKEN]"]
];

export function scan(text) {
  if (typeof text !== "string") return { outcome: "HOLD", reason: "Text is UNSPECIFIED" };
  let out = text, found = 0;
  for (const [re, repl] of SHAPES) {
    const matches = out.match(re);
    if (matches) { found += matches.length; out = out.replace(re, repl); }
  }
  return { outcome: "OK", redacted: out, found };
}
