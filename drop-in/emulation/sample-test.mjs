/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emulate } from './module.js';

const dir = new URL('./samples/', import.meta.url);
async function fixture(file) { return JSON.parse(await readFile(new URL(file, dir), 'utf8')); }
const dc = await fixture('dc-motor-step-response.json');
let dcState = { rpm: 0 };
const dcResult = emulate({ device: dc.device, steps: dc.steps, tolerance: dc.tolerance, stateful: true, initialState: dcState, metadata: { modelId: dc.model.kind, modelVersion: dc.device.modelVersion, fidelity: 'L1', observationSource: 'SYNTHETIC_FIXTURE' }, model: (input, ctx) => {
  const target = dc.model.gainRpmPerVolt * input.voltage;
  const rpm = ctx.state.rpm + (target - ctx.state.rpm) * (1 - Math.exp(-input.dt / dc.model.timeConstantSeconds));
  return { output: { rpm }, state: { rpm } };
} });
assert.equal(dcResult.outcome, 'OK', `DC motor sample: ${JSON.stringify(dcResult.mismatches)}`);
assert.equal(dcResult.summary.stepCount, dc.steps.length);
assert.equal(dcResult.evidence.physicalVerification, false);

const thermal = await fixture('thermal-rc-transient.json');
const thermalResult = emulate({ device: thermal.device, steps: thermal.steps, tolerance: thermal.tolerance, stateful: true, initialState: { temperatureC: thermal.model.ambientC }, metadata: { modelId: thermal.model.kind, fidelity: 'L1', observationSource: 'SYNTHETIC_FIXTURE' }, model: (input, ctx) => {
  const target = thermal.model.ambientC + thermal.model.thermalResistanceCPerW * input.powerW;
  const temperatureC = ctx.state.temperatureC + (target - ctx.state.temperatureC) * (1 - Math.exp(-input.dt / thermal.model.timeConstantSeconds));
  return { output: { temperatureC }, state: { temperatureC } };
} });
assert.equal(thermalResult.outcome, 'OK', `Thermal sample: ${JSON.stringify(thermalResult.mismatches)}`);

const sensor = await fixture('sensor-quantization.json');
const sensorResult = emulate({ device: sensor.device, steps: sensor.steps, tolerance: sensor.tolerance, metadata: { modelId: sensor.model.kind, fidelity: 'L1', observationSource: 'SYNTHETIC_FIXTURE' }, model: input => ({ reported: Math.round((input.raw + sensor.model.bias) / sensor.model.resolution) * sensor.model.resolution }) });
assert.equal(sensorResult.outcome, 'OK', `Sensor sample: ${JSON.stringify(sensorResult.mismatches)}`);

// Negative sample: one altered device observation must not pass.
const poisoned = structuredClone(dc.steps); poisoned[3].observed.rpm += 50;
const negative = emulate({ device: dc.device, steps: poisoned, tolerance: dc.tolerance, stateful: true, initialState: { rpm: 0 }, model: (input, ctx) => { const target = dc.model.gainRpmPerVolt * input.voltage; const rpm = ctx.state.rpm + (target - ctx.state.rpm) * (1 - Math.exp(-input.dt / dc.model.timeConstantSeconds)); return { output: { rpm }, state: { rpm } }; } });
assert.equal(negative.outcome, 'MISMATCH');
assert.ok(negative.mismatches.some(x => x.stepIndex === 3));
console.log('end-to-end samples: DC motor 7 steps PASS; thermal RC 7 steps PASS; sensor 5 steps PASS; poisoned observation correctly MISMATCH');
