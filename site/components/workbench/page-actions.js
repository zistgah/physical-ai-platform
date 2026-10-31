/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: the operations each page offers, each calling the platform's engines on the current project.
 * The operations each page offers. Every action calls the platform's own engines on the
 * current project and shows what they returned. Nothing here fabricates a result. */
import { SafetyEngine } from "../safety/safety-engine.js";
import { EducationPath } from "../education/education-path.js";
import { LMS } from "../education/lms.js";
import { ResearchProtocol } from "../research/research-protocol.js";
import { buildWorkbenchModel } from "./build-adapter.js";
import { ManufacturingEngine } from "../manufacturing/manufacturing-engine.js";
import { FleetTwin } from "../core/fleet-twin.js";
import { ComplianceAutomation } from "../compliance/compliance-automation.js";
import { ComplianceEngine } from "../compliance/compliance-engine.js";
import { BusinessEngine } from "../core/business-engine.js";
import { CostModel } from "../core/cost-model.js";
import { whatLeaves, IndexedDbAdapter } from "../core/persistence-privacy.js";
import { StandardsAcceptance } from "../compliance/standards-acceptance.js";
import { STANDARDS_CORPUS } from "../compliance/standards-corpus.js";
import { buildContext } from "../core/ai-guide.js";
import { DigitalThread } from "../core/digital-thread.js";
import { GraphEditor } from "../graph/graph-editor.js";
import { CockpitMachine } from "../safety/cockpit-machine.js";
import { allBoundaries } from "../core/industrial-boundary.js";
import { LifecycleEngine } from "../core/lifecycle-engine.js";
import { ConfigurationEngine } from "../core/configuration-engine.js";
import { runCanonicalSimulation } from "../simulation/canonical-mobile-robot.js";

const tag = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const graphSummary = ({ kernel, project }) => {
  const g = kernel.getProjectGraph(project.id); const byType = {};
  for (const e of g.entities) byType[e.type] = (byType[e.type] || 0) + 1;
  return { entities: g.entities.length, relations: (g.relations || []).length, ...byType };
};
const readiness = ({ kernel, project }) => new SafetyEngine(kernel).evaluateReadiness(project.id);
const complianceRun = ({ kernel, project }) => new ComplianceAutomation(kernel).run(project.id);
const workbench = ({ kernel, project }) => { const m = buildWorkbenchModel(kernel, project.id) || {};
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Array.isArray(v) ? `${v.length} item(s)` : v && typeof v === "object" ? `${Object.keys(v).length} field(s)` : v])); };

export const PAGE_ACTIONS = {
  "/": [{ id: "graph-summary", label: "Summarise the project graph", run: graphSummary }, { id: "readiness", label: "Evaluate safety readiness", run: readiness }],
  "/start": [
    { id: "save-local", label: "Save the project in this browser", run: ({ kernel }) => { kernel.saveToLocal(); const raw = localStorage.getItem("pap_project") || ""; return { outcome: raw ? "SAVED" : "HOLD", bytes: raw.length }; } },
    { id: "export-summary", label: "Summarise the export file", run: ({ kernel, project }) => { const d = kernel.serializeProject(project.id); return { keys: Object.keys(d).length, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v === "object" && v ? Object.keys(v).length : v])) }; } }],
  "/explore": [{ id: "entity-types", label: "Count entities by type", run: graphSummary }],
  "/learn": [{ id: "learning-path", label: "Build this project's learning path", run: ({ kernel, project }) => new EducationPath(kernel).path(project.id) }],
  "/research": [{ id: "create-experiment", label: "Create and validate an experiment", run: ({ kernel, project }) => {
    const rp = new ResearchProtocol(kernel);
    const ex = rp.createExperiment(project.id, { name: `Experiment ${tag()}`, hypothesis: "The robot stops within the declared distance.", method: "simulation", variables: ["speed"], metrics: ["stopDistance"] });
    return { created: ex?.id ?? ex?.outcome, validation: rp.validate(ex?.id ?? ex) };
  } }],
  "/build": [{ id: "workbench-model", label: "Build the workbench model", run: workbench }],
  "/workbench": [{ id: "workbench-model", label: "Build the workbench model", run: workbench },
    { id: "physical-view", label: "Open the physical view", run: ({ kernel, project }) => new GraphEditor(kernel).view(project.id, "physical") }],
  "/simulate": [{ id: "simulation-evidence", label: "Run the canonical simulation and record evidence", run: async ({ kernel, project }) => { const r = await runCanonicalSimulation(kernel, project.id); return { evidence: r.evidence?.id, state: r.evidence?.state, method: r.evidence?.method }; } }],
  "/manufacture": [{ id: "generate-boms", label: "Generate the bills of materials", run: ({ kernel, project }) => new ManufacturingEngine(kernel).generateBOMs(project.id) },
    { id: "sovereignty", label: "Analyse supply sovereignty", run: ({ kernel, project }) => new ManufacturingEngine(kernel).sovereigntyAnalysis(project.id) }],
  "/deploy": [{ id: "create-deployment", label: "Create a fleet with one deployment", run: ({ kernel, project }) => {
    const ft = new FleetTwin(kernel); const fleet = ft.createFleet(project.id, { name: `Fleet ${tag()}` });
    ft.addDeployment(fleet.id, { name: `Deployment ${tag()}` }); return ft.fleetTwin(fleet.id); } }],
  "/regulate": [{ id: "compliance-run", label: "Run compliance automation", run: complianceRun },
    { id: "applicability", label: "Evaluate applicable standards", run: ({ kernel, project }) => new ComplianceEngine(kernel).applicabilityEngine(project.id) }],
  "/fund": [{ id: "record-funding", label: "Record a funding line", run: ({ kernel, project }) => { const f = new BusinessEngine(kernel).createFunding(project.id, { name: `Funding ${tag()}` });
    const all = kernel.getProjectGraph(project.id).entities.filter((e) => e.type === "Funding"); return { created: f?.id ?? f?.outcome, fundingRecords: all.length }; } },
    { id: "aggregate-cost", label: "Aggregate the cost", run: ({ kernel, project }) => new BusinessEngine(kernel).aggregateCost(project.id) }],
  "/privacy": [{ id: "what-leaves", label: "Show what a sync would send", run: ({ kernel, project }) => whatLeaves("sync", kernel.serializeProject(project.id)) },
    { id: "save-indexeddb", label: "Save to this browser's IndexedDB and read it back", run: async ({ kernel, project }) => {
      const db = new IndexedDbAdapter(); const saved = await db.save(`project-${project.id}`, kernel.serializeProject(project.id));
      const back = await db.load(`project-${project.id}`); return { saved: saved?.outcome ?? "done", readBack: back?.outcome ?? "done", entities: back?.value?.graph?.entities?.length ?? null }; } }],
  "/standards": [{ id: "adopt-standard", label: "Profile and adopt a standard", run: ({ kernel, project }) => {
    const std = STANDARDS_CORPUS.find((s) => s.requiredEvidence?.length); const acc = new StandardsAcceptance(kernel);
    const prof = acc.profile(project.id, std.id); const ad = acc.adopt(project.id, prof.id);
    return { standard: std.name, profile: prof?.id ?? prof?.outcome, adopted: ad?.id ?? ad?.outcome, status: ad?.status, requiredEvidence: std.requiredEvidence.join("; ") }; } }],
  "/ai-guide": [{ id: "context-package", label: "Build the context package for an AI", run: ({ kernel, project }) => buildContext(kernel, project.id, "Engineer", "What blocks the next lifecycle gate?") }],
  "/modules": [{ id: "load-modules", label: "Load the core modules and list their exports", run: async () => {
    const out = {}; for (const m of ["../core/canonical-kernel.js", "../cad/geometry-kernel.js", "../simulation/simulator.js", "../compliance/compliance-automation.js", "../safety/safety-engine.js", "../core/lifecycle-engine.js"]) {
      const mod = await import(m); out[m.split("/").pop()] = Object.keys(mod).join(", "); } return out; } }],
  "/graph": [{ id: "graph-summary", label: "Summarise the project graph", run: graphSummary },
    { id: "thread-breaks", label: "Find digital-thread breaks", run: ({ kernel, project }) => new DigitalThread(kernel).getThreadBreaks(project.id) }],
  "/editor": [{ id: "physical-view", label: "Open the physical view", run: ({ kernel, project }) => new GraphEditor(kernel).view(project.id, "physical") },
    { id: "electrical-view", label: "Open the electrical view", run: ({ kernel, project }) => new GraphEditor(kernel).view(project.id, "electrical") }],
  "/cockpit": [{ id: "cockpit-start", label: "Start the cockpit and try to leave S0", run: ({ kernel, project }) => {
    const m = new CockpitMachine(kernel, project.id); m.start(); let attempt; try { attempt = m.advance("S1_CONFIGURATION_VERIFIED"); } catch (e) { attempt = { outcome: "REFUSED", reason: e.message }; }
    return { current: m.current(), attempt: attempt?.outcome ?? attempt?.reason ?? String(attempt), reason: attempt?.reason }; } },
    { id: "cockpit-abort", label: "Abort to the safe state", run: ({ kernel, project }) => { const m = new CockpitMachine(kernel, project.id); m.start(); m.abort("operator abort from the cockpit page"); return { current: m.current() }; } }],
  "/boundaries": [{ id: "boundaries", label: "List capability boundaries", run: () => allBoundaries().map((b) => ({ name: b.name, status: b.status, reason: b.reason })) }],
  "/lifecycle": [{ id: "evaluate-gate", label: "Evaluate the current gate", run: ({ kernel, project }) => {
    const le = new LifecycleEngine(kernel); const gate = le.getCurrentGate(project.id); const gateId = gate?.id ?? gate?.gateId ?? gate;
    return { gate: gateId, evaluation: le.evaluateGate(project.id, gateId) }; } }],
  "/configuration": [{ id: "freeze-configuration", label: "Create and freeze a configuration", run: ({ kernel, project }) => {
    const ce = new ConfigurationEngine(kernel); const cfg = ce.createConfiguration(project.id, { name: `Configuration ${tag()}` });
    const frozen = ce.freezeConfiguration(cfg.id); return { configuration: cfg.id, status: frozen?.status ?? kernel.store.get(cfg.id)?.status, fingerprint: ce.fingerprintConfiguration(cfg.id)?.fingerprint ?? ce.fingerprintConfiguration(cfg.id) }; } }],
  "/traceability": [{ id: "trace-findings", label: "Check the traceability", run: ({ kernel, project }) => new DigitalThread(kernel).getTraceabilityFindings(project.id) }],
  "/assurance": [{ id: "readiness", label: "Evaluate safety readiness", run: readiness },
    { id: "assurance-case", label: "Create a safety assurance case", run: ({ kernel, project }) => new SafetyEngine(kernel).createAssuranceCase(project.id, { kind: "Safety" }) }],
  "/compliance": [{ id: "compliance-run", label: "Run compliance automation", run: complianceRun },
    { id: "applicability", label: "Evaluate applicable standards", run: ({ kernel, project }) => new ComplianceEngine(kernel).applicabilityEngine(project.id) }],
  "/education": [{ id: "lms-course", label: "Run a course: enrol, complete a lesson, read progress", run: ({ kernel, project }) => {
    const lms = new LMS(kernel); const id = `course-${tag()}`;
    lms.course(project.id, { id, name: "Safe teleoperation basics", lessons: [{ id: `${id}-l1`, name: "Local safety authority" }, { id: `${id}-l2`, name: "Emergency stop" }] });
    lms.enroll(id, "learner-1"); lms.completeLesson(id, `${id}-l1`, "learner-1"); return lms.progress(id); } }],
  "/operations": [{ id: "cost-rollup", label: "Roll up the cost model", run: ({ kernel, project }) => new CostModel(kernel).rollup(project.id) },
    { id: "aggregate-cost", label: "Aggregate the cost", run: ({ kernel, project }) => new BusinessEngine(kernel).aggregateCost(project.id) }],
  "/notebooks": [{ id: "inspect-notebooks", label: "Open the notebooks and count their cells", run: async () => {
    const out = {}; for (const n of ["COLAB_CAD_WORKBENCH.ipynb", "circuit-backend-lab.ipynb", "circuit-design-space-lab.ipynb"]) {
      const r = await fetch(`./notebooks/${n}`); if (!r.ok) { out[n] = `not found (${r.status})`; continue; }
      const nb = await r.json(); out[n] = `${nb.cells?.length ?? 0} cells, kernel ${nb.metadata?.kernelspec?.name ?? "unspecified"}`; } return out; } }]
};

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
};
const show = (v) => v === null || v === undefined ? String(v) : Array.isArray(v) ? `${v.length} item(s)${v.length && typeof v[0] !== "object" ? ": " + v.slice(0, 5).join(", ") : ""}` : typeof v === "object" ? Object.entries(v).slice(0, 6).map(([k, x]) => `${k}: ${typeof x === "object" && x ? (Array.isArray(x) ? x.length + " item(s)" : "{...}") : x}`).join("; ") : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : String(v);
export function renderResult(result) {
  const t = el("table", { class: "result-table" });
  if (Array.isArray(result)) {
    const keys = [...new Set(result.slice(0, 20).flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : ["value"])))].slice(0, 6);
    t.append(el("tr", {}, ...keys.map((k) => el("th", { text: k }))));
    for (const r of result.slice(0, 50)) t.append(el("tr", {}, ...keys.map((k) => el("td", { text: show(r && typeof r === "object" ? r[k] : r) }))));
    if (!result.length) t.append(el("tr", {}, el("td", { text: "no items" })));
  } else for (const [k, v] of Object.entries(result ?? { result: String(result) })) t.append(el("tr", {}, el("td", { text: k }), el("td", { text: show(v) })));
  return t;
}
/** Puts the page's operations at the top of the page. */
export function mountPageActions(app, route, ctx) {
  const actions = PAGE_ACTIONS[route]; if (!actions || !ctx.project) return;
  const result = el("div", { "data-result": "", class: "result" });
  const bar = el("div", { class: "sim-controls" });
  for (const a of actions) {
    const b = el("button", { class: "btn", "data-action": a.id, text: a.label });
    b.onclick = async () => {
      b.disabled = true;
      try { const r = await a.run(ctx); result.replaceChildren(el("p", { class: "tool-status", text: `${a.label}: ${r?.outcome ?? r?.decision ?? "done"}` }), renderResult(r)); }
      catch (e) { result.replaceChildren(el("p", { class: "tool-status", text: `${a.label}: error: ${e.message}` })); }
      finally { b.disabled = false; ctx.onChange?.(); }
    };
    bar.append(b);
  }
  const panel = el("section", { class: "card page-actions" }, el("h2", { text: "Operate" }), bar, result);
  const page = app.querySelector(".page") || app;
  const h1 = page.querySelector("h1");
  if (h1) h1.after(panel); else page.prepend(panel);
}
