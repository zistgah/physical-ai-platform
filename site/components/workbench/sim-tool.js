/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: the simulation run, trace, chart, fault and replay panel on the platform simulator.
 * Runs the platform's mobile-robot scenario on its deterministic simulator, records a trace,
 * charts it, takes an armed emergency-stop fault into the next run, and replays the last run
 * from its recorded manifest (same steps, same faults) to show it reproduces exactly. */
import { createMobileRobotScenario } from "../simulation/scenario.js";

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
};
const STEPS = 250, EVERY = 25, FAULT_AT = 100;

/** Runs one recorded run; returns { columns, rows }. */
export function runManifest(manifest) {
  const { sim, ids } = createMobileRobotScenario();
  const rows = []; let columns = null;
  for (let i = 1; i <= manifest.steps; i++) {
    for (const f of manifest.faults) if (f.atStep === i) sim.injectFault({ id: f.id, type: f.type, target: ids[f.target] });
    sim.step();
    if (i % manifest.every === 0) {
      const values = { time: Math.round(sim.time * 1000) / 1000 };
      for (const c of sim.components) for (const [k, v] of Object.entries(c.state || {})) if (typeof v === "number") values[`${c.name}.${k}`] = Math.round(v * 1e6) / 1e6;
      columns ??= Object.keys(values).slice(0, 6);
      rows.push(columns.map((k) => values[k]));
    }
  }
  return { columns: columns || ["time"], rows };
}

export function simToolSection() {
  const state = { armed: [], last: null };
  const trace = el("table", { "data-testid": "sim-trace", "data-result": "", class: "result-table" });
  const canvas = el("canvas", { "data-testid": "sim-chart", width: "560", height: "200", class: "tool-chart" });
  const note = el("p", { class: "tool-status", text: "Run the scenario to record a trace." });
  const btn = (id, text) => el("button", { class: "btn", "data-testid": id, "data-action": id, text });
  const run = btn("sim-run", "Run 250 steps"), fault = btn("sim-fault", "Arm emergency stop at step 100"), replay = btn("sim-replay", "Replay last run");
  function show(result, label) {
    trace.replaceChildren(el("tr", {}, ...result.columns.map((c) => el("th", { text: c }))), ...result.rows.map((r) => el("tr", {}, ...r.map((v) => el("td", { text: String(v) })))));
    const g = canvas.getContext("2d"); g.fillStyle = "#0f1420"; g.fillRect(0, 0, canvas.width, canvas.height);
    const colours = ["#5aa9ff", "#ffb35a", "#7be38b", "#e37be3", "#e3d27b"];
    result.columns.slice(1).forEach((name, ci) => {
      const ys = result.rows.map((r) => r[ci + 1]).filter(Number.isFinite); if (ys.length < 2) return;
      const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
      g.strokeStyle = colours[ci % 5]; g.lineWidth = 2; g.beginPath();
      ys.forEach((yv, j) => { const xx = 10 + (j / (ys.length - 1)) * (canvas.width - 20), yy = canvas.height - 10 - ((yv - min) / span) * (canvas.height - 30); j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); });
      g.stroke(); g.fillStyle = colours[ci % 5]; g.font = "11px sans-serif"; g.fillText(name, 12, 14 + ci * 13);
    });
    note.textContent = label;
  }
  run.onclick = () => {
    const manifest = { steps: STEPS, every: EVERY, faults: state.armed.splice(0) };
    state.last = manifest; show(runManifest(manifest), `Ran ${STEPS} steps${manifest.faults.length ? " with an emergency stop at step " + FAULT_AT : ""}.`);
  };
  fault.onclick = () => { state.armed = [{ id: "fault-estop", type: "EMERGENCY_STOP", target: "estop", atStep: FAULT_AT }]; note.textContent = "Emergency stop armed for the next run."; };
  replay.onclick = () => { if (!state.last) { note.textContent = "Nothing recorded yet."; return; } show(runManifest(state.last), "Replayed the last run from its manifest."); };
  return el("section", { class: "card sim-tool" }, el("h2", { text: "Run, fault and replay" }), el("div", { class: "sim-controls" }, run, fault, replay), note, canvas, trace);
}
