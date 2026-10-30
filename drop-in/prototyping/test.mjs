/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { prototype } from "./module.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
let n = 0;
function ok(v, m) { n++; if (!v) throw new Error(`FAIL ${n}: ${m}`); }
function outcome(input, expected, message) { const r = prototype(input); ok(r.outcome === expected, `${message}; expected ${expected}, got ${r.outcome}: ${r.reason || ""}`); return r; }
const valid = {
  config: { id:"cfg-1", type:"Configuration", status:"FROZEN", fingerprint:"sha256:cfg-1" },
  revision: { id:"rev-2", configurationId:"cfg-1", parentRevisionId:"rev-1", parentRevision:{id:"rev-1",configurationId:"cfg-1"}, changes:["Revised wheel mount","Added strain relief"] },
  requirements:[{id:"req-fit",type:"Requirement"},{id:"req-clearance",type:"Requirement"}],
  tests:[
    {id:"test-fit",configurationId:"cfg-1",revisionId:"rev-2",requirementIds:["req-fit"],status:"PASS",result:{fit:true}},
    {id:"test-clearance",configurationId:"cfg-1",revisionId:"rev-2",requirementIds:["req-clearance"],status:"PASSED",result:{clearanceMm:4.2}}
  ],
  evidence:[
    {id:"ev-fit",configurationId:"cfg-1",configurationFingerprint:"sha256:cfg-1",revisionId:"rev-2",testId:"test-fit",method:"PHYSICAL_TEST",state:"TESTED",realization:"REAL",fidelityLevel:"L6",result:{fit:"within tolerance"}},
    {id:"ev-clearance",configurationId:"cfg-1",configurationFingerprint:"sha256:cfg-1",revisionId:"rev-2",testId:"test-clearance",method:"INSPECTION",state:"VERIFIED",realization:"REAL",fidelityLevel:"L6",result:{clearanceMm:4.2}}
  ],
  relations:[
    {source:"test-fit",relation:"VERIFIES",target:"req-fit"},
    {source:"test-clearance",relation:"VERIFIES",target:"req-clearance"},
    {source:"ev-fit",relation:"CONFIGURED_BY",target:"cfg-1"},{source:"ev-fit",relation:"DERIVED_FROM",target:"test-fit"},
    {source:"ev-clearance",relation:"CONFIGURED_BY",target:"cfg-1"},{source:"ev-clearance",relation:"DERIVED_FROM",target:"test-clearance"}
  ]
};
const pass = prototype(valid);
ok(pass.outcome === "OK", "complete prototype passes");
ok(pass.prototype.revisionId === "rev-2", "revision identity returned");
ok(pass.prototype.parentRevisionId === "rev-1", "parent lineage retained");
ok(pass.prototype.requirementIds.length === 2, "requirements traced");
ok(pass.prototype.testIds.length === 2, "tests traced");
ok(pass.prototype.evidenceIds.length === 2, "evidence traced");
ok(pass.prototype.fidelityLevels.includes("L6"), "fidelity level retained");
ok(pass.prototype.simulationOnlyRequirementIds.length === 0, "physical evidence not labelled simulation-only");

// Fail-closed input and required fields.
outcome(undefined,"HOLD","undefined input holds"); outcome(null,"HOLD","null input holds"); outcome([],"HOLD","array input holds"); outcome({},"HOLD","empty input holds");
outcome({...valid,config:null},"HOLD","missing config holds");
outcome({...valid,config:{...valid.config,fingerprint:""}},"HOLD","missing fingerprint holds");
outcome({...valid,config:{...valid.config,status:"DRAFT"}},"HOLD","unfrozen configuration holds");
outcome({...valid,revision:null},"HOLD","missing revision holds");
outcome({...valid,revision:{...valid.revision,changes:[]}},"HOLD","empty change record holds");
outcome({...valid,revision:{...valid.revision,changes:[" "]}},"HOLD","blank change record holds");
outcome({...valid,revision:{...valid.revision,parentRevisionId:"rev-2",parentRevision:undefined}},"FAIL","self-parent rejected");
outcome({...valid,revision:{...valid.revision,parentRevision:{id:"rev-1",configurationId:"other"}}},"FAIL","cross-configuration parent rejected");
outcome({...valid,revision:{...valid.revision,parentRevision:undefined}},"HOLD","unresolved parent holds");
outcome({...valid,requirements:[]},"HOLD","empty requirements hold");
outcome({...valid,tests:[]},"HOLD","empty tests hold");
outcome({...valid,evidence:[]},"HOLD","empty evidence holds");
outcome({...valid,relations:[]},"HOLD","missing graph edges hold");

// Identity, traceability, and canonical relation checks.
outcome({...valid,revision:{...valid.revision,configurationId:"other"}},"FAIL","revision/config mismatch fails");
outcome({...valid,requirements:[...valid.requirements,valid.requirements[0]]},"FAIL","duplicate requirement fails");
outcome({...valid,tests:[...valid.tests,valid.tests[0]]},"FAIL","duplicate test fails");
outcome({...valid,evidence:[...valid.evidence,valid.evidence[0]]},"FAIL","duplicate evidence fails");
outcome({...valid,tests:[{...valid.tests[0],configurationId:"other"},valid.tests[1]]},"FAIL","test config mismatch fails");
outcome({...valid,tests:[{...valid.tests[0],revisionId:"other"},valid.tests[1]]},"FAIL","test revision mismatch fails");
outcome({...valid,tests:[{...valid.tests[0],requirementIds:[]},valid.tests[1]]},"HOLD","test without requirement trace holds");
outcome({...valid,tests:[{...valid.tests[0],requirementIds:["missing"]},valid.tests[1]]},"HOLD","unknown requirement reference holds");
outcome({...valid,relations:valid.relations.filter(r=>!(r.source==="test-fit"&&r.relation==="VERIFIES"))},"HOLD","missing VERIFIES edge holds");
outcome({...valid,relations:valid.relations.filter(r=>!(r.source==="ev-fit"&&r.relation==="CONFIGURED_BY"))},"HOLD","missing CONFIGURED_BY edge holds");
outcome({...valid,relations:valid.relations.filter(r=>!(r.source==="ev-fit"&&r.relation==="DERIVED_FROM"))},"HOLD","missing DERIVED_FROM edge holds");
outcome({...valid,relations:[...valid.relations,{source:"",relation:"X",target:"Y"}]},"HOLD","malformed graph relation holds");

// Test and evidence result semantics.
outcome({...valid,tests:[{...valid.tests[0],status:"FAIL"},valid.tests[1]]},"FAIL","failed test fails prototype");
outcome({...valid,tests:[{...valid.tests[0],status:"RUNNING"},valid.tests[1]]},"HOLD","running test holds");
outcome({...valid,tests:[{...valid.tests[0],status:"PASS",outcome:"FAIL"},valid.tests[1]]},"FAIL","contradictory failed outcome fails");
outcome({...valid,tests:[{...valid.tests[0],result:{}},valid.tests[1]]},"HOLD","empty test result holds");
outcome({...valid,tests:[{...valid.tests[0],result:null},valid.tests[1]]},"HOLD","null test result holds");
outcome({...valid,evidence:[{...valid.evidence[0],state:"PROPOSED"},valid.evidence[1]]},"HOLD","proposed evidence holds");
outcome({...valid,evidence:[{...valid.evidence[0],state:"REJECTED"},valid.evidence[1]]},"FAIL","rejected evidence fails");
outcome({...valid,evidence:[{...valid.evidence[0],result:{}},valid.evidence[1]]},"HOLD","empty evidence result holds");
outcome({...valid,evidence:[{...valid.evidence[0],stale:true},valid.evidence[1]]},"HOLD","stale evidence holds");
outcome({...valid,evidence:[{...valid.evidence[0],configurationFingerprint:"sha256:old"},valid.evidence[1]]},"HOLD","stale fingerprint holds");
outcome({...valid,evidence:[{...valid.evidence[0],configurationId:"other"},valid.evidence[1]]},"FAIL","evidence config mismatch fails");
outcome({...valid,evidence:[{...valid.evidence[0],revisionId:"other"},valid.evidence[1]]},"FAIL","evidence revision mismatch fails");
outcome({...valid,evidence:[{...valid.evidence[0],testId:"missing"},valid.evidence[1]]},"HOLD","orphan evidence holds");
outcome({...valid,evidence:[{...valid.evidence[0],method:"UNKNOWN"},valid.evidence[1]]},"HOLD","unknown method holds");
outcome({...valid,evidence:[{...valid.evidence[0],state:"FAILED"},valid.evidence[1]]},"FAIL","failed evidence state fails");

// Fidelity guard: simulation can support prototype learning but cannot masquerade as HIL/real.
const sim = structuredClone(valid);
const simulationSample = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)),"samples/valid-simulation-evidence.json"),"utf8"));
const verifiedBackendExecution = simulationSample.evidence[0].backendExecution;
sim.evidence = sim.evidence.map(e=>({...e,method:"SIMULATION",realization:"SIMULATED",fidelityLevel:"L4",state:"EXECUTED",backendExecution:{...verifiedBackendExecution,projectId:"project-1",configurationId:"cfg-1",configurationFingerprint:"sha256:cfg-1",revisionId:"rev-2",testId:e.testId}}));
const simResult = prototype(sim);
ok(simResult.outcome === "OK", "valid simulation evidence supports prototype review");
ok(simResult.prototype.simulationOnlyRequirementIds.length === 2, "simulation-only requirements are explicitly identified");
ok(simResult.note.includes("not physical verification"), "simulation result explicitly disclaims physical verification");
outcome({...sim,evidence:sim.evidence.map(({backendExecution,...e})=>e)} ,"HOLD","simulation without external backend execution provenance holds");
outcome({...sim,evidence:sim.evidence.map(e=>({...e,backendExecution:{...e.backendExecution,validationStatus:"PLANNED"}}))},"HOLD","unvalidated backend execution cannot support prototype evidence");
outcome({...sim,evidence:sim.evidence.map(e=>({...e,backendExecution:{...e.backendExecution,outputDigest:"not-a-digest"}}))},"HOLD","malformed backend output digest holds");
outcome({...sim,evidence:sim.evidence.map(e=>({...e,realization:"REAL",fidelityLevel:"L6"}))},"HOLD","simulation method cannot claim real fidelity");
outcome({...sim,evidence:sim.evidence.map(e=>({...e,realization:"HIL",fidelityLevel:"L5"}))},"HOLD","simulation method cannot claim HIL fidelity");
outcome({...valid,evidence:[{...valid.evidence[0],method:"PHYSICAL_TEST",realization:"SIMULATED",fidelityLevel:"L4"},valid.evidence[1]]},"HOLD","physical test cannot claim simulation fidelity");
outcome({...valid,evidence:[{...valid.evidence[0],method:"HIL",realization:"HIL",fidelityLevel:"L5"},valid.evidence[1]]},"OK","HIL fidelity accepted at L5");
outcome({...valid,evidence:[{...valid.evidence[0],method:"PHIL",realization:"HIL",fidelityLevel:"L5"},valid.evidence[1]]},"OK","PHIL fidelity accepted at L5");
outcome({...valid,evidence:[{...valid.evidence[0],method:"PHYSICAL_TEST",realization:"REAL",fidelityLevel:"L5"},valid.evidence[1]]},"HOLD","physical test requires L6 or higher");

// Coverage: all requirements need tests and all tests need evidence.
outcome({...valid,tests:[valid.tests[0]],evidence:[valid.evidence[0]],relations:valid.relations.filter(r=>r.source!=="test-clearance"&&r.source!=="ev-clearance")},"HOLD","uncovered requirement holds");
outcome({...valid,evidence:[valid.evidence[0]]},"HOLD","test without evidence holds");

// Multiple evidence, normalization, immutability, and frozen records.
const multi = structuredClone(valid);
multi.evidence.push({...multi.evidence[0],id:"ev-fit-photo",method:"INSPECTION"});
multi.relations.push({source:"ev-fit-photo",relation:"CONFIGURED_BY",target:"cfg-1"},{source:"ev-fit-photo",relation:"DERIVED_FROM",target:"test-fit"});
ok(prototype(multi).outcome === "OK", "multiple evidence records may support one test");
const normalized = structuredClone(valid); normalized.tests.forEach(t=>t.status=` ${t.status.toLowerCase()} `); normalized.evidence.forEach(e=>e.state=` ${e.state.toLowerCase()} `);
ok(prototype(normalized).outcome === "OK", "status normalization is deterministic");
const before = JSON.stringify(valid); prototype(valid); ok(JSON.stringify(valid)===before,"input is not mutated");
const frozen = structuredClone(valid); for (const v of [frozen,frozen.config,frozen.revision,frozen.revision.parentRevision,frozen.revision.changes,frozen.requirements,...frozen.requirements,frozen.tests,...frozen.tests,frozen.evidence,...frozen.evidence,frozen.relations,...frozen.relations]) Object.freeze(v);
ok(prototype(frozen).outcome === "OK", "frozen inputs are accepted without mutation");

// Executable samples.
const here = dirname(fileURLToPath(import.meta.url));
for (const [file, expected] of [["valid-prototype.json","OK"],["valid-simulation-evidence.json","OK"],["hold-unbound-evidence.json","HOLD"]]) {
  const sample = JSON.parse(readFileSync(join(here,"samples",file),"utf8"));
  outcome(sample, expected, `sample ${file}`);
}
console.log(`prototyping PASS (${n} assertions)`);
