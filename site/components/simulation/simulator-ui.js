/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/simulator-ui.js
 * FILE PURPOSE: Simulator UI adapter. Projects simulator state for the page.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { createMobileRobotScenario } from "./scenario.js";

export class SimulatorUI {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(root){
    this.root=root;
    const {sim,ids}=createMobileRobotScenario();this.sim=sim;this.ids=ids;
    this.render();
    this.draw();
  }
  /** render: Performs render for this module. */
  render(){
    this.root.innerHTML=`
      <div class="page">
        <h1>Physical AI Simulator</h1>
        <p>Deterministic mobile-robot reference model. Fixed timestep: 20 ms. Seed: 42.</p>
        <div class="toolbar">
          <button data-action="step">Step</button>
          <button data-action="run">Run 250 steps</button>
          <button data-action="fault">Inject emergency stop</button>
          <button data-action="clear">Clear faults</button>
          <button data-action="reset">Reset</button>
        </div>
        <div id="metrics" class="grid"></div>
        <canvas id="plot" width="1200" height="420"></canvas>
        <pre id="state"></pre>
      </div>`;
    this.root.querySelectorAll("button").forEach(b=>b.onclick=()=>this.action(b.dataset.action));
  }
  /** action: Performs action for this module. */
  action(a){
    if(a==="step")this.sim.step();
    if(a==="run")this.sim.run(250);
    if(a==="fault")this.sim.injectFault({id:"fault-estop",type:"EMERGENCY_STOP",target:this.ids.estop});
    if(a==="clear")this.sim.faults=[];
    if(a==="reset")this.sim.reset();
    this.update();
  }
  /** update: Performs update for this module. */
  update(){
    const m=this.sim.components.map(c=>({name:c.name,state:c.state}));
    const motor=this.sim.components.find(c=>c.id===this.ids.motor);
    const battery=this.sim.components.find(c=>c.id===this.ids.battery);
    this.root.querySelector("#metrics").innerHTML=`
      <div class="card"><div>Time</div><div class="metric">${this.sim.time.toFixed(2)} s</div></div>
      <div class="card"><div>Motor speed</div><div class="metric">${motor.state.speed.toFixed(2)} m/s</div></div>
      <div class="card"><div>Position</div><div class="metric">${motor.state.position.toFixed(2)} m</div></div>
      <div class="card"><div>Battery</div><div class="metric">${(battery.state.soc*100).toFixed(2)}%</div></div>`;
    this.root.querySelector("#state").textContent=JSON.stringify({time:this.sim.time,components:m,faults:this.sim.faults},null,2);
    this.draw();
  }
  /** draw: Performs draw for this module. */
  draw(){
    const c=this.root.querySelector("#plot");if(!c)return;
    const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);
    x.strokeStyle="#58a6ff";x.beginPath();
    const data=this.sim.telemetry.slice(-500);if(!data.length)return;
    const max=Math.max(...data.map(d=>d.powerW),1);
    data.forEach((d,i)=>{const px=i/(data.length-1||1)*c.width,py=c.height-(d.powerW/max)*c.height;i?x.lineTo(px,py):x.moveTo(px,py)});
    x.stroke();
  }
}
