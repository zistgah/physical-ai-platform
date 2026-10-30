/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Earliest-feasible finite-capacity routing across ordered operations. Quality holds block dispatch. */
export function route({order,operations,stations,quality=[]}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!order?.id||!Number.isFinite(order.quantity)||order.quantity<=0)return hold('order requires id and positive quantity');
 if(!Array.isArray(operations)||!operations.length||!Array.isArray(stations)||!stations.length)return hold('operations and stations are required');
 if(!Array.isArray(quality))return hold('quality must be an array');
 const holdItems=quality.filter(q=>q&&q.status!=='ACCEPTED'&&q.status!=='CLOSED');
 if(holdItems.length)return {outcome:'HOLD',reason:'Open quality nonconformance blocks dispatch',qualityHolds:holdItems.map(q=>q.id??'UNIDENTIFIED')};
 const capacity=new Map();
 for(const s of stations){if(!s?.id||!Array.isArray(s.capabilities)||!Number.isFinite(s.capacity)||s.capacity<0||!Number.isFinite(s.availableAt??0)||(s.availableAt??0)<0)return hold('station requires id, capabilities, non-negative capacity and availability');capacity.set(s.id,{...s,availableAt:s.availableAt??0,remaining:s.capacity});}
 const schedule=[];let cursor=0;
 for(const op of operations){if(!op?.id||!op.capability||!Number.isFinite(op.duration)||op.duration<=0)return hold('each operation requires id, capability and positive duration');
  const candidates=[...capacity.values()].filter(s=>s.capabilities.includes(op.capability)&&s.remaining>=order.quantity).sort((a,b)=>Math.max(cursor,a.availableAt)-Math.max(cursor,b.availableAt));
  if(!candidates.length)return {outcome:'HOLD',reason:`No available station capacity for ${op.id}`,scheduled:schedule,unscheduled:op.id};
  const s=candidates[0],start=Math.max(cursor,s.availableAt),finish=start+op.duration;s.remaining-=order.quantity;s.availableAt=finish;cursor=finish;schedule.push({operation:op.id,station:s.id,quantity:order.quantity,start,finish});
 }
 return {outcome:'OK',orderId:order.id,schedule,completionTime:cursor,remainingCapacity:Object.fromEntries([...capacity].map(([id,s])=>[id,s.remaining])),qualityHolds:[],qualification:'DETERMINISTIC_CAPACITY_SCHEDULER_NO_SETUP_OR_CALENDAR_MODEL'};
}
