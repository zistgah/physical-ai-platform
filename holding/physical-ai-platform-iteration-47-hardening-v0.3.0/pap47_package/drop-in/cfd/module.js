/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** 1-D steady diffusion/advection-diffusion finite-volume surrogate on a uniform line mesh. Not a general CFD solver. */
export function cfdStep({mesh,fluid,steps=1000,tolerance=1e-8,relaxation=1,initial=0}={}) {
  const hold=reason=>({outcome:'HOLD',reason});
  if(!mesh||!Number.isInteger(mesh.cells)||mesh.cells<1||mesh.cells>100000||!Number.isFinite(mesh.length)||mesh.length<=0) return hold('mesh requires positive integer cells and positive length');
  if(!fluid||!Number.isFinite(fluid.diffusivity)||fluid.diffusivity<=0||!Number.isFinite(fluid.velocity)||!Number.isFinite(fluid.left)||!Number.isFinite(fluid.right)) return hold('fluid requires positive diffusivity, finite velocity and finite Dirichlet boundaries');
  if(!Number.isInteger(steps)||steps<1||steps>1e6||!(tolerance>0)||!Number.isFinite(tolerance)||!(relaxation>0&&relaxation<=1)||!Number.isFinite(initial)) return hold('invalid iteration, tolerance, relaxation or initial value');
  const n=mesh.cells, dx=mesh.length/(n+1), D=fluid.diffusivity, u=fluid.velocity, Pe=Math.abs(u)*dx/D;
  const aW=D/dx+Math.max(u,0), aE=D/dx+Math.max(-u,0), aP=aW+aE;
  let phi=Array(n).fill(initial), residual=Infinity, iter=0;
  const source=Array.isArray(fluid.source)?fluid.source:Array(n).fill(Number(fluid.source??0));
  if(source.length!==n||!source.every(Number.isFinite)) return hold('source must be finite scalar or one value per cell');
  for(;iter<steps;iter++){
    let maxDelta=0;
    for(let i=0;i<n;i++){
      const w=i?phi[i-1]:fluid.left, e=i<n-1?phi[i+1]:fluid.right;
      const target=(aW*w+aE*e+source[i]*dx)/aP;
      const next=phi[i]+relaxation*(target-phi[i]); maxDelta=Math.max(maxDelta,Math.abs(next-phi[i])); phi[i]=next;
    }
    residual=0;
    for(let i=0;i<n;i++){const w=i?phi[i-1]:fluid.left,e=i<n-1?phi[i+1]:fluid.right;const r=aP*phi[i]-aW*w-aE*e-source[i]*dx;residual=Math.max(residual,Math.abs(r));}
    if(residual<=tolerance) break;
  }
  const converged=residual<=tolerance;
  return {outcome:converged?'OK':'HOLD',model:'1D_STEADY_CONVECTION_DIFFUSION',field:phi,coordinates:phi.map((_,i)=>(i+1)*dx),residual,iterations:Math.min(iter+1,steps),converged,diagnostics:{dx,peclet:Pe,scheme:'first-order upwind',solver:'Gauss-Seidel with under-relaxation',tolerance},qualification:'REDUCED_ORDER_VERIFICATION_CASE_NOT_GENERAL_CFD',reason:converged?undefined:'Residual tolerance not reached'};
}
