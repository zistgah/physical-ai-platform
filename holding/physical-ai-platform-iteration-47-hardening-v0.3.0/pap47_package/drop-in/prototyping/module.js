/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Creates a revision record only when configuration identity and subject-bound accepted evidence are present. */
export function prototype({config,evidence,previousRevision=0,requiredEvidence=[]}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!config?.id||!config.hash||!config.components||!Array.isArray(config.components)||!config.components.length)return hold('configuration requires id, content hash and component list');
 if(!Array.isArray(evidence)||!Array.isArray(requiredEvidence)||!Number.isInteger(previousRevision)||previousRevision<0)return hold('evidence and revision inputs are invalid');
 const valid=evidence.filter(e=>e&&e.id&&e.subject===config.id&&e.configurationHash===config.hash&&e.state==='ACCEPTED'&&e.provenance&&typeof e.provenance.source==='string'&&e.provenance.source.trim()&&typeof e.provenance.timestamp==='string'&&Number.isFinite(Date.parse(e.provenance.timestamp)));
 if(!valid.length)return hold('at least one accepted, provenance-bearing evidence record bound to this configuration is required');
 const missing=requiredEvidence.filter(type=>!valid.some(e=>e.type===type));
 if(missing.length)return {outcome:'HOLD',reason:'Required accepted evidence is absent or not bound to this configuration',missingEvidence:missing,validEvidence:valid.map(e=>e.id)};
 const revision=previousRevision+1;
 return {outcome:'OK',revision:{id:`${config.id}-r${revision}`,number:revision,configurationId:config.id,configurationHash:config.hash,evidenceIds:valid.map(e=>e.id),state:'PROTOTYPE_REVISION',createdFrom:'CANONICAL_CONFIGURATION'},qualification:'REVISION_RECORD_NOT_PHYSICAL_PROTOTYPE_ACCEPTANCE'};
}
