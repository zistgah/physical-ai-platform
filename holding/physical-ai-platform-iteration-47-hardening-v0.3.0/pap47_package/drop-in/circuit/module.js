/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Backward-Euler transient for a driven series-RC circuit; reports capacitor voltage and resistor current. */
export function circuitStep({netlist,steps=100,dt=1e-4,initialVoltage=0}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!netlist||!Number.isFinite(netlist.R)||netlist.R<=0||!Number.isFinite(netlist.C)||netlist.C<=0||!Number.isFinite(netlist.V)) return hold('netlist requires positive R/C and finite source V');
 if(!Number.isInteger(steps)||steps<1||steps>1e6||!Number.isFinite(dt)||dt<=0||!Number.isFinite(initialVoltage)) return hold('steps, dt and initial voltage are invalid');
 const alpha=dt/(netlist.R*netlist.C+dt), voltage=[]; let v=initialVoltage;
 for(let k=1;k<=steps;k++){v+=alpha*(netlist.V-v);voltage.push({time:k*dt,capacitorVoltage:v,resistorCurrent:(netlist.V-v)/netlist.R});}
 const tau=netlist.R*netlist.C, exact=netlist.V+(initialVoltage-netlist.V)*Math.exp(-steps*dt/tau), error=Math.abs(v-exact);
 return {outcome:'OK',model:'SERIES_RC_BACKWARD_EULER',samples:voltage,finalVoltage:v,analyticFinalVoltage:exact,absoluteError:error,timeConstant:tau,diagnostics:{dt,steps,stability:'unconditionally stable for positive R,C',method:'backward Euler'},qualification:'LUMPED_RC_REFERENCE_MODEL'};
}
