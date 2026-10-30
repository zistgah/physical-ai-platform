/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Deterministic 1-D multi-body hard-contact step with semi-implicit Euler and sequential normal impulses. */
export function simStep({bodies,dt,gravity=0,restitution=0,iterations=8}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!Array.isArray(bodies)||bodies.length<2||bodies.length>250) return hold('at least two bodies required for multi-body contact');
 if(!Number.isFinite(dt)||dt<=0||dt>0.1||!Number.isFinite(gravity)||!Number.isFinite(restitution)||restitution<0||restitution>1||!Number.isInteger(iterations)||iterations<1||iterations>100) return hold('invalid timestep, gravity, restitution or solver iterations');
 const bs=bodies.map((b,i)=>({id:b.id??`body-${i}`,mass:b.mass,x:b.x,v:b.v,radius:b.radius??0}));
 if(bs.some(b=>!Number.isFinite(b.mass)||b.mass<=0||!Number.isFinite(b.x)||!Number.isFinite(b.v)||!Number.isFinite(b.radius)||b.radius<0)) return hold('each body needs finite x/v, positive mass and non-negative radius');
 for(const b of bs){b.v+=gravity*dt;b.x+=b.v*dt;}
 const contacts=[];
 for(let pass=0;pass<iterations;pass++) for(let i=0;i<bs.length;i++) for(let j=i+1;j<bs.length;j++){
   const a=bs[i],b=bs[j],min=a.radius+b.radius,delta=b.x-a.x,penetration=min-Math.abs(delta);
   if(penetration>=0){const sign=delta>=0?1:-1,rel=(b.v-a.v)*sign,inv=1/a.mass+1/b.mass;
     if(pass===0) contacts.push({a:a.id,b:b.id,penetration});
     if(rel<0){const impulse=-(1+restitution)*rel/inv;a.v-=impulse/a.mass*sign;b.v+=impulse/b.mass*sign;}
     const correction=Math.max(penetration-1e-9,0)*0.8/inv;a.x-=correction/a.mass*sign;b.x+=correction/b.mass*sign;
   }
 }
 return {outcome:'OK',model:'1D_MULTI_BODY_DISCRETE_CONTACT',bodies:bs,contacts,diagnostics:{dt,iterations,restitution,contactCount:contacts.length,integrator:'semi-implicit Euler',contactSolver:'sequential impulse'},qualification:'REDUCED_ORDER_1D_CONTACT_MODEL'};
}
