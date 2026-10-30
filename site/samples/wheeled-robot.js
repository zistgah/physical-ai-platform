/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/samples/wheeled-robot.js
 * FILE PURPOSE: Sample project. A wheeled inspection robot. Battery, controller, motor, estop. Each is a component on the graph.
 */
export function wheeledRobot(kernel) {
  const project = kernel.upsert({
    id: "sample-wheeled", type: "Project", name: "Wheeled Inspection Robot",
    provenance: { origin: "sample" }
  });
  const parts = [
    { id: "battery", name: "Battery Pack", costMaterial: 40 },
    { id: "controller", name: "Motion Controller", costMaterial: 60 },
    { id: "motor", name: "Drive Motor", costMaterial: 25 },
    { id: "estop", name: "Emergency Stop", costMaterial: 8 }
  ];
  for (const p of parts) {
    kernel.upsert({ ...p, type: "Component", provenance: { origin: "sample", derivedFrom: project.id } });
    kernel.link(project.id, "CONTAINS", p.id);
  }
  return project;
}
