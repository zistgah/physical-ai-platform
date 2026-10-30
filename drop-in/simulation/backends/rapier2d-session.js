/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
const HOLD=(reason,details={})=>({outcome:'HOLD',reason,...details});
const finite=Number.isFinite;

/** Build a persistent Rapier world once. step(dt) is synchronous after async WASM initialization. */
export async function createRapier2DSession({bodies,gravity={x:0,y:-9.81},floor=0,solverIterations=16}={},
  {moduleLoader=()=>import('@dimforge/rapier2d-compat')}={}) {
  if(!Array.isArray(bodies)||!bodies.length||bodies.length>256) throw new TypeError('bodies must contain 1..256 bodies');
  if(!gravity||!finite(gravity.x)||!finite(gravity.y)) throw new TypeError('gravity must contain finite x/y');
  if(floor!==null&&!finite(floor)) throw new TypeError('floor must be finite or null');
  if(!Number.isInteger(solverIterations)||solverIterations<1||solverIterations>100) throw new TypeError('solverIterations must be in [1,100]');
  const ids=new Set();
  for(const b of bodies){
    if(!b||typeof b.id!=='string'||!b.id||ids.has(b.id))throw new TypeError('body ids must be unique non-empty strings');ids.add(b.id);
    for(const k of ['x','y','vx','vy','mass','radius'])if(!finite(b[k]))throw new TypeError(`body ${b.id} requires finite ${k}`);
    if(b.mass<0||b.radius<=0)throw new TypeError(`body ${b.id} has invalid mass/radius`);
    for(const k of ['fx','fy','torque','angle','omega'])if(b[k]!==undefined&&!finite(b[k]))throw new TypeError(`body ${b.id} has invalid ${k}`);
  }
  const imported=await moduleLoader(),R=imported.default??imported;
  if(typeof R.init==='function')await R.init();
  if(typeof R.World!=='function'||!R.RigidBodyDesc||!R.ColliderDesc)throw new TypeError('Rapier 2D API is unavailable');
  const world=new R.World(gravity);if(world.integrationParameters)world.integrationParameters.numSolverIterations=solverIterations;
  const events=typeof R.EventQueue==='function'?new R.EventQueue(true):null,handles=new Map(),specs=new Map(bodies.map(b=>[b.id,b]));
  for(const b of [...bodies].sort((a,c)=>a.id<c.id?-1:a.id>c.id?1:0)){
    const fixed=b.static===true||b.mass===0;
    let desc=(fixed?R.RigidBodyDesc.fixed():R.RigidBodyDesc.dynamic()).setTranslation(b.x,b.y).setRotation(b.angle??0);
    if(!fixed)desc=desc.setLinvel(b.vx,b.vy).setAngvel(b.omega??0);
    const rb=world.createRigidBody(desc);
    let collider=R.ColliderDesc.ball(b.radius).setRestitution(b.restitution??0).setFriction(b.friction??0.5);
    if(!fixed)collider=collider.setDensity(b.mass/(Math.PI*b.radius*b.radius));
    if(R.ActiveEvents?.COLLISION_EVENTS!==undefined&&typeof collider.setActiveEvents==='function')collider=collider.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(collider,rb);handles.set(b.id,rb);
  }
  if(floor!==null){const ground=world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0,floor-0.05));world.createCollider(R.ColliderDesc.cuboid(1e5,0.05),ground);}
  let disposed=false,stepCount=0;
  function snapshot(){return [...handles.entries()].sort((a,c)=>a[0]<c[0]?-1:a[0]>c[0]?1:0).map(([id,rb])=>{
    const p=rb.translation(),v=rb.linvel();return{id,x:p.x,y:p.y,vx:v.x,vy:v.y,angle:rb.rotation(),omega:rb.angvel()};});}
  function step(dt){
    if(disposed)return HOLD('Rapier session is disposed');
    if(!finite(dt)||dt<=0||dt>1)return HOLD('dt must be finite and in (0,1]');
    for(const [id,rb] of handles){const b=specs.get(id);if(b.static===true||b.mass===0)continue;
      if((b.fx??0)||(b.fy??0))rb.addForce({x:b.fx??0,y:b.fy??0},true);
      if(b.torque)rb.addTorque(b.torque,true);
    }
    world.timestep=dt;let contactStarts=0;world.step(events??undefined);
    events?.drainCollisionEvents?.((_a,_b,started)=>{if(started)contactStarts++;});
    const state=snapshot();stepCount++;
    if(!state.every(b=>['x','y','vx','vy','angle','omega'].every(k=>finite(b[k]))))return HOLD('Rapier generated non-finite state',{step:stepCount});
    return{outcome:'OK',bodies:state.map(s=>({...s,mass:specs.get(s.id).mass,radius:specs.get(s.id).radius,static:specs.get(s.id).static===true||specs.get(s.id).mass===0})),
      diagnostics:{backend:'rapier2d',contactStartEvents:contactStarts,step:stepCount,engineVersion:typeof R.version==='function'?R.version():'unknown'},
      verification:{status:'SIMULATED',physicalVerification:false}};
  }
  return Object.freeze({engine:'rapier2d',step,snapshot,dispose(){if(disposed)return;disposed=true;try{events?.free?.();}finally{world.free?.();}},get stepCount(){return stepCount;}});
}
