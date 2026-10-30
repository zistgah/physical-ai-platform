/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 47 drop-in simulation kernel.
 * Deterministic planar rigid-disc dynamics with accumulated sequential impulses.
 * SI units: m, s, kg, N, N·m, rad, rad/s. +y is upward; +angle is CCW.
 * Geometry: uniform rigid discs and an infinite horizontal floor only.
 * Integrator: semi-implicit Euler with bounded adaptive substeps.
 * Contacts: accumulated normal/tangential impulses, Coulomb friction,
 * restitution thresholding, and iterative positional correction.
 * This is a bounded 2D backend, not a 3D, articulated, FEM, CFD, sensor,
 * or certified safety simulator. Verification is SIMULATED.
 */

const finite = Number.isFinite;
const EPS = 1e-12;
const RESTITUTION_THRESHOLD = 1e-3;
const MAX_INPUT_MAGNITUDE = 1e50;
const LIMITS = Object.freeze({ bodies: 256, steps: 10000, totalSubsteps: 200000,
  maxSubsteps: 64, solverIterations: 100, historyFrames: 10000 });
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const hold = (reason, details = {}) => ({ outcome: "HOLD", reason, ...details });
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

function validateBody(s, i) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return `Body ${i} must be an object`;
  if (typeof s.id !== "string" || !s.id.trim()) return `Body ${i} requires a non-empty id`;
  for (const k of ["x", "y", "vx", "vy", "mass", "radius"])
    if (!finite(s[k]) || Math.abs(s[k]) > MAX_INPUT_MAGNITUDE) return `Body ${s.id} requires finite, bounded ${k}`;
  if (s.mass < 0) return `Body ${s.id} requires mass >= 0`;
  if (s.radius <= 0) return `Body ${s.id} requires radius > 0`;
  for (const k of ["fx", "fy", "torque", "angle", "omega"])
    if (s[k] !== undefined && (!finite(s[k]) || Math.abs(s[k]) > MAX_INPUT_MAGNITUDE)) return `Body ${s.id} has invalid or unbounded ${k}`;
  if (s.restitution !== undefined && (!finite(s.restitution) || s.restitution < 0 || s.restitution > 1))
    return `Body ${s.id} restitution must be in [0, 1]`;
  if (s.friction !== undefined && (!finite(s.friction) || s.friction < 0))
    return `Body ${s.id} friction must be >= 0`;
  if (s.static !== undefined && typeof s.static !== "boolean") return `Body ${s.id} static must be boolean`;
  return null;
}
function makeBody(s) {
  const fixed = s.static === true || s.mass === 0;
  const inertia = fixed ? Infinity : 0.5 * s.mass * s.radius * s.radius;
  const b = { id:s.id, x:s.x, y:s.y, vx:fixed?0:s.vx, vy:fixed?0:s.vy,
    angle:s.angle??0, omega:fixed?0:(s.omega??0), fx:s.fx??0, fy:s.fy??0,
    torque:s.torque??0, mass:s.mass, radius:s.radius,
    invMass:fixed?0:1/s.mass, invInertia:fixed?0:1/inertia,
    restitution:s.restitution??0, friction:s.friction??0.5, static:fixed };
  return (fixed || (finite(inertia) && inertia > 0)) && finite(b.invMass) && finite(b.invInertia) && b.invMass >= 0 && b.invInertia >= 0 ? b : null;
}
function contactList(bodies, floor) {
  const out=[];
  if (floor!==null) for (const b of bodies) {
    const penetration=floor-(b.y-b.radius);
    if (penetration>0) out.push({key:`F:${JSON.stringify(b.id)}`,a:null,b,nx:0,ny:1,
      penetration,restitution:b.restitution,friction:b.friction,
      rax:0,ray:0,rbx:0,rby:-b.radius});
  }
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
    const a=bodies[i],b=bodies[j];
    if(a.invMass+b.invMass===0) continue;
    const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,sum=a.radius+b.radius;
    if(d2<sum*sum) {
      const d=Math.sqrt(d2); let nx=1,ny=0;
      if(d>EPS){nx=dx/d;ny=dy/d;}
      out.push({key:`P:${JSON.stringify([a.id,b.id])}`,a,b,nx,ny,penetration:sum-d,
        restitution:Math.min(a.restitution,b.restitution),
        friction:Math.sqrt(a.friction)*Math.sqrt(b.friction),
        rax:nx*a.radius,ray:ny*a.radius,rbx:-nx*b.radius,rby:-ny*b.radius});
    }
  }
  out.sort((a,b)=>cmp(a.key,b.key)); return out;
}
function pointVelocity(b,rx,ry){return b?{x:b.vx-b.omega*ry,y:b.vy+b.omega*rx}:{x:0,y:0};}
function relativeVelocity(c){const a=pointVelocity(c.a,c.rax,c.ray),b=pointVelocity(c.b,c.rbx,c.rby);return{x:b.x-a.x,y:b.y-a.y};}
function effectiveMass(c,dx,dy){
  const a=c.a?cross(c.rax,c.ray,dx,dy):0,b=cross(c.rbx,c.rby,dx,dy);
  return(c.a?.invMass??0)+c.b.invMass+a*a*(c.a?.invInertia??0)+b*b*c.b.invInertia;
}
function applyImpulse(c,ix,iy){
  if(c.a){c.a.vx-=ix*c.a.invMass;c.a.vy-=iy*c.a.invMass;c.a.omega-=cross(c.rax,c.ray,ix,iy)*c.a.invInertia;}
  c.b.vx+=ix*c.b.invMass;c.b.vy+=iy*c.b.invMass;c.b.omega+=cross(c.rbx,c.rby,ix,iy)*c.b.invInertia;
}
function initVelocityConstraint(c){
  const rv=relativeVelocity(c),vn=rv.x*c.nx+rv.y*c.ny;
  c.targetVn=vn < -RESTITUTION_THRESHOLD ? -c.restitution*vn : 0;
  c.normalImpulse=0;c.tangentImpulse=0;
}
// Accumulated impulses prevent friction from exceeding μ times the total normal impulse.
function solveVelocityIteration(c){
  let rv=relativeVelocity(c),vn=rv.x*c.nx+rv.y*c.ny,kn=effectiveMass(c,c.nx,c.ny);
  if(kn>EPS){const next=Math.max(0,c.normalImpulse+(c.targetVn-vn)/kn),delta=next-c.normalImpulse;
    c.normalImpulse=next;if(delta)applyImpulse(c,delta*c.nx,delta*c.ny);}
  const tx=-c.ny,ty=c.nx;rv=relativeVelocity(c);const vt=rv.x*tx+rv.y*ty,kt=effectiveMass(c,tx,ty);
  if(kt>EPS){const cap=c.friction*c.normalImpulse,next=Math.max(-cap,Math.min(cap,c.tangentImpulse-vt/kt));
    const delta=next-c.tangentImpulse;c.tangentImpulse=next;if(delta)applyImpulse(c,delta*tx,delta*ty);}
}
function solvePosition(c,percent=0.8,slop=1e-7){
  const ia=c.a?.invMass??0,ib=c.b.invMass,total=ia+ib,depth=Math.max(c.penetration-slop,0);
  if(total<=0||depth<=0)return;const correction=percent*depth/total;
  if(c.a){c.a.x-=c.nx*correction*ia;c.a.y-=c.ny*correction*ia;}
  c.b.x+=c.nx*correction*ib;c.b.y+=c.ny*correction*ib;
}
function snapshot(bs){return bs.map(b=>({id:b.id,x:b.x,y:b.y,vx:b.vx,vy:b.vy,angle:b.angle,omega:b.omega}));}
function allFinite(bs){return bs.every(b=>[b.x,b.y,b.vx,b.vy,b.angle,b.omega].every(finite));}
function momentum(bs){return bs.reduce((p,b)=>{if(!b.static){p.x+=b.mass*b.vx;p.y+=b.mass*b.vy;}return p;},{x:0,y:0});}
function energy(bs){return bs.reduce((e,b)=>e+(b.static?0:0.5*b.mass*(b.vx*b.vx+b.vy*b.vy)+0.25*b.mass*b.radius*b.radius*b.omega*b.omega),0);}

/** Advance a planar rigid-disc system. Invalid/incomplete inputs always return HOLD. */
export function simStep({bodies,dt,steps=1,gravity={x:0,y:-9.81},floor=0,solverIterations=16,
  positionIterations=20,seed=1,maxSubsteps=LIMITS.maxSubsteps,recordHistory=true}={}) {
  if(!Array.isArray(bodies)||bodies.length===0)return hold("Bodies are UNSPECIFIED");
  if(bodies.length>LIMITS.bodies)return hold(`Body count exceeds limit ${LIMITS.bodies}`);
  if(!finite(dt)||dt<=0||dt>1)return hold("Step must be finite and in (0, 1] seconds");
  if(!Number.isInteger(steps)||steps<1||steps>LIMITS.steps)return hold(`Steps must be an integer in [1, ${LIMITS.steps}]`);
  if(!gravity||typeof gravity!=="object"||Array.isArray(gravity)||!finite(gravity.x)||!finite(gravity.y)||Math.abs(gravity.x)>MAX_INPUT_MAGNITUDE||Math.abs(gravity.y)>MAX_INPUT_MAGNITUDE)return hold("Gravity requires finite, bounded x and y");
  if(floor!==null&&(!finite(floor)||Math.abs(floor)>MAX_INPUT_MAGNITUDE))return hold("Floor must be finite, bounded, or null");
  if(!Number.isInteger(solverIterations)||solverIterations<1||solverIterations>LIMITS.solverIterations)return hold(`Solver iterations must be in [1, ${LIMITS.solverIterations}]`);
  if(!Number.isInteger(positionIterations)||positionIterations<1||positionIterations>LIMITS.solverIterations)return hold(`Position iterations must be in [1, ${LIMITS.solverIterations}]`);
  if(!finite(seed))return hold("Seed must be finite");
  if(!Number.isInteger(maxSubsteps)||maxSubsteps<1||maxSubsteps>LIMITS.maxSubsteps)return hold(`maxSubsteps must be in [1, ${LIMITS.maxSubsteps}]`);
  if(typeof recordHistory!=="boolean")return hold("recordHistory must be boolean");
  if(recordHistory&&steps>LIMITS.historyFrames)return hold(`History frame limit is ${LIMITS.historyFrames}; set recordHistory:false`);
  const ids=new Set();for(let i=0;i<bodies.length;i++){const err=validateBody(bodies[i],i);if(err)return hold(err);if(ids.has(bodies[i].id))return hold(`Duplicate body id: ${bodies[i].id}`);ids.add(bodies[i].id);}
  const state=[];for(const s of bodies){const b=makeBody(s);if(!b)return hold(`Body ${s.id} has mass/radius outside numerically representable range`);state.push(b);}
  state.sort((a,b)=>cmp(a.id,b.id));
  const minRadius=Math.min(...state.map(b=>b.radius)),history=[],initialMomentum=momentum(state),initialEnergy=energy(state);
  if(!finite(initialMomentum.x)||!finite(initialMomentum.y)||!finite(initialEnergy))return hold("Initial momentum/energy exceeds numeric range");
  let contactEvents=0,maxPenetration=0,substepCount=0,maxClosingVelocityResidual=0;
  for(let step=0;step<steps;step++){
    const maxSpeed=Math.max(0,...state.map(b=>b.static?0:Math.hypot(b.vx,b.vy)+Math.abs(b.omega)*b.radius));
    const maxAccel=Math.max(0,...state.map(b=>b.static?0:Math.hypot(gravity.x+b.fx*b.invMass,gravity.y+b.fy*b.invMass)));
    const travel=maxSpeed*dt+0.5*maxAccel*dt*dt;
    if(!finite(travel))return hold("Non-finite travel estimate; numerical state rejected",{step:step+1});
    const required=Math.max(1,Math.ceil(travel/(0.5*minRadius)));
    if(required>maxSubsteps)return hold(`Adaptive substep requirement ${required} exceeds maxSubsteps ${maxSubsteps}`,{step:step+1,requiredSubsteps:required});
    if(substepCount+required>LIMITS.totalSubsteps)return hold(`Total substep limit ${LIMITS.totalSubsteps} exceeded`);
    const h=dt/required;
    for(let sub=0;sub<required;sub++){
      for(const b of state)if(!b.static){b.vx+=(gravity.x+b.fx*b.invMass)*h;b.vy+=(gravity.y+b.fy*b.invMass)*h;b.omega+=b.torque*b.invInertia*h;b.x+=b.vx*h;b.y+=b.vy*h;b.angle+=b.omega*h;}
      if(!allFinite(state))return hold("Numerical divergence detected during integration",{step:step+1,substep:sub+1});
      let contacts=contactList(state,floor);contactEvents+=contacts.length;
      for(const c of contacts){maxPenetration=Math.max(maxPenetration,c.penetration);initVelocityConstraint(c);}
      for(let it=0;it<solverIterations;it++)for(const c of contacts)solveVelocityIteration(c);
      for(let it=0;it<positionIterations;it++){contacts=contactList(state,floor);for(const c of contacts)solvePosition(c);}
      contacts=contactList(state,floor);
      for(const c of contacts){const rv=relativeVelocity(c);maxClosingVelocityResidual=Math.max(maxClosingVelocityResidual,Math.max(0,-(rv.x*c.nx+rv.y*c.ny)));}
      if(!allFinite(state))return hold("Numerical divergence detected during contact resolution",{step:step+1,substep:sub+1});
      substepCount++;
    }
    if(recordHistory)history.push({step:step+1,time:Number(((step+1)*dt).toFixed(12)),bodies:snapshot(state),contacts:contactList(state,floor).map(c=>({key:c.key,penetration:c.penetration}))});
  }
  const finalContacts=contactList(state,floor),finalPenetration=finalContacts.reduce((m,c)=>Math.max(m,c.penetration),0),finalMomentum=momentum(state),finalEnergy=energy(state);
  if(!finite(finalPenetration)||!finite(finalMomentum.x)||!finite(finalMomentum.y)||!finite(finalEnergy))return hold("Final diagnostics exceed numeric range");
  return {outcome:"OK",algorithmVersion:"2.0.0",method:"DETERMINISTIC_2D_RIGID_DISC_CONTACT_ACCUMULATED_IMPULSE",fidelity:"L3_PLANAR_RIGID_DISC_CONTACT",
    time:Number((steps*dt).toFixed(12)),steps,seed,bodies:state.map(b=>({id:b.id,x:b.x,y:b.y,vx:b.vx,vy:b.vy,angle:b.angle,omega:b.omega,mass:b.mass,radius:b.radius,static:b.static})),history,
    diagnostics:{bodyCount:state.length,contactEvents,maxDetectedPenetration:maxPenetration,finalPenetration,maxClosingVelocityResidual,
      solverIterations,positionIterations,substeps:substepCount,adaptiveSubstepping:true,deterministicOrdering:true,
      momentum:{initial:initialMomentum,final:finalMomentum,delta:{x:finalMomentum.x-initialMomentum.x,y:finalMomentum.y-initialMomentum.y}},
      kineticEnergy:{initial:initialEnergy,final:finalEnergy},
      replayInputsRequired:["bodies","dt","steps","gravity","floor","solverIterations","positionIterations","seed","maxSubsteps","recordHistory"],
      limitations:["2D uniform discs and horizontal floor only","No polygon or mesh collision geometry","No articulated joints or bilateral constraints","Bounded discrete collision stepping; not a formal CCD guarantee","No deformable bodies, FEM, fluids, thermal, electrical or field multiphysics","No calibrated material constitutive models or sim-to-real validation"]},
    verification:{status:"SIMULATED",physicalVerification:false}};
}
export const SIMULATION_LIMITS=LIMITS;


/**
 * Asynchronous engine dispatch. The native deterministic disc solver remains the
 * default and backwards-compatible path. An explicitly selected backend that is
 * unavailable or fails returns HOLD; there is deliberately no silent fallback.
 * For optional engines, pass a registry created by backends/index.js.
 */
export async function simStepWithBackend(input = {}, { backend = 'native-disc', registry } = {}) {
  if (backend === 'native-disc') return simStep(input);
  if (!registry || typeof registry.execute !== 'function')
    return hold(`Backend registry is required for ${backend}`, { backend });
  return registry.execute(backend, input);
}
