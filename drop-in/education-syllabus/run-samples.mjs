import fs from 'node:fs';
import {FrameworkRegistry,CurriculumCorrelationEngine,SyllabusEngine,LearningExperienceEngine,NotebookEngine,LearningRecordEngine} from './module.js';
import {ExplanationEngine} from './explanation-engine.js';
import {LearningManagementEngine,MemoryLearningRepository} from './lms-engine.js';
import {createReferenceEducationAdapter} from './reference-education-runtime.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const framework=read('./data/framework-registry.json');
const countries=read('./data/country-jurisdiction-registry.json');
const globalTargets=read('./data/global-curriculum-ingestion-targets.json');
const subdivisions=read('./data/subnational-jurisdiction-targets.json');
const india=read('./data/india-jurisdictions.json');
const indiaTargets=read('./data/india-state-board-targets.json');
const syllabusData=read('./data/starter-syllabus.json');
const registry=new FrameworkRegistry({frameworks:framework.frameworks,jurisdictions:[{id:'IN',name:'India',coverage_status:'REGISTRY_ONLY'}]});
const correlations=new CurriculumCorrelationEngine(registry);
const syllabus=new SyllabusEngine({correlationEngine:correlations});
const built=syllabus.build(syllabusData);
if(built.outcome!=='OK') throw new Error(built.reason);
console.log(`PASS syllabus: ${built.value.concepts.length} concepts sequenced; status=${built.value.status}`);
const experiences=new LearningExperienceEngine();
for(const role of ['teacher','professor','lab_assistant','parent','student','independent_learner']) {
 const p=experiences.plan({role,band:'middle',concept:built.value.concepts[0]});
 if(p.outcome!=='OK') throw new Error(`Role plan failed: ${role}`);
 console.log(`PASS role experience: ${role}`);
}
const explanation=new ExplanationEngine();
for(const mode of ['INTUITIVE','CONCRETE','VISUAL','FORMAL','WORKED','ANALOGY','MISCONCEPTION','PRACTICE','EXTENSION','LOCAL_CONTEXT']) {
 const r=explanation.build({concept:built.value.concepts[0],mode,locale:'en'});
 if(r.outcome!=='OK') throw new Error(`Explanation ${mode} unavailable: ${r.reason}`);
}
console.log('PASS explanation modes: 10 representations validated for measurement concept');
const levelled=read('./data/levelled-learning-examples.json');
if(levelled.bands.length!==11||levelled.bands.some(x=>x.officialCurriculumAlignment!=='NOT_ASSERTED')) throw new Error('Levelled learning examples incomplete or mislabelled');
console.log(`PASS levelled examples: ${levelled.bands.length} bands, no official board alignment asserted`);
const nb=new NotebookEngine({verifyAdapter:a=>(a?.issuer==='PAP_REFERENCE_SAMPLE_RUNNER'&&a?.isolation==='allow-listed-pure-function')||(a?.issuer==='pap-fixture-host'&&a?.isolation==='worker')});
const refAdapter=createReferenceEducationAdapter();
if(nb.registerAdapter(refAdapter).outcome!=='OK') throw new Error('Reference education adapter host attestation failed');
for(const [file,cellId] of [['measurement-lab-01.json','compute-summary'],['linear-model-lab-01.json','fit-line'],['feedback-control-lab-01.json','experiment']]) {
 const data=read(`./samples/${file}`); const valid=nb.validate(data); if(valid.outcome!=='OK') throw new Error(`${file}: ${valid.reason}`);
 const run=await nb.executeCell(data,cellId);
 if(run.outcome!=='OK'||run.value.state!=='EXECUTED'||!run.value.result) throw new Error(`${file} sample computation failed: ${run.reason||JSON.stringify(run.value)}`);
 if(cellId==='compute-summary'&&Math.abs(run.value.result.mean-120.1)>1e-8) throw new Error('Measurement summary numeric check failed');
 if(cellId==='fit-line'&&(Math.abs(run.value.result.slope-2)>1e-10||Math.abs(run.value.result.intercept-1)>1e-10)) throw new Error('Linear regression numeric check failed');
 if(cellId==='experiment'&&!(run.value.result.finalValue>18&&run.value.result.finalValue<22.1)) throw new Error('Feedback model numeric check failed');
 console.log(`PASS executable notebook: ${data.id}/${cellId}`);
}
const physical=await nb.executeCell(read('./samples/feedback-control-lab-01.json'),'experiment',{physical:true,supervised:false});
if(physical.outcome!=='HOLD') throw new Error('Unsupervised physical activity must HOLD');
console.log('PASS physical activity gate: unsupervised -> HOLD');

const people={admin:{id:'admin',roles:['administrator'],scopes:['*']},teacher:{id:'teacher',roles:['teacher'],scopes:['course-demo']},student:{id:'student',roles:['student'],scopes:['course-demo']},parent:{id:'parent',roles:['parent'],scopes:['course-demo']}};
let consent=false;
const repo=new MemoryLearningRepository();
const lms=new LearningManagementEngine({repository:repo,identityProvider:id=>people[id]||null,consentProvider:()=>consent,verifyEvidence:e=>e.evidenceRef.startsWith('fixture-verified:')&&e.learnerId==='student'});
const course=lms.createCourse('teacher',{id:'course-demo',title:'Measurement and Modelling',subject:'Integrated STEM',band:'middle',outcomeIds:['o-measure','o-model']});
if(course.outcome!=='OK') throw new Error(course.reason);
for(const lesson of [{id:'lesson-measure',title:'Measurement',learningOutcomeId:'o-measure',contentRef:'syllabus:measurement.quantity'},{id:'lesson-model',title:'Linear Models',learningOutcomeId:'o-model',contentRef:'syllabus:math.linear.model'}]) if(lms.addLesson('teacher','course-demo',lesson).outcome!=='OK') throw new Error('LMS lesson creation failed');
if(lms.publishCourse('teacher','course-demo').outcome!=='OK'||lms.enroll('student','course-demo','student').outcome!=='OK') throw new Error('LMS publish/enroll failed');
if(lms.createAssignment('teacher','course-demo',{id:'assignment-1',title:'Measurement report',outcomeId:'o-measure',rubric:[{id:'r1',description:'Units and method',maxPoints:5},{id:'r2',description:'Uncertainty',maxPoints:5}]}).outcome!=='OK') throw new Error('LMS assignment creation failed');
if(lms.submit('student','course-demo','assignment-1',{id:'submission-1',artifactRef:'artifact:measurement-report'}).outcome!=='OK') throw new Error('LMS submission failed');
if(lms.assess('teacher','course-demo','assignment-1','student',{scores:[{criterionId:'r1',points:5},{criterionId:'r2',points:4}],feedback:'Good unit discipline; refine uncertainty explanation.'}).outcome!=='OK') throw new Error('LMS assessment failed');
if(lms.acceptMastery('teacher','course-demo','student','o-measure','fixture-verified:assessment-1').outcome!=='OK') throw new Error('LMS mastery evidence failed');
if(lms.learnerProgress('student','course-demo','student').value.completionRatio!==0.5) throw new Error('LMS progress calculation failed');
if(lms.linkGuardian('admin','parent','student').outcome!=='HOLD') throw new Error('Guardian consent should HOLD');
consent=true; if(lms.linkGuardian('admin','parent','student').outcome!=='OK'||lms.learnerProgress('parent','course-demo','student').outcome!=='OK') throw new Error('Consented parent view failed');
console.log('PASS LMS end-to-end: course -> lessons -> publish -> enrollment -> assignment -> submission -> rubric assessment -> verified mastery -> parent consent view');
const records=new LearningRecordEngine({verifyEvidence:e=>e.evidenceRef==='fixture-evidence'&&e.evidenceSubject===e.objectId});
records.record({id:'sample-view-1',actorId:'learner-demo',verb:'viewed',objectId:'measurement.quantity',timestamp:'2026-10-30T00:00:00Z'});
if(countries.count!==249||globalTargets.count!==249||subdivisions.count!==5046||indiaTargets.unique_id_count!==36) throw new Error('Jurisdiction discovery registry count or uniqueness mismatch');
console.log(`PASS learning event capture: ${records.byLearner('learner-demo').length} event`);
console.log(`COVERAGE REGISTRY: ${countries.count} country/territory; ${globalTargets.count} curriculum discovery targets; ${subdivisions.count} ISO subdivision discovery targets; India ${india.states.length} states + ${india.union_territories.length} UTs / ${indiaTargets.count} board discovery targets.`);
console.log('Coverage status remains DISCOVERY_REQUIRED; no claim of syllabus ingestion or board verification.');
console.log('SAMPLE RUN COMPLETE: three notebook computations and LMS workflow passed; fixture simulations are not engineering solver qualification.');
