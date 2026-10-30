/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/history.js
 * FILE PURPOSE: Feature history that rebuilds. Each feature is a function of the previous solid. Editing a feature and rebuilding recomputes. An empty history holds.
 * MRD 5.
 */
export class History {
  constructor() { this.features = []; }
  add(name, fn) { this.features.push({ name, fn }); return { outcome: "OK", index: this.features.length - 1 }; }
  edit(index, fn) {
    if (!this.features[index]) return { outcome: "HOLD", reason: "Feature is UNSPECIFIED" };
    this.features[index].fn = fn;
    return { outcome: "OK" };
  }
  rebuild(seed) {
    if (!this.features.length) return { outcome: "HOLD", reason: "History is empty" };
    let solid = seed;
    const steps = [];
    for (const f of this.features) { solid = f.fn(solid); steps.push(f.name); }
    return { outcome: "OK", solid, steps };
  }
}
