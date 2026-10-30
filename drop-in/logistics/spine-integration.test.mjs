/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import {createKernel} from "../../site/components/core/canonical-kernel.js";
import {LogisticsSpineAdapter} from "./spine-adapter.js";
const assert=(v,m)=>{if(!v)throw new Error("FAIL "+m);};
const kernel=createKernel();
const project=kernel.createProject({id:"LOG-PROJECT",name:"Logistics integration fixture"});
const adapter=new LogisticsSpineAdapter(kernel);
const result=adapter.persistProjection({projectId:project.id,id:"PLAN-1",kind:"SUPPLY_PLAN",
  result:{outcome:"HOLD",shortages:[{part:"MOTOR",qty:2}]}});
assert(result.outcome==="OK","projection persisted");
assert(result.artifact.type==="Artifact"&&result.artifact.decision==="HOLD","canonical Artifact preserves HOLD");
assert(kernel.store.relations.some(r=>r.source===project.id&&r.target===result.artifact.id&&r.relation==="CONTAINS"),
  "existing canonical CONTAINS relation used");
const again=adapter.persistProjection({projectId:project.id,id:"PLAN-1",kind:"SUPPLY_PLAN",
  result:{outcome:"HOLD",shortages:[{part:"MOTOR",qty:2}]}});
assert(again.outcome==="OK","idempotent upsert");
assert(kernel.store.relations.filter(r=>r.source===project.id&&r.target===result.artifact.id&&r.relation==="CONTAINS").length===1,
  "duplicate containment relation avoided");
assert(!kernel.store.relations.some(r=>r.relation==="CONSUMES"||r.relation==="HAS_EVENT"||r.relation==="SUPPLIED_BY"),
  "unresolved relations not written");
assert(adapter.persistProjection({projectId:"MISSING",id:"X",kind:"X",result:{outcome:"OK"}}).outcome==="HOLD",
  "missing project fails closed");
console.log("logistics spine integration PASS (6 assertions)");
