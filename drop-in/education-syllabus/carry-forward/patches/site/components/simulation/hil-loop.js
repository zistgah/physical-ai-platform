/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/hil-loop.js
 * FILE PURPOSE: Simulation loop and guarded hardware read/write exchange.
 */
/** Fixed-step simulation or bounded synchronous hardware exchange. Hardware labels require explicit adapter, authority and safety declarations. */
export function runLoop({plant,controller,steps,dt,deadline,device,verifyAttestation}={}){
 const hold=(reason,extra={})=>({outcome:'HOLD',reason,method:'UNAVAILABLE',...extra});
 if(!Number.isInteger(steps)||steps<1||steps>100000||!Number.isFinite(dt)||dt<=0||typeof controller!=='function')return hold('steps, dt and controller must be valid');
 const hardware=!!device?.transport;
 if(!device||device.bound!==true)return hold('No bound device', {method:'UNAVAILABLE'});
 if(hardware){const t=device.transport;if(device.bound!==true||device.hardwareBacked!==true||!device.id||t.kind!=='hardware'||!t.bus||typeof t.readState!=='function'||typeof t.writeCommand!=='function'||typeof verifyAttestation!=='function'||!device.safety||device.safety.interlockClosed!==true||device.safety.emergencyStopClear!==true||!device.authority||device.authority.verified!==true||device.authority.authorized!==true||!device.authority.subject||!device.authority.policyRef)return hold('hardware path requires readState/writeCommand, hardware identity declaration, safety interlocks and verified authority');
  const trace=[];let x;
  try{const identity=verifyAttestation({bus:t.bus,deviceId:device.id,attestation:t.attestation});if(identity&&typeof identity.then==='function')return hold('async attestation verifier unsupported by synchronous loop');if(!identity||identity.verified!==true||identity.bus!==t.bus||identity.deviceId!==device.id)return hold('hardware identity attestation not verified');for(let i=0;i<steps;i++){const started=Date.now(),before=t.readState();if(before&&typeof before.then==='function')return hold('async transports require an asynchronous HIL adapter');if(before==null)return hold('hardware state unavailable',{step:i});const u=controller(before);if(!Number.isFinite(u))return hold('controller command is not finite',{step:i});const ack=t.writeCommand({command:u,dt,authorityRef:device.authority.subject,policyRef:device.authority.policyRef});if(ack&&typeof ack.then==='function')return hold('async transports require an asynchronous HIL adapter');if(ack!==true&&ack?.acknowledged!==true)return hold('hardware command not acknowledged',{step:i});x=t.readState();if(x&&typeof x.then==='function')return hold('async transports require an asynchronous HIL adapter');if(x==null)return hold('post-command hardware state unavailable',{step:i});const elapsed=Date.now()-started;if(deadline!=null&&elapsed>deadline)return {outcome:'FAULT',method:'HIL',reason:'Wall-clock deadline missed',step:i,elapsed,trace};trace.push({step:i+1,state:x,command:u,elapsedMs:elapsed});}}
  catch(e){return hold(`hardware exchange failed: ${String(e?.message||e)}`);}
  return {outcome:'OK',method:'HIL',qualification:'UNQUALIFIED_ADAPTER_ATTESTATION',deviceId:device.id||null,bus:t.bus||null,x,trace,warning:'This exchange is not independent hardware identity, timing, safety or bench qualification.'};
 }
 if(!plant||typeof plant.step!=='function'||!Number.isFinite(plant.x0))return hold('simulation plant with finite x0 and step function required');
 if(deadline!=null&&(!Number.isFinite(deadline)||deadline<dt))return hold('simulation timestep exceeds declared deadline');
 let x=plant.x0;const trace=[];for(let i=0;i<steps;i++){const u=controller(x);if(!Number.isFinite(u))return hold('simulation controller returned non-finite command',{step:i});x=plant.step(x,u,dt);if(!Number.isFinite(x))return hold('simulation plant returned non-finite state',{step:i});trace.push({t:(i+1)*dt,x,u});}
 return {outcome:'OK',method:'SIMULATION',x,trace};
}
