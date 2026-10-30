/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from 'node:assert/strict';
import { buildCfdBackendJob } from '../integration/backend-job.js';
const good={id:'run-1',physicsDomain:'incompressible-flow',dimensions:2,subjectRefs:['sir:system:1'],configurationRef:'cfg:rev:3',inputs:{mesh:'mesh.msh',rho:1.2,mu:1.8e-5},requestedExecutionMode:'COLAB'};
assert.equal(buildCfdBackendJob(good).outcome,'OK');
assert.equal(buildCfdBackendJob(good).job.requestedTrustState,'UNVERIFIED');
assert.equal(buildCfdBackendJob({...good,dimensions:1}).code,'EXTERNAL_DIMENSION_UNSUPPORTED');
assert.equal(buildCfdBackendJob({...good,dimensions:4}).code,'EXTERNAL_DIMENSION_UNSUPPORTED');
assert.equal(buildCfdBackendJob({...good,subjectRefs:[]}).code,'SUBJECT_BINDING_MISSING');
assert.equal(buildCfdBackendJob({...good,configurationRef:''}).code,'CONFIGURATION_BINDING_MISSING');
assert.equal(buildCfdBackendJob({...good,requestedExecutionMode:'BROWSER'}).code,'EXECUTION_MODE_INVALID');
assert.equal(buildCfdBackendJob({...good,inputs:null}).code,'SOLVER_INPUTS_MISSING');
const input={...good,inputs:{nested:{a:1}}}; const out=buildCfdBackendJob(input); input.inputs.nested.a=9; assert.equal(out.job.inputs.nested.a,1);
console.log('CFD BACKEND JOB PASS: dimensions; canonical subject/config bindings; execution mode; trust state; input clone; HOLD boundaries');
