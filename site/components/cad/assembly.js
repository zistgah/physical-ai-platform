/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/assembly.js
 * FILE PURPOSE: Assembly mates. A coincident mate places one part on another. A mate with a missing part holds. Solving applies the mates in order.
 * MRD 5.
 */
export class Assembly {
  constructor() { this.parts = new Map(); this.mates = []; }
  add(id, pose = { x: 0, y: 0, z: 0 }) { this.parts.set(id, { ...pose }); return { outcome: "OK" }; }
  mate(a, b, kind) {
    if (!this.parts.has(a) || !this.parts.has(b)) return { outcome: "HOLD", reason: "Part is missing" };
    if (kind !== "coincident" && kind !== "offset") return { outcome: "HOLD", reason: "Mate is not known" };
    this.mates.push({ a, b, kind });
    return { outcome: "OK" };
  }
  solve() {
    for (const m of this.mates) {
      const A = this.parts.get(m.a), B = this.parts.get(m.b);
      if (m.kind === "coincident") { B.x = A.x; B.y = A.y; B.z = A.z; }
    }
    return { outcome: "OK", poses: Object.fromEntries(this.parts) };
  }
}
