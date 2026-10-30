/**
 * PAP Education Syllabus & Learning Orchestration drop-in.
 * This package is a projection/adapter over the existing canonical PAP graph.
 * It does not define a replacement ontology, LMS store, kernel, or simulator.
 * Fail-closed: unverified curriculum mappings, missing evidence, unsafe physical
 * activities, and unavailable execution adapters return HOLD.
 */

export const PACKAGE_ID = 'pap.education.syllabus';
export const PACKAGE_VERSION = '1.0.0';
export const LEARNER_BANDS = Object.freeze([
  'preschool', 'primary', 'middle', 'secondary', 'senior_secondary',
  'undergraduate', 'postgraduate', 'doctoral', 'postdoctoral', 'lifelong', 'late_learner'
]);
export const ROLES = Object.freeze(['teacher', 'professor', 'lab_assistant', 'parent', 'student', 'independent_learner', 'administrator', 'curriculum_reviewer']);
export const MAPPING_TYPES = Object.freeze(['EXACT', 'PARTIAL', 'PREREQUISITE', 'EXTENSION', 'CONTEXTUAL']);
export const REVIEW_STATES = Object.freeze(['PROPOSED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED']);
export const CELL_TYPES = Object.freeze(['markdown', 'math', 'code', 'simulation', 'question', 'dataset', 'lab_protocol', 'reflection', 'media']);

const ok = (value, extra={}) => ({ outcome: 'OK', value, ...extra });
const hold = (reason, details={}) => ({ outcome: 'HOLD', reason, ...details });
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonblank = x => typeof x === 'string' && x.trim().length > 0;
const clone = x => structuredClone(x);

export function stableId(prefix, parts) {
  const raw = parts.map(x => String(x ?? '')).join('|');
  let h = 2166136261;
  for (let i=0;i<raw.length;i++) { h ^= raw.charCodeAt(i); h = Math.imul(h,16777619); }
  return `${prefix}_${(h>>>0).toString(16).padStart(8,'0')}`;
}

/** Source-backed framework catalogue. Unknown sources never become approved standards. */
export class FrameworkRegistry {
  constructor({frameworks=[], jurisdictions=[]}={}) {
    this.frameworks = new Map(); this.jurisdictions = new Map();
    for (const f of frameworks) { const r=this.register(f); if(r.outcome==='HOLD') throw new Error(r.reason); }
    for (const j of jurisdictions) { const r=this.registerJurisdiction(j); if(r.outcome==='HOLD') throw new Error(r.reason); }
  }
  register(f) {
    if (!isObj(f) || !nonblank(f.id) || !nonblank(f.name) || !nonblank(f.authority) || !nonblank(f.jurisdiction) || !nonblank(f.url)) return hold('Framework requires id, name, authority, jurisdiction and source URL');
    if (!/^https:\/\//.test(f.url)) return hold('Framework source must use HTTPS');
    if (!nonblank(f.status)) return hold('Framework source status is required');
    const prior=this.frameworks.get(f.id);
    if (prior && JSON.stringify(prior)!==JSON.stringify(f)) return hold('Framework records are immutable; use a new versioned ID or explicit supersession',{existingVersion:prior.version});
    this.frameworks.set(f.id, Object.freeze(clone(f)));
    return ok(this.frameworks.get(f.id));
  }
  registerJurisdiction(j) {
    if (!isObj(j) || !nonblank(j.id) || !nonblank(j.name) || !nonblank(j.coverage_status)) return hold('Jurisdiction requires id, name and coverage_status');
    this.jurisdictions.set(j.id,Object.freeze(clone(j))); return ok(this.jurisdictions.get(j.id));
  }
  get(id) { const f=this.frameworks.get(id); return f ? ok(f) : hold(`Framework not registered: ${id}`); }
  list({jurisdiction=null,kind=null}={}) { return [...this.frameworks.values()].filter(f=>(!jurisdiction||f.jurisdiction===jurisdiction)&&(!kind||f.kind===kind)).map(clone); }
  coverage() {
    const all=[...this.jurisdictions.values()];
    const verified=all.filter(j=>j.coverage_status==='VERIFIED_CONTENT').length;
    return {registered:all.length,verifiedContent:verified,registryOnly:all.length-verified,coverageRatio:all.length?verified/all.length:0};
  }
}

/**
 * Source-edition registry for actual curriculum artifacts. A jurisdiction row or
 * framework URL is not a curriculum. ACTIVE requires a source digest, scope,
 * language, edition, rights basis and independent review metadata.
 */
export class CurriculumSourceRegistry {
  constructor({jurisdictions=[],verifyReviewer=null,minimumIndependentReviews=2}={}) { this.jurisdictions=new Set(jurisdictions.map(x=>typeof x==='string'?x:x.id)); this.sources=new Map(); this.verifyReviewer=verifyReviewer; this.minimumIndependentReviews=minimumIndependentReviews; }
  add(source) {
    if(!isObj(source)||!nonblank(source.id)||!nonblank(source.jurisdictionId)||!nonblank(source.authority)||!nonblank(source.title)||!nonblank(source.edition)||!nonblank(source.academicYear)||!nonblank(source.language)||!nonblank(source.url)||!/^https:\/\//.test(source.url)||!nonblank(source.scope)||!nonblank(source.rightsBasis)) return hold('Curriculum source requires jurisdiction, authority, title, edition, academic year, language, HTTPS URL, scope and rights basis');
    if(this.jurisdictions.size&&!this.jurisdictions.has(source.jurisdictionId)) return hold('Curriculum source jurisdiction is not registered');
    if(!['DISCOVERED','INGESTED','IN_REVIEW','ACTIVE','SUPERSEDED','REJECTED'].includes(source.status)) return hold('Unknown curriculum source status');
    if(['INGESTED','IN_REVIEW','ACTIVE','SUPERSEDED'].includes(source.status)&&!/^sha256:[a-f0-9]{64}$/i.test(source.sourceDigest||'')) return hold('Ingested curriculum source requires a SHA-256 source digest');
    if(source.status==='ACTIVE') {
      if(!Array.isArray(source.reviewers)||source.reviewers.length<this.minimumIndependentReviews||new Set(source.reviewers.map(x=>x?.id)).size!==source.reviewers.length) return hold('Active curriculum source requires independent reviewer identities');
      for(const reviewer of source.reviewers) {
        if(!nonblank(reviewer.id)||!Number.isFinite(Date.parse(reviewer.reviewedAt||''))) return hold('Every source reviewer requires identity and timestamp');
        let verified=false; try { verified=typeof this.verifyReviewer==='function'&&this.verifyReviewer({reviewerId:reviewer.id,sourceId:source.id,jurisdictionId:source.jurisdictionId})===true; } catch { verified=false; }
        if(!verified) return hold('Source reviewer identity is not verified by host governance');
      }
    }
    const prior=this.sources.get(source.id);
    if(prior) {
      const immutable=['jurisdictionId','authority','title','edition','academicYear','language','url','scope','rightsBasis','sourceDigest'];
      if(immutable.some(k=>prior[k]!==source[k])) return hold('Source edition metadata and digest are immutable; use a new versioned source ID');
      const rank={DISCOVERED:0,INGESTED:1,IN_REVIEW:2,ACTIVE:3,SUPERSEDED:4,REJECTED:4};
      if(rank[source.status] < rank[prior.status] || (['SUPERSEDED','REJECTED'].includes(prior.status)&&source.status!==prior.status)) return hold('Source status cannot move backwards or reopen a closed revision');
    }
    const value=Object.freeze(clone(source)); this.sources.set(source.id,value); return ok(value);
  }
  get(id) { const source=this.sources.get(id); return source?ok(source):hold(`Curriculum source not registered: ${id}`); }
  activeFor(jurisdictionId) { return [...this.sources.values()].filter(s=>s.jurisdictionId===jurisdictionId&&s.status==='ACTIVE').map(clone); }
  coverage() { const rows=[...this.sources.values()]; return {registered:rows.length,active:rows.filter(x=>x.status==='ACTIVE').length,discovered:rows.filter(x=>x.status==='DISCOVERED').length,ingested:rows.filter(x=>['INGESTED','IN_REVIEW','ACTIVE','SUPERSEDED'].includes(x.status)).length}; }
}

/** Curriculum correlations are versioned assertions, not fuzzy string matches. */
export class CurriculumCorrelationEngine {
  constructor(registry,{verifyReviewer=null,verifySource=null,minimumIndependentReviews=2}={}) { this.registry=registry; this.mappings=new Map(); this.verifyReviewer=verifyReviewer; this.verifySource=verifySource; this.minimumIndependentReviews=minimumIndependentReviews; }
  add(mapping) {
    if (!isObj(mapping) || !nonblank(mapping.id) || !nonblank(mapping.frameworkId) || !nonblank(mapping.standardId) || !nonblank(mapping.conceptId)) return hold('Mapping requires id, frameworkId, standardId and conceptId');
    if (!MAPPING_TYPES.includes(mapping.mappingType)) return hold('Unknown mappingType');
    if (!REVIEW_STATES.includes(mapping.reviewState)) return hold('Unknown reviewState');
    if (!this.registry.get(mapping.frameworkId).value) return hold('Framework is not registered');
    if (!nonblank(mapping.sourceLocator) || !/^sha256:[a-f0-9]{64}$/i.test(mapping.sourceExcerptHash||'')) return hold('Mapping requires source locator and a SHA-256 excerpt hash');
    if(mapping.reviewState==='ACCEPTED') {
      if(!nonblank(mapping.sourceId)||!nonblank(mapping.extractionId)||typeof this.verifySource!=='function') return hold('Accepted mapping must bind to a verified source edition and extraction');
      let sourceVerified=false; try { sourceVerified=this.verifySource({sourceId:mapping.sourceId,extractionId:mapping.extractionId,frameworkId:mapping.frameworkId,standardId:mapping.standardId,sourceExcerptHash:mapping.sourceExcerptHash})===true; } catch { sourceVerified=false; }
      if(!sourceVerified) return hold('Mapping source edition/extraction verification failed');
      if(!Array.isArray(mapping.reviewers)||mapping.reviewers.length<this.minimumIndependentReviews||new Set(mapping.reviewers.map(x=>x?.id)).size!==mapping.reviewers.length) return hold('Accepted mapping requires independent reviewer identities');
      for(const reviewer of mapping.reviewers) {
        if(!nonblank(reviewer.id)||!Number.isFinite(Date.parse(reviewer.reviewedAt||''))||reviewer.id===mapping.contributorId) return hold('Mapping reviewer identity, independence and timestamp are required');
        let verified=false; try { verified=typeof this.verifyReviewer==='function'&&this.verifyReviewer({reviewerId:reviewer.id,frameworkId:mapping.frameworkId,standardId:mapping.standardId})===true; } catch { verified=false; }
        if(!verified) return hold('Mapping reviewer authority is not verified by host governance');
      }
    }
    const prior=this.mappings.get(mapping.id);
    if(prior&&JSON.stringify(prior)!==JSON.stringify(mapping)) return hold('Mapping IDs are immutable; create a new mapping revision');
    this.mappings.set(mapping.id,Object.freeze(clone(mapping))); return ok(this.mappings.get(mapping.id));
  }
  correlate(frameworkId, standardId, conceptId) {
    const matches=[...this.mappings.values()].filter(m=>m.frameworkId===frameworkId&&m.standardId===standardId&&m.conceptId===conceptId);
    const accepted=matches.filter(m=>m.reviewState==='ACCEPTED');
    if (accepted.length===1) return ok(accepted[0],{mappingState:'ACCEPTED'});
    if (accepted.length>1) return hold('Ambiguous accepted correlations',{mappingIds:accepted.map(x=>x.id)});
    if (matches.length) return hold('Correlation exists but has not been accepted',{mappingStates:matches.map(x=>x.reviewState)});
    return hold('No verified curriculum correlation');
  }
  sharedConcept(conceptId) { return [...this.mappings.values()].filter(m=>m.conceptId===conceptId&&m.reviewState==='ACCEPTED').map(clone); }
  exportCASE() {
    return {spec:'1EdTech CASE 1.1 compatible projection (not certified)',competencyFrameworks:[...new Set([...this.mappings.values()].map(m=>m.frameworkId))],competencies:[...this.mappings.values()].filter(m=>m.reviewState==='ACCEPTED').map(m=>({identifier:m.standardId,uri:m.sourceLocator,educationLevel:m.level||null,description:m.title||m.standardId,conceptId:m.conceptId,mappingType:m.mappingType}))};
  }
}

function topoSort(concepts) {
  const byId=new Map(concepts.map(c=>[c.id,c]));
  const visiting=new Set(), visited=new Set(), out=[];
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Prerequisite cycle at ${id}`);
    if (visited.has(id)) return;
    const c=byId.get(id); if(!c) throw new Error(`Unknown prerequisite concept: ${id}`);
    visiting.add(id); for(const p of c.prerequisites||[]) visit(p); visiting.delete(id); visited.add(id); out.push(c);
  }
  for(const c of concepts) visit(c.id);
  return out;
}

/** Builds syllabus sequencing from concepts and prerequisites. It never invents board requirements. */
export class SyllabusEngine {
  constructor({correlationEngine=null}={}) { this.correlationEngine=correlationEngine; }
  build({id, title, band, subject, concepts, frameworkIds=[], delivery='SELF_PACED', locale='en', accessibility=[]}) {
    if (!nonblank(id)||!nonblank(title)||!LEARNER_BANDS.includes(band)||!nonblank(subject)||!Array.isArray(concepts)||!concepts.length) return hold('Syllabus requires id, title, supported band, subject and non-empty concepts');
    const seen=new Set();
    for(const c of concepts) {
      if(!isObj(c)||!nonblank(c.id)||!nonblank(c.title)||!nonblank(c.learningOutcome)||!nonblank(c.explanation?.core)) return hold('Every concept requires id, title, learningOutcome and explanation.core');
      if(seen.has(c.id)) return hold(`Duplicate concept id: ${c.id}`); seen.add(c.id);
      if(!Array.isArray(c.activities)||!c.activities.length) return hold(`Concept ${c.id} requires at least one learning activity`);
    }
    let sequence; try { sequence=topoSort(concepts); } catch(e) { return hold(e.message); }
    const correlations=[];
    for(const c of concepts) for(const s of (c.standardRefs||[])) {
      if(!nonblank(s.frameworkId)||!nonblank(s.standardId)||!nonblank(s.conceptId)||s.conceptId!==c.id) return hold(`Invalid standard reference on concept ${c.id}`);
    }
    for(const frameworkId of frameworkIds) {
      if(!this.correlationEngine) return hold('Framework correlation requested but no correlation engine is configured');
      const standards=(concepts.flatMap(c=>c.standardRefs||[])).filter(s=>s.frameworkId===frameworkId);
      if(!standards.length) correlations.push({frameworkId,outcome:'HOLD',reason:'No source-standard references supplied for requested framework'});
      for(const s of standards) {
        const r=this.correlationEngine.correlate(frameworkId,s.standardId,s.conceptId);
        if(r.outcome!=='OK') correlations.push({frameworkId,standardId:s.standardId,conceptId:s.conceptId,outcome:'HOLD',reason:r.reason});
        else correlations.push({frameworkId,standardId:s.standardId,conceptId:s.conceptId,outcome:'OK',mappingId:r.value.id});
      }
    }
    return ok({id,title,band,subject,locale,delivery,accessibility:[...new Set(accessibility)],concepts:sequence.map((c,i)=>({...clone(c),sequence:i+1})),frameworkIds,correlations,status:correlations.some(x=>x.outcome==='HOLD')?'DRAFT_HOLD':'DRAFT',provenance:{origin:'pap.education.syllabus',generatedAt:new Date().toISOString(),authority:'SyllabusEngine sequencing only; curriculum authority remains with cited framework publisher'}});
  }
}

/** Creates role-specific teaching plans without changing the underlying learning outcomes. */
export class LearningExperienceEngine {
  plan({role,band,concept,learnerProfile={},context={}}) {
    if(!ROLES.includes(role)) return hold('Role is not registered');
    if(!LEARNER_BANDS.includes(band)||!isObj(concept)||!nonblank(concept.id)||!nonblank(concept.learningOutcome)) return hold('Valid band and concept outcome are required');
    const late=band==='late_learner'||learnerProfile.lateLearner===true;
    const accommodations=Array.isArray(learnerProfile.accommodations)?learnerProfile.accommodations:[];
    const mode=late?'REMEDIATION_WITH_DIGNITY':band==='preschool'?'PLAY_AND_OBSERVATION':(['undergraduate','postgraduate','doctoral','postdoctoral'].includes(band)?'INQUIRY_AND_FORMALISATION':'SCAFFOLDED_INQUIRY');
    const base={outcome:concept.learningOutcome,coreExplanation:concept.explanation?.core||'',workedExample:concept.explanation?.worked||null,misconceptions:concept.misconceptions||[],activities:clone(concept.activities||[]),checks:clone(concept.checks||[])};
    const rolePlan={
      teacher:{focus:'lesson orchestration, formative checks, differentiation',actions:['Set learning intention','Elicit prior knowledge','Model one example','Run collaborative activity','Review evidence and misconceptions']},
      professor:{focus:'disciplinary depth, derivation, critique and research connection',actions:['State assumptions','Derive or challenge model','Compare methods','Discuss limits and open problems']},
      lab_assistant:{focus:'setup, instrument calibration, safe procedure and observation',actions:['Verify equipment and risk controls','Demonstrate safe setup','Observe procedure','Record raw data and deviations']},
      parent:{focus:'supportive observation, encouragement and practical connection',actions:['Ask learner to explain in their own words','Connect concept to everyday experience','Notice effort and confusion without grading','Share concerns with educator']},
      student:{focus:'active participation and evidence of understanding',actions:['Predict','Explore','Explain','Practice','Reflect']},
      independent_learner:{focus:'self-paced study and self-checking',actions:['Read explanation','Run worked example','Attempt challenge','Compare against rubric','Plan next study step']},
      administrator:{focus:'coverage, access, safeguarding and programme quality',actions:['Review approved framework coverage','Check access and accommodations','Review aggregate quality indicators']},
      curriculum_reviewer:{focus:'source fidelity, alignment and review provenance',actions:['Check source edition','Verify standard locator','Review mapping semantics','Approve, reject or request revision']}
    }[role];
    return ok({role,band,mode,conceptId:concept.id,lesson:base,rolePlan,learnerSupport:{accommodations,chunking:late?'short sequenced steps with recap':'standard chunking',retryPolicy:'unlimited formative retries unless the institution configures otherwise',diagnostic:'non-clinical prior-knowledge check only',avoidAgeInference:true},context:{delivery:context.delivery||'unspecified',classSize:context.classSize||null,availableTimeMinutes:context.availableTimeMinutes||null},status:'PLANNED'});
  }
}

/** Notebook content is declarative. Execution requires an explicitly registered sandbox adapter. */
export class NotebookEngine {
  constructor({verifyAdapter=null, maxOutputBytes=1048576, maxCells=2000, maxNotebookBytes=5242880}={}) { this.adapters=new Map(); this.verifyAdapter=verifyAdapter; this.maxOutputBytes=maxOutputBytes; this.maxCells=maxCells; this.maxNotebookBytes=maxNotebookBytes; }
  registerAdapter(adapter) {
    if(!isObj(adapter)||!nonblank(adapter.id)||!nonblank(adapter.kind)||typeof adapter.execute!=='function') return hold('Notebook adapter requires id, kind and execute function');
    if(typeof this.verifyAdapter!=='function') return hold('Trusted host sandbox attestation verifier is not configured');
    let attested=false; try { attested=this.verifyAdapter(adapter.runtimeAttestation, {id:adapter.id,kind:adapter.kind})===true; } catch { attested=false; }
    if(!attested) return hold('Notebook adapter sandbox attestation is invalid or unverified');
    this.adapters.set(adapter.id,adapter); return ok({id:adapter.id,kind:adapter.kind,attestation:'HOST_VERIFIED'});
  }
  validate(notebook) {
    if(!isObj(notebook)||!nonblank(notebook.id)||!Array.isArray(notebook.cells)||!notebook.cells.length) return hold('Notebook requires id and non-empty cells');
    if(notebook.cells.length>this.maxCells) return hold('Notebook exceeds maximum cell count',{maxCells:this.maxCells});
    let bytes; try { bytes=new TextEncoder().encode(JSON.stringify(notebook)).length; } catch { return hold('Notebook must be serializable JSON'); }
    if(bytes>this.maxNotebookBytes) return hold('Notebook exceeds maximum serialized size',{maxNotebookBytes:this.maxNotebookBytes});
    const ids=new Set();
    for(const c of notebook.cells) {
      if(!isObj(c)) return hold('Notebook cells must be objects');
      if(!nonblank(c.id)||ids.has(c.id)) return hold('Notebook cell IDs must be unique and non-empty'); ids.add(c.id);
      if(!CELL_TYPES.includes(c.type)) return hold(`Unsupported notebook cell type: ${c.type}`);
      if(['code','simulation'].includes(c.type)&&!nonblank(c.adapterId)) return hold(`${c.type} cell requires adapterId`);
      if(c.type==='simulation'&&!nonblank(c.simulationRef)) return hold('Simulation cell requires simulationRef');
      if(c.type==='lab_protocol'&&c.physical===true&&(!c.supervisionRequired||!c.riskAssessmentRef)) return hold('Physical lab protocol requires supervision and risk assessment reference');
    }
    return ok(clone(notebook));
  }
  async executeCell(notebook,cellId,context={}) {
    const valid=this.validate(notebook); if(valid.outcome!=='OK') return valid;
    const cell=notebook.cells.find(c=>c.id===cellId); if(!cell) return hold('Notebook cell not found');
    if(!['code','simulation'].includes(cell.type)) return ok({cellId,state:'DISPLAY_ONLY',content:cell.content??null});
    const adapter=this.adapters.get(cell.adapterId); if(!adapter) return hold(`Execution adapter unavailable: ${cell.adapterId}`);
    if(cell.type==='simulation'&&context.physical===true&&(!context.supervised||!nonblank(context.riskAssessmentRef)||!nonblank(context.authorityRef))) return hold('Physical activity requires qualified supervision, risk assessment and authority references');
    try { const raw=await adapter.execute({cell:clone(cell),context:clone(context)});
      if(raw?.outcome==='HOLD') return hold(raw.reason||'Notebook adapter returned HOLD',{cellId,adapterId:adapter.id});
      const result=raw?.outcome==='OK'?raw.value:raw;
      const encoded=JSON.stringify(result); if(encoded===undefined || new TextEncoder().encode(encoded).length>this.maxOutputBytes) return hold('Notebook result exceeds configured output limit',{cellId,maxOutputBytes:this.maxOutputBytes});
      return ok({cellId,state:'EXECUTED',adapterId:adapter.id,result,provenance:{adapter:adapter.id,attestationState:'HOST_VERIFIED',executedAt:new Date().toISOString()}}); }
    catch(e) { return hold('Notebook cell execution failed',{cellId,error:String(e.message||e)}); }
  }
}

/** LMS event projection. Events are append-only and analytics are descriptive, not causal. */
export class LearningRecordEngine {
  constructor({verifyEvidence=null}={}) { this.events=[]; this.verifyEvidence=verifyEvidence; }
  record(event) {
    if(!isObj(event)||!nonblank(event.id)||!nonblank(event.actorId)||!nonblank(event.verb)||!nonblank(event.objectId)||!nonblank(event.timestamp)||!Number.isFinite(Date.parse(event.timestamp))) return hold('Learning event requires id, actorId, verb, objectId and valid timestamp');
    if(this.events.some(e=>e.id===event.id)) return hold('Duplicate event ID');
    if(event.verb==='mastered') {
      if(!nonblank(event.evidenceRef)||event.evidenceSubject!==event.objectId||event.evidenceState!=='ACCEPTED') return hold('Mastery requires accepted evidence explicitly bound to the learning outcome');
      if(typeof this.verifyEvidence!=='function') return hold('Host evidence verifier is required before mastery can be accepted');
      let verified=false; try { verified=this.verifyEvidence({evidenceRef:event.evidenceRef,actorId:event.actorId,subjectId:event.objectId,event})===true; } catch { verified=false; }
      if(!verified) return hold('Mastery evidence verification failed');
    }
    const safe={...clone(event),source:'pap.education',recordedAt:new Date().toISOString()}; this.events.push(Object.freeze(safe)); return ok(safe);
  }
  byLearner(actorId) { return this.events.filter(e=>e.actorId===actorId).map(clone); }
  progress(actorId, requiredOutcomeIds=[]) {
    const ev=this.byLearner(actorId); const achieved=new Set(ev.filter(e=>e.verb==='mastered'&&e.evidenceState==='ACCEPTED').map(e=>e.objectId));
    const missing=requiredOutcomeIds.filter(id=>!achieved.has(id));
    return {actorId,required:requiredOutcomeIds.length,acceptedMastery:requiredOutcomeIds.length-missing.length,missing,status:missing.length?'IN_PROGRESS':'COMPLETE',warning:'Learning progress is not a diagnosis, certification, or engineering verification.'};
  }
  correlation(xId,yId,{cohortId,objectId=null,minObservations=5}={}) {
    if(!nonblank(xId)||!nonblank(yId)||xId===yId||!nonblank(cohortId)) return hold('Correlation requires two distinct variables and an explicit cohort scope');
    if(!Number.isInteger(minObservations)||minObservations<5) return hold('Minimum cohort sample size cannot be lower than five');
    const pairs=[];
    for(const e of this.events) if(e.cohortId===cohortId&&(!objectId||e.objectId===objectId)&&Number.isFinite(e.metrics?.[xId])&&Number.isFinite(e.metrics?.[yId])) pairs.push([e.metrics[xId],e.metrics[yId]]);
    if(pairs.length<minObservations) return hold('Insufficient paired observations for privacy-preserving descriptive correlation',{n:pairs.length,minimum:minObservations,cohortId});
    const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]); const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;
    const cov=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0); const vx=xs.reduce((s,x)=>s+(x-mx)**2,0),vy=ys.reduce((s,y)=>s+(y-my)**2,0);
    if(vx===0||vy===0) return hold('Correlation undefined for zero-variance variable',{n:pairs.length,cohortId});
    return ok({n:pairs.length,cohortId,objectId,pearsonR:cov/Math.sqrt(vx*vy),variables:[xId,yId],interpretation:'DESCRIPTIVE_ASSOCIATION_ONLY',causalInference:false,individualRanking:false,minimumCohortSize:minObservations});
  }
  toXAPI() { return this.events.map(e=>({id:e.id,actor:{account:{name:e.actorId}},verb:{id:`https://pap.example/verbs/${encodeURIComponent(e.verb)}`},object:{id:e.objectId},timestamp:e.timestamp,result:{success:e.success??null,score:e.metrics?.score??null},context:{extensions:{'https://pap.example/extensions/evidence-state':e.evidenceState||'UNSPECIFIED'}}})); }
}

/** Platform adapter: writes only explicitly supported canonical entities/relations. */
export class CanonicalEducationAdapter {
  constructor(kernel) { if(!kernel||typeof kernel.upsert!=='function'||typeof kernel.link!=='function') throw new Error('Canonical PAP kernel with upsert/link is required'); this.kernel=kernel; }
  publishSyllabus(projectId, syllabus) {
    if(!nonblank(projectId)||!syllabus||!nonblank(syllabus.id)) return hold('Project and syllabus identity required');
    if(syllabus.status!=='DRAFT'&&syllabus.status!=='DRAFT_HOLD') return hold('Only draft syllabus can be published to canonical graph');
    const id=`syllabus_${syllabus.id}`;
    const entity=this.kernel.upsert({id,type:'Curriculum',name:syllabus.title,band:syllabus.band,subject:syllabus.subject,status:syllabus.status,syllabusVersion:syllabus.version||'1.0.0',conceptIds:syllabus.concepts.map(c=>c.id),frameworkIds:syllabus.frameworkIds,provenance:{origin:PACKAGE_ID,derivedFrom:projectId,note:'Curriculum projection; standards authority remains external and source-bound'}});
    this.kernel.link(projectId,'CONTAINS',id); return ok(entity);
  }
}

export function validatePackageHealth({frameworkRegistry,sourceRegistry=null,correlationEngine,syllabusEngine,notebookEngine,recordEngine,lmsEngine=null}) {
  const checks=[['framework_registry',frameworkRegistry instanceof FrameworkRegistry],['curriculum_source_registry',sourceRegistry===null || sourceRegistry instanceof CurriculumSourceRegistry],['correlation_engine',correlationEngine instanceof CurriculumCorrelationEngine],['syllabus_engine',syllabusEngine instanceof SyllabusEngine],['notebook_engine',notebookEngine instanceof NotebookEngine],['learning_record_engine',recordEngine instanceof LearningRecordEngine],['lms_engine',lmsEngine===null || typeof lmsEngine.createCourse==='function']];
  return {status:checks.every(x=>x[1])?'OK':'HOLD',checks:checks.map(([name,pass])=>({name,pass})),noClaims:{globalCurriculumCoverage:false,caseCertification:false,ltiCertification:false,engineeringVerification:false,clinicalAssessment:false}};
}
