/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: the tools pages that mount every drop-in package with its samples and show its real results.
 * The tools pages: every drop-in package mounted with its own samples. Each run calls the
 * package's real exported function (or the adapter named in registry.js) in the browser and
 * shows the call, the arguments, the result and a table and chart of the result. */
import { TOOL_PACKAGES, SAMPLE_FILES, runFor } from "./registry.js";

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
};
async function resolveCall(pkg, call) {
  if (call.includes("#")) { const [path, name] = call.split("#"); const m = await import(`../../../${path}`); return m[name]; }
  const m = await import(`../../../drop-in/${pkg}/module.js`); return m[call];
}
async function loadSample(pkg, file) {
  const r = await fetch(`../drop-in/${pkg}/samples/${file}`);
  if (!r.ok) throw new Error(`sample ${file} could not be loaded (${r.status})`);
  return r.json();
}
/** Runs one sample of one package; returns { call, args, result }. */
export async function runSample(pkg, file) {
  const p = TOOL_PACKAGES[pkg];
  if (!p) throw new Error(`unknown package ${pkg}`);
  if (!SAMPLE_FILES[pkg]?.length) { const b = p.builtin[0]; const args = b.args(); const fn = await resolveCall(pkg, b.call); return { call: b.call, args, result: await fn(...args) }; }
  const sample = await loadSample(pkg, file); const run = runFor(pkg, file); const args = run.args(sample);
  const fn = await resolveCall(pkg, run.call);
  return { call: run.call, args, result: await fn(...structuredClone(args)) };
}
function summaryTable(result) {
  const t = el("table", { class: "result-table" });
  t.append(el("tr", {}, el("th", { text: "field" }), el("th", { text: "value" })));
  const show = (v) => v === null || v === undefined ? String(v) : Array.isArray(v) ? `${v.length} item(s)` : typeof v === "object" ? `{ ${Object.keys(v).slice(0, 6).join(", ")}${Object.keys(v).length > 6 ? ", ..." : ""} }` : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : String(v);
  for (const [k, v] of Object.entries(result || {})) t.append(el("tr", {}, el("td", { text: k }), el("td", { text: show(v) })));
  return t;
}
function findSeries(result) {
  const out = [];
  const visit = (v, path, depth) => {
    if (depth > 4 || out.length > 2) return;
    if (Array.isArray(v) && v.length > 2 && v.every((x) => typeof x === "number")) { out.push({ name: path, ys: v }); return; }
    if (Array.isArray(v) && v.length > 2 && v.every((x) => x && typeof x === "object")) {
      const keys = Object.keys(v[0]).filter((k) => typeof v[0][k] === "number" && k !== "step");
      for (const k of keys.slice(0, 2)) out.push({ name: `${path}.${k}`, ys: v.map((x) => x[k]) });
      return;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) visit(x, path ? `${path}.${k}` : k, depth + 1);
  };
  visit(result, "", 0);
  return out;
}
function chart(series) {
  const c = el("canvas", { width: "560", height: "200", class: "tool-chart" });
  const g = c.getContext("2d"); if (!g) return c;
  g.fillStyle = "#0f1420"; g.fillRect(0, 0, c.width, c.height);
  const colours = ["#5aa9ff", "#ffb35a", "#7be38b"];
  series.forEach((s, i) => {
    const ys = s.ys.filter(Number.isFinite); if (ys.length < 2) return;
    const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
    g.strokeStyle = colours[i % 3]; g.lineWidth = 2; g.beginPath();
    s.ys.forEach((y, j) => { const x = 10 + (j / (s.ys.length - 1)) * (c.width - 20); const yy = c.height - 10 - ((y - min) / span) * (c.height - 30);
      if (j === 0) g.moveTo(x, yy); else g.lineTo(x, yy); });
    g.stroke(); g.fillStyle = colours[i % 3]; g.font = "12px sans-serif"; g.fillText(s.name.slice(0, 60), 12, 14 + i * 14);
  });
  return c;
}

export function toolsIndexView(app) {
  const page = el("div", { class: "page" }, el("h1", { text: "Tools" }),
    el("p", { text: "Every engineering package of the platform, mounted with its own samples. A run calls the package's real code in this browser; nothing is simulated by the page." }));
  const list = el("ul", { class: "tool-list" });
  for (const [id, p] of Object.entries(TOOL_PACKAGES)) list.append(el("li", {}, el("a", { href: `#/tools/${id}`, text: p.title }), el("span", { text: `  ${SAMPLE_FILES[id]?.length || 0} sample(s)` })));
  const run = el("button", { class: "btn", "data-action": "run-first-samples", text: "Run every package's first sample" });
  const result = el("div", { "data-result": "", class: "result" });
  run.onclick = async () => {
    const t = el("table", { class: "result-table" }); t.append(el("tr", {}, el("th", { text: "package" }), el("th", { text: "call" }), el("th", { text: "outcome" })));
    for (const id of Object.keys(TOOL_PACKAGES)) {
      try { const r = await runSample(id, SAMPLE_FILES[id]?.[0]); t.append(el("tr", {}, el("td", { text: id }), el("td", { text: r.call.split("#").pop() }), el("td", { text: String(r.result?.outcome ?? "done") }))); }
      catch (e) { t.append(el("tr", {}, el("td", { text: id }), el("td", { text: "" }), el("td", { text: `error: ${e.message}` }))); }
    }
    result.replaceChildren(t);
  };
  page.append(list, run, result);
  app.replaceChildren(page);
}

export function toolPackageView(app, pkg) {
  const p = TOOL_PACKAGES[pkg];
  if (!p) { app.replaceChildren(el("div", { class: "page" }, el("h1", { text: "Unknown tool" }), el("p", { text: `No package named ${pkg}.` }), el("a", { href: "#/tools", text: "All tools" }))); return; }
  const files = SAMPLE_FILES[pkg]?.length ? SAMPLE_FILES[pkg] : p.builtin.map((b) => b.name);
  const select = el("select", { "data-testid": "tool-sample" }); for (const f of files) select.append(el("option", { value: f, text: f }));
  const runBtn = el("button", { class: "btn", "data-testid": "tool-run", "data-action": "tool-run", text: "Run" });
  const call = el("code", { "data-testid": "tool-call" });
  const args = el("pre", { "data-testid": "tool-args", class: "tool-json" });
  const result = el("pre", { "data-testid": "tool-result", "data-result": "", class: "tool-json" });
  const view = el("div", { "data-testid": "tool-view", class: "tool-view" });
  const status = el("p", { class: "tool-status" });
  runBtn.onclick = async () => {
    status.textContent = "running..."; runBtn.disabled = true;
    try {
      const r = await runSample(pkg, select.value);
      call.textContent = r.call; args.textContent = JSON.stringify(r.args); result.textContent = JSON.stringify(r.result);
      const series = findSeries(r.result);
      view.replaceChildren(summaryTable(r.result), ...(series.length ? [chart(series)] : []));
      status.textContent = `outcome: ${r.result?.outcome ?? "done"}`;
    } catch (e) { status.textContent = `error: ${e.message}`; result.textContent = JSON.stringify({ error: e.message }); }
    finally { runBtn.disabled = false; }
  };
  app.replaceChildren(el("div", { class: "page tool-page" },
    el("p", {}, el("a", { href: "#/tools", text: "All tools" })), el("h1", { text: p.title }),
    el("p", { text: `Package drop-in/${pkg}. Pick a sample and run it; the result below is what the package's code returned.` }),
    el("div", { class: "sim-controls" }, el("label", { text: "Sample " }, select), runBtn), status,
    el("h3", { text: "Result" }), view, el("details", {}, el("summary", { text: "Call, arguments and raw result" }),
      el("p", {}, el("span", { text: "call: " }), call), el("h4", { text: "arguments" }), args, el("h4", { text: "result" }), result)));
}
