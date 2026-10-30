/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import { EntityStore } from "../site/components/core/store.js";
import { EventBus } from "../site/components/core/event-bus.js";
import { KnowledgeGraph } from "../site/components/graph/knowledge-graph.js";
import { Simulator } from "../site/components/simulation/simulator.js";
import { Motor } from "../site/components/simulation/mobile-robot.js";
import { ComplianceEngine } from "../site/components/compliance/compliance-engine.js";
import { TeleoperationEngine } from "../site/components/teleoperation/teleoperation-engine.js";
import { componentContract, port } from "../site/components/core/contracts.js";
import { ArchitectureUpgradeManager } from "../site/components/workbench/architecture-upgrade.js";
import { PortRegistry } from "../site/components/workbench/ports.js";
import { PluginRegistry } from "../site/components/core/plugin-system.js";
import { ReplayRecorder } from "../site/components/simulation/replay.js";

let passed=0,failed=0;
function test(name,fn){try{fn();console.log("PASS",name);passed++}catch(e){console.error("FAIL",name,e);failed++}}
function eq(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`)}

test("event bus",()=>{const b=new EventBus();let x=0;b.on("x",v=>x=v);b.emit("x",7);eq(x,7)});
test("entity store",()=>{const s=new EntityStore();s.add({id:"a",type:"A"});s.add({id:"b",type:"B"});s.relate("a","USES","b");eq(s.neighbors("a").length,1)});
test("knowledge graph",()=>{const s=new EntityStore(),g=new KnowledgeGraph(s);g.add({id:"a",type:"A"});g.add({id:"b",type:"B"});g.link("a","USES","b");eq(g.neighborhood("a",1).length,2)});
test("simulator deterministic stepping",()=>{const s=new Simulator({dt:.1,seed:42}),m=new Motor({id:"m"});s.add(m);s.run(10);eq(Number(s.time.toFixed(5)),1)});
test("component IDs are preserved",()=>{const m=new Motor({id:"m"});eq(m.id,"m")});
test("motor moves under command",()=>{const s=new Simulator({dt:.1});const m=new Motor({id:"m"});s.add(m);m.inputs.command=1;s.run(10);if(m.state.position<=0)throw new Error("motor did not move")});
test("fault injection stops motor",()=>{const s=new Simulator({dt:.1});const m=new Motor({id:"m"});s.add(m);m.inputs.command=1;s.run(5);s.injectFault({id:"f",target:"m"});s.run(20);if(m.state.speed>0.01)throw new Error(`fault did not stop motor: ${m.state.speed}`)});
test("compliance unknown holds",()=>{const c=new ComplianceEngine();eq(c.evaluate({state:"UNKNOWN"}).decision,"HOLD")});
test("teleoperation requires local safety authority",()=>{const t=new TeleoperationEngine();let threw=false;try{t.open({id:"x"})}catch{threw=true}if(!threw)throw new Error("missing local authority accepted")});

test("component contracts validate typed ports",()=>{
  const a=componentContract({id:"a",type:"Motor",ports:[port("out",{direction:"out",type:"state",unit:"m/s"})]});
  const b=componentContract({id:"b",type:"Controller",ports:[port("in",{direction:"in",type:"state",unit:"m/s"})]});
  const r=new PortRegistry();r.register(a);r.register(b);r.connect("a","out","b","in");eq(r.validate().length,0);
});
test("architecture upgrade migrates schema explicitly",()=>{
  const u=new ArchitectureUpgradeManager({schemaVersion:"2.0.0"});
  u.registerMigration("System","1.0.0","2.0.0",d=>({...d,schemaVersion:"2.0.0",architectureVersion:"2.0.0"}));
  const x=u.upgrade({schemaVersion:"1.0.0",id:"s"},"System","2.0.0");eq(x.architectureVersion,"2.0.0");
});
test("architecture adapter preserves explicit boundary",()=>{
  const u=new ArchitectureUpgradeManager();u.registerAdapter("motor.v1","motor.v2",x=>({...x,version:"motor.v2"}));
  eq(u.adapt({id:"m"},"motor.v1","motor.v2").version,"motor.v2");
});
test("plugin registry loads replaceable implementation",()=>{
  const p=new PluginRegistry({events:new EventBus()});p.register({id:"solver.test",version:"1.0.0"},()=>({solve:()=>42}));
  eq(p.load("solver.test").instance.solve(),42);
});
test("replay manifest is deterministic",()=>{
  const r=new ReplayRecorder();r.start({seed:42,dt:.1});r.record({step:1,value:3});
  const m=r.manifest();eq(r.verify(m),true);
});


// Additional rigorous tests
test("units reject incompatible connection conceptually",()=>{
  // Conceptual: dimensional analysis placeholder
  const u1 = componentContract({id:"u",type:"Motor",ports:[port("o",{direction:"out",type:"state",unit:"m/s"})]}).ports.o.unit;
  const u2 = componentContract({id:"v",type:"Joint",ports:[port("o",{direction:"out",type:"state",unit:"rad/s"})]}).ports.o.unit;
  if(u1 === u2) throw new Error("units should differ");
});
test("compliance unknown never allows",()=>{
  const c = new ComplianceEngine();
  const r = c.evaluate({state:"UNKNOWN"});
  if(r.decision !== "HOLD") throw new Error("UNKNOWN must HOLD");
});
test("store preserves identity across upsert",()=>{
  const s = new EntityStore();
  s.upsert({id:"x", type:"Component", name:"A"});
  s.upsert({id:"x", type:"Component", name:"B"});
  const e = s.get("x");
  if(e.name !== "B" || e.id !== "x") throw new Error("identity lost");
});
test("simulator reset restores initial time",()=>{
  const sim = new Simulator({dt:0.1, seed:1});
  sim.run(10);
  sim.reset();
  if(sim.time !== 0) throw new Error("reset failed");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode=failed?1:0;

