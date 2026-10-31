/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * FILE PURPOSE: which function of each drop-in package the site calls for each sample, and with which arguments.
 * Which exported function of each drop-in package the site calls for a sample, and with which
 * arguments. A call is either an export of drop-in/<package>/module.js, or "path#export" for an
 * adapter in this repository. The calls follow each package's own tests. */
const whole = (s) => [s];
const input = (s) => [s.input];
export const TOOL_PACKAGES = {
  cad: { title: "CAD clipping (solid intersection)", runs: { "*": { call: "site/components/tools/adapters.js#cadClipSample", args: whole } } },
  cfd: { title: "CFD reference solver", runs: { "*": { call: "cfdStep", args: input } } },
  circuit: { title: "Circuit transient solver", runs: { "*": { call: "circuitStep", args: input } } },
  emulation: { title: "Device emulation", runs: { "*": { call: "site/components/tools/adapters.js#emulationRun", args: whole } } },
  fabrication: { title: "Fabrication planning and toolpath simulation", runs: { "*": { call: "planFabrication", args: whole } } },
  hil: { title: "Hardware in the loop", builtin: [{ name: "no-device-bound", call: "hilStep", args: () => [{}] }] },
  logistics: { title: "Logistics and supply network", runs: { "logistics-network.json": { call: "assessSupplyNetwork", args: whole }, "*": { call: "runLogisticsSimulation", args: whole } } },
  manufacturing: { title: "Manufacturing routing and scheduling", runs: { "route-feasible.json": { call: "simulateManufacturing", args: whole },
    "route-quality-hold.json": { call: "route", args: whole }, "schedule-multi-order.json": { call: "planOrders", args: whole } } },
  prototyping: { title: "Prototype evidence", runs: { "*": { call: "prototype", args: whole } } },
  simulation: { title: "Rigid-body simulation", runs: { "*": { call: "simStep", args: input } } },
  uncertainty: { title: "Uncertainty study", runs: { "*": { call: "site/components/tools/adapters.js#uncertaintyRun", args: whole } } },
  "education-syllabus": { title: "Lab notebook validation", runs: { "*": { call: "site/components/tools/adapters.js#notebookValidate", args: whole } } }
};
export const SAMPLE_FILES = {
  cad: ["box-overlap.json", "contained-solid.json", "disjoint-solids.json", "identical-solids.json", "nonconvex-l-prism.json", "rotated-box.json", "tangent-solids.json"],
  cfd: ["couette-channel.json", "poiseuille-water-channel.json", "reverse-pressure-flow.json", "zero-pressure-gradient.json"],
  circuit: ["rc-lowpass.json", "resistive-divider.json", "rl-step.json"],
  emulation: ["dc-motor-step-response.json", "sensor-quantization.json", "thermal-rc-transient.json"],
  fabrication: ["rectangular-pocket.json"],
  hil: [],
  logistics: ["extended-scenarios.json", "logistics-network.json", "logistics-scenarios.json"],
  manufacturing: ["route-feasible.json", "route-quality-hold.json", "schedule-multi-order.json"],
  prototyping: ["hold-unbound-evidence.json", "scipy-rc-step-job.json", "valid-prototype.json", "valid-simulation-evidence.json"],
  simulation: ["falling-disc-floor.json", "rotating-frictional-contact.json", "three-disc-stack.json", "torque-driven-rotor.json", "two-disc-elastic.json"],
  uncertainty: ["drop-disc-study.json"],
  "education-syllabus": ["feedback-control-lab-01.json", "linear-model-lab-01.json", "measurement-lab-01.json"]
};
export function runFor(pkg, sample) {
  const p = TOOL_PACKAGES[pkg]; if (!p) return null;
  return (p.runs && (p.runs[sample] || p.runs["*"])) || null;
}
