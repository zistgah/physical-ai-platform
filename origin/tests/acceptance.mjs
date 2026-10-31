#!/usr/bin/env node
/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * pap-acceptance 1.0.0
 * Mechanical acceptance for the Physical AI Platform.
 *
 * © 1993–2026 Abhishek Choudhary. All rights reserved.
 * Licensed under GPL-3.0-only. AyeAI.
 * Names of third-party products and standards are the trademarks of their respective owners.
 *
 * Run from the repository root:  node tests/acceptance.mjs
 * Each check reports PASS, FAIL, SKIP or UNVERIFIED (build guidelines, section 41).
 * Gate checks set the exit code: 1 when a gate FAILS, 2 when no gate fails but one is UNVERIFIED, 0 otherwise.
 * Report checks print and never refuse.
 * Writes only under ./.acceptance, which ignores itself. Nothing outside the invocation folder is touched.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VERSION = "1.0.0";
const SELF = fileURLToPath(import.meta.url);
const NOTICE = [
  `pap-acceptance ${VERSION}`,
  "© 1993–2026 Abhishek Choudhary. All rights reserved.",
  "Licensed under GPL-3.0-only. AyeAI.",
  "Names of third-party products and standards are the trademarks of their respective owners."
].join("\n");

const argv = process.argv.slice(2);
if (argv.includes("--version")) { console.log(NOTICE); process.exit(0); }
if (argv.includes("--help")) {
  console.log(NOTICE + "\n\nUsage: node tests/acceptance.mjs [--json] [--no-mutation] [--no-browser]\n" +
    "  --json         print the full report as JSON after the table\n" +
    "  --no-mutation  skip the mutation stage (its checks report SKIP, never PASS)\n" +
    "  --no-browser   skip the real-browser walk (its check reports SKIP, never PASS)\n" +
    "Results are also written to .acceptance/report.json.");
  process.exit(0);
}
if (argv[0] === "--child-smoke") { await childSmoke(argv[1]); process.exit(0); }

// ───────────────────────────── configuration ─────────────────────────────
const ROOT = process.cwd();
const WORK = join(ROOT, ".acceptance");
const NESTED = process.env.PAP_ACCEPTANCE_NESTED === "1";
const APP = "site/assets/js/app.js";
const C = "site/components/";

// Mutants: a gate is only trusted if removing it makes the repository's own checklist fail.
// When code moves, re-anchor the mutant here; an anchor that no longer matches reports UNVERIFIED.
const MUTANTS = [
  { id: "G1a", gate: "Power-up needs isolation confirmed", file: C + "safety/cockpit-machine.js",
    old: 'if (nextState === "S3_SYSTEM_POWER_UP") {', new: "if (false) {" },
  { id: "G1b", gate: "Compliance rejects evidence in an invalid state", file: C + "compliance/compliance-automation.js",
    old: "if (!VALID_STATES.has(ev.state)) return false;", new: "" },
  { id: "G1c", gate: "Compliance evidence must belong to the project", file: C + "compliance/compliance-automation.js",
    old: "if (!inProject) return false;", new: "" },
  { id: "G1d", gate: "Safety readiness returns NO-GO for unresolved hazards", file: C + "safety/safety-engine.js",
    old: 'if (unresolved.length) return { decision: "NO-GO"', new: 'if (false) return { decision: "NO-GO"' },
  { id: "G1e", gate: "CAD contract rejects a mesh that is not watertight", file: C + "cad/cad-contracts.js",
    old: "return { ok: count.size > 0 && bad.length === 0,", new: "return { ok: true," },
  { id: "G1f", gate: "Cockpit refuses to leave S0 with an unfrozen configuration", file: C + "safety/cockpit-machine.js",
    old: 'if (configuration.status !== "READY") return configuration;', new: "" },
  { id: "G1g", gate: "Prover holds what it cannot prove", file: C + "core/prover.js",
    old: 'return { outcome: "HOLD", reason: `Cannot prove', new: 'return { outcome: "PROVED", reason: `Cannot prove' }
];

// Report-level coverage thresholds for the standards corpus. Tune here; they never set the exit code.
const COVERAGE = {
  exportRegimes: [["Wassenaar", /wassenaar/i], ["US EAR", /export administration regulations|\bEAR\b/], ["EU 2021/821", /2021\/821/], ["India SCOMET", /scomet/i]],
  regulations: [["EU Machinery Regulation 2023/1230", /2023\/1230/], ["EU AI Act 2024/1689", /2024\/1689/]],
  jurisdictions: [["European Union", /\b(EU|CEN|CENELEC|European)\b/], ["United Kingdom", /\b(BSI|BS EN|UK)\b/], ["China", /\bGB\/T\b|\bSAC\b/], ["Japan", /\bJIS\b/],
    ["Brazil", /\bABNT\b|\bNBR\b/], ["South Africa", /\bSANS\b/], ["Kenya", /\bKEBS\b|\bKS EAS\b/], ["Nigeria", /\bSON\b|\bNIS\b/], ["Bangladesh", /\bBSTI\b/], ["African Union / ARSO", /\bARSO\b|\bAfrican\b/]]
};
const EXPECT = { chamfer: 980, fillet: 1000 - 10 * 4 * (4 - Math.PI), draft: frustum(10, 10 - 2 * 10 * Math.tan(5 * Math.PI / 180), 10),
  shellOpen: 1000 - 8 * 8 * 9, shellClosed: 1000 - 8 * 8 * 8, pocket: 1000 - 4 * 4 * 2, union: 1750, userRect: 40 * 30 * 10 };
function frustum(a, b, h) { return h / 3 * (a * a + b * b + a * b); }

// ───────────────────────────── harness ─────────────────────────────
class Unverified extends Error {}
const results = [];
const PASS = (detail = "") => ({ status: "PASS", detail });
const FAIL = (detail) => ({ status: "FAIL", detail });
const UNV = (detail) => ({ status: "UNVERIFIED", detail });
const SKIP = (detail) => ({ status: "SKIP", detail });
async function check(id, title, severity, modules, fn) {
  let r;
  try { r = await fn(); }
  catch (e) {
    r = e instanceof Unverified ? UNV(e.message) : FAIL("threw: " + String(e?.message || e).split("\n")[0]);
  }
  results.push({ id, title, severity, modules, ...r });
}
async function mod(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) throw new Unverified(`module missing: ${rel}`);
  return import(pathToFileURL(p).href);
}
function need(obj, name, where) {
  if (!obj || obj[name] === undefined) throw new Unverified(`API missing: ${where}.${name}`);
  return obj[name];
}
const read = (rel) => existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : null;
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol * Math.abs(b);
const fmt = (n) => Number.isFinite(n) ? (Math.round(n * 100) / 100).toString() : String(n);
function tris(mesh) { const out = []; for (const f of mesh?.faces || []) for (let i = 1; i < f.length - 1; i++) out.push([f[0], f[i], f[i + 1]]); return out; }
function signedVolume(mesh) {
  const V = mesh.vertices; let v = 0;
  for (const [a, b, c] of tris(mesh)) { const A = V[a], B = V[b], Q = V[c];
    v += A.x * (B.y * Q.z - B.z * Q.y) - A.y * (B.x * Q.z - B.z * Q.x) + A.z * (B.x * Q.y - B.y * Q.x); }
  return v / 6;
}
function closedConsistent(mesh) {
  const d = new Map();
  for (const [a, b, c] of tris(mesh)) for (const [p, q] of [[a, b], [b, c], [c, a]]) d.set(p + ">" + q, (d.get(p + ">" + q) || 0) + 1);
  let bad = 0; for (const [k, n] of d) { const [p, q] = k.split(">"); if (n !== 1 || d.get(q + ">" + p) !== 1) bad++; }
  return { ok: d.size > 0 && bad === 0, bad };
}
function stripTags(html) { return String(html || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim(); }
function unescapeHtml(s) { return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"); }
function routesFromApp(src) {
  const i = src.indexOf("const routes = {"); if (i < 0) return null;
  const body = src.slice(i, src.indexOf("};", i));
  return [...body.matchAll(/["']([^"']+)["']\s*:\s*([A-Za-z_$][\w$]*)/g)].map(m => ({ route: m[1], handler: m[2] }));
}
function sha256(p) { return createHash("sha256").update(readFileSync(p)).digest("hex"); }
function ensureWork() { mkdirSync(WORK, { recursive: true }); writeFileSync(join(WORK, ".gitignore"), "*\n"); }

// ───────────────────────────── child: DOM-stub smoke run of the live app ─────────────────────────────
async function childSmoke(specPath) {
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const out = { storedHasPayload: false, loaded: false, loadError: null, routes: {}, sink: [], alerts: [], unhandled: [], projectName: null, serializedKeys: null, importAlerts: [] };
  process.on("unhandledRejection", (e) => out.unhandled.push(String(e?.message || e)));
  process.on("uncaughtException", (e) => out.unhandled.push(String(e?.message || e)));
  const sink = (s) => { if (typeof s === "string") out.sink.push(s); };
  function stub(name = "stub") {
    const store = new Map();
    const fn = function () {};
    return new Proxy(fn, {
      get(_, p) {
        if (p === "then") return undefined;
        if (p === Symbol.toPrimitive) return (hint) => (hint === "number" ? NaN : "");
        if (p === Symbol.iterator) return function* () {};
        if (p === "toString" || p === "valueOf") return () => "";
        if (p === "toJSON") return () => null;
        if (p === "insertAdjacentHTML") return (_pos, html) => sink(html);
        if (store.has(p)) return store.get(p);
        const child = stub(name + "." + String(p)); store.set(p, child); return child;
      },
      set(_, p, v) { if (p === "innerHTML" || p === "outerHTML") sink(v); store.set(p, v); return true; },
      apply() { return stub(name + "()"); },
      construct() { return stub("new " + name); }
    });
  }
  const listeners = {};
  const byId = new Map();
  function element(id) {
    if (byId.has(id)) return byId.get(id);
    const base = stub("#" + id); const ev = {};
    const el = new Proxy(base, {
      get(t, p) { if (p === "addEventListener") return (type, fn) => { (ev[type] ||= []).push(fn); }; if (p === "__events") return ev; return Reflect.get(t, p); },
      set(t, p, v) { return Reflect.set(t, p, v); }
    });
    byId.set(id, el); return el;
  }
  const app = { _html: "", set innerHTML(v) { this._html = String(v); sink(this._html); }, get innerHTML() { return this._html; },
    get innerText() { return stripTags(this._html); }, querySelector: () => stub("app.qs"), querySelectorAll: () => [], addEventListener() {}, style: {}, classList: stub("cl"), dataset: {} };
  const document = {
    querySelector: (sel) => (sel === "#app" ? app : stub("qs:" + sel)),
    querySelectorAll: () => [],
    getElementById: (id) => element(id),
    createElement: (tag) => stub("<" + tag + ">"),
    addEventListener() {}, body: stub("body"), documentElement: stub("html"), title: "", write: sink
  };
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k), clear: () => store.clear(), key: (i) => [...store.keys()][i] ?? null, get length() { return store.size; } };
  const winListeners = {};
  let hash = "";
  const location = {
    get hash() { return hash; },
    set hash(v) { const n = String(v).startsWith("#") ? String(v) : "#" + v; hash = n; setTimeout(() => (winListeners.hashchange || []).forEach(fn => { try { fn({}); } catch (e) { out.unhandled.push(String(e?.message || e)); } }), 0); },
    href: "http://localhost/index.html", pathname: "/index.html", reload() {}
  };
  class FileReader { readAsText(file) { this.result = file.__text; setTimeout(() => this.onload && this.onload({ target: this }), 0); } }
  Object.assign(globalThis, {
    document, localStorage, location, FileReader,
    alert: (m) => out.alerts.push(String(m)), confirm: () => true, prompt: () => "Acceptance project",
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, open: () => null
  });
  Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} }, userAgent: "pap-acceptance" }, configurable: true });
  globalThis.window = globalThis;
  globalThis.addEventListener = (type, fn) => { (winListeners[type] ||= []).push(fn); };
  globalThis.removeEventListener = () => {};
  const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));
  try { await import(pathToFileURL(join(spec.root, spec.app)).href); out.loaded = true; }
  catch (e) { out.loadError = `${e?.name || "Error"}: ${String(e?.message || e).split("\n")[0]}`; }
  await tick(60);
  async function render(route) {
    const before = out.unhandled.length; app._html = "";
    let error = null;
    try { hash = "#" + route; for (const fn of winListeners.hashchange || []) fn({}); } catch (e) { error = `${e?.name || "Error"}: ${String(e?.message || e).split("\n")[0]}`; }
    await tick(25);
    if (!error && out.unhandled.length > before) error = out.unhandled.slice(before).join(" | ");
    return { html: app._html, error };
  }
  if (out.loaded) {
    if (spec.scenario === "import") {
      try {
        const robot = await import(pathToFileURL(join(spec.root, "site/components/simulation/canonical-mobile-robot.js")).href);
        const demo = robot.createCanonicalMobileRobotProject();
        const data = demo.kernel.serializeProject(demo.project.id);
        const list = data.entities || data.graph?.entities || [];
        const target = list.find(e => e.type === "Component") || list[0];
        target.name = spec.payload;
        await render("/start");
        const input = byId.get("btn-import");
        const handlers = input?.__events?.change || [];
        if (!handlers.length) out.importAlerts.push("NO_IMPORT_CONTROL");
        const alertsBefore = out.alerts.length;
        for (const h of handlers) h({ target: { files: [{ name: "poisoned.pap.json", __text: JSON.stringify(data) }] } });
        await tick(80);
        out.importAlerts.push(...out.alerts.slice(alertsBefore));
      } catch (e) { out.importAlerts.push("SCENARIO_ERROR " + String(e?.message || e)); }
    }
    for (const r of spec.routes) out.routes[r] = await render(r);
    if (spec.payload) out.storedHasPayload = (localStorage.getItem("pap_project") || "").includes(spec.payload);
    try { const raw = localStorage.getItem("pap_project"); if (raw) { const d = JSON.parse(raw); out.serializedKeys = Object.keys(d);
      const ents = d.entities || d.graph?.entities || []; const pid = d.project?.id || d.projectId || d.rootId;
      out.projectName = (ents.find(e => e.type === "Project" && (!pid || e.id === pid)) || ents.find(e => e.type === "Project"))?.name || null; } } catch {}
  }
  writeFileSync(spec.out, JSON.stringify(out));
}

function smoke(scenario, routes, payload = null, label = scenario) {
  ensureWork();
  const specPath = join(WORK, `smoke-${label}.json`), outPath = join(WORK, `smoke-${label}.out.json`);
  writeFileSync(specPath, JSON.stringify({ root: ROOT, app: APP, scenario, routes, payload, out: outPath }));
  if (existsSync(outPath)) rmSync(outPath);
  const r = spawnSync(process.execPath, [SELF, "--child-smoke", specPath], { cwd: ROOT, encoding: "utf8", timeout: 120000 });
  if (!existsSync(outPath)) throw new Unverified(`smoke run produced no result (${(r.stderr || r.error || "").toString().split("\n")[0]})`);
  return JSON.parse(readFileSync(outPath, "utf8"));
}

// ───────────────────────────── main ─────────────────────────────
ensureWork();
const appSrc = read(APP) || "";
const routeTable = routesFromApp(appSrc) || [];
const routes = [...new Set(routeTable.map(r => r.route))];
let checklist = null;

// S0: the repository's own checklist
await check("S0", "Repository checklist passes", "gate", ["regression-checklist.mjs"], () => {
  const runner = existsSync(join(ROOT, "tools/regression-checklist.mjs")) ? "tools/regression-checklist.mjs" : (existsSync(join(ROOT, "tests/run.mjs")) ? "tests/run.mjs" : null);
  if (!runner) throw new Unverified("no checklist runner found");
  const r = spawnSync(process.execPath, [runner], { cwd: ROOT, encoding: "utf8", timeout: 600000, env: { ...process.env, PAP_ACCEPTANCE_NESTED: "1" } });
  checklist = (r.stdout || "") + (r.stderr || "");
  const suites = (checklist.match(/^PASS SUITE /gm) || []).length, failed = (checklist.match(/^FAIL SUITE /gm) || []).length;
  return r.status === 0 ? PASS(`${runner}: ${suites} suites pass`) : FAIL(`${runner} exit ${r.status}; ${failed} suites fail`);
});

// A: the site loads
await check("A1", "app.js parses as an ES module", "gate", ["app.js"], () => {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: appSrc, encoding: "utf8" });
  return r.status === 0 ? PASS() : FAIL((r.stderr || "").split("\n").find(l => /Error/.test(l)) || "syntax error");
});
await check("A3", "Every route handler is defined", "gate", ["app.js"], () => {
  if (!routeTable.length) return FAIL("no routes table found in app.js");
  const defined = new Set([...appSrc.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]).concat([...appSrc.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/g)].map(m => m[1])));
  const missing = routeTable.filter(r => !defined.has(r.handler)).map(r => `${r.route} -> ${r.handler}`);
  const dup = routeTable.map(r => r.route).filter((r, i, a) => a.indexOf(r) !== i);
  if (missing.length) return FAIL(`undefined handlers: ${missing.join(", ")}`);
  return dup.length ? PASS(`note: duplicate route keys ${[...new Set(dup)].join(", ")}`) : PASS(`${routeTable.length} routes`);
});
let walk = null;
await check("A2", "App module evaluates without error", "gate", ["app.js"], () => {
  walk = smoke("walk", routes);
  return walk.loaded ? PASS() : FAIL(walk.loadError || "module did not load");
});
await check("A4", "Every route renders without error and with content", "gate", ["app.js"], () => {
  if (!walk?.loaded) return FAIL("app did not load, so no route can render");
  const bad = [];
  for (const r of routes) { const x = walk.routes[r]; if (!x) { bad.push(`${r}: not rendered`); continue; }
    if (x.error) bad.push(`${r}: ${x.error}`); else if (!stripTags(x.html)) bad.push(`${r}: empty`); }
  return bad.length ? FAIL(bad.join("; ")) : PASS(`${routes.length} routes render`);
});
await check("A6", "CI runs the checklist and this acceptance script before deploying", "gate", [], () => {
  const dir = join(ROOT, ".github/workflows"); if (!existsSync(dir)) return FAIL("no workflows");
  const text = readdirSync(dir).map(f => readFileSync(join(dir, f), "utf8")).join("\n");
  const hasChecklist = /regression-checklist\.mjs|tests\/run\.mjs/.test(text), hasAcceptance = /acceptance\.mjs/.test(text);
  return hasChecklist && hasAcceptance ? PASS() : FAIL(`workflow runs: ${(text.match(/run:\s*(.+)/g) || []).map(s => s.replace(/run:\s*/, "")).join(" | ") || "nothing"}`);
});

// B: import and rendering are safe
const PAYLOADS = [
  { id: "space-before-equals", payload: '<img src=x onerror =window.__pwned=1>', needle: "<img src=x onerror =" },
  { id: "svg-animate", payload: '<svg><animate onbegin=window.__pwned=1 attributeName=x dur=1s>', needle: "<svg><animate onbegin" },
  { id: "plain-onerror", payload: '<img src=x onerror=window.__pwned=1>', needle: "<img src=x onerror=" }
];
await check("B1", "A clean project file imports and is shown", "gate", ["app.js", "persistence-privacy.js"], () => {
  const name = "Acceptance clean import 7f3a";
  const run = smoke("import", routes, name, "import-clean");
  if (!run.loaded) return UNV("blocked by A2: the app does not load, so the import path cannot run");
  if (run.importAlerts.includes("NO_IMPORT_CONTROL")) return FAIL("no import control found on /start");
  const scenarioError = run.importAlerts.find(a => a.startsWith("SCENARIO_ERROR")); if (scenarioError) return UNV(scenarioError);
  if (!run.storedHasPayload) return FAIL(`a clean import did not take effect (${run.importAlerts.join(" / ") || "no message"})`);
  return run.sink.some(h => h.includes(name)) ? PASS() : FAIL("imported, but the project is not shown on any page");
});
await check("B2", "Imported markup never reaches the page unescaped", "gate", ["app.js", "persistence-privacy.js"], () => {
  const findings = [], unproven = [];
  for (const p of PAYLOADS) {
    const run = smoke("import", routes, p.payload, "import-" + p.id);
    if (!run.loaded) return UNV("blocked by A2: the app does not load, so the import path cannot run");
    if (run.importAlerts.includes("NO_IMPORT_CONTROL")) return UNV("no import control found on /start");
    const scenarioError = run.importAlerts.find(a => a.startsWith("SCENARIO_ERROR")); if (scenarioError) return UNV(scenarioError);
    const raw = [...new Set(run.sink.filter(h => h.toLowerCase().includes(p.needle.toLowerCase())).length ? Object.entries(run.routes).filter(([, x]) => (x.html || "").toLowerCase().includes(p.needle.toLowerCase())).map(([r]) => r) : [])];
    const anyRaw = run.sink.some(h => h.toLowerCase().includes(p.needle.toLowerCase()));
    if (anyRaw) { findings.push(`${p.id}: rendered raw on ${raw.length ? raw.join(", ") : "a sub-element"} (import said: ${run.importAlerts.join(" / ") || "nothing"})`); continue; }
    const held = !run.storedHasPayload && run.importAlerts.length > 0;
    if (!run.storedHasPayload && !held) unproven.push(`${p.id}: import neither took effect nor was held (${run.importAlerts.join(" / ") || "no message"})`);
  }
  if (findings.length) return FAIL(findings.join("; "));
  return unproven.length ? UNV(unproven.join("; ")) : PASS("every payload was escaped or held");
});
await check("B3", "index.html sets a Content-Security-Policy without unsafe-inline scripts", "gate", ["index.html"], () => {
  const html = read("site/index.html") || "";
  const m = html.match(/http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']+)["']/i);
  if (!m) return FAIL("no CSP meta tag");
  return /script-src[^;]*'unsafe-inline'/.test(m[1]) ? FAIL("script-src allows 'unsafe-inline'") : PASS(m[1]);
});

// C: persistence is real and explicit
await check("C1", "IndexedDB adapter persists across adapter instances", "gate", ["persistence-privacy.js"], async () => {
  const m = await mod(C + "core/persistence-privacy.js"); const Adapter = need(m, "IndexedDbAdapter", "persistence-privacy");
  const fake = installFakeIndexedDB();
  try {
    const a = new Adapter(); await a.save("acceptance-key", { v: 42 });
    const b = new Adapter(); const r = await b.load("acceptance-key");
    const value = r?.value ?? r;
    if (value?.v === 42) return fake.opens > 0 ? PASS(`indexedDB.open called ${fake.opens} times`) : FAIL("value survived without touching indexedDB");
    return FAIL(`a new adapter instance cannot load what another saved (${JSON.stringify(r).slice(0, 80)}); indexedDB.open calls: ${fake.opens}`);
  } catch (e) { throw new Unverified("adapter uses IndexedDB in a way this harness does not emulate: " + String(e?.message || e)); }
  finally { fake.remove(); }
});
await check("C2", "GitHub adapter never reports success without a request", "gate", ["persistence-privacy.js"], async () => {
  const m = await mod(C + "core/persistence-privacy.js"); const GH = need(m, "GitHubAdapter", "persistence-privacy");
  const calls = []; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(String(url)); return new Response(JSON.stringify({ sha: "0".repeat(40), content: { sha: "0".repeat(40) } }), { status: 201, headers: { "content-type": "application/json" } }); };
  try {
    const g = new GH({ token: "acceptance-token", repo: "acceptance/repo" });
    const r = await g.sync({ id: "p", name: "Acceptance", entities: [], relations: [] });
    const outcome = String(r?.outcome || "");
    const claimsSuccess = /SYNC|OK|PUSH|PUBLISH|SAVED/i.test(outcome) && !/HOLD|UNAVAILABLE|FAIL|ERROR/i.test(outcome);
    const unconfigured = await new GH().sync({ id: "p" });
    if (!/HOLD|UNAVAILABLE/i.test(String(unconfigured?.outcome))) return FAIL("unconfigured adapter does not HOLD");
    if (claimsSuccess && calls.length === 0) return FAIL(`reported ${outcome} with zero network requests`);
    return PASS(calls.length ? `${calls.length} request(s) made` : `honest outcome: ${outcome}`);
  } finally { globalThis.fetch = realFetch; }
});
await check("C3", "'What leaves my machine?' lists the fields that would actually leave", "gate", ["app.js", "persistence-privacy.js"], () => {
  if (!walk?.loaded) return UNV("blocked by A2: the app does not load");
  const r = walk.routes["/privacy"]; if (!r) return FAIL("no /privacy route");
  if (r.error) return FAIL(r.error);
  const keys = walk.serializedKeys || []; if (!keys.length) throw new Unverified("could not read the serialized project");
  const text = unescapeHtml(r.html); const missing = keys.filter(k => !new RegExp(`["'\\s]${k}["'\\s:]`).test(text));
  return missing.length ? FAIL(`payload keys not disclosed: ${missing.join(", ")}`) : PASS(`${keys.length} payload keys disclosed`);
});
await check("C4", "Save, Sync and Publish are explicit controls in the UI", "gate", ["app.js"], () => {
  if (!walk?.loaded) return UNV("blocked by A2: the app does not load");
  const all = walk.sink.join("\n");
  const has = (w) => new RegExp(`<button[^>]*>[^<]*${w}`, "i").test(all);
  const missing = ["Save", "Sync", "Publish"].filter(w => !has(w));
  return missing.length ? FAIL(`no button for: ${missing.join(", ")}`) : PASS();
});

// D: simulation is not verification; authority is checked
await check("D1", "Software-only loops are never labelled HIL", "gate", ["hil-loop.js", "hil-realtime.js"], async () => {
  const issues = [];
  if (existsSync(join(ROOT, C + "simulation/hil-loop.js"))) {
    const { runLoop } = await mod(C + "simulation/hil-loop.js");
    const r = runLoop({ plant: { x0: 0, step: (x, u, dt) => x + dt * (u - x) }, controller: (x) => 1 - x, steps: 3, dt: 0.1, deadline: 1 });
    if (r?.method === "HIL") issues.push("hil-loop labels a JavaScript plant HIL");
  }
  if (existsSync(join(ROOT, C + "simulation/hil-realtime.js"))) {
    const { HilRealtime } = await mod(C + "simulation/hil-realtime.js");
    const h = new HilRealtime(); h.bind({ id: "js-object", x0: 0, step: (x, u) => x + u });
    const r = h.run({ steps: 2, dt: 0.01, deadlineMs: 1000, controller: () => 0 });
    if (r?.method === "HIL") issues.push("hil-realtime accepts a plain JavaScript object as hardware");
  }
  return issues.length ? FAIL(issues.join("; ")) : PASS();
});
await check("D2", "Compliance does not accept unpromoted simulation evidence", "gate", ["compliance-automation.js"], async () => {
  const k = await kernelWithProject(); const { std, ca } = await adoptStandard(k);
  for (const need of std.requiredEvidence) {
    const ev = k.kernel.upsert({ id: "ev_" + need, type: "Evidence", name: "simulation run", state: "EXECUTED", method: "SIMULATION", provenance: { origin: "acceptance" } });
    k.kernel.link(k.project.id, "CONTAINS", ev.id); ca.bind(std.id, ev.id, need);
  }
  const r = ca.run(k.project.id); return r.outcome === "PASS" ? FAIL(`${std.name} cleared by simulation runs alone`) : PASS(r.outcome);
});
await check("D3", "A waiver needs a registered role, not any string", "gate", ["compliance-automation.js", "roles.js"], async () => {
  const k = await kernelWithProject(); const { std, ca } = await adoptStandard(k);
  for (const need of std.requiredEvidence) ca.waive(std.id, need, { reason: "x", role: "x" });
  const r = ca.run(k.project.id); return r.outcome === "PASS" ? FAIL("every requirement waived with role 'x' and the standard passes") : PASS(r.outcome);
});
await check("D4", "A standards binding needs real evidence", "gate", ["standards-binding.js"], async () => {
  const m = await mod(C + "compliance/standards-binding.js"); const SB = need(m, "StandardsBinding", "standards-binding");
  const k = await kernelWithProject(); const s = k.kernel.upsert({ id: "std-acc", type: "Standard", name: "ISO 10218", provenance: { origin: "acceptance" } });
  const sb = new SB(k.kernel); const b = sb.accept(k.project.id, s.id, { role: "anyone" });
  if (b?.outcome === "HOLD") return PASS("acceptance itself holds an unregistered role");
  sb.attachEvidence(b.id, k.project.id);
  const g = sb.gate(b.id); return g.outcome === "PASS" ? FAIL("gate passes with the project entity attached as evidence") : PASS(g.outcome);
});
await check("D5", "Prover is sound and handles <=", "gate", ["prover.js"], async () => {
  const { prove } = await mod(C + "core/prover.js"); const issues = [];
  if (prove([{ left: "x", op: ">=", right: 5 }], { left: "x", op: ">", right: 5 }).outcome === "PROVED") issues.push("proves x > 5 from x >= 5");
  if (prove([{ left: "x", op: "<=", right: 3 }], { left: "x", op: "<=", right: 3 }).outcome !== "PROVED") issues.push("cannot prove x <= 3 from x <= 3");
  if (prove([{ left: "x", op: ">=", right: 5 }], { left: "x", op: ">=", right: 3 }).outcome !== "PROVED") issues.push("cannot prove x >= 3 from x >= 5");
  return issues.length ? FAIL(issues.join("; ")) : PASS();
});
await check("D6", "ERP will not issue the same order twice", "gate", ["erp.js"], async () => {
  const m = await mod(C + "core/erp.js"); const ERP = need(m, "ERP", "erp"); const k = await kernelWithProject(); const e = new ERP(k.kernel);
  e.stock(k.project.id, { id: "m1", sku: "Al", qty: 10, cost: 2 }); const o = e.order(k.project.id, { id: "o1", customerId: "c", lines: [{ materialId: "m1", qty: 4 }] });
  e.issue(o.id); const second = e.issue(o.id); const left = k.kernel.store.get("m1").qty;
  const issues = []; if (left !== 6) issues.push(`stock ${left} after a repeated issue (expected 6)`);
  if (k.kernel.store.get("o1")?.type === "Customer") issues.push("an order is stored as type Customer");
  return issues.length ? FAIL(issues.join("; ")) : PASS(second?.outcome || "");
});
await check("D7", "Evidence in a rejected state does not clear compliance", "gate", ["compliance-automation.js"], async () => {
  const k = await kernelWithProject(); const { std, ca } = await adoptStandard(k);
  for (const need of std.requiredEvidence) {
    const ev = k.kernel.upsert({ id: "rej_" + need, type: "Evidence", name: "rejected", state: "REJECTED", method: "PHYSICAL_TEST", provenance: { origin: "acceptance" } });
    k.kernel.link(k.project.id, "CONTAINS", ev.id); ca.bind(std.id, ev.id, need);
  }
  const r = ca.run(k.project.id); return r.outcome === "PASS" ? FAIL("rejected evidence cleared the standard") : PASS(r.outcome);
});

// E: CAD is numerically correct
async function cadEnv() {
  const k = await kernelWithProject(); const m = await mod(C + "cad/geometry-kernel.js"); const GK = need(m, "GeometryKernel", "geometry-kernel");
  const cad = new GK(k.kernel); const P = k.project.id;
  const square = (id, s = 10, x0 = 0, y0 = 0, cw = false) => { let pts = [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, { x: x0 + s, y: y0 + s }, { x: x0, y: y0 + s }]; if (cw) pts = pts.reverse(); return cad.sketch(P, { id, name: id, points: pts }); };
  return { k, cad, P, square };
}
const solids = [];
function solidResult(label, r, expected, tol) {
  if (!r || r.outcome === "HOLD" || !r.mesh) return FAIL(`${label} returned HOLD: ${r?.reason || r?.reasons || "no mesh"}`);
  solids.push({ label, mesh: r.mesh });
  const v = signedVolume(r.mesh); const ok = Array.isArray(expected) ? expected.some(e => near(v, e, tol)) : near(v, expected, tol);
  return ok ? PASS(`${fmt(v)} mm³`) : FAIL(`${fmt(v)} mm³, expected ${Array.isArray(expected) ? expected.map(fmt).join(" or ") : fmt(expected)}`);
}
await check("E1", "Chamfer 1 mm on a 10 mm cube", "gate", ["cad-features.js", "geometry-kernel.js"], async () => { const { cad, P, square } = await cadEnv(); const s = square("s"); return solidResult("chamfer", need(cad, "chamfer", "GeometryKernel").call(cad, P, s.id, 1, 10, { id: "e1" }), EXPECT.chamfer, 0.005); });
await check("E2", "Fillet r2 on the vertical edges of a 10 mm cube", "gate", ["cad-features.js", "geometry-kernel.js"], async () => { const { cad, P, square } = await cadEnv(); const s = square("s"); return solidResult("fillet", need(cad, "fillet", "GeometryKernel").call(cad, P, s.id, 2, 10, { id: "e2" }), EXPECT.fillet, 0.01); });
await check("E3", "Draft 5 degrees on a 10 mm cube", "gate", ["geometry-kernel.js"], async () => { const { cad, P, square } = await cadEnv(); const s = square("s"); return solidResult("draft", need(cad, "draft", "GeometryKernel").call(cad, P, s.id, 10, 5, { id: "e3" }), EXPECT.draft, 0.01); });
await check("E4", "Shell 1 mm keeps a floor", "gate", ["geometry-kernel.js"], async () => { const { cad, P, square } = await cadEnv(); const b = cad.extrude(P, square("s").id, 10, { id: "b" }); return solidResult("shell", need(cad, "shell", "GeometryKernel").call(cad, P, b.id, 1, { id: "e4" }), [EXPECT.shellOpen, EXPECT.shellClosed], 0.005); });
await check("E5", "Pocket 4x4x2 subtracts only its own volume", "gate", ["geometry-kernel.js", "cad-features.js"], async () => { const { cad, P, square } = await cadEnv(); const b = cad.extrude(P, square("s").id, 10, { id: "b" }); const cs = cad.sketch(P, { id: "c", name: "c", points: [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7 }] }); const cut = cad.extrude(P, cs.id, 2, { id: "cut" }); return solidResult("pocket", cad.boolean(P, b.id, cut.id, "SUBTRACT", { id: "e5" }), EXPECT.pocket, 0.005); });
await check("E6", "Union of two overlapping cubes", "gate", ["geometry-kernel.js"], async () => { const { cad, P, square } = await cadEnv(); const a = cad.extrude(P, square("a").id, 10, { id: "a3" }); const b = cad.extrude(P, square("b", 10, 5, 5).id, 10, { id: "b3" }); return solidResult("union", cad.boolean(P, a.id, b.id, "UNION", { id: "e6" }), EXPECT.union, 0.005); });
await check("E7", "Solids are outward-facing (positive signed volume)", "gate", ["geometry-kernel.js"], async () => {
  const { cad, P, square } = await cadEnv(); const issues = [];
  const cw = cad.extrude(P, square("s_cw", 10, 0, 0, true).id, 10, { id: "x_cw" }); if (cw?.mesh && signedVolume(cw.mesh) <= 0) issues.push(`clockwise extrude ${fmt(signedVolume(cw.mesh))}`);
  const ring = cad.sketch(P, { id: "ring", name: "ring", points: [{ x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 10 }] });
  const rv = cad.revolve(P, ring.id, 360, { id: "rv" }); if (rv?.mesh && signedVolume(rv.mesh) <= 0) issues.push(`revolve ${fmt(signedVolume(rv.mesh))}`);
  if (cw?.mesh) solids.push({ label: "clockwise extrude", mesh: cw.mesh }); if (rv?.mesh) solids.push({ label: "revolve", mesh: rv.mesh });
  return issues.length ? FAIL("inside-out: " + issues.join("; ")) : PASS();
});
await check("E8", "Every solid above is closed with consistent winding", "gate", ["geometry-kernel.js", "cad-features.js"], () => {
  if (!solids.length) return FAIL("no solids were produced");
  const bad = solids.map(s => ({ s, c: closedConsistent(s.mesh) })).filter(x => !x.c.ok).map(x => `${x.s.label} (${x.c.bad} bad edges)`);
  return bad.length ? FAIL(bad.join("; ")) : PASS(`${solids.length} solids`);
});
await check("E9", "A failed operation leaves no solid behind", "gate", ["geometry-kernel.js"], async () => {
  const { k, cad, P } = await cadEnv();
  const L = cad.sketch(P, { id: "L", name: "L", points: [{ x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }, { x: 10, y: 5 }] });
  const ls = cad.extrude(P, L.id, 10, { id: "Ls" }); const r = cad.shell(P, ls.id, 1, { id: "e9" });
  const inGraph = new Set(k.kernel.getProjectGraph(P).entities.map(e => e.id));
  const orphans = k.kernel.store.all("Solid").filter(s => !inGraph.has(s.id)).map(s => s.id);
  if (r?.outcome === "HOLD" && k.kernel.store.get("e9")) return FAIL(`HOLD but solid e9 is in the store (orphans: ${orphans.join(", ")})`);
  if (r?.mesh && !closedConsistent(r.mesh).ok) return FAIL("shell of an L-section produced an open mesh");
  return orphans.length ? FAIL(`orphan solids: ${orphans.join(", ")}`) : PASS(r?.outcome === "HOLD" ? "HOLD with nothing left behind" : "valid shell");
});
await check("E10", "Interference is geometric, not bounding-box overlap", "gate", ["cad-features.js", "geometry-kernel.js"], async () => {
  const { cad, P } = await cadEnv();
  const L = cad.sketch(P, { id: "L2", name: "L", points: [{ x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }, { x: 10, y: 5 }] });
  const ls = cad.extrude(P, L.id, 10, { id: "L2s" });
  const nb = cad.extrude(P, cad.sketch(P, { id: "nb", name: "nb", points: [{ x: 12, y: 6 }, { x: 18, y: 6 }, { x: 18, y: 9 }, { x: 12, y: 9 }] }).id, 10, { id: "nbs" });
  const ob = cad.extrude(P, cad.sketch(P, { id: "ob", name: "ob", points: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }] }).id, 10, { id: "obs" });
  const clear = need(cad, "assembly", "GeometryKernel").call(cad, P, { id: "as1", placements: [{ solidId: ls.id }, { solidId: nb.id }] });
  const clash = cad.assembly(P, { id: "as2", placements: [{ solidId: ls.id }, { solidId: ob.id }] });
  const issues = []; if (clear.interference?.[0]?.interferes !== false) issues.push("block sitting in the notch reported as interfering");
  if (clash.interference?.[0]?.interferes !== true) issues.push("overlapping solids not reported");
  return issues.length ? FAIL(issues.join("; ")) : PASS();
});
await check("E11", "STEP export opens in OpenCascade with the same volume", "gate", ["cad-features.js", "geometry-kernel.js"], async () => {
  const py = spawnSync("python3", ["-c", "import OCP"], { encoding: "utf8" });
  if (py.status !== 0) throw new Unverified("OpenCascade (python3 module OCP) is not available on this machine");
  const { cad, P, square } = await cadEnv(); const b = cad.extrude(P, square("s").id, 10, { id: "stepbox" });
  const st = need(cad, "step", "GeometryKernel").call(cad, b.id); if (st?.outcome === "HOLD" || !st?.step) return FAIL("export returned HOLD");
  ensureWork(); writeFileSync(join(WORK, "box.stp"), st.step);
  writeFileSync(join(WORK, "occt_check.py"), [
    "import json, sys", "from OCP.STEPControl import STEPControl_Reader", "from OCP.IFSelect import IFSelect_RetDone",
    "from OCP.BRepCheck import BRepCheck_Analyzer", "from OCP.GProp import GProp_GProps", "from OCP.BRepGProp import BRepGProp",
    "r = STEPControl_Reader(); st = r.ReadFile(sys.argv[1]); out = {'read': st == IFSelect_RetDone}",
    "if out['read']:", "    out['roots'] = r.NbRootsForTransfer(); r.TransferRoots(); s = r.OneShape(); out['null'] = s.IsNull()",
    "    if not s.IsNull():", "        p = GProp_GProps(); BRepGProp.VolumeProperties_s(s, p); out['valid'] = BRepCheck_Analyzer(s).IsValid(); out['volume'] = p.Mass()",
    "print(json.dumps(out))"].join("\n"));
  const r = spawnSync("python3", [join(WORK, "occt_check.py"), join(WORK, "box.stp")], { encoding: "utf8" });
  const line = (r.stdout || "").trim().split("\n").filter(l => l.startsWith("{")).pop(); if (!line) return FAIL("OpenCascade check produced no result");
  const o = JSON.parse(line);
  if (!o.read) return FAIL("OpenCascade cannot read the file"); if (o.null) return FAIL(`OpenCascade transferred no shape (roots ${o.roots})`);
  return o.valid && near(o.volume, 1000, 0.005) ? PASS(`volume ${fmt(o.volume)}`) : FAIL(`valid ${o.valid}, volume ${fmt(o.volume)}`);
});
await check("E12", "NURBS extrude is a closed solid", "gate", ["nurbs.js"], async () => {
  const m = await mod(C + "cad/nurbs.js"); const ne = need(m, "nurbsExtrude", "nurbs");
  const r = ne([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], [1, 1, 1, 1], [0, 0, 0, 0.5, 1, 1, 1], 2, 5, 12);
  if (!r?.mesh) return FAIL(r?.reason || "no mesh");
  const c = closedConsistent(r.mesh); const v1 = signedVolume(r.mesh);
  const v2 = signedVolume({ vertices: r.mesh.vertices.map(p => ({ ...p, x: p.x + 100 })), faces: r.mesh.faces });
  if (!c.ok) return FAIL(`open mesh (${c.bad} bad edges); volume moves ${fmt(v1)} -> ${fmt(v2)} when translated`);
  return near(v2, v1, 1e-6) && v1 > 0 ? PASS(`${fmt(v1)} mm³`) : FAIL(`volume not translation-invariant: ${fmt(v1)} -> ${fmt(v2)}`);
});
await check("E13", "CAD workbench builds the profile the user draws", "gate", ["cad-workbench.js"], async () => {
  const { k, cad, P } = await cadEnv(); const m = await mod(C + "cad/cad-workbench.js"); const cs = need(m, "createCadSession", "cad-workbench");
  const s = cs(k.kernel, P); for (const [x, y] of [[0, 0], [40, 0], [40, 30], [0, 30]]) s.addPoint(String(x), String(y));
  if (s.state?.height !== undefined) s.state.height = 10;
  return solidResult("workbench rectangle", s.extrude(cad), EXPECT.userRect, 0.005);
});

// F: safety
async function safetyEnv() { const k = await kernelWithProject(); const m = await mod(C + "safety/safety-engine.js"); return { k, se: new (need(m, "SafetyEngine", "safety-engine"))(k.kernel) }; }
await check("F1", "No hazard log is not GO", "gate", ["safety-engine.js"], async () => { const { k, se } = await safetyEnv(); const r = se.evaluateReadiness(k.project.id); return r.decision === "GO" ? FAIL("GO with zero hazards recorded") : PASS(r.decision); });
await check("F2", "Unfrozen configuration is not GO", "gate", ["safety-engine.js"], async () => {
  const { k, se } = await safetyEnv(); const K = k.kernel, P = k.project.id;
  K.upsert({ id: "hz", type: "Hazard", name: "pinch", status: "CONTROLLED", provenance: { origin: "acceptance" } }); K.link(P, "CONTAINS", "hz");
  K.upsert({ id: "cfg", type: "Configuration", name: "cfg", status: "DRAFT", provenance: { origin: "acceptance" } }); K.link(P, "CONTAINS", "cfg");
  const r = se.evaluateReadiness(P); return r.decision === "GO" ? FAIL("GO with the configuration in DRAFT") : PASS(r.decision);
});
async function cockpit(initialState) {
  const k = await kernelWithProject(); const m = await mod(C + "safety/cockpit-machine.js"); const CM = need(m, "CockpitMachine", "cockpit-machine");
  k.kernel.upsert({ id: "cfg-f", type: "Configuration", name: "cfg", status: "FROZEN", fingerprint: "acceptance", provenance: { origin: "acceptance" } }); k.kernel.link(k.project.id, "CONTAINS", "cfg-f");
  return new CM(k.kernel, k.project.id, { configurationId: "cfg-f", ...(initialState ? { initialState } : {}) });
}
await check("F3", "Power-up needs an explicit isolation confirmation", "gate", ["cockpit-machine.js"], async () => {
  const c = await cockpit(); c.start();
  for (const s of ["S1_CONFIGURATION_VERIFIED", "S2_POWER_ISOLATED_CHECK", "S3_SYSTEM_POWER_UP"]) {
    try { c.advance(s); } catch (e) { if (/unknown|invalid/i.test(String(e?.message))) throw new Unverified("cockpit states were renamed: " + e.message); } }
  return c.current() === "S3_SYSTEM_POWER_UP" ? FAIL("reached S3 without anyone confirming isolation") : PASS(`stopped at ${c.current()}`);
});
await check("F4", "Abort reaches a safe state from every operating state without a role", "gate", ["cockpit-machine.js"], async () => {
  const states = ["S1_CONFIGURATION_VERIFIED", "S3_SYSTEM_POWER_UP", "S5_CONTROL_AUTHORITY_VERIFIED", "S7_CONTROLLED_OPERATION", "S8_FULL_OPERATION"]; const bad = [];
  for (const s of states) { let c; try { c = await cockpit(s); } catch (e) { if (/invalid|unknown/i.test(String(e?.message))) throw new Unverified("cockpit states were renamed: " + e.message); throw e; }
    c.abort("acceptance"); if (!/SAFE/.test(c.current())) bad.push(`${s} -> ${c.current()}`); }
  return bad.length ? FAIL(bad.join("; ")) : PASS();
});
await check("F5", "Shutdown authority is a registered role", "report", ["cockpit-machine.js"], async () => {
  const c = await cockpit("S7_CONTROLLED_OPERATION"); c.shutdownRole = "x"; let r; try { r = c.advance("S9_SHUTDOWN"); } catch (e) { return PASS("refused: " + e.message); }
  return c.current() === "S9_SHUTDOWN" ? FAIL("the string 'x' was accepted as an operator role") : PASS(r?.reason || c.current());
});

// G: tests bite
await check("G2", "The test runner reports PASS, FAIL, SKIP and UNVERIFIED", "gate", ["regression-checklist.mjs"], () => {
  const t = (read("tools/regression-checklist.mjs") || "") + (read("tests/run.mjs") || "");
  return /UNVERIFIED/.test(t) && /SKIP/.test(t) ? PASS() : FAIL("the checklist knows only PASS and FAIL");
});
await check("G3", "No tautological tests remain", "gate", ["test-components.mjs"], () => {
  const t = read("tools/test-components.mjs") || ""; const issues = [];
  if (/u1\s*=\s*"m\/s"[\s\S]{0,80}u2\s*=\s*"rad\/s"/.test(t)) issues.push("units test compares two string literals");
  if (/const m=r\.manifest\(\);eq\(r\.verify\(m\)/.test(t.replace(/\s+/g, ""))) issues.push("replay test verifies a manifest against itself");
  return issues.length ? FAIL(issues.join("; ")) : PASS();
});
if (NESTED || argv.includes("--no-mutation")) {
  for (const m of MUTANTS) results.push({ id: m.id, title: `Mutant: ${m.gate}`, severity: "gate", modules: [m.file.split("/").pop()], ...SKIP(NESTED ? "nested run" : "--no-mutation") });
} else {
  for (const m of MUTANTS) {
    await check(m.id, `Removing the gate fails the checklist: ${m.gate}`, "gate", [m.file.split("/").pop()], () => {
      const src = read(m.file); if (src === null) throw new Unverified(`file missing: ${m.file}`);
      const n = src.split(m.old).length - 1; if (n !== 1) throw new Unverified(`anchor matches ${n} times; re-anchor this mutant`);
      const dir = join(WORK, "mut", m.id); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
      for (const e of readdirSync(ROOT)) { if ([".acceptance", ".git", "node_modules"].includes(e)) continue; cpSync(join(ROOT, e), join(dir, e), { recursive: true }); }
      writeFileSync(join(dir, m.file), src.replace(m.old, m.new));
      const runner = existsSync(join(dir, "tools/regression-checklist.mjs")) ? "tools/regression-checklist.mjs" : "tests/run.mjs";
      const r = spawnSync(process.execPath, [runner], { cwd: dir, encoding: "utf8", timeout: 600000, env: { ...process.env, PAP_ACCEPTANCE_NESTED: "1" } });
      rmSync(dir, { recursive: true, force: true });
      const caught = (r.stdout || "").split("\n").filter(l => l.startsWith("FAIL SUITE ")).map(l => l.slice(11));
      return r.status !== 0 ? PASS(`caught by ${caught.join(", ") || "checklist"}`) : FAIL("the mutant passes every suite");
    });
  }
}

// H: provenance
const corpusDoc = (() => { try { return JSON.parse(read("data/standards/corpus.json")); } catch { return null; } })();
const corpus = corpusDoc?.standards || [];
const MRD = read("docs/MRD.md") || "";
const PRED = existsSync(join(ROOT, "sources/mrd-predecessor")) ? readdirSync(join(ROOT, "sources/mrd-predecessor")).map(f => readFileSync(join(ROOT, "sources/mrd-predecessor", f), "utf8")).join("\n") : "";
const designation = (name) => (String(name).match(/\d{3,5}/) || [null])[0];
await check("H1", "Every 'MRD' or 'predecessor' citation in the corpus is true", "gate", ["corpus.json"], () => {
  if (!corpus.length) throw new Unverified("corpus not found");
  const bad = [];
  for (const r of corpus) { const src = JSON.stringify(r.provenance || r.provenance_basis || ""); const num = designation(r.name);
    if (!num) continue;
    const family = /\bNPR\b/.test(r.name) && /\bNPRs?\b/.test(MRD);
    if (/docs\/MRD\.md/.test(src) && !MRD.includes(num) && !family) bad.push(`${r.name} cites the MRD${PRED.includes(num) ? " (named only in the predecessors)" : " (named in no source)"}`);
    if (/mrd-predecessor/.test(src) && !PRED.includes(num)) bad.push(`${r.name} cites the predecessors`); }
  return bad.length ? FAIL(bad.join("; ")) : PASS();
});
await check("H2", "Every standard named in MRD section 7 is in the corpus", "gate", ["corpus.json"], () => {
  const named = ["15288", "42010", "24748", "15939", "EIA-632", "SysML", "MIL-STD-882", "MIL-STD-810", "MIL-STD-461", "NASA", "ISRO"];
  const names = corpus.map(r => `${r.name} ${r.title || ""}`).join("\n"); const missing = named.filter(n => !names.includes(n));
  return missing.length ? FAIL(`missing: ${missing.join(", ")}`) : PASS();
});
await check("H3", "No duplicate standards in the corpus", "gate", ["corpus.json"], () => {
  const seen = new Map(); for (const r of corpus) seen.set(r.name, (seen.get(r.name) || 0) + 1);
  const d = [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${k} x${n}`); return d.length ? FAIL(d.join("; ")) : PASS(`${corpus.length} records`);
});

// I: licence and citation
await check("I1", "LICENSE carries the full GPL-3.0 text", "gate", ["LICENSE"], () => {
  const t = read("LICENSE") || ""; return /TERMS AND CONDITIONS/.test(t) && /END OF TERMS AND CONDITIONS/.test(t) && t.length > 30000 ? PASS() : FAIL(`LICENSE is ${t.split("\n").length} lines, not the licence text`);
});
await check("I2", "CITATION.cff records the ORCID, the AyeAI affiliation and a URL that resolves", "gate", ["CITATION.cff"], async () => {
  const t = read("CITATION.cff") || ""; const issues = [];
  if (!/0009-0002-0684-8320/.test(t)) issues.push("ORCID 0009-0002-0684-8320 missing");
  if (!/affiliation:\s*["']?AyeAI/.test(t)) issues.push("affiliation AyeAI missing");
  const url = (t.match(/repository-code:\s*["']?(\S+?)["']?\s*$/m) || [])[1];
  if (url) { try { const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) }); if (r.status >= 400) issues.push(`${url} returns ${r.status}`); }
    catch (e) { if (!issues.length) throw new Unverified(`could not reach ${url}: ${e.message}`); } }
  return issues.length ? FAIL(issues.join("; ")) : PASS(url ? `${url} resolves` : "no repository URL recorded");
});
await check("I3", "Copyright line in the standard form", "report", ["README.md", "LICENSE", "index.html"], () => {
  const line = "© 1993–2026 Abhishek Choudhary. All rights reserved.";
  const missing = ["README.md", "LICENSE", "site/index.html"].filter(f => !(read(f) || "").includes(line));
  return missing.length ? FAIL(`not in: ${missing.join(", ")}`) : PASS();
});

// J: architectural acceptance tests (build guidelines sections 46 and 47)
await check("J1", "The twelve architectural acceptance tests and the V1 to V2 experiment pass", "gate", ["regression-checklist.mjs"], () => {
  const files = [...(existsSync(join(ROOT, "tools")) ? readdirSync(join(ROOT, "tools")).filter(f => /^(conformance-test.*|test-components)\.mjs$/.test(f)).map(f => "tools/" + f) : []),
    ...(existsSync(join(ROOT, "tests")) ? readdirSync(join(ROOT, "tests")).filter(f => f.endsWith(".mjs") && !["acceptance.mjs", "run.mjs"].includes(f)).map(f => "tests/" + f) : [])];
  let text = "";
  for (const f of files) { const r = spawnSync(process.execPath, [f], { cwd: ROOT, encoding: "utf8", timeout: 300000, env: { ...process.env, PAP_ACCEPTANCE_NESTED: "1" } }); if (r.status === 0) text += (r.stdout || "") + "\n"; }
  const ids = [...Array.from({ length: 12 }, (_, i) => `ARCH-T${i + 1}`), "ARCH-V1V2"];
  const missing = ids.filter(id => !new RegExp(`^PASS.*\\b${id}\\b`, "m").test(text));
  return missing.length ? FAIL(`no passing test named ${missing.join(", ")}`) : PASS();
});

// K: standards coverage
await check("K1", "Export-control regimes are in the corpus", "gate", ["corpus.json"], () => {
  const blob = JSON.stringify(corpus); const missing = COVERAGE.exportRegimes.filter(([, re]) => !re.test(blob)).map(([n]) => n);
  return missing.length ? FAIL(`missing: ${missing.join(", ")}`) : PASS();
});
await check("K2", "Every standard carries the evidence it requires", "gate", ["corpus.json", "compliance-automation.js"], () => {
  const without = corpus.filter(r => !(r.requiredEvidence || []).length).length;
  return without ? FAIL(`${without} of ${corpus.length} records have no requiredEvidence`) : PASS();
});
await check("K3", "Regional regulations are in the corpus", "report", ["corpus.json"], () => {
  const blob = JSON.stringify(corpus); const missing = COVERAGE.regulations.filter(([, re]) => !re.test(blob)).map(([n]) => n);
  return missing.length ? FAIL(`missing: ${missing.join(", ")}`) : PASS();
});
await check("K4", "Jurisdictions beyond ISO, IEC, the US and India are covered", "report", ["corpus.json"], () => {
  const blob = corpus.map(r => `${r.name} ${r.title || ""} ${r.authority || ""}`).join("\n");
  const missing = COVERAGE.jurisdictions.filter(([, re]) => !re.test(blob)).map(([n]) => n);
  return missing.length ? FAIL(`not covered: ${missing.join(", ")}`) : PASS();
});

// L, M: accessibility and the AI Guide
await check("L1", "Role cards are keyboard-operable", "gate", ["app.js"], () => {
  if (!walk?.loaded) return UNV("blocked by A2: the app does not load");
  const home = walk.routes["/"]?.html; if (!home) return FAIL("home did not render");
  const cards = [...home.matchAll(/<([a-z]+)([^>]*class=["'][^"']*role-card[^"']*["'][^>]*)>/gi)];
  if (!cards.length) return FAIL("no role cards rendered");
  const bad = cards.filter(([, tag, attrs]) => !/^(a|button)$/i.test(tag) && !/tabindex=["']0["']/.test(attrs)).length;
  return bad ? FAIL(`${bad} of ${cards.length} role cards are not focusable`) : PASS(`${cards.length} cards`);
});
await check("L2", "High-contrast or forced-colours support", "report", ["app.css"], () => /prefers-contrast|forced-colors|high-contrast/.test(read("site/assets/css/app.css") || "") ? PASS() : FAIL("no contrast mode"));
await check("M1", "AI Guide lists providers and sends the project's context", "gate", ["app.js", "ai-guide.js"], () => {
  if (!walk?.loaded) return UNV("blocked by A2: the app does not load");
  const r = walk.routes["/ai-guide"]; if (!r) return FAIL("no /ai-guide route"); if (r.error) return FAIL(r.error);
  const urls = [...r.html.matchAll(/data-url=["']([^"']+)/g)].length; const prompts = [...r.html.matchAll(/data-prompt=["']([^"']*)/g)].map(m => { try { return decodeURIComponent(unescapeHtml(m[1])); } catch { return m[1]; } });
  const name = walk.projectName; const issues = [];
  if (urls < 5) issues.push(`${urls} providers`); if (!name) issues.push("project name unknown");
  else if (!prompts.some(p => p.includes(name))) issues.push("prompt does not carry the project's context");
  return issues.length ? FAIL(issues.join("; ")) : PASS(`${urls} providers`);
});

// A5: real browser, when one is available
await check("A5", "Every route renders in a real browser with no page error", "report", ["app.js"], async () => {
  if (argv.includes("--no-browser") || NESTED) return SKIP("--no-browser");
  const pw = resolvePlaywright(); if (!pw) throw new Unverified("Playwright is not installed; the DOM-stub walk (A2, A4) still ran");
  let browser = null; const tries = [undefined, process.env.CHROME_PATH, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", ...globChrome()].filter((v, i, a) => a.indexOf(v) === i);
  for (const exe of tries) { try { browser = await pw.chromium.launch({ executablePath: exe, args: ["--no-sandbox"] }); break; } catch {} }
  if (!browser) throw new Unverified("no launchable Chromium found");
  const server = await serve(join(ROOT, "site")); const bad = [];
  try {
    for (const r of routes) { const page = await (await browser.newContext()).newPage(); const errs = [];
      page.on("pageerror", (e) => errs.push(String(e.message).split("\n")[0]));
      await page.goto(`http://127.0.0.1:${server.port}/index.html#${r}`); await page.waitForTimeout(400);
      const text = await page.evaluate(() => document.querySelector("#app")?.innerText?.trim() || "");
      if (errs.length) bad.push(`${r}: ${errs[0]}`); else if (!text) bad.push(`${r}: empty`); await page.close(); }
  } finally { await browser.close(); server.close(); }
  return bad.length ? FAIL(bad.join("; ")) : PASS(`${routes.length} routes`);
});

// H4: traceability must not claim what fails here
await check("H4", "TRACEABILITY.md claims nothing this run shows to fail", "gate", ["TRACEABILITY.md"], () => {
  const t = read("docs/iterations/TRACEABILITY.md"); if (!t) throw new Unverified("TRACEABILITY.md not found");
  const rows = t.split("\n").filter(l => /^\|\s*\d{2}\s*\|/.test(l)).map(l => l.split("|").map(s => s.trim()));
  const failing = results.filter(r => r.status === "FAIL" && r.severity === "gate");
  const over = [];
  for (const row of rows) { const [, iter, , code, , status] = row; if (!/IMPLEMENTED|INTEGRATED/i.test(status || "")) continue;
    const hits = failing.filter(f => f.modules.some(m => m && (code || "").includes(m))).map(f => f.id);
    if (hits.length) over.push(`iteration ${iter} (${[...new Set(hits)].join(",")})`); }
  return over.length ? FAIL(`marked IMPLEMENTED while failing: ${over.join("; ")}`) : PASS();
});

// ───────────────────────────── report ─────────────────────────────
const order = { FAIL: 0, UNVERIFIED: 1, SKIP: 2, PASS: 3 };
const gateFail = results.some(r => r.severity === "gate" && r.status === "FAIL");
const gateUnv = results.some(r => r.severity === "gate" && r.status === "UNVERIFIED");
const counts = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
console.log(NOTICE.split("\n")[0] + "   script sha256 " + sha256(SELF).slice(0, 16));
for (const r of [...results].sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id, undefined, { numeric: true })))
  console.log(`${r.status.padEnd(10)} ${r.severity.padEnd(6)} ${r.id.padEnd(4)} ${r.title}${r.detail ? "  ::  " + r.detail : ""}`);
console.log(`\n${results.length} checks: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}. Verdict: ${gateFail ? "NOT ACCEPTED (a gate failed)" : gateUnv ? "NOT ACCEPTED (a gate is unverified)" : "ACCEPTED"}`);
const report = { tool: `pap-acceptance ${VERSION}`, scriptSha256: sha256(SELF), at: new Date().toISOString(), root: ROOT, counts, verdict: gateFail ? "FAIL" : gateUnv ? "UNVERIFIED" : "PASS", results };
ensureWork(); writeFileSync(join(WORK, "report.json"), JSON.stringify(report, null, 2));
if (argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
process.exit(gateFail ? 1 : gateUnv ? 2 : 0);

// ───────────────────────────── helpers used above ─────────────────────────────
async function kernelWithProject() {
  const m = await mod(C + "core/canonical-kernel.js"); const kernel = need(m, "createKernel", "canonical-kernel")();
  const project = kernel.upsert({ id: "acc-project", type: "Project", name: "Acceptance", provenance: { origin: "acceptance" } });
  return { kernel, project };
}
async function adoptStandard(k) {
  const sa = await mod(C + "compliance/standards-acceptance.js"); const sc = await mod(C + "compliance/standards-corpus.js"); const au = await mod(C + "compliance/compliance-automation.js");
  const corpusList = need(sc, "STANDARDS_CORPUS", "standards-corpus"); const withReq = corpusList.find(s => s.requiredEvidence?.length);
  if (!withReq) throw new Unverified("no corpus standard carries requiredEvidence");
  const acc = new (need(sa, "StandardsAcceptance", "standards-acceptance"))(k.kernel); const prof = acc.profile(k.project.id, withReq.id);
  const std = acc.adopt(k.project.id, prof.id); return { std, ca: new (need(au, "ComplianceAutomation", "compliance-automation"))(k.kernel) };
}
function installFakeIndexedDB() {
  const dbs = new Map(); const state = { opens: 0 }; const had = Object.prototype.hasOwnProperty.call(globalThis, "indexedDB"); const prev = globalThis.indexedDB;
  const later = (fn) => setTimeout(fn, 0);
  const emit = (target, type, extra = {}) => { const ev = { type, target, ...extra }; if (typeof target["on" + type] === "function") target["on" + type](ev); for (const l of target.__l?.[type] || []) l(ev); };
  const listenable = (o) => Object.assign(o, { __l: {}, addEventListener(t, f) { (this.__l[t] ||= []).push(f); }, removeEventListener() {} });
  function request(tx, work) { const r = listenable({ result: undefined, error: null, readyState: "pending", transaction: tx });
    tx.__pending++; later(() => { try { r.result = work(); r.readyState = "done"; emit(r, "success"); } catch (e) { r.error = e; emit(r, "error"); } tx.__pending--; tx.__maybeComplete(); }); return r; }
  function makeDb(name) { const rec = dbs.get(name);
    const db = listenable({ name, get version() { return rec.version; },
      objectStoreNames: { contains: (n) => rec.stores.has(n), get length() { return rec.stores.size; }, item: (i) => [...rec.stores.keys()][i] },
      createObjectStore(n, opts = {}) { rec.stores.set(n, { data: new Map(), keyPath: opts.keyPath || null }); return store(null, n); },
      transaction(names, mode) { const tx = listenable({ __pending: 0, mode, db, error: null, objectStore: (n) => store(tx, n), commit() {}, abort() {},
        __maybeComplete() { if (this.__pending === 0 && !this.__done) { this.__done = true; later(() => emit(tx, "complete")); } } });
        later(() => tx.__maybeComplete()); return tx; }, close() {} });
    function store(tx, n) { const s = rec.stores.get(n); if (!s) throw new Error(`object store ${n} not found`);
      const t = tx || { __pending: 0, __maybeComplete() {} };
      const keyOf = (v, k) => (k !== undefined ? k : s.keyPath ? v?.[s.keyPath] : undefined);
      return { put: (v, k) => request(t, () => { const key = keyOf(v, k); s.data.set(JSON.stringify(key), structuredClone(v)); return key; }),
        add: (v, k) => request(t, () => { const key = keyOf(v, k); s.data.set(JSON.stringify(key), structuredClone(v)); return key; }),
        get: (k) => request(t, () => { const v = s.data.get(JSON.stringify(k)); return v === undefined ? undefined : structuredClone(v); }),
        delete: (k) => request(t, () => { s.data.delete(JSON.stringify(k)); }), clear: () => request(t, () => s.data.clear()),
        getAll: () => request(t, () => [...s.data.values()].map(v => structuredClone(v))), count: () => request(t, () => s.data.size) }; }
    return db; }
  globalThis.indexedDB = { open(name, version = 1) { state.opens++; const r = listenable({ result: undefined, error: null, transaction: null });
    later(() => { let rec = dbs.get(name); const old = rec ? rec.version : 0; if (!rec) { rec = { version: version, stores: new Map() }; dbs.set(name, rec); }
      r.result = makeDb(name); if (version > old) { rec.version = version; const up = listenable({ __pending: 0, objectStore: () => null, __maybeComplete() {} }); r.transaction = up; emit(r, "upgradeneeded", { oldVersion: old, newVersion: version }); }
      later(() => emit(r, "success")); }); return r; },
    deleteDatabase(name) { dbs.delete(name); const r = listenable({}); later(() => emit(r, "success")); return r; } };
  return { get opens() { return state.opens; }, remove() { if (had) globalThis.indexedDB = prev; else delete globalThis.indexedDB; } };
}
function resolvePlaywright() {
  const bases = [ROOT]; const g = spawnSync("npm", ["root", "-g"], { encoding: "utf8" }); if (g.status === 0) bases.push(g.stdout.trim());
  for (const b of bases) { try { return createRequire(join(b, "noop.js"))("playwright"); } catch {} }
  return null;
}
function globChrome() {
  const out = []; for (const base of ["/opt/pw-browsers", join(process.env.HOME || "", ".cache/ms-playwright")]) {
    if (!existsSync(base)) continue; for (const d of readdirSync(base)) { const p = join(base, d, "chrome-linux", "chrome"); if (existsSync(p)) out.push(p); } }
  return out;
}
function serve(dir) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
  return new Promise((ok) => { const s = createServer((req, res) => { const p = resolve(dir, "." + decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(resolve(dir)) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p)); });
    s.listen(0, "127.0.0.1", () => ok({ port: s.address().port, close: () => s.close() })); });
}
