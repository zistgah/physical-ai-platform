#!/usr/bin/env node
/**
 * pap-ui-acceptance 1.1.0
 * Browser-driven acceptance for the Physical AI Platform: a page passes only by operating
 * its components and showing their real results. Loading is not enough.
 *
 * © 1993–2026 Abhishek Choudhary. All rights reserved.
 * Licensed under GPL-3.0-only. AyeAI.
 * Names of third-party products and standards are the trademarks of their respective owners.
 *
 * Run from the repository root:  node tests/ui-acceptance.mjs
 * It serves the repository root (the layout Pages publishes: site/ beside drop-in/) and opens
 * site/index.html in Chromium through Playwright. Results: PASS, FAIL, SKIP, UNVERIFIED.
 * Exit code: 1 when a gate fails, 2 when no gate fails but one is unverified, 0 otherwise.
 *
 * The contract a page meets (see the brief for the full table):
 *   every working page   [data-action] controls; clicking one fills a [data-result] region
 *   #/tools/<package>    [data-testid=tool-sample] lists the package's samples;
 *                        [data-testid=tool-run] runs the selected one;
 *                        [data-testid=tool-call] names the exported function called, or
 *                        "path#export" for an adapter module in this repository;
 *                        [data-testid=tool-args] holds the JSON array of arguments passed;
 *                        [data-testid=tool-result] holds the JSON the function returned;
 *                        [data-testid=tool-view] shows that result as a table, chart or 3D view.
 *                        The harness calls the same function in Node with the same arguments
 *                        and requires the same result, and requires the arguments to come
 *                        from the selected sample.
 *   #/cad                the testids listed in CAD below; volumes are checked against the
 *                        geometry kernel run in Node, and the exported STL is re-measured.
 *   #/simulate           sim-run, sim-trace, sim-chart, sim-fault, sim-replay.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VERSION = "1.1.0";
const SELF = fileURLToPath(import.meta.url);
const ROOT = process.cwd();
if (process.argv.includes("--version")) {
  console.log([`pap-ui-acceptance ${VERSION}`, "© 1993–2026 Abhishek Choudhary. All rights reserved.", "Licensed under GPL-3.0-only. AyeAI.",
    "Names of third-party products and standards are the trademarks of their respective owners."].join("\n")); process.exit(0);
}
const INFORMATIONAL = new Set(["/about", "/disclaimer"]);
const results = [];
const add = (id, title, severity, status, detail = "") => results.push({ id, title, severity, status, detail });

// ---------------------------------------------------------------- helpers
function approxEqual(a, b, path = "$") {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return null;
    const tol = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= tol ? null : `${path}: ${a} != ${b}`;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return `${path}: array shape differs`;
    for (let i = 0; i < a.length; i++) { const d = approxEqual(a[i], b[i], `${path}[${i}]`); if (d) return d; }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).filter(k => a[k] !== undefined).sort(), kb = Object.keys(b).filter(k => b[k] !== undefined).sort();
    if (ka.join() !== kb.join()) return `${path}: keys differ (${ka.filter(k => !kb.includes(k)).concat(kb.filter(k => !ka.includes(k))).slice(0, 4).join(", ")})`;
    for (const k of ka) { const d = approxEqual(a[k], b[k], `${path}.${k}`); if (d) return d; }
    return null;
  }
  return a === b ? null : `${path}: ${JSON.stringify(a)?.slice(0, 40)} != ${JSON.stringify(b)?.slice(0, 40)}`;
}
const plain = (v) => JSON.parse(JSON.stringify(v ?? null));
function stlVolume(text) {
  const v = [...text.matchAll(/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g)].map(m => m.slice(1).map(Number));
  let vol = 0; for (let i = 0; i + 2 < v.length; i += 3) { const [a, b, c] = [v[i], v[i + 1], v[i + 2]];
    vol += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); }
  return { facets: v.length / 3, volume: vol / 6 };
}
function resolvePlaywright() {
  const bases = [ROOT]; const g = spawnSync("npm", ["root", "-g"], { encoding: "utf8" }); if (g.status === 0) bases.push(g.stdout.trim());
  for (const b of bases) { try { return createRequire(join(b, "noop.js"))("playwright"); } catch {} }
  return null;
}
function serve(dir) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
    ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".stl": "model/stl", ".wasm": "application/wasm" };
  return new Promise((ok) => { const s = createServer((req, res) => { const p = resolve(dir, "." + decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(resolve(dir)) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p)); });
    s.listen(0, "127.0.0.1", () => ok({ port: s.address().port, close: () => s.close() })); });
}
function routesOf() {
  const src = readFileSync(join(ROOT, "site/assets/js/app.js"), "utf8"); const i = src.indexOf("const routes = {");
  return i < 0 ? [] : [...new Set([...src.slice(i, src.indexOf("};", i)).matchAll(/["'](\/[^"']*)["']\s*:/g)].map(m => m[1]))];
}
function packages() {
  const d = join(ROOT, "drop-in"); if (!existsSync(d)) return [];
  return readdirSync(d).filter(p => existsSync(join(d, p, "module.js"))).map(p => ({ id: p,
    samples: existsSync(join(d, p, "samples")) ? readdirSync(join(d, p, "samples")).filter(f => f.endsWith(".json")).sort() : [] }));
}

// ---------------------------------------------------------------- run
const pw = resolvePlaywright();
if (!pw) { add("U0", "Playwright and Chromium are available", "gate", "UNVERIFIED", "npm install -g playwright && npx playwright install chromium"); report(); }
let browser = null;
for (const exe of [undefined, process.env.CHROME_PATH, "/usr/bin/chromium", "/usr/bin/google-chrome",
  ...(existsSync("/opt/pw-browsers") ? readdirSync("/opt/pw-browsers").map(d => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : [])].filter((v, i, a) => a.indexOf(v) === i)) {
  try { browser = await pw.chromium.launch({ executablePath: exe, args: ["--no-sandbox"] }); break; } catch {}
}
if (!browser) { add("U0", "Playwright and Chromium are available", "gate", "UNVERIFIED", "no launchable Chromium"); report(); }
const server = await serve(ROOT);
const base = `http://127.0.0.1:${server.port}/site/index.html`;
async function open(route) {
  const ctx = await browser.newContext({ acceptDownloads: true }); const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));
  await page.goto(`${base}#${route}`); await page.waitForTimeout(500);
  return { page, ctx, errors };
}

try {
  // G1: every working page operates something
  for (const r of routesOf()) {
    if (INFORMATIONAL.has(r)) { add(`G1 ${r}`, `page ${r} is informational`, "report", "SKIP", "listed as informational"); continue; }
    const { page, ctx, errors } = await open(r);
    try {
      const actions = await page.$$("#app [data-action]");
      if (!actions.length) {
        const controls = await page.$$eval("#app button, #app input, #app select, #app textarea", (e) => e.length);
        add(`G1 ${r}`, `page ${r} operates its components`, "gate", "FAIL", controls
          ? `${controls} control(s), none marked [data-action]: the contract hook is missing, which says nothing about whether they work`
          : "display only: the page has no control at all"); continue;
      }
      const resultBefore = await page.evaluate(() => [...document.querySelectorAll("#app [data-result]")].map(e => e.innerText).join("\u0001"));
      let changed = false, clicked = 0;
      for (const a of actions.slice(0, 6)) { if (!(await a.isVisible()) || !(await a.isEnabled())) continue;
        await a.click().catch(() => {}); clicked++;
        for (let t = 0; t < 40 && !changed; t++) { await page.waitForTimeout(200);   // actions may be asynchronous: wait up to 8 s
          const after = await page.evaluate(() => [...document.querySelectorAll("#app [data-result]")].map(e => e.innerText).join("\u0001"));
          if (after !== resultBefore && after.trim()) changed = true; }
        if (changed) break; }
      if (errors.length) add(`G1 ${r}`, `page ${r} operates its components`, "gate", "FAIL", `page error: ${errors[0]}`);
      else add(`G1 ${r}`, `page ${r} operates its components`, "gate", changed ? "PASS" : "FAIL", changed ? `${actions.length} actions` : `clicked ${clicked} [data-action] control(s); nothing marked [data-result] changed`);
    } finally { await ctx.close(); }
  }

  // T: every drop-in package is mounted and runs its real module
  for (const pkg of packages()) {
    const mod = await import(pathToFileURL(join(ROOT, "drop-in", pkg.id, "module.js")).href);
    const { page, ctx, errors } = await open(`/tools/${pkg.id}`);
    try {
      const select = await page.$("[data-testid=tool-sample]");
      if (!select) { add(`T ${pkg.id}`, `drop-in ${pkg.id} runs in the site`, "gate", "FAIL", `no page mounts it: #/tools/${pkg.id} has no [data-testid=tool-sample]`); continue; }
      const offered = await page.$$eval("[data-testid=tool-sample] option", o => o.map(x => x.value));
      const missing = pkg.samples.filter(s => !offered.includes(s));
      if (missing.length) { add(`T ${pkg.id}`, `drop-in ${pkg.id} runs in the site`, "gate", "FAIL", `samples not offered: ${missing.join(", ")}`); continue; }
      const problems = [];
      for (const s of (pkg.samples.length ? pkg.samples : [offered[0]]).filter(Boolean)) {
        await page.selectOption("[data-testid=tool-sample]", s); await page.click("[data-testid=tool-run]"); await page.waitForTimeout(400);
        const call = (await page.textContent("[data-testid=tool-call]").catch(() => "") || "").trim();
        let args, ui;
        try { args = JSON.parse(await page.textContent("[data-testid=tool-args]")); ui = JSON.parse(await page.textContent("[data-testid=tool-result]")); }
        catch (e) { problems.push(`${s}: tool-args or tool-result is not JSON`); continue; }
        let fn = mod[call];
        if (call.includes("#")) { const [rel, name] = call.split("#"); try { fn = (await import(pathToFileURL(join(ROOT, rel)).href))[name]; } catch { fn = undefined; } }
        if (typeof fn !== "function") { problems.push(`${s}: ${call || "(none)"} is not an exported function`); continue; }
        if (!Array.isArray(args)) { problems.push(`${s}: tool-args is not a JSON array`); continue; }
        if (pkg.samples.length) {
          const sample = JSON.parse(readFileSync(join(ROOT, "drop-in", pkg.id, "samples", s), "utf8"));
          const pieces = [sample, sample?.input, ...Object.values(sample || {})].map(v => JSON.stringify(v));
          if (!args.some(a => pieces.includes(JSON.stringify(a)))) problems.push(`${s}: no argument is the sample or a part of it`);
        }
        let expected; try { expected = plain(await fn(...plain(args))); } catch (e) { expected = { thrown: String(e?.message || e) }; }
        const diff = approxEqual(plain(ui), expected); if (diff) problems.push(`${s}: the page's result differs from ${call} in Node (${diff})`);
        const view = await page.$("[data-testid=tool-view] table, [data-testid=tool-view] canvas, [data-testid=tool-view] svg");
        if (!view) problems.push(`${s}: no table, chart or 3D view of the result`);
      }
      if (errors.length) problems.unshift(`page error: ${errors[0]}`);
      add(`T ${pkg.id}`, `drop-in ${pkg.id} runs in the site`, "gate", problems.length ? "FAIL" : "PASS", problems.slice(0, 3).join("; ") || `${pkg.samples.length} samples, results equal the module's`);
    } finally { await ctx.close(); }
  }

  // C: the CAD workbench is a tool
  {
    const T = (id) => `[data-testid=${id}]`;
    const need = ["cad-clear", "cad-x", "cad-y", "cad-add-point", "cad-height", "cad-extrude", "cad-volume", "cad-viewport", "cad-op", "cad-op-param", "cad-apply", "cad-undo", "cad-export-stl", "cad-import-stl", "cad-tree"];
    const { page, ctx, errors } = await open("/cad");
    try {
      const absent = []; for (const id of need) if (!(await page.$(T(id)))) absent.push(id);
      if (absent.length) add("C1", "CAD workbench controls", "gate", "FAIL", `contract hooks missing: ${absent.join(", ")}`);
      else {
        const { createKernel } = await import(pathToFileURL(join(ROOT, "site/components/core/canonical-kernel.js")).href);
        const { GeometryKernel } = await import(pathToFileURL(join(ROOT, "site/components/cad/geometry-kernel.js")).href);
        const k = createKernel(); const P = k.upsert({ id: "p", type: "Project", name: "P", provenance: { origin: "ui-acceptance" } }).id; const g = new GeometryKernel(k);
        const pts = [[0, 0], [40, 0], [40, 30], [0, 30]];
        const sk = g.sketch(P, { id: "s", name: "s", points: pts.map(([x, y]) => ({ x, y })) });
        const expectExtrude = g.extrude(P, sk.id, 10, { id: "e" }).volume, expectChamfer = g.chamfer(P, sk.id, 1, 10, { id: "c" }).volume;
        const vol = async () => Number((await page.textContent(T("cad-volume"))).replace(/[^\d.eE+-]/g, ""));
        await page.click(T("cad-clear"));
        for (const [x, y] of pts) { await page.fill(T("cad-x"), String(x)); await page.fill(T("cad-y"), String(y)); await page.click(T("cad-add-point")); }
        await page.fill(T("cad-height"), "10"); await page.click(T("cad-extrude")); await page.waitForTimeout(300);
        const v1 = await vol();
        add("C2", "CAD extrude of a drawn 40x30 profile, height 10", "gate", Math.abs(v1 - expectExtrude) <= 1e-6 * expectExtrude ? "PASS" : "FAIL", `page ${v1}, kernel ${expectExtrude}`);
        const blank = await page.$eval(T("cad-viewport"), (c) => { try { const x = c.getContext("2d") || c.getContext("webgl2") || c.getContext("webgl");
          if (x && x.getImageData) { const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; } return false; } catch { return false; } }).catch(() => true);
        add("C3", "CAD viewport draws the solid", "gate", blank ? "FAIL" : "PASS", blank ? "the viewport is blank" : "");
        await page.selectOption(T("cad-op"), "chamfer"); await page.fill(T("cad-op-param"), "1"); await page.click(T("cad-apply")); await page.waitForTimeout(300);
        const v2 = await vol();
        add("C4", "CAD chamfer 1 mm on the drawn profile", "gate", Math.abs(v2 - expectChamfer) <= 1e-6 * expectChamfer ? "PASS" : "FAIL", `page ${v2}, kernel ${expectChamfer}`);
        const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(() => null), page.click(T("cad-export-stl"))]);
        if (!dl) add("C5", "CAD exports an STL of the current solid", "gate", "FAIL", "no download");
        else { const text = readFileSync(await dl.path(), "utf8"); const m = stlVolume(text);
          add("C5", "CAD exports an STL of the current solid", "gate", m.facets >= 12 && Math.abs(m.volume - v2) <= 0.005 * v2 ? "PASS" : "FAIL", `${m.facets} facets, volume ${m.volume.toFixed(2)} against ${v2}`);
          await page.click(T("cad-undo")); await page.waitForTimeout(300); const v3 = await vol();
          add("C6", "CAD undo returns to the extrude", "gate", Math.abs(v3 - expectExtrude) <= 1e-6 * expectExtrude ? "PASS" : "FAIL", `after undo ${v3}`);
          await page.setInputFiles(T("cad-import-stl"), { name: "back.stl", mimeType: "model/stl", buffer: Buffer.from(text) }); await page.waitForTimeout(400);
          const items = await page.$$eval(`${T("cad-tree")} li`, (l) => l.map(x => x.innerText));
          add("C7", "CAD imports the exported STL as a solid", "gate", items.some(t => /back|import|stl/i.test(t)) ? "PASS" : "FAIL", `${items.length} feature(s)`);
        }
      }
      if (errors.length) add("C0", "CAD page has no page error", "gate", "FAIL", errors[0]);
    } finally { await ctx.close(); }
  }

  // S: the simulator runs, plots, takes a fault and replays
  {
    const T = (id) => `[data-testid=${id}]`; const { page, ctx, errors } = await open("/simulate");
    try {
      const absent = []; for (const id of ["sim-run", "sim-trace", "sim-chart", "sim-fault", "sim-replay"]) if (!(await page.$(T(id)))) absent.push(id);
      if (absent.length) add("S1", "Simulator controls", "gate", "FAIL", `contract hooks missing: ${absent.join(", ")}`);
      else {
        const rows = async () => page.$$eval(`${T("sim-trace")} tr`, (r) => r.map(x => x.innerText));
        await page.click(T("sim-run")); await page.waitForTimeout(600); const a = await rows();
        await page.click(T("sim-fault")); await page.click(T("sim-run")); await page.waitForTimeout(600); const b = await rows();
        await page.click(T("sim-replay")); await page.waitForTimeout(600); const c = await rows();
        add("S2", "Simulator run fills a trace", "gate", a.length > 2 ? "PASS" : "FAIL", `${a.length} rows`);
        add("S3", "A fault changes the trace", "gate", b.length > 2 && b.join() !== a.join() ? "PASS" : "FAIL", "");
        add("S4", "Replay reproduces the recorded run", "gate", c.length > 2 && c.join() === b.join() ? "PASS" : "FAIL", "");
      }
      if (errors.length) add("S0", "Simulator page has no page error", "gate", "FAIL", errors[0]);
    } finally { await ctx.close(); }
  }
} finally { if (browser) await browser.close(); server.close(); }
report();

function report() {
  const order = { FAIL: 0, UNVERIFIED: 1, SKIP: 2, PASS: 3 };
  const sha = createHash("sha256").update(readFileSync(SELF)).digest("hex").slice(0, 16);
  console.log(`pap-ui-acceptance ${VERSION}   script sha256 ${sha}`);
  for (const r of [...results].sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id, undefined, { numeric: true })))
    console.log(`${r.status.padEnd(10)} ${r.severity.padEnd(6)} ${r.id.padEnd(22)} ${r.title}${r.detail ? "  ::  " + r.detail : ""}`);
  const gf = results.some(r => r.severity === "gate" && r.status === "FAIL"), gu = results.some(r => r.severity === "gate" && r.status === "UNVERIFIED");
  const c = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
  console.log(`\n${results.length} checks: ${Object.entries(c).map(([k, v]) => `${v} ${k}`).join(", ")}. Verdict: ${gf ? "NOT A WORKING TOOL (a gate failed)" : gu ? "UNVERIFIED" : "ACCEPTED"}`);
  process.exit(gf ? 1 : gu ? 2 : 0);
}
