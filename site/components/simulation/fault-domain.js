/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/fault-domain.js
 * FILE PURPOSE: Fault injection with a domain. Sensor, actuator, power, comms, ai, environment. An unknown domain holds. The fault is recorded, not invented.
 * MRD 5.
 */
const DOMAINS = {
  sensor: (v, mag) => v + mag,
  actuator: (v, mag) => v * (1 - mag),
  power: (v, mag) => v - mag,
  comms: (v) => null,
  ai: (v, mag) => v + mag * 0.1,
  environment: (v, mag) => v + mag
};

export function inject(domain, value, magnitude = 1) {
  if (!DOMAINS[domain]) return { outcome: "HOLD", reason: "Domain is not known" };
  if (!Number.isFinite(value)) return { outcome: "HOLD", reason: "Value is not a number" };
  const result = DOMAINS[domain](value, magnitude);
  return { outcome: "INJECTED", domain, before: value, after: result, magnitude };
}
