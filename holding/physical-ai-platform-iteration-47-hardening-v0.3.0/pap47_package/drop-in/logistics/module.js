/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Lot-aware supply check; shortage or blocked/unknown source status holds the consuming order. */
export function supply({part,qty,lead,inventory,orderId,supplierStatus,lots=[]}={}) {
 const hold=reason=>({outcome:'HOLD',reason,orderId:orderId??null});
 if(typeof part!=='string'||!part.trim()||!Number.isFinite(qty)||qty<=0||!Number.isFinite(lead)||lead<0||!Number.isFinite(inventory)||inventory<0||!Array.isArray(lots))return hold('part, positive demand, non-negative lead time and inventory are required');
 if(!orderId)return hold('consuming order identity is required');
 if(supplierStatus!=='APPROVED')return hold(`supplier status ${supplierStatus} is not approved`);
 let usable=inventory;
 if(lots.length){if(lots.some(l=>!Number.isFinite(l.quantity)||l.quantity<0||!['RELEASED','ACCEPTED'].includes(l.status)))return hold('lot records invalid or not quality-released');usable=lots.filter(l=>['RELEASED','ACCEPTED'].includes(l.status)).reduce((s,l)=>s+l.quantity,0);}
 const shortage=Math.max(0,qty-usable);
 return shortage>0?{outcome:'HOLD',reason:'Supply shortage blocks order release',part,orderId,demand:qty,available:usable,shortage,leadTime:lead,procurementRequired:true}:{outcome:'OK',part,orderId,demand:qty,available:usable,allocated:qty,remaining:usable-qty,leadTime:lead,procurementRequired:false};
}
