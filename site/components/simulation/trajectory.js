/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/trajectory.js
 * FILE PURPOSE: A trajectory under force with a floor contact. Steps are fixed. A non-positive step count holds. Contact stops the body at the floor.
 * License: GPL-3.0-only.
 */
export function trajectory({ mass, force, dt, steps, floor = 0 }) {
  if (!(steps > 0)) return { outcome: "HOLD", reason: "Steps must be positive" };
  if (!(dt > 0)) return { outcome: "HOLD", reason: "Step must be positive" };
  if (!(mass > 0)) return { outcome: "HOLD", reason: "Mass must be positive" };
  let y = 1, v = 0;
  const history = [];
  for (let i = 0; i < steps; i++) {
    const a = force / mass;
    v += a * dt;
    y += v * dt;
    if (y < floor) { y = floor; v = 0; }
    history.push({ t: (i + 1) * dt, y, v });
  }
  return { outcome: "OK", history, final: history.at(-1) };
}
