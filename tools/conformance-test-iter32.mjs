/**
 * Iteration 32 – B-rep, factory, board import.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { bibo } from "../tests/bibo.mjs";
import { boxBrep, validateBrep, brepVolume, brepFromProfile } from "../site/components/cad/brep.js";
import { Factory } from "../site/components/manufacturing/factory.js";
import { BoardImport } from "../site/components/education/board-import.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

bibo("brepBox", {
  below: { fn: () => boxBrep(0), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => boxBrep(1), expect: (r) => r.outcome === "OK" && brepVolume(r.solid).volume === 1 },
  within: { fn: () => boxBrep(10), expect: (r) => validateBrep(r.solid).ok && brepVolume(r.solid).volume === 1000 },
  above: { fn: () => boxBrep(-1), expect: (r) => r.outcome === "HOLD" }
});

bibo("brepExtrude", {
  below: { fn: () => brepFromProfile([{ x: 0, y: 0 }, { x: 1, y: 0 }], 10), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => brepFromProfile([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], 1), expect: (r) => r.outcome === "OK" && Math.abs(r.volume - 0.5) < 1e-9 },
  within: { fn: () => brepFromProfile([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 10), expect: (r) => r.outcome === "OK" && Math.abs(r.volume - 1000) < 1e-6 },
  above: { fn: () => brepFromProfile([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], 0), expect: (r) => r.outcome === "HOLD" }
});

const kernel = createKernel();
const project = kernel.upsert({ id: "p32", type: "Project", name: "P", provenance: { origin: "iter32" } });
const factory = new Factory(kernel);
factory.machine(project.id, { id: "mill", name: "Mill", capacity: 1 });
factory.machine(project.id, { id: "inspect", name: "Inspect", capacity: 1 });

bibo("factory", {
  below: { fn: () => factory.release(project.id, { id: "wo-bad", steps: [] }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => factory.release(project.id, { id: "wo1", steps: ["mill"] }), expect: (r) => r.outcome === "OK" && r.status === "IN_PROCESS" },
  within: { fn: () => factory.complete("wo1"), expect: (r) => r.outcome === "OK" && r.status === "COMPLETE" },
  above: { fn: () => factory.release(project.id, { id: "wo2", steps: ["missing"] }), expect: (r) => r.outcome === "HOLD" }
});

// capacity boundary: one machine, two orders
const f2 = new Factory(kernel);
f2.machine(project.id, { id: "lathe", name: "Lathe", capacity: 1 });
f2.release(project.id, { id: "a", steps: ["lathe"] });
const full = f2.release(project.id, { id: "b", steps: ["lathe"] });
assert(full.outcome === "HOLD" && full.reason === "Machine is full", "Full machine holds");

const board = new BoardImport(kernel);
bibo("boardImport", {
  below: { fn: () => board.import(project.id, "UNKNOWN", "10"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => board.map("CBSE", "10", "Mathematics", "c-math"), expect: (r) => r.outcome === "OK" },
  within: { fn: () => { board.map("CBSE", "10", "Science", "c-sci"); return board.import(project.id, "CBSE", "10"); }, expect: (r) => r.outcome === "OK" && r.subjects.length === 2 },
  above: { fn: () => board.map("CBSE", "13", "Mathematics", "c"), expect: (r) => r.outcome === "HOLD" }
});

console.log("\n=== ALL ITERATION 32 TESTS PASSED ===");
