/**
 * Iteration 30 – reachability, disclaimer, PWA, workbench.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { REACHABLE, reachableCount } from "../site/components/core/module-registry.js";
import { MASTER_DISCLAIMER, INDEMNITY, disclaimerFor } from "../site/components/core/disclaimer.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

assert(reachableCount() >= 78, "Registry reaches the modules not imported directly");
assert(Object.keys(REACHABLE).includes("sir/sir-runtime.js"), "SIR runtime is reachable");
assert(Object.keys(REACHABLE).includes("manufacturing/mes.js"), "MES is reachable");
assert(MASTER_DISCLAIMER.includes("not a safety authority"), "Master disclaimer is present");
assert(INDEMNITY.includes("indemnify"), "Indemnity is present");
assert(disclaimerFor("hil").context.includes("transport"), "HIL context is present");
const html = readFileSync("site/index.html", "utf8");
assert(html.includes("manifest.webmanifest"), "PWA manifest is linked");
// Alpha 0.2.0: the registration moved from an inline script to assets/js/pwa.js so the CSP can be enforced.
const pwaJs = html.includes("assets/js/pwa.js") ? readFileSync("site/assets/js/pwa.js", "utf8") : "";
assert(html.includes("serviceWorker") || pwaJs.includes("serviceWorker"), "Service worker is registered");
const app = readFileSync("site/assets/js/app.js", "utf8");
assert(app.includes("pwa-install"), "Install button is on the landing");
assert(app.includes("class=\"workbench\""), "Workbench has an industrial layout");

console.log("\n=== ALL ITERATION 30 TESTS PASSED ===");
