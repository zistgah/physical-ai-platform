/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/scenario.js
 * FILE PURPOSE: Scenario factory. Builds the mobile robot scenario used by the simulator.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
import { Simulator } from "./simulator.js";
import { Battery, Motor, Controller, EmergencyStop } from "./mobile-robot.js";

/** createMobileRobotScenario: Scenario factory. Builds the mobile robot scenario used by the simulator. */
export function createMobileRobotScenario(){
  const sim=new Simulator({dt:0.02,seed:42});
  const motor=new Motor({id:"motor-left"});
  const battery=new Battery({id:"battery",params:{loadComponentId:"motor-left",capacityWh:500}});
  const controller=new Controller({id:"controller",params:{motorId:"motor-left",batteryId:"battery",targetSpeed:1}});
  const estop=new EmergencyStop({id:"estop"});

  sim.add(battery);sim.add(motor);sim.add(controller);sim.add(estop);
  sim.connect("controller","command","motor-left","command");
  return {sim,ids:{battery:"battery",motor:"motor-left",controller:"controller",estop:"estop"}};
}
