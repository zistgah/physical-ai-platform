/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Route CI – Iteration 26
 * Opens every route in headless Chromium. Fails on a page error or an empty #app.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const routes = [...readFileSync("site/assets/js/app.js", "utf8").matchAll(/"(\/[^"]*)":/g)].map(m => m[1]);
const unique = [...new Set(routes)];

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", d => out += d);
    child.stderr.on("data", d => err += d);
    child.on("close", code => resolve({ code, out, err }));
  });
}

const server = spawn("python3", ["-m", "http.server", "8766"], { cwd: "site", stdio: "ignore" });
await new Promise(r => setTimeout(r, 400));
const failures = [];
for (const route of unique) {
  const url = `http://127.0.0.1:8766/#${route}`;
  const result = await run("chromium", ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=4000", "--dump-dom", url]);
  const app = result.out.match(/<main id="app">([\s\S]*?)<\/main>/);
  const text = app ? app[1].replace(/<[^>]+>/g, "").trim() : "";
  const pageError = /SyntaxError|ReferenceError|is not defined/.test(result.out + result.err);
  if (!text || pageError) failures.push({ route, empty: !text, pageError });
  else console.log("PASS", route);
}
server.kill();
if (failures.length) {
  console.error("FAIL", failures);
  process.exit(1);
}
console.log(`PASS: ${unique.length} routes opened with a filled #app`);
