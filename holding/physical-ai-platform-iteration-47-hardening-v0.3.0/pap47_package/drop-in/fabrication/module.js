/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Generates a contour-following XY toolpath from a closed polygon and compares measured dimensions to nominal bounds. */
export function fabricate({solid,machine,measurement,tolerance=0.1,feed=100}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!solid||!Array.isArray(solid.outline)||solid.outline.length<3||solid.outline.length>10000||solid.closed!==true) return hold('solid requires a closed XY outline with at least three points');
 if(solid.outline.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))) return hold('outline coordinates must be finite');
 if(!machine||!machine.id||!Number.isFinite(machine.maxFeed)||machine.maxFeed<=0||!Number.isFinite(machine.maxTravel)||machine.maxTravel<=0) return hold('machine requires identity, positive maxFeed and maxTravel');
 if(!Number.isFinite(feed)||feed<=0||feed>machine.maxFeed||!Number.isFinite(tolerance)||tolerance<0) return hold('feed or tolerance invalid');
 const pts=solid.outline, area=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p.x*q.y-q.x*p.y;},0)/2;
 if(Math.abs(area)<1e-9) return hold('outline has zero signed area');
 const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
 if(bounds.maxX-bounds.minX>machine.maxTravel||bounds.maxY-bounds.minY>machine.maxTravel) return hold('part exceeds machine travel');
 const toolpath=[{code:'G21'},{code:'G90'},{code:'G0',x:pts[0].x,y:pts[0].y}];
 for(let i=1;i<=pts.length;i++){const p=pts[i%pts.length];toolpath.push({code:'G1',x:p.x,y:p.y,feed});}
 let inspection={status:'NOT_MEASURED'};
 if(measurement){if(!Number.isFinite(measurement.width)||!Number.isFinite(measurement.height)||measurement.width<=0||measurement.height<=0)return hold('measurement dimensions must be finite and positive');
  const nominal={width:bounds.maxX-bounds.minX,height:bounds.maxY-bounds.minY},deviation={width:measurement.width-nominal.width,height:measurement.height-nominal.height};
  inspection={status:Math.abs(deviation.width)<=tolerance&&Math.abs(deviation.height)<=tolerance?'PASS':'HOLD',nominal,measured:{width:measurement.width,height:measurement.height},deviation,tolerance};}
 return {outcome:inspection.status==='HOLD'?'HOLD':'OK',toolpath,bounds,signedArea:area,inspection,machineId:machine.id,qualification:'2D_CONTOUR_PATH_NO_TOOL_RADIUS_COMPENSATION',reason:inspection.status==='HOLD'?'Measured part is outside tolerance':undefined};
}
