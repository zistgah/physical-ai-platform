/** Multi-representation explanation projection. It never changes the canonical outcome. */
const ok=(value)=>({outcome:'OK',value});
const hold=(reason)=>({outcome:'HOLD',reason});
const text=x=>typeof x==='string'&&x.trim().length>0;
const clone=x=>structuredClone(x);
export const EXPLANATION_MODES=Object.freeze(['INTUITIVE','CONCRETE','VISUAL','FORMAL','WORKED','ANALOGY','MISCONCEPTION','PRACTICE','EXTENSION','LOCAL_CONTEXT']);
export class ExplanationEngine {
  build({concept,mode='INTUITIVE',locale='en',learnerBand='middle',accessibility=[]}={}){
    if(!concept||!text(concept.id)||!text(concept.learningOutcome)) return hold('Concept identity and learning outcome required');
    if(!EXPLANATION_MODES.includes(mode)) return hold('Unsupported explanation mode');
    const e=concept.explanations||concept.explanationVariants||{};
    const core=concept.explanation?.core;
    const mapping={INTUITIVE:e.intuitive||core,CONCRETE:e.concrete||e.worked||concept.explanation?.worked,VISUAL:e.visual||concept.visualExplanation,FORMAL:e.formal||concept.formalDefinition,WORKED:e.worked||concept.explanation?.worked,ANALOGY:e.analogy,MISCONCEPTION:(concept.misconceptions||[]).join('\n'),PRACTICE:(concept.checks||[]).map(x=>x.prompt||x.question).filter(Boolean).join('\n'),EXTENSION:e.extension,LOCAL_CONTEXT:e.localContext?.[locale]||e.localContext?.default};
    const content=mapping[mode];
    if(!text(content)) return hold(`No source-authored ${mode.toLowerCase()} explanation is available for ${concept.id}`);
    return ok({conceptId:concept.id,learningOutcome:concept.learningOutcome,mode,locale,learnerBand,content,accessibility:{textEquivalent:true,requiresColorOnly:false,alternatives:clone(accessibility)},provenance:{source:'curriculum-concept',generated:false},warning:'Adaptation is a presentation view; it does not alter the learning outcome or establish mastery.'});
  }
}
