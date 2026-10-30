/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { readFileSync } from "node:fs";
const src = readFileSync("site/assets/js/app.js", "utf8");
const stripped = src.replace(/^import .*$/gm, "");
new Function(stripped.replace("window.addEventListener", "globalThis.addEventListener"));
const routes = [...src.matchAll(/"(\/[^"]*)":/g)].map(m => m[1]);
const missing = routes.filter(r => {
  const name = src.match(new RegExp(`"${r}":\\s*(\\w+)`))?.[1];
  return name && !new RegExp(`function ${name}\\s*\\(`).test(src);
});
if (missing.length) throw new Error("Missing handlers: " + missing.join(", "));
if (!src.includes("Content-Security-Policy") && !readFileSync("site/index.html","utf8").includes("Content-Security-Policy")) {
  throw new Error("No CSP");
}
console.log("PASS: app.js parses. Routes:", routes.length, "CSP present");
