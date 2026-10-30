/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/samples/static-sensor.js
 * FILE PURPOSE: Sample project. A static environmental sensor. Sensor, enclosure, power. Each is a component on the graph.
 */
export function staticSensor(kernel) {
  const project = kernel.upsert({
    id: "sample-sensor", type: "Project", name: "Static Environmental Sensor",
    provenance: { origin: "sample" }
  });
  const parts = [
    { id: "sensor-head", name: "Sensor Head", costMaterial: 15 },
    { id: "enclosure", name: "Enclosure", costMaterial: 10 },
    { id: "psu", name: "Power Supply", costMaterial: 12 }
  ];
  for (const p of parts) {
    kernel.upsert({ ...p, type: "Component", provenance: { origin: "sample", derivedFrom: project.id } });
    kernel.link(project.id, "CONTAINS", p.id);
  }
  return project;
}
