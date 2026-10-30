/**
 * Deterministic, allow-listed educational computation kernels.
 * No eval, arbitrary imports, filesystem, network or process access.
 * These are classroom reference models, not validated engineering solvers.
 */
const hold = reason => ({ outcome: 'HOLD', reason });
const ok = value => ({ outcome: 'OK', value });
const finite = x => Number.isFinite(x);

export function executeEducationOperation(operation, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return hold('Operation input must be an object');
  if (operation === 'measurement-summary') {
    const values = input.values;
    if (!Array.isArray(values) || values.length < 2 || !values.every(finite)) return hold('Measurement summary requires at least two finite values');
    const mean = values.reduce((a,b)=>a+b,0)/values.length;
    const variance = values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1);
    return ok({n:values.length,mean,sampleStandardDeviation:Math.sqrt(variance),min:Math.min(...values),max:Math.max(...values),unit:input.unit||null,method:'sample-standard-deviation'});
  }
  if (operation === 'linear-regression') {
    const points = input.points;
    if (!Array.isArray(points) || points.length < 2 || !points.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))) return hold('Linear regression requires at least two finite [x,y] pairs');
    const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
    const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
    const sxx=xs.reduce((s,x)=>s+(x-mx)**2,0), sxy=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0);
    if (sxx===0) return hold('Linear regression is undefined when all x values are identical');
    const slope=sxy/sxx, intercept=my-slope*mx;
    const residuals=points.map(([x,y])=>y-(intercept+slope*x));
    const sse=residuals.reduce((s,e)=>s+e*e,0), sst=ys.reduce((s,y)=>s+(y-my)**2,0);
    return ok({n:points.length,slope,intercept,rSquared:sst===0?(sse===0?1:null):1-sse/sst,residuals,model:'ordinary-least-squares-with-intercept'});
  }
  if (operation === 'first-order-control') {
    const {setpoint,initial=0,ambient=0,processGain=1,timeConstant=5,kp=1,dt=0.1,duration=10}=input;
    if (![setpoint,initial,ambient,processGain,timeConstant,kp,dt,duration].every(finite)||timeConstant<=0||dt<=0||duration<=0||duration/dt>100000) return hold('Control sample requires finite values, positive time constant/timestep/duration and <=100000 steps');
    const steps=Math.ceil(duration/dt); let y=initial; const series=[{t:0,y,control:0}]; let max=y;
    for(let i=1;i<=steps;i++) { const error=setpoint-y; const control=kp*error; const dy=(processGain*control-(y-ambient))/timeConstant; y+=dt*dy; if(!finite(y)) return hold('Numerical instability in educational first-order model'); max=Math.max(max,y); if(i===steps||i%Math.max(1,Math.floor(steps/100))===0) series.push({t:Math.min(i*dt,duration),y,control}); }
    const band=Math.abs(setpoint)*0.02+1e-9;
    const settled=series.findIndex((p,i)=>i>0&&series.slice(i).every(q=>Math.abs(q.y-setpoint)<=band));
    return ok({series,finalValue:y,steadyStateError:setpoint-y,maximumValue:max,overshoot:Math.max(0,max-setpoint),settlingTime:settled>=0?series[settled].t:null,model:'discrete-first-order-proportional-feedback',warning:'Educational model only. Not a plant model, controller tuning certificate or physical safety authority.'});
  }
  return hold(`Operation is not allow-listed: ${operation}`);
}

export function createReferenceEducationAdapter() {
  return {
    id:'pap.education.reference', kind:'educational-computation',
    runtimeAttestation:{issuer:'PAP_REFERENCE_SAMPLE_RUNNER',isolation:'allow-listed-pure-function',scope:'education-samples-only'},
    execute:async({cell})=>executeEducationOperation(cell.operation,cell.inputs||{})
  };
}
