/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Integration contract smoke test: SIR compile -> model conformance -> fidelity evidence gate. */
import assert from 'node:assert/strict';
import { compileIR, executeGate, IR_VERSION, ABI_VERSION } from '../../site/components/sir/sir-abi.js';
import { createKernel } from '../../site/components/core/canonical-kernel.js';
import { FidelityLevels } from '../../site/components/simulation/fidelity-levels.js';
import { emulate } from './module.js';

const sir = compileIR({
  header: { irVersion: IR_VERSION, abiVersion: ABI_VERSION }, identity: {}, mission: {}, components: [], ports: [], commands: [], safety: {}, execution: {}, standards: [], provenance: {}
});
assert.equal(sir.outcome, 'OK', 'SIR schema/version contract compiles');
assert.equal(executeGate({ intent: true, policy: true, authority: true, capability: true, state: true, safety: true, timing: true, resource: true }).outcome, 'EXECUTE');

const conformance = emulate({
  device: { id: 'sir-component-01', type: 'ACTUATOR', modelId: 'sample-actuator', modelVersion: '1.0.0' },
  input: { command: 4 }, observed: { response: 8 }, model: input => ({ response: input.command * 2 }),
  ports: [
    { name: 'command', direction: 'input', type: 'number', unit: '1', min: 0, max: 10 },
    { name: 'response', direction: 'output', type: 'number', unit: '1', min: 0, max: 20 }
  ], metadata: { fidelity: 'L1', observationSource: 'SYNTHETIC_FIXTURE', modelId: 'sample-actuator', modelVersion: '1.0.0' }
});
assert.equal(conformance.outcome, 'OK');
assert.equal(conformance.evidence.promotionState, 'UNVERIFIED', 'emulation cannot self-promote its evidence');

const kernel = createKernel();
const project = kernel.upsert({ id: 'emulation-integration-project', type: 'Project', name: 'Emulation integration test', provenance: { origin: 'emulation-spine-test' } });
const fidelity = new FidelityLevels(kernel);
assert.equal(fidelity.claim(project.id, 'sir-component-01', 'L0').outcome, 'OK');
const l1 = fidelity.claim(project.id, 'sir-component-01', 'L1');
assert.equal(l1.outcome, 'OK');
const evidence = kernel.store.get(l1.evidenceId);
assert.equal(evidence.method, 'SIMULATION');
assert.equal(evidence.state, 'EXECUTED');
assert.equal(conformance.evidence.physicalVerification, false);
console.log('spine integration contract: SIR compile PASS; execute gate PASS; emulation match PASS; L1 evidence registration PASS; physical promotion correctly withheld');
