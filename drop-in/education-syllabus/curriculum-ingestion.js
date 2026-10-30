/**
 * Source-controlled curriculum ingestion and two-person review workflow.
 * Stores source metadata, short locators and hashes, not copyrighted chapter text.
 * Retrieval, file hashing and identity verification are host responsibilities.
 */
const ok=value=>({outcome:'OK',value});
const hold=(reason,details={})=>({outcome:'HOLD',reason,...details});
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
const sha=x=>/^sha256:[a-f0-9]{64}$/i.test(x||'');
const date=x=>text(x)&&Number.isFinite(Date.parse(x));
const clone=x=>structuredClone(x);
export class CurriculumIngestionEngine {
  constructor({verifyReviewer=null,minimumIndependentReviews=2}={}){
    if(!Number.isInteger(minimumIndependentReviews)||minimumIndependentReviews<2) throw new Error('At least two independent reviews are required');
    this.verifyReviewer=verifyReviewer; this.minimumIndependentReviews=minimumIndependentReviews; this.sources=new Map(); this.extractions=new Map();
  }
  registerSourceEdition(source){
    if(!isObj(source)||!text(source.id)||!text(source.frameworkId)||!text(source.authority)||!text(source.edition)||!text(source.jurisdiction)||!text(source.language)||!text(source.sourceUrl)||!/^https:\/\//.test(source.sourceUrl)||!date(source.effectiveFrom)||!date(source.retrievedAt)||!sha(source.sourceDigest)) return hold('Source edition requires identity, authority, HTTPS locator, edition, jurisdiction, language, effective date, retrieval date and SHA-256 digest');
    if(!['OPEN','RESTRICTED','UNKNOWN'].includes(source.licenseStatus)) return hold('licenseStatus must be OPEN, RESTRICTED or UNKNOWN');
    if(this.sources.has(source.id)) return hold('Source edition IDs are immutable; create a new versioned ID');
    const stored={...clone(source),state:'SOURCE_REGISTERED',redistributionAllowed:source.licenseStatus==='OPEN',rawTextStored:false};
    this.sources.set(stored.id,Object.freeze(stored)); return ok(clone(stored));
  }
  submitExtraction(item){
    if(!isObj(item)||!text(item.id)||!text(item.sourceId)||!text(item.standardId)||!text(item.locator)||!sha(item.excerptHash)||!text(item.contributorId)||!date(item.submittedAt)||!Array.isArray(item.learningOutcomes)||!item.learningOutcomes.length||item.learningOutcomes.some(x=>!text(x))) return hold('Extraction requires source, standard, locator, excerpt hash, contributor, timestamp and learning outcomes');
    if(!this.sources.has(item.sourceId)) return hold('Source edition is not registered');
    if(this.extractions.has(item.id)) return hold('Extraction IDs are immutable; create a new revision');
    const stored={...clone(item),state:'PROPOSED',reviews:[],verifiedAt:null};
    delete stored.rawExcerpt; delete stored.fullText;
    this.extractions.set(stored.id,stored); return ok(clone(stored));
  }
  reviewExtraction({extractionId,reviewerId,decision='ACCEPT',sourceMatch=false,locatorMatch=false,meaningMatch=false,reviewedAt,notes='' }={}){
    const item=this.extractions.get(extractionId); if(!item) return hold('Extraction not found');
    if(['REJECTED','REVIEW_REQUIRED','VERIFIED_CONTENT'].includes(item.state)) return hold('This extraction revision is closed; submit a new revision for reconsideration',{state:item.state});
    if(!text(reviewerId)||!date(reviewedAt)||!['ACCEPT','REJECT'].includes(decision)) return hold('Reviewer identity, valid timestamp and decision required');
    if(reviewerId===item.contributorId) return hold('Contributor cannot independently review their own extraction');
    let reviewerVerified=false; try { reviewerVerified=typeof this.verifyReviewer==='function'&&this.verifyReviewer({reviewerId,sourceId:item.sourceId,frameworkId:this.sources.get(item.sourceId).frameworkId})===true; } catch { reviewerVerified=false; }
    if(!reviewerVerified) return hold('Reviewer authority is not verified by the host identity service');
    if(item.reviews.some(r=>r.reviewerId===reviewerId)) return hold('Reviewer may submit only one review per extraction revision');
    const review={reviewerId,decision,sourceMatch:sourceMatch===true,locatorMatch:locatorMatch===true,meaningMatch:meaningMatch===true,reviewedAt,notes:String(notes).slice(0,2000)};
    item.reviews.push(review);
    if(decision==='REJECT') item.state='REJECTED';
    else if(!review.sourceMatch||!review.locatorMatch||!review.meaningMatch) item.state='REVIEW_REQUIRED';
    const accepted=item.reviews.filter(r=>r.decision==='ACCEPT'&&r.sourceMatch&&r.locatorMatch&&r.meaningMatch);
    if(accepted.length>=this.minimumIndependentReviews){item.state='VERIFIED_CONTENT';item.verifiedAt=reviewedAt;}
    return ok(clone(item),{remainingReviews:Math.max(0,this.minimumIndependentReviews-accepted.length)});
  }
  getVerified(extractionId){const x=this.extractions.get(extractionId);return x?.state==='VERIFIED_CONTENT'?ok(clone(x)):hold('Curriculum extraction has not passed independent source review',{state:x?.state||'NOT_FOUND'});}
  report(){
    const sources=[...this.sources.values()],items=[...this.extractions.values()];
    return {sourceEditions:sources.length,extractions:items.length,proposed:items.filter(x=>x.state==='PROPOSED').length,reviewRequired:items.filter(x=>x.state==='REVIEW_REQUIRED').length,verifiedContent:items.filter(x=>x.state==='VERIFIED_CONTENT').length,rejected:items.filter(x=>x.state==='REJECTED').length,redistributionRestricted:sources.filter(x=>!x.redistributionAllowed).length,coverageClaim:false};
  }
}
