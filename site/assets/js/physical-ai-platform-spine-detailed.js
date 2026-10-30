/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Physical AI Sovereign Platform - GitHub Pages Boilerplate Spine
 * Version: 0.1.0
 *
 * Dependency-free ES module. Static-first, graph-first, workflow-first.
 * Designed to be extended by humans or another AI without redesigning the core.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 1993-2026 Abhishek Choudhary
 */

const VERSION = '0.1.0';
const MAGIC = 'PAI-SPINE';
const SCHEMA_VERSION = '1.0';

export const ENUMS = Object.freeze({
  lifecycle: ['DISCOVER','DEFINE','RESEARCH','ARCHITECT','DESIGN','SIMULATE','PROTOTYPE','MVP','VALIDATE','FUND','CERTIFY','MANUFACTURE','PROCURE','DEPLOY','OPERATE','SERVICE','BILL','AUDIT','IMPROVE','RETIRE'],
  projectStatus: ['DRAFT','ACTIVE','BLOCKED','ON_HOLD','REVIEW','APPROVED','BASELINED','RELEASED','DEPRECATED','RETIRED'],
  evidenceStatus: ['PROPOSED','UNVERIFIED','OBSERVED','REPLICATED','VALIDATED','VERIFIED','CERTIFIED','SUPERSEDED','REJECTED'],
  complianceStatus: ['UNKNOWN','UNDER_REVIEW','NOT_CONTROLLED','CONTROLLED','LICENSE_REQUIRED','LICENSE_PENDING','LICENSE_GRANTED','EXEMPTION_CONFIRMED','RESTRICTED','PROHIBITED','EXPIRED','SUPERSEDED'],
  safetyStatus: ['UNKNOWN','SCREENING_REQUIRED','RISK_ASSESSMENT_REQUIRED','REVIEW_REQUIRED','APPROVED','ACTIVE','NO_GO','EMERGENCY','SAFE_STATE','DEGRADED'],
  authority: ['OBSERVE','SUGGEST','APPROVE','COMMAND','AUTHORIZE','OVERRIDE','EMERGENCY_STOP','MAINTAIN','CONFIGURE','PROGRAM','CERTIFY','DEPLOY','RETIRE'],
  modes: ['NOVICE','EXPERT','THOUGHT_LEADER'],
  roles: ['LEARN','RESEARCH','BUILD','START','MANUFACTURE','DEPLOY','REGULATE','FUND','EXPLORE'],
  domains: ['TERRESTRIAL','MARINE','SUBSEA','AERIAL','AEROSPACE_ORBITAL','INDUSTRIAL','AGRICULTURAL','MINING','CONSTRUCTION','ENERGY','LOGISTICS','INFRASTRUCTURE','HEALTHCARE','EDUCATION','DOMESTIC_CONSUMER','EMERGENCY_DISASTER','SECURITY','DEFENCE_MILITARY','SCIENTIFIC'],
  embodiments: ['FIXED','WHEELED','TRACKED','LEGGED','AERIAL','SURFACE_VESSEL','UNDERWATER','TETHERED','SPACECRAFT','SWARM','SOFT_DEFORMABLE','HYBRID'],
  fidelity: ['L0_CONCEPTUAL','L1_FUNCTIONAL','L2_KINEMATIC','L3_DYNAMIC','L4_PHYSICS','L5_HIL','L6_HARDWARE','L7_FIELD'],
  verificationMethods: ['INSPECTION','ANALYSIS','DEMONSTRATION','TEST','SIMULATION','FORMAL_PROOF','REVIEW','CERTIFICATION','FIELD_OBSERVATION']
});

const ENTITY_TYPES = [
  'Person','Role','Organization','System','Subsystem','Component','Interface','Requirement','Capability','Mission','Environment',
  'Standard','Regulation','Artifact','Evidence','Test','Experiment','Dataset','Model','Supplier','Process','Customer','ServiceEvent',
  'Project','Simulation','Scenario','Benchmark','Hazard','FailureMode','SafetyCase','ComplianceCase','Configuration','Robot','Lesson',
  'Curriculum','Assessment','Patent','Publication','FundingOpportunity','BOMItem','ManufacturingOperation','ChangeRequest','Decision',
  'Incident','TelemetryStream','Policy','Intention','Plan','Execution'
];

const DEFAULT_CONFIG = {
  dataBasePath: './data/',
  locale: 'en-IN',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  currency: 'INR',
  defaultMode: 'NOVICE',
  complianceUnknownAction: 'HOLD',
  safetyUnknownAction: 'HOLD',
  strictUnits: true,
  strictProvenance: true,
  politicalTopicsDisabledInOperations: true
};

const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
const now = () => new Date().toISOString();
const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const assert = (x,m) => { if(!x) throw new Error(m); };

function deepMerge(a,b){
  if(!b || typeof b !== 'object') return a;
  for(const [k,v] of Object.entries(b)){
    if(v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k],v);
    else a[k]=clone(v);
  }
  return a;
}

export class EventBus {
  constructor(){ this.listeners = new Map(); }
  on(name,fn){ if(!this.listeners.has(name)) this.listeners.set(name,new Set()); this.listeners.get(name).add(fn); return ()=>this.off(name,fn); }
  off(name,fn){ this.listeners.get(name)?.delete(fn); }
  emit(name,payload={}){
    const e={magic:MAGIC,version:VERSION,event:name,timestamp:now(),payload};
    for(const fn of this.listeners.get(name)||[]) try{fn(e)}catch(err){console.error(err)}
    for(const fn of this.listeners.get('*')||[]) try{fn(e)}catch(err){console.error(err)}
    return e;
  }
}

export class EntityStore {
  constructor(bus){this.bus=bus;this.entities=new Map();this.relations=new Map();}
  add(e){
    assert(e?.id,'Entity requires id'); assert(ENTITY_TYPES.includes(e.type),`Unknown entity type: ${e.type}`);
    const n={...clone(e),schemaVersion:e.schemaVersion||SCHEMA_VERSION,createdAt:e.createdAt||now(),updatedAt:now()};
    this.entities.set(n.id,n); this.bus.emit('entity:add',{entity:n}); return n;
  }
  get(id){return this.entities.get(id)||null;}
  all(type){const a=[...this.entities.values()];return type?a.filter(x=>x.type===type):a;}
  find(fn){return this.all().filter(fn);}
  update(id,patch){const e=this.get(id);assert(e,`Entity not found: ${id}`);const n=deepMerge(clone(e),patch);n.updatedAt=now();this.entities.set(id,n);this.bus.emit('entity:update',{entity:n});return n;}
  remove(id){if(!this.entities.has(id))return false;this.entities.delete(id);for(const [k,r] of this.relations)if(r.from===id||r.to===id)this.relations.delete(k);return true;}
  relate(from,relation,to,metadata={}){assert(this.get(from),`Missing source ${from}`);assert(this.get(to),`Missing target ${to}`);const r={id:uid('rel'),from,relation,to,metadata:clone(metadata),createdAt:now()};this.relations.set(r.id,r);this.bus.emit('relation:add',{relation:r});return r;}
  relationsFrom(id,relation){return [...this.relations.values()].filter(r=>r.from===id&&(!relation||r.relation===relation));}
  relationsTo(id,relation){return [...this.relations.values()].filter(r=>r.to===id&&(!relation||r.relation===relation));}
  neighbors(id,relation){return [...new Set([...this.relationsFrom(id,relation).map(r=>r.to),...this.relationsTo(id,relation).map(r=>r.from)])].map(x=>this.get(x)).filter(Boolean);}
  export(){return{magic:MAGIC,version:VERSION,schemaVersion:SCHEMA_VERSION,exportedAt:now(),entities:this.all(),relations:[...this.relations.values()]};}
  import(s,{replace=true}={}){assert(s?.magic===MAGIC,'Invalid graph magic');if(replace){this.entities.clear();this.relations.clear()}for(const e of s.entities||[])this.add(e);for(const r of s.relations||[])if(this.get(r.from)&&this.get(r.to))this.relations.set(r.id||uid('rel'),r);}
}

export class ProvenanceEngine {
  constructor(store){this.store=store;}
  record({source,target,action,actor='system',evidence=[],notes=''}){return this.store.relate(source,'PROVENANCE_TO',target,{action,actor,evidence,notes,timestamp:now()});}
  chain(id,limit=20){const out=[];let cur=id;for(let i=0;i<limit;i++){const r=this.store.relationsTo(cur,'PROVENANCE_TO')[0];if(!r)break;out.push(r);cur=r.from}return out;}
}

export class RequirementsEngine {
  constructor(store,bus){this.store=store;this.bus=bus;}
  create(d){const r=this.store.add({type:'Requirement',id:d.id||uid('req'),title:d.title,statement:d.statement,rationale:d.rationale||'',typeOfRequirement:d.typeOfRequirement||'FUNCTIONAL',source:d.source||null,parent:d.parent||null,system:d.system||null,component:d.component||null,constraints:d.constraints||[],verificationMethod:d.verificationMethod||null,acceptanceCriterion:d.acceptanceCriterion||null,standardClauses:d.standardClauses||[],evidence:d.evidence||[],owner:d.owner||null,status:d.status||'DRAFT',baseline:d.baseline||null,changeHistory:d.changeHistory||[]});this.bus.emit('requirement:created',{requirement:r});return r;}
  orphans(){return this.store.all('Requirement').filter(r=>!r.system&&!r.component&&!r.parent);}
  unverified(){return this.store.all('Requirement').filter(r=>r.status!=='RETIRED'&&!r.evidence?.length);}
}

export class EvidenceEngine {
  constructor(store,bus){this.store=store;this.bus=bus;}
  create(d){const e=this.store.add({type:'Evidence',id:d.id||uid('evidence'),title:d.title,evidenceType:d.evidenceType||'OBSERVATION',status:d.status||'PROPOSED',source:d.source||null,subject:d.subject||null,method:d.method||null,dataset:d.dataset||null,experiment:d.experiment||null,test:d.test||null,version:d.version||null,provenance:d.provenance||[],result:d.result??null,limitations:d.limitations||[],reviewer:d.reviewer||null,timestamp:now()});this.bus.emit('evidence:created',{evidence:e});return e;}
}

export class SafetyEngine {
  constructor(store,bus){this.store=store;this.bus=bus;}
  hazard(d){return this.store.add({type:'Hazard',id:d.id||uid('haz'),title:d.title,description:d.description||'',category:d.category||'UNKNOWN',severity:d.severity??null,likelihood:d.likelihood??null,risk:d.risk??null,controls:d.controls||[],residualRisk:d.residualRisk??null,safeState:d.safeState||null,interlocks:d.interlocks||[],abortConditions:d.abortConditions||[],requiredPPE:d.requiredPPE||[],supervisionLevel:d.supervisionLevel||null,responsiblePerson:d.responsiblePerson||null,status:d.status||'UNKNOWN'});}
  assess({severity,likelihood,controls=[],residualRisk=null}){const risk=Number(severity)*Number(likelihood);return{severity:Number(severity),likelihood:Number(likelihood),risk,controls,residualRisk,recommendedStatus:risk>=15?'NO_GO':risk>=8?'REVIEW_REQUIRED':'APPROVED'};}
  canOperate(x){return !!x&&x.safetyStatus!=='NO_GO'&&x.safetyStatus!=='EMERGENCY'&&!(x.safetyStatus==='UNKNOWN');}
  checklist(systemId){return{checklistId:uid('safety'),systemId,createdAt:now(),items:[
    'Responsible operator identified','Competency authorization current','Risk assessment approved','Operating envelope defined','Emergency stop verified','Local safe state verified','Power isolation verified','Mechanical hazards controlled','Stored energy assessed','Sensors and calibration checked','Communications-loss behavior checked','Software watchdog checked','Hardware interlocks checked','Test area controlled','Environment acceptable','Emergency procedure available','Abort criteria understood','Configuration baseline recorded','Evidence/logging enabled'
  ]};}
}

export class ComplianceEngine {
  constructor(store,bus){this.store=store;this.bus=bus;}
  create(d){return this.store.add({type:'ComplianceCase',id:d.id||uid('compliance'),subject:d.subject||null,itemClassification:d.itemClassification||'UNKNOWN',origin:d.origin||null,destination:d.destination||null,endUser:d.endUser||null,endUse:d.endUse||null,transferMethod:d.transferMethod||null,remoteAccess:!!d.remoteAccess,technicalData:!!d.technicalData,softwareTransfer:!!d.softwareTransfer,aiModelAccess:!!d.aiModelAccess,manufacturingAssistance:!!d.manufacturingAssistance,currentSources:d.currentSources||[],licenses:d.licenses||[],restrictions:d.restrictions||[],reviewer:d.reviewer||null,expiration:d.expiration||null,status:d.status||'UNKNOWN',decision:d.decision||null,evidence:d.evidence||[]});}
  evaluate(p){const missing=[];if(!p.destination)missing.push('destination');if(!p.endUser)missing.push('endUser');if(!p.endUse)missing.push('endUse');if(!p.transferMethod)missing.push('transferMethod');if(p.itemClassification==='UNKNOWN')missing.push('itemClassification');if(missing.length)return{status:'UNDER_REVIEW',action:'HOLD',reasons:missing};if(['PROHIBITED','RESTRICTED'].includes(p.status))return{status:p.status,action:'NO_GO',reasons:['restricted profile']};if(p.status==='LICENSE_REQUIRED'&&!p.licenses?.length)return{status:'LICENSE_REQUIRED',action:'HOLD',reasons:['license evidence missing']};return{status:p.status==='UNKNOWN'?'UNDER_REVIEW':p.status,action:['NOT_CONTROLLED','LICENSE_GRANTED','EXEMPTION_CONFIRMED'].includes(p.status)?'GO_SUBJECT_TO_OTHER_CONTROLS':'HOLD',reasons:[]};}
  antiCircumvention(text=''){return ![/bypass\s+(export|sanction|embargo|license)/i,/circumvent\s+(export|sanction|embargo|license)/i,/conceal\s+(end.?user|destination|end.?use)/i,/evad(e|ing|es)\s+(sanction|embargo|export)/i/.some(re=>re.test(text));}
}

export class MissionEngine {
  constructor(store){this.store=store;}
  intention(d){return this.store.add({type:'Intention',id:d.id||uid('intent'),objective:d.objective,desiredOutcome:d.desiredOutcome||'',constraints:d.constraints||[],priorities:d.priorities||[],owner:d.owner||null});}
  policy(d){return this.store.add({type:'Policy',id:d.id||uid('policy'),scope:d.scope||'SYSTEM',permissions:d.permissions||[],safetyConstraints:d.safetyConstraints||[],legalConstraints:d.legalConstraints||[],resourceConstraints:d.resourceConstraints||[],humanAuthority:d.humanAuthority||[],complianceProfile:d.complianceProfile||null,version:d.version||'1.0.0'});}
  plan(d){return this.store.add({type:'Plan',id:d.id||uid('plan'),intention:d.intention||null,policy:d.policy||null,tasks:d.tasks||[],deadlines:d.deadlines||[],fallbacks:d.fallbacks||[],successCriteria:d.successCriteria||[],abortCriteria:d.abortCriteria||[]});}
  validateSeparation({intention,policy,plan}){const errors=[];if(intention?.type!=='Intention')errors.push('Intention required');if(policy?.type!=='Policy')errors.push('Policy required');if(plan?.type!=='Plan')errors.push('Plan required');if(plan?.intention!==intention?.id)errors.push('Plan must reference intention');if(plan?.policy!==policy?.id)errors.push('Plan must reference policy');return{valid:!errors.length,errors};}
  mission(d){return this.store.add({type:'Mission',id:d.id||uid('mission'),objective:d.objective,area:d.area||null,actors:d.actors||[],assets:d.assets||[],resources:d.resources||[],constraints:d.constraints||[],rules:d.rules||[],environment:d.environment||null,tasks:d.tasks||[],waypoints:d.waypoints||[],events:d.events||[],deadlines:d.deadlines||[],successCriteria:d.successCriteria||[],abortCriteria:d.abortCriteria||[],authority:d.authority||[],safety:d.safety||[],evidenceRequirements:d.evidenceRequirements||[]});}
}

export class ComponentRegistry {
  constructor(store){this.store=store;}
  register(d){return this.store.add({type:'Component',id:d.id||uid('component'),name:d.name,kind:d.kind||'GENERIC',vendor:d.vendor||null,version:d.version||'1.0.0',interfaceVersion:d.interfaceVersion||'1.0.0',capabilities:d.capabilities||[],interfaces:d.interfaces||[],parameters:d.parameters||{},dependencies:d.dependencies||[],compatibility:d.compatibility||{},simulationModel:d.simulationModel||null,physicalImplementation:d.physicalImplementation||null,manufacturing:d.manufacturing||null,verification:d.verification||[],safety:d.safety||{},sovereignty:d.sovereignty||{dependencyLevel:'DEPENDENCY',alternatives:[]},provenance:d.provenance||[]});}
  compatible(a,b){if(!a||!b)return false;const provides=new Set(a.capabilities||[]);return (b.dependencies||[]).every(x=>provides.has(x));}
  substitution(component,candidates=[]){return candidates.map(c=>({candidate:c,compatible:this.compatible(c,component),sovereignty:c.sovereignty?.dependencyLevel||'UNKNOWN',certification:c.certificationImpact||'UNKNOWN',manufacturing:c.manufacturingImpact||'UNKNOWN',cost:c.costImpact||'UNKNOWN',performance:c.performanceImpact||'UNKNOWN'}));}
}

const UNIT_DIMENSIONS={m:'length',mm:'length',cm:'length',km:'length',kg:'mass',g:'mass',s:'time',ms:'time',A:'current',V:'voltage',W:'power',N:'force',Nm:'torque',Pa:'pressure',Hz:'frequency',rad:'angle',deg:'angle',C:'temperature',K:'temperature',Wh:'energy',J:'energy',bit:'information',byte:'information'};

export class ContractEngine {
  validatePort(p){const missing=['id','name','direction','semanticType'].filter(k=>p?.[k]==null);return{valid:!missing.length,missing};}
  validateUnit(u){return{valid:!!UNIT_DIMENSIONS[u],dimension:UNIT_DIMENSIONS[u]||null};}
  validateComponent(c){const errors=[];for(const p of c.interfaces||[]){const r=this.validatePort(p);if(!r.valid)errors.push({interface:p.id||p.name,missing:r.missing});if(p.unit&&!this.validateUnit(p.unit).valid)errors.push({interface:p.id,error:`Unknown unit ${p.unit}`});}return{valid:!errors.length,errors};}
}

export class IREngine {
  create(d={}){return{magic:MAGIC,irMagic:'PAI-IR',irVersion:d.irVersion||'0.1.0',schemaVersion:SCHEMA_VERSION,targetIndependent:true,intention:d.intention||null,policy:d.policy||null,components:d.components||[],interfaces:d.interfaces||[],states:d.states||[],events:d.events||[],transitions:d.transitions||[],requirements:d.requirements||[],safetyConstraints:d.safetyConstraints||[],timing:d.timing||{clockDomains:[],logicalTime:true,deadlines:[]},resources:d.resources||{compute:[],memory:[],power:[],thermal:[],bandwidth:[]},ownership:d.ownership||{},scheduling:d.scheduling||{},targets:d.targets||['SIMULATION','COTS_CPU','FPGA','MATURE_NODE_MESH','ROBOT_MIDDLEWARE'],provenance:d.provenance||[],createdAt:now()};}
  validate(ir){const e=[];if(ir.magic!==MAGIC)e.push('invalid platform magic');if(ir.irMagic!=='PAI-IR')e.push('invalid IR magic');if(!ir.irVersion)e.push('missing IR version');for(const s of ir.states||[])if(!s.id||s.owner==null)e.push(`state requires id and owner: ${s.id||'<unnamed>'}`);for(const t of ir.transitions||[])for(const k of ['from','event','to'])if(!t[k])e.push(`transition missing ${k}`);return{valid:!e.length,errors:e};}
  schedule(ir){const v=this.validate(ir);if(!v.valid)return{validation:v,schedule:null};const buckets={SAFETY:[],CONTROL:[],STATE:[],BULK:[]};for(const e of ir.events||[])buckets[e.priority==='SAFETY'?'SAFETY':e.priority==='CONTROL'?'CONTROL':e.priority==='BULK'?'BULK':'STATE'].push(e);return{validation:v,schedule:{classes:buckets,order:['SAFETY','CONTROL','STATE','BULK'],starvationProtection:true}};}
}

export class NoCEngine {
  topology(){return{type:'2D_MESH',rows:3,columns:3,routing:'STATIC_OR_COMPILETIME',physicalLinks:'GALS_ASYNCHRONOUS',packetSemantics:'DETERMINISTIC'};}
  packet(d){return{version:1,source:d.source,destination:d.destination,route:d.route||[],eventType:d.eventType,priority:d.priority||'STATE',stateId:d.stateId||null,sequenceId:d.sequenceId||uid('seq'),timestamp:d.timestamp||now(),logicalTime:d.logicalTime??null,deadline:d.deadline??null,payload:d.payload??null,integrity:d.integrity||'UNSPECIFIED'};}
  deadline({compute=0,queue=0,route=0,execute=0,deadline}){const total=+compute + +queue + +route + +execute;return{totalLatency:total,deadline,met:Number.isFinite(+deadline)?total<+deadline:null};}
}

export const GATES=[
  ['G0','Opportunity','DISCOVER'],['G1','Concept','DEFINE'],['G2','Feasibility','RESEARCH'],['G3','Architecture','ARCHITECT'],['G4','Prototype','PROTOTYPE'],['G5','MVP','MVP'],['G6','Validation','VALIDATE'],['G7','Funding / Production Decision','FUND'],['G8','Production Release','MANUFACTURE'],['G9','Market Release','DEPLOY'],['G10','Operational Release','OPERATE'],['G11','Major Revision','IMPROVE'],['G12','Retirement','RETIRE']
].map(([id,name,stage])=>({id,name,stage}));

export class LifecycleEngine {
  constructor(store){this.store=store;}
  project(d){return this.store.add({type:'Project',id:d.id||uid('project'),name:d.name,mission:d.mission||null,domain:d.domain||null,embodiment:d.embodiment||null,lifecycleStage:d.lifecycleStage||'DISCOVER',status:d.status||'DRAFT',gate:d.gate||'G0',objectives:d.objectives||[],scope:d.scope||[],workstreams:d.workstreams||[],owners:d.owners||[],resources:d.resources||{},budget:d.budget||{},risks:d.risks||[],issues:d.issues||[],decisions:d.decisions||[],requirements:d.requirements||[],evidence:d.evidence||[],configuration:d.configuration||null,compliance:d.compliance||null,safety:d.safety||null});}
  transition(id,next,evidence=[]){const p=this.store.get(id);assert(p?.type==='Project','Project not found');const a=ENUMS.lifecycle.indexOf(p.lifecycleStage),b=ENUMS.lifecycle.indexOf(next);assert(b>=0,'Unknown lifecycle stage');assert(b>=a,'Backward transition requires explicit rebaseline');return this.store.update(id,{lifecycleStage:next,status:'ACTIVE',evidence:[...(p.evidence||[]),...evidence]});}
  readiness(id){const p=this.store.get(id);if(!p)return{ready:false,reasons:['Project not found']};const r=[];if(!p.objectives?.length)r.push('objectives missing');if(!p.requirements?.length)r.push('requirements missing');if(!p.safety)r.push('safety profile missing');if(!p.compliance)r.push('compliance profile missing');return{ready:!r.length,reasons:r};}
}

export class ConfigurationEngine {
  constructor(store){this.store=store;}
  snapshot(d){return this.store.add({type:'Configuration',id:d.id||uid('config'),system:d.system||null,mechanical:d.mechanical||null,electrical:d.electrical||null,firmware:d.firmware||null,software:d.software||null,irSchema:d.irSchema||null,components:d.components||[],simulationModel:d.simulationModel||null,aiModel:d.aiModel||null,parameters:d.parameters||{},standardsProfile:d.standardsProfile||null,testBaseline:d.testBaseline||null,status:d.status||'DRAFT'});}
  diff(a,b){const out=[];for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))if(JSON.stringify(a?.[k])!==JSON.stringify(b?.[k]))out.push({field:k,from:a?.[k],to:b?.[k]});return out;}
}

export class SimulationEngine {
  constructor(store){this.store=store;}
  create(d){return this.store.add({type:'Simulation',id:d.id||uid('sim'),name:d.name,system:d.system||null,fidelity:d.fidelity||'L0_CONCEPTUAL',modelVersion:d.modelVersion||null,parameters:d.parameters||{},initialConditions:d.initialConditions||{},environment:d.environment||{},randomSeed:d.randomSeed??0,eventSequence:d.eventSequence||[],clock:d.clock||{type:'LOGICAL'},softwareVersions:d.softwareVersions||{},hardwareVersions:d.hardwareVersions||{},metrics:d.metrics||[],failuresInjected:d.failuresInjected||[],results:d.results||null,reproducibility:d.reproducibility||'UNKNOWN',assumptions:d.assumptions||[],limitations:d.limitations||[]});}
  manifest(s){return{simulationId:s.id,modelVersion:s.modelVersion,parameters:s.parameters,initialConditions:s.initialConditions,environment:s.environment,randomSeed:s.randomSeed,eventSequence:s.eventSequence,clock:s.clock,softwareVersions:s.softwareVersions,hardwareVersions:s.hardwareVersions};}
}

export class ManufacturingEngine {
  constructor(store){this.store=store;}
  operation(d){return this.store.add({type:'ManufacturingOperation',id:d.id||uid('mfg'),name:d.name,material:d.material||null,process:d.process||null,machine:d.machine||null,tool:d.tool||null,fixture:d.fixture||null,tolerance:d.tolerance||null,inspection:d.inspection||[],skill:d.skill||null,cycleTime:d.cycleTime||null,yieldTarget:d.yieldTarget||null,calibration:d.calibration||[],postProcess:d.postProcess||[],workInstruction:d.workInstruction||null,safety:d.safety||{}});}
  bom(d){return this.store.add({type:'BOMItem',id:d.id||uid('bom'),system:d.system||null,partNumber:d.partNumber,revision:d.revision||'A',quantity:d.quantity??1,unit:d.unit||'EA',material:d.material||null,process:d.process||null,supplier:d.supplier||null,countryOfOrigin:d.countryOfOrigin||null,alternateParts:d.alternateParts||[],cost:d.cost||null,leadTime:d.leadTime||null,lifecycle:d.lifecycle||null,exportProfile:d.exportProfile||null});}
}

export class SovereigntyEngine {
  assess(d){const score=+d.criticality*+d.irreplaceability*+d.externalControl;return{score,criticality:+d.criticality,irreplaceability:+d.irreplaceability,externalControl:+d.externalControl,rawMaterials:d.rawMaterials||[],suppliers:d.suppliers||[],processes:d.manufacturingProcesses||[],alternatives:d.alternatives||[],architectureSubstitutions:d.architectureSubstitutions||[],status:d.status||'DEPENDENCY'};}
}

export class StandardsEngine {
  constructor(store){this.store=store;}
  create(d){return this.store.add({type:'Standard',id:d.id||uid('std'),identifier:d.identifier,title:d.title,issuer:d.issuer||null,jurisdiction:d.jurisdiction||null,domain:d.domain||[],embodiments:d.embodiments||[],lifecycleStages:d.lifecycleStages||[],mandatory:d.mandatory??false,voluntary:d.voluntary??true,market:d.market||[],prerequisites:d.prerequisites||[],relatedStandards:d.relatedStandards||[],supersedes:d.supersedes||[],supersededBy:d.supersededBy||[],nationalAdoption:d.nationalAdoption||[],regulatoryRelationship:d.regulatoryRelationship||[],certificationRelationship:d.certificationRelationship||[],testRequirements:d.testRequirements||[],documentationRequirements:d.documentationRequirements||[],evidenceRequired:d.evidenceRequired||[],revision:d.revision||null,effectiveDate:d.effectiveDate||null,officialSource:d.officialSource||null});}
  applicable(system){return this.store.all('Standard').filter(s=>(!s.domain?.length||s.domain.includes(system.domain)||s.domain.includes('ALL'))&&(!s.embodiments?.length||s.embodiments.includes(system.embodiment)||s.embodiments.includes('ALL')));}
}

export class EducationEngine {
  constructor(store){this.store=store;}
  curriculum(d){return this.store.add({type:'Curriculum',id:d.id||uid('curriculum'),name:d.name,level:d.level,board:d.board||null,jurisdiction:d.jurisdiction||null,subjects:d.subjects||[],learningObjectives:d.learningObjectives||[],competencies:d.competencies||[],prerequisites:d.prerequisites||[],academicCalendar:d.academicCalendar||{},source:d.source||null});}
  lesson(d){return this.store.add({type:'Lesson',id:d.id||uid('lesson'),curriculum:d.curriculum||null,grade:d.grade||null,subject:d.subject||null,topic:d.topic,prerequisites:d.prerequisites||[],objectives:d.objectives||[],vocabulary:d.vocabulary||[],concepts:d.concepts||[],explanation:d.explanation||'',demonstration:d.demonstration||null,activities:d.activities||[],lab:d.lab||null,safety:d.safety||[],expectedObservations:d.expectedObservations||[],misconceptions:d.misconceptions||[],differentiation:d.differentiation||{},assessment:d.assessment||[],homework:d.homework||[],extension:d.extension||[],researchExtension:d.researchExtension||[],innovationExtension:d.innovationExtension||[]});}
  dailyPlan(d){return{date:d.date||now().slice(0,10),grade:d.grade,subject:d.subject,topic:d.topic,curriculumObjective:d.curriculumObjective,prerequisites:d.prerequisites||[],learningObjectives:d.learningObjectives||[],sequence:[['RECALL',5],['EXPLAIN',10],['DEMONSTRATE',10],['ACTIVITY',15],['ASSESS',10],['EXTEND',5]].map(([phase,minutes])=>({phase,minutes})),safety:d.safety||[],differentiation:d.differentiation||{},evidence:d.evidence||[]};}
}

export class ArtifactCompiler {
  constructor(store){this.store=store;}
  create(d){return this.store.add({type:'Artifact',id:d.id||uid('artifact'),artifactType:d.artifactType,title:d.title,project:d.project||null,sourceModel:d.sourceModel||null,requirements:d.requirements||[],evidence:d.evidence||[],standards:d.standards||[],provenance:d.provenance||[],status:d.status||'DRAFT',content:d.content||{},generatedAt:now()});}
  fromProject(p){return['ARCHITECTURE','REQUIREMENTS_SPEC','TECHNICAL_REPORT','EDUCATIONAL_PROJECT'].map(t=>this.create({artifactType:t,title:`${p.name} - ${t}`,project:p.id,sourceModel:p.id}));}
}

export class AccessController {
  constructor(){this.session={userId:null,roles:[],authorities:[],jurisdictions:[],capabilities:[],projectIds:[]};}
  set(s){this.session={...this.session,...clone(s)};}
  hasAuthority(x){return this.session.authorities.includes(x);}
  hasCapability(x){return this.session.capabilities.includes(x);}
  can(x){return this.hasAuthority(x)||this.hasCapability(x);}
  clear(){this.session={userId:null,roles:[],authorities:[],jurisdictions:[],capabilities:[],projectIds:[]};}
}

export class CockpitEngine {
  constructor(access){this.access=access;}
  checklist(){return [
    ['IDENTITY','Operator identity verified','CRITICAL'],['AUTHORITY','Explicit command authority verified','CRITICAL'],['JURISDICTION','Operator and robot jurisdictions identified','CRITICAL'],['COMPLIANCE','Dual-use/export/embargo status reviewed','CRITICAL'],['MISSION','Mission and operating area confirmed','HIGH'],['SAFETY','Risk assessment approved','CRITICAL'],['SAFETY','Emergency stop/local safe state verified','CRITICAL'],['SYSTEM','Configuration baseline verified','HIGH'],['SYSTEM','Firmware/software/model versions verified','HIGH'],['SENSORS','Required sensors calibrated','HIGH'],['POWER','Power and stored energy verified','CRITICAL'],['COMMUNICATION','Latency/packet-loss/link health acceptable','HIGH'],['FAILURE','Communications-loss behavior verified','CRITICAL'],['CONTROL','Motion/torque/acceleration/workspace limits active','CRITICAL'],['ENVIRONMENT','Environment within operating envelope','HIGH'],['PEOPLE','Affected people accounted for','CRITICAL'],['CULTURE','Local communication/cultural protocol acknowledged','MEDIUM'],['POLITICAL_NEUTRALITY','Operational channel remains non-political','MEDIUM'],['EMERGENCY','Emergency procedure/contact available','CRITICAL'],['GO_NO_GO','All critical checks passed','CRITICAL']
  ].map(([phase,check,severity])=>({id:uid('check'),phase,check,severity,state:'UNRESOLVED'}));}
  evaluate(c={}){const f=[];if(!this.access.can('COMMAND'))f.push('command authority missing');if(c.complianceStatus!=='NOT_CONTROLLED'&&c.complianceStatus!=='LICENSE_GRANTED'&&c.complianceStatus!=='EXEMPTION_CONFIRMED')f.push('compliance not cleared');if(c.safetyStatus!=='APPROVED'&&c.safetyStatus!=='ACTIVE')f.push('safety not cleared');if(c.emergencyStopVerified!==true)f.push('emergency stop not verified');if(c.configurationVerified!==true)f.push('configuration not verified');if(c.environmentWithinLimits!==true)f.push('environment unknown/out of limits');if(c.communicationsHealthy!==true)f.push('communications unhealthy');return{decision:f.length?'NO_GO':'GO',failures:f,checkedAt:now()};}
}

export class Internationalization {
  constructor(config){this.config=config;}
  context(){return{language:this.config.locale.split('-')[0],locale:this.config.locale,timezone:this.config.timezone,currency:this.config.currency,jurisdiction:null,script:null,measurementSystem:null};}
  culturalProtocol(){return{politicalTopicsInOperations:'DISALLOWED',respectIndividualDifferences:true,avoidStereotyping:true,avoidNationalityAssumptions:true,respectLocalLaw:true,respectInternationalLaw:true,useDeclaredLanguagePreferences:true,useDeclaredAccessibilityPreferences:true,resolveAmbiguityByClarification:true};}
}

export class AIGuide {
  prompt(context={}){return['You are an assistant inside the Physical AI Sovereign Platform.','Treat the supplied graph and evidence as context, not as authority beyond its evidence.','Do not invent standards, laws, measurements, citations, safety approvals, compliance clearances or capabilities.','Separate INTENTION -> POLICY -> PLANNING -> EXECUTION -> OBSERVATION.','For physical systems, identify hazards and verification requirements before recommending action.','For international or regulated work, flag uncertainty and require human review.','CONTEXT:',JSON.stringify(context,null,2)].join('\n');}
}

export class Validator {
  constructor(store){this.store=store;}
  graph(){const errors=[],warnings=[];for(const e of this.store.all()){if(!e.id)errors.push('entity missing id');if(!e.type)errors.push(`${e.id}: type missing`);if(!e.schemaVersion)warnings.push(`${e.id}: schemaVersion missing`);}for(const r of this.store.relations.values()){if(!this.store.get(r.from))errors.push(`${r.id}: broken source`);if(!this.store.get(r.to))errors.push(`${r.id}: broken target`);}return{valid:!errors.length,errors,warnings,counts:Object.fromEntries(ENTITY_TYPES.map(t=>[t,this.store.all(t).length]))};}
}

export class DataLoader {
  constructor(config,bus){this.config=config;this.bus=bus;this.cache=new Map();}
  async json(path){const url=new URL(path,new URL(this.config.dataBasePath,location.href));if(this.cache.has(url.href))return clone(this.cache.get(url.href));const r=await fetch(url);if(!r.ok)throw new Error(`Failed to load ${url}: ${r.status}`);const x=await r.json();this.cache.set(url.href,x);this.bus.emit('data:loaded',{url:url.href});return clone(x);}
}

export class Persistence {
  constructor(key='physical-ai-platform'){this.key=key;}
  save(x){localStorage.setItem(this.key,JSON.stringify(x));}
  load(){const x=localStorage.getItem(this.key);return x?JSON.parse(x):null;}
  clear(){localStorage.removeItem(this.key);}
}

export const ROUTES={
  '/':'landing','/explore':'explore','/learn':'learn','/research':'research','/build':'build','/startup':'startup',
  '/manufacture':'manufacture','/deploy':'deploy','/regulate':'regulate','/standards':'standards','/simulation':'simulation',
  '/teleoperation':'teleoperation','/education':'education','/projects':'projects','/systems':'systems','/components':'components',
  '/evidence':'evidence','/compliance':'compliance','/safety':'safety'
};

export class Router {
  constructor(bus){this.bus=bus;}
  current(){return location.hash.replace(/^#/,'')||'/';}
  navigate(path){location.hash=path;}
  start(){const render=()=>this.bus.emit('route:change',{path:this.current(),view:ROUTES[this.current()]||'not-found'});addEventListener('hashchange',render);render();}
}

export class PhysicalAIPlatform {
  constructor(options={}){
    this.config=deepMerge(clone(DEFAULT_CONFIG),options); this.bus=new EventBus(); this.store=new EntityStore(this.bus);
    this.provenance=new ProvenanceEngine(this.store); this.requirements=new RequirementsEngine(this.store,this.bus); this.evidence=new EvidenceEngine(this.store,this.bus);
    this.safety=new SafetyEngine(this.store,this.bus); this.compliance=new ComplianceEngine(this.store,this.bus); this.missions=new MissionEngine(this.store);
    this.components=new ComponentRegistry(this.store); this.contracts=new ContractEngine(); this.ir=new IREngine(); this.noc=new NoCEngine();
    this.lifecycle=new LifecycleEngine(this.store); this.configuration=new ConfigurationEngine(this.store); this.simulation=new SimulationEngine(this.store);
    this.manufacturing=new ManufacturingEngine(this.store); this.sovereignty=new SovereigntyEngine(); this.standards=new StandardsEngine(this.store);
    this.education=new EducationEngine(this.store); this.artifacts=new ArtifactCompiler(this.store); this.access=new AccessController();
    this.cockpit=new CockpitEngine(this.access); this.i18n=new Internationalization(this.config); this.ai=new AIGuide(); this.validator=new Validator(this.store);
    this.persistence=new Persistence(); this.loader=new DataLoader(this.config,this.bus); this.router=new Router(this.bus); this.ready=false;
  }
  initialize({restore=true,seed=false,startRouter=true}={}){
    if(restore){try{const s=this.persistence.load();if(s?.magic===MAGIC)this.store.import(s,{replace:true});}catch(e){console.warn('restore skipped',e)}}
    if(seed&&this.store.all().length===0)seedDemo(this); if(startRouter&&typeof window!=='undefined')this.router.start(); this.ready=true;this.bus.emit('platform:ready',{version:VERSION,schemaVersion:SCHEMA_VERSION});return this;
  }
  save(){this.persistence.save(this.store.export());this.bus.emit('platform:saved');}
  export(){return{metadata:{magic:MAGIC,version:VERSION,schemaVersion:SCHEMA_VERSION,exportedAt:now()},config:clone(this.config),graph:this.store.export()};}
  import(bundle){assert(bundle?.metadata?.magic===MAGIC,'Invalid platform bundle');this.store.import(bundle.graph,{replace:true});this.bus.emit('platform:imported',{bundle});}
  status(){return{magic:MAGIC,version:VERSION,schemaVersion:SCHEMA_VERSION,ready:this.ready,entities:this.store.all().length,relations:this.store.relations.size,locale:this.config.locale,timezone:this.config.timezone,complianceUnknownAction:this.config.complianceUnknownAction,safetyUnknownAction:this.config.safetyUnknownAction};}
}

export function seedDemo(p){
  const robot=p.store.add({type:'Robot',id:'robot.demo.humanoid',name:'Demo Modular Humanoid',domain:'TERRESTRIAL',embodiment:'LEGGED',safetyStatus:'UNKNOWN'});
  const motor=p.components.register({id:'component.demo.actuator',name:'Modular BLDC Actuator',kind:'ACTUATOR',capabilities:['TORQUE_CONTROL','POSITION_CONTROL'],interfaces:[{id:'power.in',name:'Power',direction:'IN',semanticType:'POWER',unit:'V'},{id:'torque.out',name:'Torque',direction:'OUT',semanticType:'TORQUE',unit:'Nm'},{id:'encoder.out',name:'Encoder',direction:'OUT',semanticType:'STATE'}],safety:{interlocks:['WATCHDOG','CURRENT_LIMIT']}});
  const req=p.requirements.create({id:'req.demo.safe-stop',title:'Safe Stop',statement:'The system shall enter a defined safe state when emergency stop is asserted.',verificationMethod:'TEST'});
  const haz=p.safety.hazard({id:'hazard.demo.motion',title:'Unexpected Motion',category:'MECHANICAL',severity:5,likelihood:2,controls:['Emergency stop','Reduced-speed commissioning','Workspace restriction','Watchdog','Torque limit'],safeState:'MOTORS_DISABLED'});
  const comp=p.compliance.create({id:'compliance.demo',subject:robot.id,itemClassification:'UNKNOWN',endUse:'Education and research',transferMethod:'REMOTE_ACCESS',remoteAccess:true,status:'UNKNOWN'});
  const project=p.lifecycle.project({id:'project.demo',name:'Physical AI Platform Demonstrator',mission:'Demonstrate concept-to-field digital thread',domain:'TERRESTRIAL',embodiment:'LEGGED',lifecycleStage:'ARCHITECT',objectives:['Represent system architecture','Trace requirements to evidence','Support simulation and physical promotion'],requirements:[req.id],safety:haz.id,compliance:comp.id});
  p.store.relate(project.id,'HAS_ROBOT',robot.id);p.store.relate(project.id,'USES_COMPONENT',motor.id);p.store.relate(project.id,'HAS_REQUIREMENT',req.id);p.store.relate(project.id,'HAS_HAZARD',haz.id);p.store.relate(project.id,'HAS_COMPLIANCE_CASE',comp.id);
  return{robot,motor,req,haz,comp,project};
}

export const platform = new PhysicalAIPlatform();

if(typeof window!=='undefined') window.PhysicalAI=Object.freeze({version:VERSION,magic:MAGIC,schemaVersion:SCHEMA_VERSION,enums:ENUMS,gates:GATES,platform,seedDemo:()=>seedDemo(platform)});

export { VERSION, MAGIC, SCHEMA_VERSION, ENTITY_TYPES, DEFAULT_CONFIG };


/* ==========================================================================
 * DETAILED ARCHITECTURAL SPINE EXTENSION
 * Version 0.2.0
 *
 * This section turns the compact spine into a more explicit architecture
 * contract for downstream AI/developer implementation.
 *
 * The platform remains static-first and GitHub Pages compatible.
 * ========================================================================== */

export const ARCHITECTURE_VERSION = "0.2.0";

export const PLATFORM_PRINCIPLES = Object.freeze({
  STATIC_FIRST: true,
  KNOWLEDGE_GRAPH_FIRST: true,
  WORKFLOW_FIRST: true,
  EVIDENCE_FIRST: true,
  SAFETY_FIRST: true,
  PROVENANCE_FIRST: true,
  INTERFACE_OVER_VENDOR: true,
  AI_PROVIDER_INDEPENDENT: true,
  HUMAN_AUTHORITY_REQUIRED_FOR_HIGH_RISK_ACTIONS: true,
  UNKNOWN_COMPLIANCE_MEANS_HOLD: true,
  UNKNOWN_SAFETY_MEANS_HOLD: true,
  POLITICAL_NEUTRALITY_IN_OPERATIONAL_CHANNELS: true,
  CULTURAL_PROTOCOL_WITHOUT_STEREOTYPING: true
});

/* --------------------------------------------------------------------------
 * CANONICAL IDENTIFIERS
 * -------------------------------------------------------------------------- */

export const ID_PREFIXES = Object.freeze({
  person: "person",
  organization: "org",
  system: "sys",
  subsystem: "subsys",
  component: "comp",
  interface: "iface",
  requirement: "req",
  capability: "cap",
  mission: "mission",
  environment: "env",
  standard: "std",
  regulation: "reg",
  artifact: "artifact",
  evidence: "evidence",
  test: "test",
  experiment: "exp",
  dataset: "dataset",
  model: "model",
  supplier: "supplier",
  process: "process",
  customer: "customer",
  serviceEvent: "service",
  project: "project",
  simulation: "sim",
  scenario: "scenario",
  benchmark: "bench",
  hazard: "hazard",
  failureMode: "failure",
  safetyCase: "safety",
  complianceCase: "compliance",
  configuration: "config",
  robot: "robot",
  lesson: "lesson",
  curriculum: "curriculum",
  assessment: "assessment",
  patent: "patent",
  publication: "pub",
  fundingOpportunity: "fund",
  bomItem: "bom",
  manufacturingOperation: "mfg",
  changeRequest: "change",
  decision: "decision",
  incident: "incident",
  telemetryStream: "telemetry",
  policy: "policy",
  intention: "intent",
  plan: "plan",
  execution: "exec"
});

/* --------------------------------------------------------------------------
 * COMPLETE DOMAIN TAXONOMY
 * -------------------------------------------------------------------------- */

export const DOMAIN_PROFILES = Object.freeze({
  TERRESTRIAL: {
    hazards: ["IMPACT","TRACTION_LOSS","OBSTACLE","TRAFFIC","WEATHER"],
    primarySensors: ["IMU","ENCODER","CAMERA","LIDAR","ULTRASONIC"],
    actuators: ["BLDC","PMSM","GEARED_MOTOR","LINEAR_ACTUATOR"],
    environmentalFactors: ["VIBRATION","DUST","RAIN","TEMPERATURE"]
  },

  MARINE: {
    hazards: ["DROWNING","PROPELLER","ENTANGLEMENT","CURRENT","VESSEL_TRAFFIC"],
    primarySensors: ["IMU","GNSS","DEPTH","CAMERA","SONAR"],
    actuators: ["THRUSTER","BLDC","PUMP"],
    environmentalFactors: ["CORROSION","WATER_INGRESS","WAVES","CURRENT"]
  },

  SUBSEA: {
    hazards: ["PRESSURE","WATER_INGRESS","ENTANGLEMENT","TETHER","BUOYANCY"],
    primarySensors: ["PRESSURE","IMU","SONAR","DEPTH","CAMERA"],
    actuators: ["THRUSTER","DIRECT_DRIVE","MAGNETIC_COUPLING"],
    environmentalFactors: ["HYDROSTATIC_PRESSURE","CORROSION","LOW_LIGHT","THERMAL"]
  },

  AERIAL: {
    hazards: ["PROPELLER","FALL","AIRSPACE","BATTERY","WEATHER"],
    primarySensors: ["IMU","GNSS","BAROMETER","OPTICAL_FLOW","CAMERA"],
    actuators: ["OUTRUNNER_BLDC","ESC","SERVO"],
    environmentalFactors: ["WIND","TEMPERATURE","PRECIPITATION"]
  },

  AEROSPACE_ORBITAL: {
    hazards: ["VACUUM","RADIATION","LAUNCH_VIBRATION","THERMAL","LOSS_OF_CONTACT"],
    primarySensors: ["IMU","SUN_SENSOR","MAGNETOMETER","STAR_TRACKER"],
    actuators: ["REACTION_WHEEL","THRUSTER","SERVO"],
    environmentalFactors: ["VACUUM","RADIATION","THERMAL_CYCLING","MICROGRAVITY"]
  },

  INDUSTRIAL: {
    hazards: ["CRUSH","PINCH","MOTION","ENERGY","PROCESS_HAZARD"],
    primarySensors: ["ENCODER","VISION","FORCE_TORQUE","PROXIMITY"],
    actuators: ["SERVO","BLDC","LINEAR_ACTUATOR","PNEUMATIC"],
    environmentalFactors: ["VIBRATION","DUST","TEMPERATURE","EMI"]
  },

  AGRICULTURAL: {
    hazards: ["MACHINERY","CHEMICAL","TERRAIN","WEATHER","ANIMALS"],
    primarySensors: ["GNSS","CAMERA","IMU","MOISTURE","FORCE"],
    actuators: ["WHEEL","PUMP","VALVE","ARM"],
    environmentalFactors: ["DUST","MUD","RAIN","HEAT"]
  },

  SCIENTIFIC: {
    hazards: ["EXPERIMENTAL_ENERGY","PRESSURE","VACUUM","CHEMICAL","RADIATION"],
    primarySensors: ["DOMAIN_SPECIFIC"],
    actuators: ["DOMAIN_SPECIFIC"],
    environmentalFactors: ["EXPERIMENT_SPECIFIC"]
  }
});

/* --------------------------------------------------------------------------
 * EMBODIMENT PROFILES
 * -------------------------------------------------------------------------- */

export const EMBODIMENT_PROFILES = Object.freeze({
  FIXED: {
    mobility: false,
    typicalInterfaces: ["POWER","DATA","THERMAL","MECHANICAL"],
    safetyFocus: ["ENERGY","ACCESS","MAINTENANCE"]
  },
  WHEELED: {
    mobility: true,
    typicalInterfaces: ["MOTOR","ENCODER","IMU","POWER","COMMUNICATION"],
    safetyFocus: ["MOTION","COLLISION","BRAKING"]
  },
  TRACKED: {
    mobility: true,
    typicalInterfaces: ["MOTOR","ENCODER","IMU","POWER"],
    safetyFocus: ["MOTION","ENTANGLEMENT","TERRAIN"]
  },
  LEGGED: {
    mobility: true,
    typicalInterfaces: ["ACTUATOR","ENCODER","IMU","FORCE_TORQUE","POWER"],
    safetyFocus: ["BALANCE","FALL","PINCH","IMPACT"]
  },
  AERIAL: {
    mobility: true,
    typicalInterfaces: ["ESC","MOTOR","IMU","GNSS","POWER"],
    safetyFocus: ["AIRSPACE","FALL","PROPELLER","BATTERY"]
  },
  SURFACE_VESSEL: {
    mobility: true,
    typicalInterfaces: ["THRUSTER","GNSS","IMU","RADIO","POWER"],
    safetyFocus: ["DROWNING","VESSEL_TRAFFIC","PROPELLER"]
  },
  UNDERWATER: {
    mobility: true,
    typicalInterfaces: ["THRUSTER","PRESSURE","IMU","SONAR","TETHER"],
    safetyFocus: ["PRESSURE","WATER_INGRESS","TETHER"]
  },
  SPACECRAFT: {
    mobility: true,
    typicalInterfaces: ["POWER","AVIONICS","TELEMETRY","ATTITUDE_CONTROL"],
    safetyFocus: ["VACUUM","RADIATION","THERMAL","COMMUNICATION"]
  },
  SWARM: {
    mobility: true,
    typicalInterfaces: ["INTER_ROBOT_COMMS","LOCALIZATION","POWER"],
    safetyFocus: ["COLLECTIVE_BEHAVIOUR","COMMUNICATION","IDENTITY"]
  }
});

/* --------------------------------------------------------------------------
 * SYSTEM MODEL SCHEMA
 * -------------------------------------------------------------------------- */

export const SYSTEM_SCHEMA = Object.freeze({
  required: [
    "id",
    "name",
    "mission",
    "domain",
    "embodiment",
    "requirements",
    "architecture",
    "configuration",
    "safety",
    "compliance"
  ],

  fields: {
    id: "durable system identifier",
    name: "human-readable system name",
    mission: "mission reference",
    domain: "operational domain",
    embodiment: "physical embodiment",
    requirements: "requirement identifiers",
    architecture: "architecture model",
    subsystems: "subsystem identifiers",
    components: "component identifiers",
    interfaces: "interface identifiers",
    software: "software configuration",
    firmware: "firmware configuration",
    aiModels: "AI model identifiers",
    datasets: "dataset identifiers",
    simulations: "simulation identifiers",
    configurations: "configuration identifiers",
    standardsProfile: "standards profile",
    safety: "safety case/profile",
    compliance: "legal/export/compliance profile",
    manufacturing: "manufacturing definition",
    logistics: "logistics definition",
    operations: "operational definition",
    service: "service definition",
    billing: "billing definition",
    provenance: "provenance chain"
  }
});

/* --------------------------------------------------------------------------
 * COMPONENT ABI
 * -------------------------------------------------------------------------- */

export const COMPONENT_ABI = Object.freeze({
  magic: "PAI-COMPONENT",
  required: [
    "id",
    "name",
    "version",
    "interfaceVersion",
    "capabilities",
    "interfaces"
  ],

  interfaceContract: {
    required: [
      "id",
      "name",
      "direction",
      "semanticType"
    ],

    optional: [
      "unit",
      "dataType",
      "range",
      "rate",
      "latency",
      "jitter",
      "precision",
      "power",
      "thermal",
      "environment",
      "safety",
      "authority",
      "compatibility"
    ]
  },

  semanticRules: [
    "Interfaces are typed.",
    "Units are explicit.",
    "Direction is explicit.",
    "Timing constraints are explicit where relevant.",
    "Safety limits are explicit for physical components.",
    "Version compatibility is explicit.",
    "Provenance is retained.",
    "Substitution candidates are first-class objects."
  ]
});

/* --------------------------------------------------------------------------
 * STANDARD PORT TYPES
 * -------------------------------------------------------------------------- */

export const PORT_TYPES = Object.freeze({
  POWER_IN: {
    direction: "IN",
    semanticType: "POWER"
  },
  POWER_OUT: {
    direction: "OUT",
    semanticType: "POWER"
  },
  TELEMETRY_OUT: {
    direction: "OUT",
    semanticType: "TELEMETRY"
  },
  COMMAND_IN: {
    direction: "IN",
    semanticType: "COMMAND"
  },
  STATE_IN: {
    direction: "IN",
    semanticType: "STATE"
  },
  STATE_OUT: {
    direction: "OUT",
    semanticType: "STATE"
  },
  EVENT_IN: {
    direction: "IN",
    semanticType: "EVENT"
  },
  EVENT_OUT: {
    direction: "OUT",
    semanticType: "EVENT"
  },
  DIAGNOSTICS_OUT: {
    direction: "OUT",
    semanticType: "DIAGNOSTICS"
  },
  SAFETY_IN: {
    direction: "IN",
    semanticType: "SAFETY"
  },
  SAFETY_OUT: {
    direction: "OUT",
    semanticType: "SAFETY"
  }
});

/* --------------------------------------------------------------------------
 * ROBOT ABI EVENTS
 * -------------------------------------------------------------------------- */

export const STANDARD_EVENTS = Object.freeze({
  SYSTEM_BOOT: "SYSTEM_BOOT",
  SYSTEM_READY: "SYSTEM_READY",
  SYSTEM_FAULT: "SYSTEM_FAULT",
  EMERGENCY_STOP: "EMERGENCY_STOP",
  SAFE_STATE_ENTERED: "SAFE_STATE_ENTERED",
  SAFE_STATE_EXITED: "SAFE_STATE_EXITED",
  HEARTBEAT: "HEARTBEAT",
  WATCHDOG_TIMEOUT: "WATCHDOG_TIMEOUT",
  SENSOR_UPDATE: "SENSOR_UPDATE",
  STATE_UPDATE: "STATE_UPDATE",
  COMMAND_RECEIVED: "COMMAND_RECEIVED",
  COMMAND_REJECTED: "COMMAND_REJECTED",
  COMMAND_COMPLETED: "COMMAND_COMPLETED",
  DEADLINE_MISSED: "DEADLINE_MISSED",
  COMMUNICATION_LOSS: "COMMUNICATION_LOSS",
  COMMUNICATION_RESTORED: "COMMUNICATION_RESTORED",
  POWER_WARNING: "POWER_WARNING",
  POWER_CRITICAL: "POWER_CRITICAL",
  THERMAL_WARNING: "THERMAL_WARNING",
  THERMAL_CRITICAL: "THERMAL_CRITICAL",
  CALIBRATION_REQUIRED: "CALIBRATION_REQUIRED",
  MAINTENANCE_REQUIRED: "MAINTENANCE_REQUIRED",
  MISSION_START: "MISSION_START",
  MISSION_ABORT: "MISSION_ABORT",
  MISSION_COMPLETE: "MISSION_COMPLETE"
});

/* --------------------------------------------------------------------------
 * ROBOT STATE MACHINE
 * -------------------------------------------------------------------------- */

export const ROBOT_STATES = Object.freeze([
  "STORED_SAFE",
  "CONFIGURATION_VERIFIED",
  "POWER_ISOLATED",
  "POWER_UP",
  "SELF_TEST",
  "AUTHORITY_VERIFIED",
  "LOW_ENERGY_COMMISSIONING",
  "CONTROLLED_OPERATION",
  "FULL_OPERATION",
  "SAFE_STATE",
  "DEGRADED",
  "EMERGENCY",
  "RECOVERY",
  "MAINTENANCE"
]);

export const ROBOT_STATE_TRANSITIONS = Object.freeze([
  ["STORED_SAFE","CONFIGURATION_VERIFIED"],
  ["CONFIGURATION_VERIFIED","POWER_ISOLATED"],
  ["POWER_ISOLATED","POWER_UP"],
  ["POWER_UP","SELF_TEST"],
  ["SELF_TEST","AUTHORITY_VERIFIED"],
  ["AUTHORITY_VERIFIED","LOW_ENERGY_COMMISSIONING"],
  ["LOW_ENERGY_COMMISSIONING","CONTROLLED_OPERATION"],
  ["CONTROLLED_OPERATION","FULL_OPERATION"],
  ["FULL_OPERATION","SAFE_STATE"],
  ["FULL_OPERATION","DEGRADED"],
  ["FULL_OPERATION","EMERGENCY"],
  ["CONTROLLED_OPERATION","SAFE_STATE"],
  ["LOW_ENERGY_COMMISSIONING","SAFE_STATE"],
  ["DEGRADED","RECOVERY"],
  ["RECOVERY","CONTROLLED_OPERATION"],
  ["RECOVERY","MAINTENANCE"],
  ["EMERGENCY","SAFE_STATE"],
  ["SAFE_STATE","MAINTENANCE"],
  ["MAINTENANCE","CONFIGURATION_VERIFIED"]
]);

/* --------------------------------------------------------------------------
 * FAILURE ONTOLOGY
 * -------------------------------------------------------------------------- */

export const FAILURE_ONTOLOGY = Object.freeze({
  categories: [
    "COMPONENT",
    "INTERFACE",
    "TIMING",
    "POWER",
    "THERMAL",
    "COMMUNICATION",
    "SENSOR",
    "ACTUATOR",
    "SOFTWARE",
    "MODEL",
    "HUMAN",
    "ENVIRONMENT",
    "SUPPLY",
    "MANUFACTURING",
    "CYBER",
    "DATA",
    "CALIBRATION",
    "CONFIGURATION"
  ],

  lifecycle: [
    "DETECTION",
    "DIAGNOSIS",
    "CONTAINMENT",
    "RECOVERY",
    "DEGRADED_OPERATION",
    "REPAIR",
    "VERIFICATION",
    "ROOT_CAUSE",
    "CORRECTIVE_ACTION",
    "DESIGN_CHANGE"
  ]
});

/* --------------------------------------------------------------------------
 * RESILIENCE MODES
 * -------------------------------------------------------------------------- */

export const RESILIENCE_MODES = Object.freeze([
  "FULL",
  "REDUCED",
  "DEGRADED",
  "SAFE",
  "EMERGENCY",
  "RECOVERY",
  "MANUAL",
  "ISOLATED",
  "PARTIAL_CAPABILITY"
]);

/* --------------------------------------------------------------------------
 * DIGITAL THREAD
 * -------------------------------------------------------------------------- */

export const DIGITAL_THREAD = Object.freeze([
  "MISSION",
  "CONOPS",
  "STAKEHOLDER_NEED",
  "REQUIREMENT",
  "ARCHITECTURE",
  "COMPONENT",
  "INTERFACE",
  "SIMULATION",
  "DESIGN",
  "MANUFACTURING",
  "TEST",
  "CONFIGURATION",
  "DEPLOYMENT",
  "TELEMETRY",
  "MAINTENANCE",
  "FIELD_EVIDENCE",
  "NEXT_REQUIREMENT"
]);

/* --------------------------------------------------------------------------
 * BOM TAXONOMY
 * -------------------------------------------------------------------------- */

export const BOM_TYPES = Object.freeze([
  "EBOM",
  "MBOM",
  "SBOM",
  "HBOM",
  "CBOM",
  "ABOM",
  "SYSTEM_BOM"
]);

/* --------------------------------------------------------------------------
 * SECURITY MODEL
 * -------------------------------------------------------------------------- */

export const SECURITY_MODEL = Object.freeze({
  capabilities: [
    "VIEW_TELEMETRY",
    "VIEW_CONFIGURATION",
    "COMMAND_ROBOT",
    "MODIFY_MISSION",
    "MODIFY_POLICY",
    "UPDATE_FIRMWARE",
    "ACCESS_SOURCE",
    "ACCESS_CAD",
    "ACCESS_MANUFACTURING_DATA",
    "EXPORT_DATA",
    "ADMINISTER_SYSTEM"
  ],

  controls: [
    "IDENTITY",
    "AUTHENTICATION",
    "AUTHORIZATION",
    "LEAST_PRIVILEGE",
    "SECURE_BOOT",
    "FIRMWARE_SIGNING",
    "SBOM",
    "VULNERABILITY_TRACKING",
    "KEY_MANAGEMENT",
    "CERTIFICATE_MANAGEMENT",
    "AUDIT_LOG",
    "SECURE_UPDATE",
    "ROLLBACK",
    "NETWORK_SEGMENTATION",
    "ISOLATION"
  ]
});

/* --------------------------------------------------------------------------
 * INTERNATIONAL TELEOPERATION MODEL
 * -------------------------------------------------------------------------- */

export const INTERNATIONAL_TELEOPERATION = Object.freeze({
  requiredContext: [
    "operatorJurisdiction",
    "robotJurisdiction",
    "siteJurisdiction",
    "customerJurisdiction",
    "dataJurisdiction",
    "cloudJurisdiction",
    "missionJurisdiction",
    "languageProfile",
    "accessibilityProfile",
    "privacyProfile",
    "authorityProfile"
  ],

  politicalPolicy: {
    operationalPoliticalDiscussion: "DISALLOWED",
    campaigning: "DISALLOWED",
    politicalPersuasion: "DISALLOWED",
    propaganda: "DISALLOWED",
    geopoliticalArgument: "DISALLOWED",
    technicalLegalComplianceDiscussion: "ALLOWED_WHEN_OPERATIONAL"
  },

  culturalPolicy: [
    "Do not infer individual behaviour from nationality.",
    "Do not infer religion from language, name, appearance or location.",
    "Use declared language/script preferences.",
    "Use declared accessibility preferences.",
    "Respect local site protocol.",
    "Use human interpretation for high-stakes ambiguity.",
    "Separate cultural preference from safety and legal requirements."
  ]
});

/* --------------------------------------------------------------------------
 * SAFETY MODEL
 * -------------------------------------------------------------------------- */

export const SAFETY_MODEL = Object.freeze({
  nonNegotiables: [
    "NO_UNSUPERVISED_HAZARDOUS_ACTIVITY",
    "SIMULATION_BEFORE_PHYSICAL_TEST_WHERE_FEASIBLE",
    "START_WITH_LOWEST_ENERGY_EXPERIMENT",
    "SOFTWARE_IS_NOT_THE_ONLY_SAFETY_LAYER",
    "EVERY_EXPERIMENT_HAS_ABORT_CONDITIONS",
    "EMERGENCY_STOP_OR_EQUIVALENT_SAFE_STOP_FOR_PHYSICAL_MOTION",
    "LOCAL_OPERATOR_CAN_STOP_REMOTE_OPERATION"
  ],

  gates: [
    "G0_CONCEPT_SAFETY_SCREEN",
    "G1_HAZARD_ANALYSIS",
    "G2_FAILURE_ANALYSIS",
    "G3_TEST_PROCEDURE_APPROVAL",
    "G4_CONTROLLED_TEST_ENVELOPE",
    "G5_EXPANDED_TEST_EVIDENCE",
    "G6_DEPLOYMENT_SAFETY_CASE"
  ],

  competencyLevels: [
    "L0_OBSERVATION",
    "L1_GUIDED",
    "L2_SUPERVISED_INDEPENDENT",
    "L3_INDEPENDENT",
    "L4_ADVANCED",
    "L5_TRAIN_AND_AUTHORIZE"
  ]
});

/* --------------------------------------------------------------------------
 * DUAL-USE / EXPORT / EMBARGO MODEL
 * -------------------------------------------------------------------------- */

export const DUAL_USE_POLICY = Object.freeze({
  defaultUnknownAction: "HOLD",

  transferTypes: [
    "PHYSICAL_EXPORT",
    "RE_EXPORT",
    "TECHNICAL_DATA",
    "SOFTWARE",
    "SOURCE_CODE",
    "CAD",
    "FIRMWARE",
    "BITSTREAM",
    "MODEL_WEIGHTS",
    "DATASET",
    "REMOTE_TECHNICAL_ASSISTANCE",
    "REMOTE_TELEOPERATION",
    "CLOUD_COMPUTE",
    "MANUFACTURING_ASSISTANCE",
    "TRAINING",
    "DEBUGGING",
    "PUBLICATION"
  ],

  prohibitedBehaviour: [
    "SANCTIONS_EVASION",
    "EMBARGO_EVASION",
    "END_USER_CONCEALMENT",
    "END_USE_CONCEALMENT",
    "DESTINATION_CONCEALMENT",
    "LICENSE_EVASION",
    "CIRCUMVENTION_ASSISTANCE"
  ],

  accessTiers: [
    "OPEN",
    "AUTHENTICATED",
    "PROJECT_MEMBER",
    "CONTROLLED",
    "RESTRICTED",
    "LEGAL_REVIEW",
    "BLOCKED"
  ]
});

/* --------------------------------------------------------------------------
 * CURRICULUM ARCHITECTURE
 * -------------------------------------------------------------------------- */

export const EDUCATION_ARCHITECTURE = Object.freeze({
  levels: [
    "PRESCHOOL",
    "PRIMARY",
    "MIDDLE",
    "SECONDARY",
    "CLASS_11_12",
    "UNDERGRADUATE",
    "MASTERS",
    "PHD",
    "POSTDOC"
  ],

  mastery: [
    "L0_EXPOSURE",
    "L1_UNDERSTANDING",
    "L2_GUIDED_PRACTICE",
    "L3_INDEPENDENT_CONSTRUCTION",
    "L4_INDEPENDENT_RESEARCH",
    "L5_ORIGINAL_INVENTION",
    "L6_SYSTEMS_LEADERSHIP",
    "L7_FIELD_DEFINING_CONTRIBUTION"
  ],

  continuousDomains: [
    "MATHEMATICS",
    "NATURAL_SCIENCES",
    "COMPUTATION",
    "ENGINEERING",
    "PHYSICAL_AI_ROBOTICS",
    "MANUFACTURING_MATERIALS",
    "RESEARCH_METHOD",
    "ENTREPRENEURSHIP_ECONOMICS_IP",
    "SOCIETY_ETHICS_POLICY_STANDARDS",
    "SYSTEMS_THINKING"
  ],

  planningChain: [
    "NATIONAL_OR_STATE_CURRICULUM",
    "SCHOOL_OR_COLLEGE_CURRICULUM",
    "REGULAR_SUBJECT",
    "STEAM_MAPPING",
    "MASTERY_GRAPH",
    "PROJECT",
    "LAB",
    "ASSESSMENT",
    "MASTERY_UPDATE",
    "NEXT_PLAN"
  ]
});

/* --------------------------------------------------------------------------
 * RESEARCH PIPELINE
 * -------------------------------------------------------------------------- */

export const RESEARCH_PIPELINE = Object.freeze([
  "RESEARCH_QUESTION",
  "LITERATURE_REVIEW",
  "GAP",
  "HYPOTHESIS",
  "METHODOLOGY",
  "EXPERIMENTAL_DESIGN",
  "DATASET",
  "PROTOTYPE",
  "EXPERIMENT",
  "RESULTS",
  "STATISTICAL_ANALYSIS",
  "REPRODUCIBILITY",
  "PAPER",
  "PUBLICATION",
  "GRANT",
  "TECH_TRANSFER"
]);

/* --------------------------------------------------------------------------
 * INVENTION / IP PIPELINE
 * -------------------------------------------------------------------------- */

export const INVENTION_PIPELINE = Object.freeze([
  "PROBLEM",
  "INVENTION",
  "PRIOR_ART",
  "INVENTION_DISCLOSURE",
  "PROTOTYPE",
  "NOVELTY_ANALYSIS",
  "IP_STRATEGY",
  "FILING",
  "VALIDATION",
  "TECH_TRANSFER",
  "PRODUCT_OR_OPEN_TECH"
]);

/* --------------------------------------------------------------------------
 * ENTREPRENEURIAL PIPELINE
 * -------------------------------------------------------------------------- */

export const BUSINESS_PIPELINE = Object.freeze([
  "PROBLEM",
  "CUSTOMER",
  "MARKET",
  "COMPETITION",
  "VALUE_PROPOSITION",
  "PRODUCT",
  "MVP",
  "UNIT_ECONOMICS",
  "MANUFACTURING_ECONOMICS",
  "GTM",
  "REGULATORY",
  "PILOT",
  "REVENUE",
  "SCALE"
]);

/* --------------------------------------------------------------------------
 * MANUFACTURING PIPELINE
 * -------------------------------------------------------------------------- */

export const MANUFACTURING_PIPELINE = Object.freeze([
  "DESIGN_FOR_MANUFACTURING",
  "DESIGN_FOR_ASSEMBLY",
  "MATERIAL_SELECTION",
  "PROCESS_SELECTION",
  "TOOLING",
  "FIXTURES",
  "EBOM",
  "MBOM",
  "ROUTING",
  "WORK_INSTRUCTION",
  "WORK_ORDER",
  "SERIALIZATION",
  "INSPECTION",
  "CALIBRATION",
  "NONCONFORMANCE",
  "REWORK",
  "RELEASE"
]);

/* --------------------------------------------------------------------------
 * LOGISTICS PIPELINE
 * -------------------------------------------------------------------------- */

export const LOGISTICS_PIPELINE = Object.freeze([
  "SUPPLIER",
  "PROCUREMENT",
  "INBOUND",
  "WAREHOUSE",
  "KITTING",
  "PRODUCTION",
  "FINISHED_GOODS",
  "REGIONAL_WAREHOUSE",
  "DISTRIBUTOR",
  "CUSTOMER",
  "FIELD_SERVICE",
  "REVERSE_LOGISTICS",
  "REPAIR",
  "REFURBISH",
  "RECYCLE"
]);

/* --------------------------------------------------------------------------
 * SERVICE PIPELINE
 * -------------------------------------------------------------------------- */

export const SERVICE_PIPELINE = Object.freeze([
  "ISSUE",
  "IDENTIFY_DEVICE",
  "IDENTIFY_CONFIGURATION",
  "READ_TELEMETRY",
  "DIAGNOSE",
  "REMOTE_RECOVERY",
  "FIELD_SERVICE",
  "PARTS",
  "REPAIR",
  "VERIFY",
  "CLOSE"
]);

/* --------------------------------------------------------------------------
 * COMPLETE PROJECT OUTPUTS
 * -------------------------------------------------------------------------- */

export const PROJECT_OUTPUT_TYPES = Object.freeze([
  "SIMULATION",
  "RESEARCH_PROJECT",
  "TECHNICAL_PROJECT",
  "EDUCATIONAL_PROJECT",
  "FUNDING_PROPOSAL",
  "BUSINESS_PROPOSAL",
  "PRODUCT_CONCEPT",
  "MANUFACTURING_PACKAGE",
  "REGULATORY_DOSSIER",
  "PUBLIC_DEMONSTRATION",
  "COMPLETE_PROJECT"
]);

/* --------------------------------------------------------------------------
 * WORKBENCH VIEWS
 * -------------------------------------------------------------------------- */

export const WORKBENCH_VIEWS = Object.freeze([
  "ARCHITECTURE",
  "PHYSICAL_3D",
  "ELECTRICAL",
  "SOFTWARE",
  "EVENT_STATE",
  "MANUFACTURING",
  "COMMERCIAL",
  "SAFETY",
  "COMPLIANCE",
  "SUPPLY_CHAIN",
  "EDUCATION",
  "RESEARCH",
  "OPERATIONS",
  "TELEOPERATION"
]);

/* --------------------------------------------------------------------------
 * IMPORT / EXPORT CONTRACT
 * -------------------------------------------------------------------------- */

export const IMPORT_PIPELINE = Object.freeze([
  "FILE",
  "QUARANTINE",
  "PARSE",
  "IDENTIFY",
  "LICENSE_CHECK",
  "SECURITY_CHECK",
  "SCHEMA_VALIDATION",
  "INTERFACE_EXTRACTION",
  "PARAMETER_EXTRACTION",
  "DEPENDENCY_EXTRACTION",
  "PROVENANCE",
  "COMPONENT"
]);

export const EXPORT_PIPELINE = Object.freeze([
  "MODEL",
  "VALIDATE",
  "DEPENDENCY_RESOLUTION",
  "LICENSE_CHECK",
  "COMPLIANCE_CHECK",
  "SAFETY_CHECK",
  "PROVENANCE_PACKAGE",
  "TARGET_EXPORT"
]);

/* --------------------------------------------------------------------------
 * FILE FORMAT REGISTRY
 * -------------------------------------------------------------------------- */

export const FORMAT_REGISTRY = Object.freeze({
  mechanical: [
    "STEP",
    "STL",
    "OBJ",
    "GLTF"
  ],
  electronics: [
    "SCHEMATIC",
    "PCB",
    "NETLIST",
    "BOM",
    "GERBER",
    "IPC-2581",
    "ODB++"
  ],
  software: [
    "SOURCE",
    "REPOSITORY",
    "PACKAGE",
    "BUILD_MANIFEST",
    "CONFIG"
  ],
  robotics: [
    "ROBOT_DESCRIPTION",
    "KINEMATIC_MODEL",
    "CONTROLLER_CONFIG",
    "MISSION_DEFINITION",
    "MIDDLEWARE_PACKAGE"
  ],
  simulation: [
    "WORLD",
    "MODEL",
    "MESH",
    "PARAMETERS",
    "TRAJECTORY",
    "DATASET"
  ],
  data: [
    "CSV",
    "JSON",
    "PARQUET",
    "IMAGE",
    "VIDEO",
    "SENSOR_LOG",
    "TIME_SERIES"
  ],
  documents: [
    "MARKDOWN",
    "HTML",
    "PDF",
    "LATEX"
  ],
  business: [
    "SPREADSHEET",
    "BOM",
    "FINANCIAL_MODEL",
    "PROPOSAL"
  ]
});

/* --------------------------------------------------------------------------
 * DIGITAL TWIN MODEL
 * -------------------------------------------------------------------------- */

export const DIGITAL_TWIN_LAYERS = Object.freeze([
  "DESIGN",
  "SIMULATION",
  "MANUFACTURING",
  "AS_BUILT",
  "AS_TESTED",
  "AS_DELIVERED",
  "OPERATIONAL",
  "HISTORICAL"
]);

/* --------------------------------------------------------------------------
 * TEST MODES
 * -------------------------------------------------------------------------- */

export const TEST_MODES = Object.freeze([
  "MIL",
  "SIL",
  "HIL",
  "PHIL",
  "RIL",
  "HITL",
  "FIELD"
]);

/* --------------------------------------------------------------------------
 * BENCHMARK MODEL
 * -------------------------------------------------------------------------- */

export const BENCHMARK_SCHEMA = Object.freeze({
  required: [
    "id",
    "name",
    "dataset",
    "environment",
    "metrics",
    "baseline",
    "variants",
    "results",
    "reproducibility"
  ],

  resultFields: [
    "variant",
    "metric",
    "value",
    "unit",
    "confidence",
    "runtime",
    "hardware",
    "software",
    "configuration"
  ]
});

/* --------------------------------------------------------------------------
 * EXPERIMENT MODEL
 * -------------------------------------------------------------------------- */

export const EXPERIMENT_SCHEMA = Object.freeze({
  required: [
    "question",
    "hypothesis",
    "variables",
    "parameters",
    "initialConditions",
    "environment",
    "procedure",
    "instrumentation",
    "dataset",
    "results",
    "conclusion"
  ],

  reproducibility: [
    "modelVersion",
    "componentVersions",
    "softwareVersions",
    "hardwareVersions",
    "parameters",
    "initialConditions",
    "environment",
    "randomSeed",
    "clock",
    "eventSequence",
    "rawData"
  ]
});

/* --------------------------------------------------------------------------
 * TRACEABILITY MATRIX
 * -------------------------------------------------------------------------- */

export class TraceabilityEngine {
  constructor(store) {
    this.store = store;
  }

  matrix(projectId) {
    const project = this.store.get(projectId);
    if (!project) return [];

    const rows = [];

    for (const requirementId of project.requirements || []) {
      const requirement = this.store.get(requirementId);
      if (!requirement) {
        rows.push({
          requirement: requirementId,
          status: "BROKEN_REFERENCE"
        });
        continue;
      }

      const evidence = (requirement.evidence || [])
        .map(id => this.store.get(id))
        .filter(Boolean);

      const tests = this.store.all("Test")
        .filter(test =>
          (test.requirements || []).includes(requirement.id)
        );

      rows.push({
        requirement: requirement.id,
        statement: requirement.statement,
        verificationMethod: requirement.verificationMethod,
        evidence: evidence.map(e => e.id),
        tests: tests.map(t => t.id),
        status:
          evidence.length && tests.length
            ? "TRACEABLE"
            : "INCOMPLETE"
      });
    }

    return rows;
  }

  orphanRequirements(projectId) {
    return this.matrix(projectId)
      .filter(row => row.status !== "TRACEABLE");
  }
}

/* --------------------------------------------------------------------------
 * CHANGE IMPACT ANALYSIS
 * -------------------------------------------------------------------------- */

export class ChangeImpactEngine {
  constructor(store) {
    this.store = store;
  }

  analyze(entityId) {
    const root = this.store.get(entityId);
    if (!root) return { entityId, impacts: [] };

    const impacts = [];
    const visited = new Set([entityId]);
    const queue = [entityId];

    while (queue.length) {
      const current = queue.shift();

      for (const neighbor of this.store.neighbors(current)) {
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);
        queue.push(neighbor.id);

        impacts.push({
          source: current,
          affected: neighbor.id,
          type: neighbor.type,
          severity: this.estimateImpact(neighbor)
        });
      }
    }

    return {
      entityId,
      impactedEntities: impacts,
      count: impacts.length
    };
  }

  estimateImpact(entity) {
    if (["Requirement","SafetyCase","ComplianceCase","Configuration"].includes(entity.type)) {
      return "HIGH";
    }

    if (["Component","Interface","Model","Simulation","Test"].includes(entity.type)) {
      return "MEDIUM";
    }

    return "LOW";
  }
}

/* --------------------------------------------------------------------------
 * CONSTRAINT / TRADE-SPACE ENGINE
 * -------------------------------------------------------------------------- */

export class TradeSpaceEngine {
  constructor() {
    this.objectives = [];
    this.constraints = [];
  }

  addObjective(data) {
    this.objectives.push({
      id: data.id || uid("objective"),
      name: data.name,
      direction: data.direction || "MINIMIZE",
      weight: data.weight ?? 1,
      unit: data.unit || null
    });
  }

  addConstraint(data) {
    this.constraints.push({
      id: data.id || uid("constraint"),
      name: data.name,
      operator: data.operator || "<=",
      limit: data.limit,
      unit: data.unit || null
    });
  }

  evaluate(candidate) {
    const violations = [];

    for (const constraint of this.constraints) {
      const value = Number(candidate[constraint.name]);

      if (!Number.isFinite(value)) {
        violations.push({
          constraint: constraint.id,
          reason: "VALUE_MISSING"
        });
        continue;
      }

      const ok =
        constraint.operator === "<=" ? value <= constraint.limit :
        constraint.operator === ">=" ? value >= constraint.limit :
        constraint.operator === "<" ? value < constraint.limit :
        constraint.operator === ">" ? value > constraint.limit :
        constraint.operator === "==" ? value === constraint.limit :
        false;

      if (!ok) {
        violations.push({
          constraint: constraint.id,
          value,
          limit: constraint.limit
        });
      }
    }

    return {
      feasible: violations.length === 0,
      violations
    };
  }
}

/* --------------------------------------------------------------------------
 * COST MODEL
 * -------------------------------------------------------------------------- */

export const COST_MODEL = Object.freeze([
  "PROTOTYPE_NRE",
  "TOOLING",
  "UNIT_COST",
  "ASSEMBLY",
  "TEST",
  "CERTIFICATION",
  "SHIPPING",
  "WARRANTY",
  "SERVICE",
  "SPARES",
  "ENERGY",
  "INFRASTRUCTURE",
  "DEPRECIATION",
  "R_AND_D",
  "OVERHEAD",
  "MARGIN"
]);

/* --------------------------------------------------------------------------
 * SUPPLY-CHAIN GRAPH
 * -------------------------------------------------------------------------- */

export class SupplyChainEngine {
  constructor(store) {
    this.store = store;
  }

  createNode(data) {
    return this.store.add({
      type: data.type || "Supplier",
      id: data.id || uid("supply"),
      name: data.name,
      country: data.country || null,
      process: data.process || null,
      rawMaterials: data.rawMaterials || [],
      alternatives: data.alternatives || [],
      leadTime: data.leadTime || null,
      cost: data.cost || null,
      exportRestrictions: data.exportRestrictions || [],
      certification: data.certification || [],
      obsolescence: data.obsolescence || null
    });
  }

  independentPaths(componentId, suppliers) {
    const component = this.store.get(componentId);
    if (!component) return { componentId, independentPaths: 0 };

    const countries = new Set();
    const processes = new Set();

    for (const supplier of suppliers || []) {
      if (supplier.country) countries.add(supplier.country);
      if (supplier.process) processes.add(supplier.process);
    }

    return {
      componentId,
      supplierCount: suppliers?.length || 0,
      countryCount: countries.size,
      processCount: processes.size,
      independentPaths: Math.min(countries.size, processes.size)
    };
  }
}

/* --------------------------------------------------------------------------
 * OBSOLESCENCE MODEL
 * -------------------------------------------------------------------------- */

export class ObsolescenceEngine {
  assess(component) {
    return {
      component: component.id,
      lifecycle: component.lifecycle || "UNKNOWN",
      lastTimeBuy: component.lastTimeBuy || null,
      replacementCandidates: component.alternatives || [],
      redesignCost: component.redesignCost || null,
      qualificationImpact: component.qualificationImpact || null,
      certificationImpact: component.certificationImpact || null
    };
  }
}

/* --------------------------------------------------------------------------
 * CALIBRATION / METROLOGY
 * -------------------------------------------------------------------------- */

export const CALIBRATION_TYPES = Object.freeze([
  "CAMERA",
  "IMU",
  "ENCODER",
  "FORCE_TORQUE",
  "MOTOR",
  "BATTERY",
  "THERMAL",
  "GEOMETRIC",
  "TIME_SYNC",
  "NETWORK_LATENCY"
]);

/* --------------------------------------------------------------------------
 * TIME MODEL
 * -------------------------------------------------------------------------- */

export const TIME_MODEL = Object.freeze({
  domains: [
    "PHYSICAL_TIME",
    "LOGICAL_TIME",
    "SIMULATION_TIME",
    "MISSION_TIME",
    "LOCAL_CLOCK",
    "UTC",
    "MONOTONIC"
  ],

  requiredForDeterministicReplay: [
    "EVENT_SEQUENCE",
    "TIMESTAMPS",
    "CLOCK_DEFINITION",
    "CLOCK_SYNCHRONIZATION",
    "DEADLINES",
    "EXTERNAL_INPUTS"
  ]
});

/* --------------------------------------------------------------------------
 * SAFETY / IR CONTRACT
 * -------------------------------------------------------------------------- */

export const SAFETY_IR_FIELDS = Object.freeze([
  "SAFETY_CONSTRAINT",
  "HAZARD",
  "LIMIT",
  "INTERLOCK",
  "AUTHORITY",
  "ABORT_CONDITION",
  "SAFE_STATE",
  "FAILURE_MODE",
  "RECOVERY_MODE"
]);

/* --------------------------------------------------------------------------
 * KNOWLEDGE GRAPH RELATION VOCABULARY
 * -------------------------------------------------------------------------- */

export const RELATIONS = Object.freeze([
  "HAS_SUBSYSTEM",
  "HAS_COMPONENT",
  "HAS_INTERFACE",
  "IMPLEMENTS",
  "REQUIRES",
  "DERIVED_FROM",
  "SATISFIES",
  "VERIFIED_BY",
  "VALIDATED_BY",
  "EVIDENCED_BY",
  "TESTED_BY",
  "SIMULATED_BY",
  "USES_DATASET",
  "USES_MODEL",
  "USES_STANDARD",
  "SUBJECT_TO",
  "CONSTRAINED_BY",
  "HAS_HAZARD",
  "HAS_FAILURE_MODE",
  "HAS_SAFETY_CASE",
  "HAS_COMPLIANCE_CASE",
  "HAS_CONFIGURATION",
  "HAS_MANUFACTURING_OPERATION",
  "HAS_BOM_ITEM",
  "SUPPLIED_BY",
  "ALTERNATIVE_TO",
  "SUBSTITUTES",
  "PRODUCES",
  "SERVICED_BY",
  "OPERATED_BY",
  "OWNED_BY",
  "CUSTOMER_OF",
  "REGULATED_BY",
  "FUNDED_BY",
  "PUBLISHED_AS",
  "PATENTED_AS",
  "TAUGHT_BY",
  "ASSESSED_BY",
  "PROVENANCE_TO",
  "SUPERSEDES",
  "SUPERSEDED_BY",
  "DEPENDS_ON",
  "IMPACTS",
  "DERIVES",
  "TRACES_TO"
]);

/* --------------------------------------------------------------------------
 * ROLE-SPECIFIC UI CONTRACT
 * -------------------------------------------------------------------------- */

export const ROLE_VIEWS = Object.freeze({
  LEARN: [
    "learn",
    "simulation",
    "education",
    "projects"
  ],
  RESEARCH: [
    "research",
    "evidence",
    "simulation",
    "benchmarks",
    "publications",
    "funding"
  ],
  BUILD: [
    "systems",
    "components",
    "simulation",
    "manufacturing",
    "safety"
  ],
  START: [
    "projects",
    "market",
    "business",
    "funding",
    "manufacturing",
    "compliance"
  ],
  MANUFACTURE: [
    "manufacturing",
    "bom",
    "supply-chain",
    "quality",
    "configuration"
  ],
  DEPLOY: [
    "mission",
    "teleoperation",
    "operations",
    "service",
    "billing",
    "safety"
  ],
  REGULATE: [
    "standards",
    "compliance",
    "evidence",
    "audit",
    "configuration"
  ],
  FUND: [
    "projects",
    "evidence",
    "market",
    "economics",
    "risk"
  ],
  EXPLORE: [
    "systems",
    "domains",
    "embodiments",
    "standards",
    "research"
  ]
});

/* --------------------------------------------------------------------------
 * NOVICE / EXPERT / THOUGHT-LEADER PRESENTATION CONTRACT
 * -------------------------------------------------------------------------- */

export const MODE_PRESENTATION = Object.freeze({
  NOVICE: {
    show: [
      "simple_components",
      "guided_experiments",
      "visual_connections",
      "plain_language",
      "immediate_feedback",
      "safe_defaults"
    ],
    hideByDefault: [
      "formal_constraints",
      "advanced_timing",
      "complex_compliance"
    ]
  },

  EXPERT: {
    show: [
      "interfaces",
      "equations",
      "constraints",
      "tolerances",
      "timing",
      "power_budgets",
      "control_loops",
      "simulation_models",
      "tests",
      "standards",
      "requirements",
      "manufacturing"
    ]
  },

  THOUGHT_LEADER: {
    show: [
      "architectural_abstractions",
      "research_gaps",
      "alternative_architectures",
      "formal_models",
      "benchmark_definitions",
      "reproducibility",
      "standards_gaps",
      "policy_implications",
      "manufacturing_implications",
      "economic_implications",
      "new_primitives"
    ]
  }
});

/* --------------------------------------------------------------------------
 * NEW PRIMITIVE CONTRACT
 * -------------------------------------------------------------------------- */

export const NEW_PRIMITIVE_CONTRACT = Object.freeze({
  required: [
    "semanticInterface",
    "physicalInterface",
    "computationalModel",
    "simulationModel",
    "manufacturingModel",
    "verification",
    "evidence"
  ],

  optional: [
    "safetyModel",
    "complianceModel",
    "economicModel",
    "educationModel",
    "researchModel",
    "substitutionModel"
  ]
});

/* --------------------------------------------------------------------------
 * CHECKLIST ENGINE
 * -------------------------------------------------------------------------- */

export class ChecklistEngine {
  constructor(bus) {
    this.bus = bus;
    this.instances = new Map();
  }

  create(definition, context = {}) {
    const instance = {
      id: uid("checklist"),
      definition,
      context,
      items: definition.items.map(item => ({
        ...item,
        state: "UNRESOLVED",
        observed: null,
        evidence: [],
        checkedBy: null,
        checkedAt: null
      })),
      state: "OPEN",
      createdAt: new Date().toISOString()
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  check(instanceId, itemId, result) {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error("Checklist instance not found");

    const item = instance.items.find(i => i.id === itemId);
    if (!item) throw new Error("Checklist item not found");

    item.state = result.pass ? "PASS" : "FAIL";
    item.observed = result.observed ?? null;
    item.evidence = result.evidence || [];
    item.checkedBy = result.checkedBy || null;
    item.checkedAt = new Date().toISOString();

    instance.state = instance.items.some(i => i.state === "FAIL")
      ? "NO_GO"
      : instance.items.every(i => i.state === "PASS")
        ? "READY"
        : "OPEN";

    this.bus.emit("checklist:update", {
      checklistId: instanceId,
      item
    });

    return instance;
  }

  decision(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error("Checklist instance not found");

    const criticalFailures = instance.items.filter(
      i => i.severity === "CRITICAL" && i.state !== "PASS"
    );

    return {
      checklistId: instanceId,
      decision: criticalFailures.length ? "NO_GO" : "GO",
      unresolved: instance.items.filter(i => i.state === "UNRESOLVED"),
      failures: instance.items.filter(i => i.state === "FAIL"),
      criticalFailures
    };
  }
}

/* --------------------------------------------------------------------------
 * AUDIT LOG
 * -------------------------------------------------------------------------- */

export class AuditLog {
  constructor() {
    this.entries = [];
  }

  record(action, data = {}) {
    const entry = {
      id: uid("audit"),
      timestamp: new Date().toISOString(),
      action,
      actor: data.actor || "system",
      subject: data.subject || null,
      before: data.before ?? null,
      after: data.after ?? null,
      reason: data.reason || null,
      evidence: data.evidence || [],
      metadata: data.metadata || {}
    };

    this.entries.push(entry);
    return entry;
  }

  query(predicate = () => true) {
    return this.entries.filter(predicate);
  }

  export() {
    return JSON.parse(JSON.stringify(this.entries));
  }
}

/* --------------------------------------------------------------------------
 * FORMAL REVIEW / GOVERNANCE
 * -------------------------------------------------------------------------- */

export const REVIEW_STATES = Object.freeze([
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "BASELINED",
  "RELEASED",
  "DEPRECATED",
  "RETIRED"
]);

export class GovernanceEngine {
  constructor(store, audit) {
    this.store = store;
    this.audit = audit;
  }

  decision(data) {
    const decision = this.store.add({
      type: "Decision",
      id: data.id || uid("decision"),
      title: data.title,
      subject: data.subject || null,
      state: data.state || "DRAFT",
      decision: data.decision || null,
      rationale: data.rationale || "",
      alternativesConsidered: data.alternativesConsidered || [],
      objections: data.objections || [],
      waivers: data.waivers || [],
      deviations: data.deviations || [],
      reviewers: data.reviewers || [],
      approvals: data.approvals || [],
      signatures: data.signatures || [],
      evidence: data.evidence || [],
      createdAt: new Date().toISOString()
    });

    this.audit.record("DECISION_CREATED", {
      subject: decision.id,
      after: decision
    });

    return decision;
  }
}

/* --------------------------------------------------------------------------
 * INCIDENT / NEAR-MISS MODEL
 * -------------------------------------------------------------------------- */

export const INCIDENT_TYPES = Object.freeze([
  "FIRE",
  "ELECTRIC_SHOCK",
  "CHEMICAL",
  "BURN",
  "BATTERY",
  "MECHANICAL",
  "BIOLOGICAL",
  "PRESSURE",
  "ROBOT",
  "DRONE",
  "CYBER",
  "DATA",
  "TELEOPERATION",
  "ENVIRONMENT",
  "NEAR_MISS"
]);

export class IncidentEngine {
  constructor(store, audit) {
    this.store = store;
    this.audit = audit;
  }

  report(data) {
    const incident = this.store.add({
      type: "Incident",
      id: data.id || uid("incident"),
      incidentType: data.incidentType || "NEAR_MISS",
      project: data.project || null,
      system: data.system || null,
      configuration: data.configuration || null,
      date: data.date || new Date().toISOString(),
      location: data.location || null,
      description: data.description || "",
      immediateActions: data.immediateActions || [],
      injuries: data.injuries || [],
      damage: data.damage || [],
      evidence: data.evidence || [],
      rootCause: data.rootCause || null,
      correctiveActions: data.correctiveActions || [],
      preventiveActions: data.preventiveActions || [],
      status: data.status || "OPEN"
    });

    this.audit.record("INCIDENT_REPORTED", {
      subject: incident.id,
      after: incident
    });

    return incident;
  }
}

/* --------------------------------------------------------------------------
 * COMPLETE PLATFORM ASSEMBLY
 * -------------------------------------------------------------------------- */

export function attachDetailedServices(platform) {
  platform.audit = platform.audit || new AuditLog();

  platform.traceability = new TraceabilityEngine(platform.store);
  platform.changeImpact = new ChangeImpactEngine(platform.store);
  platform.tradeSpace = new TradeSpaceEngine();
  platform.supplyChain = new SupplyChainEngine(platform.store);
  platform.obsolescence = new ObsolescenceEngine();
  platform.checklists = new ChecklistEngine(platform.bus);
  platform.governance = new GovernanceEngine(platform.store, platform.audit);
  platform.incidents = new IncidentEngine(platform.store, platform.audit);

  platform.architecture = {
    version: ARCHITECTURE_VERSION,
    principles: PLATFORM_PRINCIPLES,
    digitalThread: DIGITAL_THREAD,
    relationships: RELATIONS,
    workbenchViews: WORKBENCH_VIEWS,
    importPipeline: IMPORT_PIPELINE,
    exportPipeline: EXPORT_PIPELINE,
    testModes: TEST_MODES,
    bomTypes: BOM_TYPES,
    timeModel: TIME_MODEL
  };

  return platform;
}

/* --------------------------------------------------------------------------
 * STATIC SITE APPLICATION CONTRACT
 * -------------------------------------------------------------------------- */

export const STATIC_SITE_CONTRACT = Object.freeze({
  requiredFiles: [
    "index.html",
    "assets/js/physical-ai-platform-spine.js",
    "assets/css/",
    "data/",
    "schemas/"
  ],

  recommendedPages: [
    "index.html",
    "explore.html",
    "learn.html",
    "research.html",
    "build.html",
    "startup.html",
    "manufacture.html",
    "deploy.html",
    "regulate.html",
    "standards.html",
    "simulation.html",
    "teleoperation.html",
    "education.html"
  ],

  deployment: {
    platform: "GitHub Pages",
    backendRequired: false,
    databaseRequired: false,
    runtimeServerRequired: false,
    externalAIKeysRequired: false,
    persistentUserServerStorageRequired: false
  },

  dataSources: [
    "JSON",
    "YAML_CONVERTED_TO_JSON",
    "MARKDOWN",
    "STATIC_ASSETS",
    "USER_LOCAL_STORAGE"
  ]
});

/* --------------------------------------------------------------------------
 * AI HANDOFF CONTRACT
 * -------------------------------------------------------------------------- */

export const AI_HANDOFF_CONTRACT = Object.freeze({
  instruction:
    "Extend the existing architecture. Do not redesign the platform from scratch.",

  priorities: [
    "Preserve canonical IDs.",
    "Preserve entity types.",
    "Preserve relationship semantics.",
    "Preserve intention-policy-execution separation.",
    "Preserve safety and compliance HOLD behaviour.",
    "Preserve provenance.",
    "Preserve version magic.",
    "Preserve component ABI compatibility.",
    "Preserve static GitHub Pages deployment.",
    "Do not introduce a mandatory backend.",
    "Do not make one AI provider an architectural dependency.",
    "Do not silently invent standards or regulatory conclusions.",
    "Do not silently collapse languages, scripts, jurisdictions or cultures.",
    "Do not silently remove safety gates."
  ],

  expectedExtensionOrder: [
    "SCHEMAS",
    "DATA",
    "UI",
    "WORKBENCH",
    "SIMULATION",
    "IMPORT_EXPORT",
    "VALIDATION",
    "EDUCATION",
    "RESEARCH",
    "MANUFACTURING",
    "OPERATIONS",
    "TELEOPERATION",
    "COMPLIANCE",
    "PUBLICATION"
  ]
});

/* --------------------------------------------------------------------------
 * DETAILED BOOTSTRAP
 * -------------------------------------------------------------------------- */

export function initializeDetailedPlatform(options = {}) {
  const instance = options.platform || platform;

  attachDetailedServices(instance);

  instance.initialize({
    seed: options.seed ?? false,
    restore: options.restore ?? true,
    startRouter: options.startRouter ?? true
  });

  instance.bus.emit("architecture:initialized", {
    architectureVersion: ARCHITECTURE_VERSION,
    platformVersion: VERSION
  });

  return instance;
}

/* --------------------------------------------------------------------------
 * BROWSER GLOBAL
 * -------------------------------------------------------------------------- */

if (typeof window !== "undefined") {
  window.PhysicalAIArchitecture = Object.freeze({
    version: ARCHITECTURE_VERSION,
    principles: PLATFORM_PRINCIPLES,
    systemSchema: SYSTEM_SCHEMA,
    componentABI: COMPONENT_ABI,
    domainProfiles: DOMAIN_PROFILES,
    embodimentProfiles: EMBODIMENT_PROFILES,
    standardEvents: STANDARD_EVENTS,
    robotStates: ROBOT_STATES,
    failureOntology: FAILURE_ONTOLOGY,
    resilienceModes: RESILIENCE_MODES,
    digitalThread: DIGITAL_THREAD,
    safety: SAFETY_MODEL,
    dualUse: DUAL_USE_POLICY,
    education: EDUCATION_ARCHITECTURE,
    researchPipeline: RESEARCH_PIPELINE,
    inventionPipeline: INVENTION_PIPELINE,
    businessPipeline: BUSINESS_PIPELINE,
    manufacturingPipeline: MANUFACTURING_PIPELINE,
    logisticsPipeline: LOGISTICS_PIPELINE,
    servicePipeline: SERVICE_PIPELINE,
    workbenchViews: WORKBENCH_VIEWS,
    importPipeline: IMPORT_PIPELINE,
    exportPipeline: EXPORT_PIPELINE,
    formats: FORMAT_REGISTRY,
    aiHandoff: AI_HANDOFF_CONTRACT,
    initialize: initializeDetailedPlatform
  });

  if (window.PhysicalAI?.platform) {
    attachDetailedServices(window.PhysicalAI.platform);
  }
}
