/**
 * PAP Education LMS orchestration layer.
 * This is a domain engine, not a persistent LMS database or identity provider.
 * Production integration must inject a transactional repository and identity/consent
 * authority. The in-memory implementation is deterministic test infrastructure only.
 */
const ok = (value, extra={}) => ({outcome:'OK', value, ...extra});
const hold = (reason, details={}) => ({outcome:'HOLD', reason, ...details});
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0;
const clone = x => structuredClone(x);
const cloneMap = map => new Map([...map.entries()].map(([k,v])=>[k,clone(v)]));
const ROLES = new Set(['administrator','teacher','professor','lab_assistant','student','parent']);

/** Test-only store. Never use as production persistence. */
export class MemoryLearningRepository {
  constructor(){ this.courses=new Map(); this.enrollments=new Map(); this.guardians=new Map(); this.assignments=new Map(); this.submissions=new Map(); this.events=[]; }
  transaction(fn){
    const snapshot={courses:cloneMap(this.courses),enrollments:cloneMap(this.enrollments),guardians:cloneMap(this.guardians),assignments:cloneMap(this.assignments),submissions:cloneMap(this.submissions),events:clone(this.events)};
    try { return fn(this); } catch(error) { Object.assign(this,snapshot); throw error; }
  }
}

/**
 * Role- and scope-checked LMS workflow.
 * The identityProvider must return {id, roles, scopes}; scopes are course IDs or '*'.
 * The consentProvider must explicitly approve guardian visibility.
 */
export class LearningManagementEngine {
  constructor({repository, identityProvider, consentProvider, verifyEvidence=null, clock=()=>new Date()}={}){
    if(!repository || typeof repository.transaction!=='function') throw new Error('Transactional repository adapter required');
    if(typeof identityProvider!=='function') throw new Error('Identity provider required');
    if(typeof consentProvider!=='function') throw new Error('Guardian consent provider required');
    this.repo=repository; this.identity=identityProvider; this.consent=consentProvider; this.verifyEvidence=verifyEvidence; this.clock=clock;
  }
  actor(actorId, allowed){
    if(!text(actorId)) return hold('Actor identity is required');
    let a; try { a=this.identity(actorId); } catch { return hold('Identity provider unavailable'); }
    if(!a || a.id!==actorId || !Array.isArray(a.roles) || !a.roles.some(r=>allowed.includes(r))) return hold('Actor is not authorized for this LMS operation');
    return ok(a);
  }
  inScope(actor, courseId){ return actor.scopes?.includes('*') || actor.scopes?.includes(courseId); }
  event(actorId, verb, objectId, data={}){
    const timestamp=this.clock().toISOString();
    const id=`evt_${this.repo.events.length+1}_${actorId}_${verb}_${objectId}`;
    this.repo.events.push(Object.freeze({id,actorId,verb,objectId,timestamp,...clone(data)}));
  }
  createCourse(actorId, course){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!isObj(course)||!text(course.id)||!text(course.title)||!text(course.subject)||!text(course.band)||!Array.isArray(course.outcomeIds)||!course.outcomeIds.length) return hold('Course requires id, title, subject, learner band and outcomeIds');
    if(!a.value.scopes?.includes('*')&&!a.value.scopes?.includes(course.id)) return hold('Course is outside actor scope');
    if(new Set(course.outcomeIds).size!==course.outcomeIds.length||course.outcomeIds.some(x=>!text(x))) return hold('Course outcome IDs must be unique and non-empty');
    return this.repo.transaction(r=>{
      if(r.courses.has(course.id)) return hold('Course ID already exists');
      const c={...clone(course),status:'DRAFT',createdBy:actorId,createdAt:this.clock().toISOString(),enrollmentOpen:false};
      r.courses.set(c.id,c); this.event(actorId,'created',c.id); return ok(clone(c));
    });
  }
  publishCourse(actorId, courseId){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    return this.repo.transaction(r=>{
      const c=r.courses.get(courseId); if(!c) return hold('Course not found');
      if(!this.inScope(a.value,courseId)) return hold('Course is outside actor scope');
      if(!Array.isArray(c.lessons)||!c.lessons.length) return hold('Course requires at least one lesson before publication');
      if(c.lessons.some(l=>!text(l.id)||!text(l.learningOutcomeId)||!text(l.contentRef))) return hold('Every lesson requires id, learningOutcomeId and contentRef');
      c.status='PUBLISHED'; c.enrollmentOpen=true; c.publishedAt=this.clock().toISOString();
      this.event(actorId,'published',courseId); return ok(clone(c));
    });
  }
  addLesson(actorId, courseId, lesson){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!isObj(lesson)||!text(lesson.id)||!text(lesson.title)||!text(lesson.learningOutcomeId)||!text(lesson.contentRef)) return hold('Lesson requires id, title, learningOutcomeId and contentRef');
    return this.repo.transaction(r=>{
      const c=r.courses.get(courseId); if(!c) return hold('Course not found');
      if(!this.inScope(a.value,courseId)) return hold('Course is outside actor scope');
      if(c.status==='PUBLISHED') return hold('Published course is immutable; create a versioned course revision');
      if(!c.outcomeIds.includes(lesson.learningOutcomeId)) return hold('Lesson learning outcome is not declared by the course');
      c.lessons ||= []; if(c.lessons.some(x=>x.id===lesson.id)) return hold('Lesson ID already exists');
      c.lessons.push({...clone(lesson),sequence:c.lessons.length+1}); this.event(actorId,'added-lesson',`${courseId}/${lesson.id}`); return ok(clone(c.lessons.at(-1)));
    });
  }
  enroll(actorId, courseId, learnerId){
    const actor=this.actor(actorId,['administrator','teacher','professor','student']); if(actor.outcome!=='OK') return actor;
    if(!text(learnerId)) return hold('Learner identity required');
    const learner=this.identity(learnerId); if(!learner||learner.id!==learnerId||!learner.roles?.includes('student')) return hold('A registered student identity is required');
    if(actorId!==learnerId && !actor.value.roles.some(r=>['administrator','teacher','professor'].includes(r))) return hold('Learners may only enroll themselves');
    return this.repo.transaction(r=>{
      const c=r.courses.get(courseId); if(!c||c.status!=='PUBLISHED'||!c.enrollmentOpen) return hold('Course is not open for enrollment');
      if(!this.inScope(actor.value,courseId)) return hold('Course is outside actor scope');
      const key=`${courseId}:${learnerId}`; if(r.enrollments.has(key)) return hold('Learner is already enrolled');
      const e={id:key,courseId,learnerId,state:'ACTIVE',enrolledAt:this.clock().toISOString(),completedOutcomeIds:[]}; r.enrollments.set(key,e);
      this.event(actorId,'enrolled',courseId,{learnerId}); return ok(clone(e));
    });
  }
  createAssignment(actorId, courseId, assignment){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!isObj(assignment)||!text(assignment.id)||!text(assignment.title)||!text(assignment.outcomeId)||!Array.isArray(assignment.rubric)||!assignment.rubric.length) return hold('Assignment requires id, title, outcomeId and rubric criteria');
    if(assignment.rubric.some(c=>!text(c.id)||!text(c.description)||!Number.isFinite(c.maxPoints)||c.maxPoints<=0)||new Set(assignment.rubric.map(c=>c.id)).size!==assignment.rubric.length) return hold('Rubric criteria require unique IDs, descriptions and positive maxPoints');
    if(assignment.dueAt && !Number.isFinite(Date.parse(assignment.dueAt))) return hold('Assignment dueAt must be a valid timestamp');
    return this.repo.transaction(r=>{
      const c=r.courses.get(courseId); if(!c||c.status!=='PUBLISHED') return hold('Assignment requires a published course');
      if(!c.outcomeIds.includes(assignment.outcomeId)) return hold('Assignment outcome is not declared by the course');
      if(!this.inScope(a.value,courseId)) return hold('Course is outside actor scope');
      const key=`${courseId}:${assignment.id}`; if(r.assignments.has(key)) return hold('Assignment ID already exists');
      const total=assignment.rubric.reduce((s,x)=>s+x.maxPoints,0);
      const item={...clone(assignment),courseId,totalPoints:total,createdBy:actorId}; r.assignments.set(key,item);
      this.event(actorId,'created-assignment',key); return ok(clone(item));
    });
  }
  submit(actorId, courseId, assignmentId, submission){
    const a=this.actor(actorId,['student']); if(a.outcome!=='OK') return a;
    if(!isObj(submission)||!text(submission.id)||!text(submission.artifactRef)) return hold('Submission requires id and artifactRef');
    return this.repo.transaction(r=>{
      const c=r.courses.get(courseId), e=r.enrollments.get(`${courseId}:${actorId}`), as=r.assignments.get(`${courseId}:${assignmentId}`);
      if(!c||!e||e.state!=='ACTIVE') return hold('Active course enrollment required');
      if(!as) return hold('Assignment not found');
      if(as.dueAt && this.clock().getTime()>Date.parse(as.dueAt) && !as.acceptLate) return hold('Submission deadline has passed');
      const key=`${courseId}:${assignmentId}:${actorId}`; if(r.submissions.has(key)) return hold('Submission already exists; use an explicit resubmission policy');
      const s={...clone(submission),courseId,assignmentId,learnerId:actorId,state:'SUBMITTED',submittedAt:this.clock().toISOString(),assessment:null}; r.submissions.set(key,s);
      this.event(actorId,'submitted',key,{artifactRef:submission.artifactRef}); return ok(clone(s));
    });
  }
  assess(actorId, courseId, assignmentId, learnerId, assessment){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!isObj(assessment)||!Array.isArray(assessment.scores)||!text(assessment.feedback||'')) return hold('Assessment requires criterion scores and feedback');
    return this.repo.transaction(r=>{
      const as=r.assignments.get(`${courseId}:${assignmentId}`), key=`${courseId}:${assignmentId}:${learnerId}`, s=r.submissions.get(key), e=r.enrollments.get(`${courseId}:${learnerId}`);
      if(!as||!s||!e) return hold('Assignment, submission and enrollment must all exist');
      if(!this.inScope(a.value,courseId)) return hold('Course is outside assessor scope');
      if(assessment.scores.length!==as.rubric.length) return hold('Every rubric criterion must be scored exactly once');
      const seen=new Set(); let total=0;
      for(const score of assessment.scores){
        const criterion=as.rubric.find(x=>x.id===score.criterionId);
        if(!criterion||seen.has(score.criterionId)||!Number.isFinite(score.points)||score.points<0||score.points>criterion.maxPoints) return hold('Invalid, duplicate or out-of-range rubric score');
        seen.add(score.criterionId); total+=score.points;
      }
      s.assessment={assessorId:actorId,scores:clone(assessment.scores),points:total,maxPoints:as.totalPoints,feedback:assessment.feedback,assessedAt:this.clock().toISOString(),state:'ASSESSED'};
      this.event(actorId,'assessed',key,{points:total,maxPoints:as.totalPoints}); return ok(clone(s.assessment));
    });
  }
  acceptMastery(actorId, courseId, learnerId, outcomeId, evidenceRef){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!text(evidenceRef)) return hold('Mastery requires an evidence reference');
    if(typeof this.verifyEvidence!=='function') return hold('Host evidence verifier is required before mastery can be accepted');
    let verified=false; try { verified=this.verifyEvidence({evidenceRef,courseId,learnerId,outcomeId,reviewerId:actorId})===true; } catch { verified=false; }
    if(!verified) return hold('Mastery evidence verification failed');
    return this.repo.transaction(r=>{
      const e=r.enrollments.get(`${courseId}:${learnerId}`), c=r.courses.get(courseId);
      if(!e||!c||!c.outcomeIds.includes(outcomeId)) return hold('Enrollment and course outcome must exist');
      if(!this.inScope(a.value,courseId)) return hold('Course is outside assessor scope');
      if(!e.completedOutcomeIds.includes(outcomeId)) e.completedOutcomeIds.push(outcomeId);
      this.event(actorId,'mastery-accepted',`${courseId}:${learnerId}:${outcomeId}`,{evidenceRef});
      const complete=c.outcomeIds.every(id=>e.completedOutcomeIds.includes(id)); e.state=complete?'COMPLETE':'ACTIVE';
      return ok({enrollment:clone(e),courseComplete:complete,evidenceRef});
    });
  }
  linkGuardian(actorId, guardianId, learnerId){
    const a=this.actor(actorId,['administrator']); if(a.outcome!=='OK') return a;
    if(!text(guardianId)||!text(learnerId)||guardianId===learnerId) return hold('Distinct guardian and learner identities required');
    const guardian=this.identity(guardianId), learner=this.identity(learnerId);
    if(!guardian?.roles?.includes('parent')||!learner?.roles?.includes('student')) return hold('Registered parent and student identities are required');
    let approved=false; try { approved=this.consent(guardianId,learnerId)===true; } catch { approved=false; }
    if(approved!==true) return hold('Guardian visibility requires explicit, current consent or legal authority');
    const key=`${guardianId}:${learnerId}`; this.repo.guardians.set(key,{guardianId,learnerId,linkedAt:this.clock().toISOString(),consent:'VERIFIED'}); return ok(clone(this.repo.guardians.get(key)));
  }
  learnerProgress(actorId, courseId, learnerId){
    const a=this.actor(actorId,['administrator','teacher','professor','student','parent']); if(a.outcome!=='OK') return a;
    if(actorId!==learnerId){
      if(a.value.roles.includes('parent')){
        const g=this.repo.guardians.get(`${actorId}:${learnerId}`); let currentConsent=false; try { currentConsent=this.consent(actorId,learnerId)===true; } catch { currentConsent=false; }
        if(!g||g.consent!=='VERIFIED'||!currentConsent) return hold('Guardian access is not authorized by current consent');
      } else if(!a.value.roles.some(r=>['administrator','teacher','professor'].includes(r))||!this.inScope(a.value,courseId)) return hold('Learner progress is outside actor authority');
    }
    const c=this.repo.courses.get(courseId), e=this.repo.enrollments.get(`${courseId}:${learnerId}`); if(!c||!e) return hold('Course enrollment not found');
    return ok({courseId,learnerId,state:e.state,completedOutcomeIds:clone(e.completedOutcomeIds),requiredOutcomeIds:clone(c.outcomeIds),remaining:c.outcomeIds.filter(x=>!e.completedOutcomeIds.includes(x)),completionRatio:e.completedOutcomeIds.length/c.outcomeIds.length,warning:'Educational progress is not a diagnosis, credential, or engineering verification.'});
  }
  eventsFor(actorId, courseId){
    const a=this.actor(actorId,['administrator','teacher','professor']); if(a.outcome!=='OK') return a;
    if(!this.inScope(a.value,courseId)) return hold('Course is outside actor scope');
    return ok(this.repo.events.filter(e=>e.objectId===courseId||e.objectId.startsWith(`${courseId}:`)).map(clone));
  }
}
