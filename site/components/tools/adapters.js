/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: adapters that run packages whose functions take models or runners, following each package's own sample tests.
 * Adapters for packages whose functions take models or runners (functions) as arguments.
 * Each follows the package's own sample test, so the site runs exactly what the package tests. */
import { emulate } from "../../../drop-in/emulation/module.js";
import { uncertaintyStudy } from "../../../drop-in/uncertainty/module.js";
import { simStep } from "../../../drop-in/simulation/module.js";
import { NotebookEngine } from "../../../drop-in/education-syllabus/module.js";
import { cadClip } from "../../../drop-in/cad/module.js";

/** Merges coincident vertices so a mesh with per-face vertices becomes index-shared, as cadClip needs. */
export function weldMesh(mesh) {
  const key = (v) => [v.x, v.y, v.z].map((n) => Math.round(n * 1e9) / 1e9).join(",");
  const index = new Map(), vertices = [];
  const map = (mesh?.vertices || []).map((v) => { const k = key(v); if (!index.has(k)) { index.set(k, vertices.length); vertices.push({ x: v.x, y: v.y, z: v.z }); } return index.get(k); });
  return { vertices, faces: (mesh?.faces || []).map((f) => f.map((i) => map[i])) };
}
/** Clips a CAD sample's base by its cutter, after welding (the samples store per-face vertices). */
export function cadClipSample(sample) { return cadClip(weldMesh(sample.base), weldMesh(sample.cutter)); }

/** Runs an emulation sample with the device model its fields describe (drop-in/emulation/sample-test.mjs). */
export function emulationRun(sample) {
  const m = sample?.model || {};
  const meta = { modelId: m.kind, fidelity: "L1", observationSource: "SYNTHETIC_FIXTURE" };
  if (m.gainRpmPerVolt !== undefined) {
    return emulate({ device: sample.device, steps: sample.steps, tolerance: sample.tolerance, stateful: true, initialState: { rpm: 0 },
      metadata: { ...meta, modelVersion: sample.device?.modelVersion }, model: (input, ctx) => {
        const target = m.gainRpmPerVolt * input.voltage;
        const rpm = ctx.state.rpm + (target - ctx.state.rpm) * (1 - Math.exp(-input.dt / m.timeConstantSeconds));
        return { output: { rpm }, state: { rpm } };
      } });
  }
  if (m.thermalResistanceCPerW !== undefined) {
    return emulate({ device: sample.device, steps: sample.steps, tolerance: sample.tolerance, stateful: true, initialState: { temperatureC: m.ambientC },
      metadata: meta, model: (input, ctx) => {
        const target = m.ambientC + m.thermalResistanceCPerW * input.powerW;
        const temperatureC = ctx.state.temperatureC + (target - ctx.state.temperatureC) * (1 - Math.exp(-input.dt / m.timeConstantSeconds));
        return { output: { temperatureC }, state: { temperatureC } };
      } });
  }
  return emulate({ device: sample.device, steps: sample.steps, tolerance: sample.tolerance, metadata: meta,
    model: (input) => ({ reported: Math.round((input.raw + m.bias) / m.resolution) * m.resolution }) });
}

/** Runs the drop-disc uncertainty study: each sample drops a disc of the sampled mass, radius and
 * restitution from 2 m and measures the impact speed and the time until it comes to rest. */
export async function uncertaintyRun(spec) {
  return uncertaintyStudy(spec, { runner: (p) => {
    const radius = p.radius ?? 0.1, dt = 1 / 120;
    const sim = simStep({ bodies: [{ id: "drop", x: 0, y: 2, vx: 0, vy: 0, mass: p.mass ?? 1, radius, restitution: p.restitution ?? 0.5 }],
      dt, steps: 600, gravity: { x: 0, y: -9.81 }, floor: 0, recordHistory: true });
    if (sim.outcome !== "OK") return sim;
    let impactSpeed = 0, settlingTime = sim.history.at(-1).time;
    for (const h of sim.history) { const b = h.bodies[0]; if (h.contacts?.length) break; impactSpeed = Math.max(impactSpeed, Math.hypot(b.vx, b.vy)); }
    for (let i = sim.history.length - 1; i >= 0; i--) { const b = sim.history[i].bodies[0];
      if (Math.abs(b.vy) > 0.05 || b.y > radius + 0.002) { settlingTime = sim.history[Math.min(i + 1, sim.history.length - 1)].time; break; } }
    return { outcome: "OK", metrics: { impactSpeed, settlingTime } };
  } });
}

/** Validates a lab notebook with the syllabus package's notebook engine. */
export function notebookValidate(notebook) { return new NotebookEngine().validate(notebook); }
