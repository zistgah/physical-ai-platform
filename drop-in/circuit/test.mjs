/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Independent analytical, invariant, malformed-input and resource-bound tests. */
import { circuitStep, CIRCUIT_CONTRACT } from "./module.js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
let passed = 0;
function assert(condition, message) { if (!condition) throw new Error(`FAIL: ${message}`); passed++; }
function near(actual, expected, tolerance, message) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`);
}
function ok(result, message) { assert(result?.outcome === "OK", `${message}: ${result?.reason ?? result?.outcome}`); return result; }
function held(result, message) { assert(result?.outcome === "HOLD", `${message}: expected HOLD, got ${result?.outcome}`); }

// 1. RC charging: analytical continuous-time reference, both integrators.
const rc = { elements: [
  { id: "VS", type: "V", n1: "in", n2: "0", value: { type: "step", initial: 0, value: 1, at: 0 } },
  { id: "R1", type: "R", n1: "in", n2: "out", value: 1000 },
  { id: "C1", type: "C", n1: "out", n2: "gnd", value: 1e-6 }
] };
const rcTrap = ok(circuitStep({ netlist: rc, steps: 1000, dt: 1e-5, method: "trapezoidal" }), "RC trapezoidal");
near(rcTrap.final.nodeVoltages.out, 1 - Math.exp(-0.01 / 0.001), 2e-5, "RC trap final voltage");
near(rcTrap.history.nodes.out[99], 1 - Math.exp(-0.001 / 0.001), 2e-5, "RC trap one tau");
const rcBE = ok(circuitStep({ netlist: rc, steps: 1000, dt: 1e-5, method: "backward-euler" }), "RC backward Euler");
const rcBEExpected = 1 - Math.pow(1 + 1e-5 / 1e-3, -1000);
near(rcBE.final.nodeVoltages.out, rcBEExpected, 1e-10, "RC BE discrete closed form");
assert(Math.abs(rcTrap.final.nodeVoltages.out - (1 - Math.exp(-0.01 / 0.001))) <
       Math.abs(rcBE.final.nodeVoltages.out - (1 - Math.exp(-0.01 / 0.001))), "trapezoidal is more accurate than BE at matched dt");

// 2. RC discharge from an explicit capacitor initial condition.
const discharge = ok(circuitStep({ netlist: { elements: [
  { id: "R", type: "R", n1: "n", n2: "0", value: 1000 },
  { id: "C", type: "C", n1: "n", n2: "0", value: 1e-6 }
] }, steps: 100, dt: 1e-5, method: "backward-euler", initialConditions: { capacitors: { C: 1 } } }), "RC discharge");
near(discharge.final.nodeVoltages.n, Math.pow(1 + 1e-5 / 1e-3, -100), 1e-10, "RC discharge BE-start/trap sequence");

// 3. RL current rise: analytical reference and current polarity.
const rl = { elements: [
  { id: "V1", type: "V", n1: "src", n2: "0", value: 1 },
  { id: "R1", type: "R", n1: "src", n2: "coil", value: 10 },
  { id: "L1", type: "L", n1: "coil", n2: "0", value: 0.1 }
] };
const rlTrap = ok(circuitStep({ netlist: rl, steps: 500, dt: 1e-4, method: "trapezoidal" }), "RL trapezoidal");
near(rlTrap.final.inductorCurrents.L1, 0.1 * (1 - Math.exp(-0.05 / 0.01)), 2e-5, "RL final current");
const rlInitial = ok(circuitStep({ netlist: { elements: [
  { id: "R", type: "R", n1: "n", n2: "0", value: 10 },
  { id: "L", type: "L", n1: "n", n2: "0", value: 0.1 }
] }, steps: 100, dt: 1e-4, method: "backward-euler", initialConditions: { inductors: { L: 0.1 } } }), "RL decay");
near(rlInitial.final.inductorCurrents.L, 0.1 * Math.pow(1 + 10 * 1e-4 / 0.1, -100), 1e-10, "RL BE-start/trap decay");

// 4. DC divider and voltage-source branch-current sign.
const divider = ok(circuitStep({ netlist: { elements: [
  { id: "V", type: "V", n1: "supply", n2: "0", value: 10 },
  { id: "RA", type: "R", n1: "supply", n2: "mid", value: 1000 },
  { id: "RB", type: "R", n1: "mid", n2: "0", value: 1000 }
] }, steps: 2, dt: 1e-3 }), "divider");
near(divider.final.nodeVoltages.mid, 5, 1e-10, "divider midpoint");
near(divider.final.branchCurrents.V, -0.005, 1e-10, "voltage-source branch-current sign");

// 5. Current source direction and KCL.
const currentDriven = ok(circuitStep({ netlist: { elements: [
  { id: "I1", type: "I", n1: "0", n2: "sense", value: { type: "dc", value: 0.001 } },
  { id: "R1", type: "R", n1: "sense", n2: "0", value: 1000 }
] }, steps: 3, dt: 1e-3, method: "backward-euler", recordEvery: 2 }), "current-source network");
near(currentDriven.final.nodeVoltages.sense, 1, 1e-10, "current-source polarity");
assert(currentDriven.history.time.length === 2, "recordEvery keeps final sample");
near(currentDriven.final.elementCurrents.R1 - currentDriven.final.elementCurrents.I1, 0, 1e-12, "KCL current balance");

// 6. Pulse and delayed-step waveform sampling.
const pulse = ok(circuitStep({ netlist: { elements: [
  { id: "VP", type: "V", n1: "n", n2: "0", value: { type: "pulse", low: 0, high: 5, delay: 0.002, rise: 0, width: 0.002, fall: 0, period: 0.01 } },
  { id: "R", type: "R", n1: "n", n2: "0", value: 1000 }
] }, steps: 6, dt: 0.001, method: "backward-euler" }), "pulse source");
near(pulse.history.nodes.n[0], 0, 1e-12, "pulse low before delay");
near(pulse.history.nodes.n[1], 5, 1e-12, "pulse high at delay");
near(pulse.history.nodes.n[3], 0, 1e-12, "pulse returns low");
const delayed = ok(circuitStep({ netlist: { elements: [
  { id: "V", type: "V", n1: "n", n2: "0", value: { type: "step", initial: 2, value: 4, at: 0.003 } },
  { id: "R", type: "R", n1: "n", n2: "0", value: 1000 }
] }, steps: 4, dt: 0.001, method: "backward-euler" }), "delayed step");
near(delayed.history.nodes.n[1], 2, 1e-12, "step initial value");
near(delayed.history.nodes.n[2], 4, 1e-12, "step transition value");

// A delayed discontinuity in a trapezoidal transient gets a BE transition
// interval rather than an artificial half-step impulse.
const delayedRc = ok(circuitStep({ netlist: { elements: [
  { id: "VS", type: "V", n1: "in", n2: "0", value: { type: "step", initial: 0, value: 1, at: 0.003 } },
  { id: "R", type: "R", n1: "in", n2: "out", value: 1000 },
  { id: "C", type: "C", n1: "out", n2: "0", value: 1e-6 }
] }, steps: 40, dt: 1e-4, method: "trapezoidal" }), "delayed RC trapezoidal transition");
near(delayedRc.history.nodes.out[28], 0, 1e-12, "delayed RC remains discharged before transition");
near(delayedRc.history.nodes.out[29], 1 / 11, 1e-12, "delayed RC transition uses backward Euler");

// 7. Scale disparity: micro-siemens and ideal voltage branch coexist.
const scaled = ok(circuitStep({ netlist: { elements: [
  { id: "V", type: "V", n1: "a", n2: "0", value: 1 },
  { id: "Rbig", type: "R", n1: "a", n2: "b", value: 1e12 },
  { id: "Rsmall", type: "R", n1: "b", n2: "0", value: 1e12 }
] }, steps: 1, dt: 1e-3 }), "scaled conductance network");
near(scaled.final.nodeVoltages.b, 0.5, 1e-9, "large-resistance divider");

// 8. Custom ground aliases and power output.
const customGround = ok(circuitStep({ netlist: { ground: "earth", elements: [
  { id: "V", type: "V", n1: "vcc", n2: "earth", value: 2 },
  { id: "R", type: "R", n1: "vcc", n2: "GND", value: 1000 }
] }, steps: 1, dt: 1e-3 }), "custom ground");
near(customGround.final.elementPower.R, 0.004, 1e-12, "resistor dissipation");

// 9. Deterministic replay and output schema.
const replayA = circuitStep({ netlist: rc, steps: 25, dt: 1e-5 });
const replayB = circuitStep({ netlist: rc, steps: 25, dt: 1e-5 });
assert(JSON.stringify(replayA) === JSON.stringify(replayB), "deterministic replay");
assert(replayA.evidence.deterministic && replayA.evidence.referenceComparison === "NOT_PERFORMED", "evidence does not overclaim validation");
assert(replayA.fidelity === "L1_FUNCTIONAL" && replayA.verified === false, "simulation is not promoted to physical verification");
assert(CIRCUIT_CONTRACT.version === "0.3.1", "versioned circuit contract exported");
const inputSnapshot = JSON.stringify(rc);
circuitStep({ netlist: rc, steps: 3, dt: 1e-5 });
assert(JSON.stringify(rc) === inputSnapshot, "solver does not mutate caller netlist");

// 10. Strict HOLD behavior and malformed data.
held(circuitStep({}), "missing netlist");
held(circuitStep({ netlist: rc, steps: 1 }), "missing dt");
held(circuitStep({ netlist: rc, steps: 0, dt: 1e-3 }), "zero steps");
held(circuitStep({ netlist: rc, steps: 1.2, dt: 1e-3 }), "fractional steps");
held(circuitStep({ netlist: rc, steps: 1, dt: 0 }), "zero dt");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-3, method: "runge-kutta" }), "unknown method");
held(circuitStep({ netlist: { elements: [{ id: "X", type: "D", n1: "a", n2: "0", value: 1 }] }, steps: 1, dt: 1e-3 }), "unsupported device");
held(circuitStep({ netlist: { elements: [{ id: "R", type: "R", n1: "a", n2: "b", value: 100 }] }, steps: 1, dt: 1e-3 }), "floating network");
held(circuitStep({ netlist: { elements: [{ id: "R", type: "R", n1: "a", n2: "0", value: 0 }] }, steps: 1, dt: 1e-3 }), "zero resistance");
held(circuitStep({ netlist: { elements: [{ id: "R", type: "R", n1: "a", n2: "0", value: 100 }, { id: "R", type: "R", n1: "a", n2: "0", value: 200 }] }, steps: 1, dt: 1e-3 }), "duplicate id");
held(circuitStep({ netlist: { elements: [{ id: "V", type: "V", n1: "a", n2: "0", value: { type: "pulse", delay: 0, rise: -1 } }, { id: "R", type: "R", n1: "a", n2: "0", value: 100 }] }, steps: 1, dt: 1e-3 }), "negative pulse edge");
held(circuitStep({ netlist: { elements: [{ id: "V", type: "V", n1: "a", n2: "0", value: { type: "pulse", rise: 2, width: 2, fall: 2, period: 5 } }, { id: "R", type: "R", n1: "a", n2: "0", value: 100 }] }, steps: 1, dt: 1e-3 }), "pulse longer than period");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-3, initialConditions: { capacitors: { UNKNOWN: 1 } } }), "unknown initial-condition element");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-3, initialConditions: { capacitors: { C1: NaN } } }), "non-finite initial condition");
held(circuitStep({ netlist: rc, steps: 2, dt: 1e-3, limits: { maxSteps: 1 } }), "step resource bound");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-3, limits: { maxUnknowns: 1 } }), "unknown-count resource bound");
held(circuitStep({ netlist: rc, steps: 2, dt: 1e-3, limits: { maxRecordedSamples: 1 } }), "recorded-sample resource bound");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-3, limits: { maxElements: 1 } }), "element-count resource bound");
held(circuitStep({ netlist: rc, steps: 1, dt: 1e-6, limits: { maxWorkUnits: 1 } }), "dense-solver work budget");
held(circuitStep({ netlist: rc, steps: 100000, dt: 1e-6, recordEvery: 1, limits: { maxWorkUnits: 1e12, maxHistoryValues: 10 } }), "history-memory budget");
held(circuitStep({ netlist: { elements: [{ id: "V", type: "V", n1: "a", n2: "0", value: { type: "noise", value: 1 } }, { id: "R", type: "R", n1: "a", n2: "0", value: 100 }] }, steps: 1, dt: 1e-3 }), "unsupported source waveform");

// 11. Every shipped JSON sample must execute and match its declared assertions.
const sampleFiles = readdirSync(join(root, "samples")).filter(f => f.endsWith(".json")).sort();
assert(sampleFiles.length >= 3, "at least three runnable circuit samples shipped");
for (const file of sampleFiles) {
  const sample = JSON.parse(readFileSync(join(root, "samples", file), "utf8"));
  const result = ok(circuitStep(sample.input), `sample ${file}`);
  for (const check of sample.assertions) {
    const actual = check.path.split(".").reduce((v, k) => v?.[k], result);
    near(actual, check.expected, check.tolerance, `${file}: ${check.path}`);
  }
}

console.log(`circuit: ${passed} assertions PASS; ${sampleFiles.length} shipped samples executed`);
