/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: the CAD workbench page: sketch, solid features, booleans, undo and STL exchange on the geometry kernel.
 * The CAD workbench: sketch by clicking on the canvas or by typing coordinates, then extrude,
 * revolve, chamfer, fillet, draft, shell, union and subtract through the geometry kernel; undo;
 * export and import STL. Every solid is a canonical entity in the project graph. */
import { GeometryKernel } from "../cad/geometry-kernel.js";
import { exportSTL, importSTL } from "../cad/stl-exchange.js";

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
};
function signedVolume(mesh) {
  let v = 0; const V = mesh.vertices;
  for (const f of mesh.faces) for (let i = 1; i < f.length - 1; i++) { const a = V[f[0]], b = V[f[i]], c = V[f[i + 1]];
    v += a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x); }
  return v / 6;
}

export function cadToolView(app, kernel, project) {
  if (!project) { app.replaceChildren(el("div", { class: "page" }, el("h1", { text: "CAD workbench" }), el("p", { text: "Create or open a project first." }))); return; }
  const g = new GeometryKernel(kernel);
  const P = project.id;
  const state = { points: [], sketchId: null, history: [], redo: [], seq: 0 };
  const uid = (k) => `cad-${k}-${Date.now().toString(36)}-${(state.seq++).toString(36)}`;
  const current = () => state.history.at(-1) || null;

  const canvas = el("canvas", { "data-testid": "cad-viewport", width: "640", height: "420", class: "cad-canvas" });
  const x = el("input", { "data-testid": "cad-x", type: "number", value: "0", step: "any" });
  const y = el("input", { "data-testid": "cad-y", type: "number", value: "0", step: "any" });
  const height = el("input", { "data-testid": "cad-height", type: "number", value: "10", step: "any" });
  const op = el("select", { "data-testid": "cad-op" });
  for (const [v, t] of [["chamfer", "Chamfer (distance)"], ["fillet", "Fillet (radius)"], ["draft", "Draft (angle, degrees)"], ["shell", "Shell (wall)"],
    ["revolve", "Revolve (angle, degrees)"], ["union", "Union with previous solid"], ["subtract", "Subtract from previous solid"]]) op.append(el("option", { value: v, text: t }));
  const param = el("input", { "data-testid": "cad-op-param", type: "number", value: "1", step: "any" });
  const volume = el("span", { "data-testid": "cad-volume", "data-result": "", text: "0" });
  const tree = el("ul", { "data-testid": "cad-tree" });
  const message = el("p", { class: "cad-message", "data-result": "", text: "Click on the canvas or type X and Y to add profile points, then extrude." });
  const importInput = el("input", { "data-testid": "cad-import-stl", type: "file", accept: ".stl,model/stl" });
  const buttons = {};
  for (const [id, label] of [["cad-clear", "New sketch"], ["cad-add-point", "Add point"], ["cad-extrude", "Extrude"], ["cad-apply", "Apply"],
    ["cad-undo", "Undo"], ["cad-redo", "Redo"], ["cad-export-stl", "Export STL"]]) buttons[id] = el("button", { class: "btn", "data-testid": id, "data-action": id, text: label });

  const view = { yaw: -0.6, pitch: 0.5 };
  function paint() {
    const c = canvas.getContext("2d"); c.fillStyle = "#0f1420"; c.fillRect(0, 0, canvas.width, canvas.height);
    const solid = current();
    if (solid?.mesh?.vertices?.length) {
      const V = solid.mesh.vertices; const cx = V.reduce((s, v) => s + v.x, 0) / V.length, cy = V.reduce((s, v) => s + v.y, 0) / V.length, cz = V.reduce((s, v) => s + v.z, 0) / V.length;
      const span = Math.max(...V.map((v) => Math.max(Math.abs(v.x - cx), Math.abs(v.y - cy), Math.abs(v.z - cz)))) || 1;
      const s = 150 / span, cyw = Math.cos(view.yaw), syw = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
      const proj = V.map((v) => { const X = v.x - cx, Y = v.y - cy, Z = v.z - cz; const x1 = X * cyw - Y * syw, y1 = X * syw + Y * cyw;
        return { x: canvas.width / 2 + x1 * s, y: canvas.height / 2 - (Z * cp - y1 * sp) * s }; });
      c.strokeStyle = "#5aa9ff"; c.lineWidth = 1;
      for (const f of solid.mesh.faces) { c.beginPath(); f.forEach((i, k) => (k ? c.lineTo(proj[i].x, proj[i].y) : c.moveTo(proj[i].x, proj[i].y))); c.closePath(); c.stroke(); }
    }
    if (state.points.length) {
      c.fillStyle = "#ffb35a"; c.strokeStyle = "#ffb35a";
      const xs = state.points.map((p) => p.x), ys = state.points.map((p) => p.y);
      const minx = Math.min(...xs, 0), maxx = Math.max(...xs, 1), miny = Math.min(...ys, 0), maxy = Math.max(...ys, 1);
      const k = Math.min(200 / (maxx - minx || 1), 120 / (maxy - miny || 1));
      const pts = state.points.map((p) => ({ x: 20 + (p.x - minx) * k, y: canvas.height - 20 - (p.y - miny) * k }));
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
      for (const p of pts) c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
  }
  function refresh(note) {
    const solid = current();
    volume.textContent = solid ? String(solid.volume) : "0";
    tree.replaceChildren(...state.history.map((s, i) => el("li", { class: i === state.history.length - 1 ? "sel" : "", text: `${s.label} · ${Math.round(s.volume * 1000) / 1000} mm³` })));
    if (note) message.textContent = note;
    paint();
  }
  function push(result, label) {
    if (!result || result.outcome === "HOLD" || !result.mesh) { refresh(`HOLD: ${result?.reason || result?.reasons || "the kernel returned no solid"}`); return false; }
    state.history.push({ id: result.id, label, volume: result.volume ?? signedVolume(result.mesh), mesh: result.mesh, sketchId: state.sketchId, height: Number(height.value) });
    state.redo = []; refresh(`${label}: ${Math.round((result.volume ?? 0) * 1000) / 1000} mm³`); return true;
  }
  function sketch() {
    const sk = g.sketch(P, { id: uid("sketch"), name: `Sketch ${state.seq}`, points: state.points.map((p) => ({ x: p.x, y: p.y })) });
    if (sk.outcome === "HOLD") { refresh(`HOLD: ${sk.reason}`); return null; }
    state.sketchId = sk.id; return sk;
  }
  function addPoint(px, py) { if (!Number.isFinite(px) || !Number.isFinite(py)) { refresh("A point needs numeric X and Y."); return; } state.points.push({ x: px, y: py }); refresh(`${state.points.length} point(s) in the sketch.`); }

  buttons["cad-clear"].onclick = () => { state.points = []; state.sketchId = null; refresh("New sketch: add points."); };
  buttons["cad-add-point"].onclick = () => addPoint(Number(x.value), Number(y.value));
  canvas.addEventListener("click", (ev) => { const r = canvas.getBoundingClientRect(); addPoint(Math.round(ev.clientX - r.left), Math.round(r.bottom - ev.clientY)); });
  canvas.addEventListener("wheel", (ev) => { ev.preventDefault(); view.yaw += ev.deltaY > 0 ? 0.1 : -0.1; paint(); }, { passive: false });
  buttons["cad-extrude"].onclick = () => { const sk = sketch(); if (!sk) return; push(g.extrude(P, sk.id, Number(height.value), { id: uid("solid"), name: "Extrude" }), `Extrude ${height.value}`); };
  buttons["cad-apply"].onclick = () => {
    const v = Number(param.value), h = Number(height.value), base = current();
    const sk = ["chamfer", "fillet", "draft", "revolve"].includes(op.value) ? (state.sketchId ? { id: state.sketchId } : sketch()) : null;
    if (["chamfer", "fillet", "draft", "revolve"].includes(op.value) && !sk) return;
    if (op.value === "chamfer") push(g.chamfer(P, sk.id, v, h, { id: uid("solid"), name: "Chamfer" }), `Chamfer ${v}`);
    else if (op.value === "fillet") push(g.fillet(P, sk.id, v, h, { id: uid("solid"), name: "Fillet" }), `Fillet ${v}`);
    else if (op.value === "draft") push(g.draft(P, sk.id, h, v, { id: uid("solid"), name: "Draft" }), `Draft ${v}°`);
    else if (op.value === "revolve") push(v >= 360 ? g.revolve(P, sk.id, 360, { id: uid("solid"), name: "Revolve" }) : (g.revolvePartial ? g.revolvePartial(P, sk.id, v, { id: uid("solid"), name: "Revolve" }) : g.revolve(P, sk.id, v, { id: uid("solid"), name: "Revolve" })), `Revolve ${v}°`);
    else if (op.value === "shell") { if (!base) return refresh("Shell needs a solid."); push(g.shell(P, base.id, v, { id: uid("solid"), name: "Shell" }), `Shell ${v}`); }
    else { const prev = state.history.at(-2); if (!prev || !base) return refresh("A boolean needs two solids: build one, then another.");
      push(g.boolean(P, prev.id, base.id, op.value === "union" ? "UNION" : "SUBTRACT", { id: uid("solid"), name: op.value }), op.value === "union" ? "Union" : "Subtract"); }
  };
  buttons["cad-undo"].onclick = () => { const s = state.history.pop(); if (s) state.redo.push(s); refresh(s ? `Undid ${s.label}.` : "Nothing to undo."); };
  buttons["cad-redo"].onclick = () => { const s = state.redo.pop(); if (s) state.history.push(s); refresh(s ? `Redid ${s.label}.` : "Nothing to redo."); };
  buttons["cad-export-stl"].onclick = () => {
    const s = current(); if (!s) return refresh("Nothing to export.");
    const out = exportSTL(s.mesh, s.label.replace(/\s+/g, "_")); if (out.outcome !== "OK") return refresh(`HOLD: ${out.reason}`);
    const a = el("a", { href: URL.createObjectURL(new Blob([out.text], { type: "model/stl" })), download: `${s.label.replace(/\s+/g, "-").toLowerCase()}.stl` });
    document.body.append(a); a.click(); a.remove(); refresh(`Exported ${out.facets} facets.`);
  };
  importInput.onchange = async () => {
    const f = importInput.files?.[0]; if (!f) return;
    const parsed = importSTL(await f.text()); const mesh = parsed.mesh || parsed;
    if (parsed.outcome === "HOLD" || !mesh?.vertices?.length) return refresh(`HOLD: ${parsed.reason || "not an STL"}`);
    const id = uid("import"); const vol = Math.abs(signedVolume(mesh));
    kernel.upsert({ id, type: "Solid", name: `Import ${f.name}`, mesh, volume: vol, feature: "IMPORT_STL", provenance: { origin: "cad workbench import", file: f.name } });
    try { kernel.link(P, "CONTAINS", id); } catch {}
    state.history.push({ id, label: `Import ${f.name}`, volume: vol, mesh }); refresh(`Imported ${f.name}.`);
  };

  app.replaceChildren(el("div", { class: "page cad-page" },
    el("h1", { text: "CAD workbench" }), message,
    el("div", { class: "cad-layout" },
      el("div", {}, canvas,
        el("div", { class: "sim-controls" }, buttons["cad-clear"], el("label", { text: "X " }, x), el("label", { text: "Y " }, y), buttons["cad-add-point"],
          el("label", { text: "Height " }, height), buttons["cad-extrude"]),
        el("div", { class: "sim-controls" }, el("label", { text: "Operation " }, op), el("label", { text: "Value " }, param), buttons["cad-apply"],
          buttons["cad-undo"], buttons["cad-redo"], buttons["cad-export-stl"], el("label", { text: "Import STL " }, importInput))),
      el("aside", {}, el("h3", { text: "Feature tree" }), tree, el("p", {}, el("span", { text: "Volume " }), volume, el("span", { text: " mm³" }))))));
  refresh();
}
