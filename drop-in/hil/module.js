/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Executes one bounded exchange through an explicitly hardware-backed adapter. Software mocks are never labelled HIL. */
export async function hilStep({transport,verifyAttestation,dt,command,limits,safety,authority}={}) {
 const hold=reason=>({outcome:'HOLD',reason,method:'NOT_HIL'});
 if(!transport||transport.kind!=='hardware'||!transport.bus||!transport.deviceId||transport.hardwareBacked!==true||typeof transport.read!=='function'||typeof transport.write!=='function'||typeof verifyAttestation!=='function') return hold('requires hardware adapter, bus/device identity and a platform-supplied attestation verifier');
 if(!Number.isFinite(dt)||dt<=0||dt>0.05||!Number.isFinite(command)||!limits||!Number.isFinite(limits.min)||!Number.isFinite(limits.max)||limits.min>limits.max||command<limits.min||command>limits.max) return hold('invalid timestep or command outside declared bounds');
 if(!safety||safety.interlockClosed!==true||safety.emergencyStopClear!==true||!authority||authority.authorized!==true||authority.verified!==true||!authority.subject||!authority.policyRef) return hold('verified safety interlocks and subject-/policy-bound execution authority are required');
 try {
   const identity=await verifyAttestation({bus:transport.bus,deviceId:transport.deviceId,attestation:transport.attestation});
   if(!identity||identity.verified!==true||identity.bus!==transport.bus||identity.deviceId!==transport.deviceId) return hold('hardware identity attestation was not verified by the platform trust adapter');
   const before=await transport.read(); if(before===undefined||before===null) return hold('device read returned no state');
   const ack=await transport.write({command,dt,authorityRef:authority.subject,policyRef:authority.policyRef});
   if(ack!==true&&!(ack&&ack.acknowledged===true)) return hold('device did not acknowledge command');
   const after=await transport.read(); if(after===undefined||after===null) return hold('post-command device read returned no state');
   return {outcome:'EXECUTED',method:'HIL',qualification:'UNQUALIFIED_ADAPTER_ATTESTATION',bus:transport.bus,deviceId:transport.deviceId,before,command,after,acknowledged:true,authorityRef:authority.subject,policyRef:authority.policyRef,identityVerified:true,diagnostics:{dt,readWriteRead:true},warning:'Adapter declaration is not independent proof of hardware identity, safety certification, timing qualification or test-bench validity.'};
 } catch(error){return {outcome:'HOLD',method:'NOT_HIL',reason:`Hardware exchange failed: ${String(error?.message||error)}`};}
}
