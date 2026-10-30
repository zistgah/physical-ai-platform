/**
 * Iteration 38 – the CAD features that were listed as a gap.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { readFileSync } from "node:fs";
import { bibo } from "../tests/bibo.mjs";
import { mesh, addVertex, addFace, moveVertex, sculpt } from "../site/components/cad/mesh-edit.js";
import { nurbsSurface } from "../site/components/cad/nurbs-surface.js";
import { brepBoolean } from "../site/components/cad/brep-boolean.js";
import { boxBrep } from "../site/components/cad/brep.js";
import { Assembly } from "../site/components/cad/assembly.js";
import { History } from "../site/components/cad/history.js";
import { project, pick } from "../site/components/cad/viewport.js";
import { evaluate } from "../site/components/cad/geometry-nodes.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

const m = mesh();
addVertex(m, 0, 0, 0); addVertex(m, 1, 0, 0); addVertex(m, 0, 1, 0);

bibo("mesh", {
  below: { fn: () => addFace(m, [0, 1]), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => addFace(m, [0, 1, 2]), expect: (r) => r.outcome === "OK" },
  within: { fn: () => moveVertex(m, 0, 0, 0, 1), expect: (r) => r.outcome === "OK" && r.vertex.z === 1 },
  above: { fn: () => moveVertex(m, 9, 0, 0, 0), expect: (r) => r.outcome === "HOLD" }
});
assert(sculpt(m, { x: 0, y: 0, z: 0 }, 0, 1).outcome === "HOLD", "Zero radius holds");

const grid = [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }], [{ x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 0 }]];
const knots = [0, 0, 1, 1];
bibo("nurbsSurface", {
  below: { fn: () => nurbsSurface([], [], knots, knots, 1), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => nurbsSurface(grid, [[1, 1], [1, 1]], knots, knots, 1, 2), expect: (r) => r.outcome === "OK" },
  within: { fn: () => nurbsSurface(grid, [[1, 1], [1, 1]], knots, knots, 1, 4), expect: (r) => r.points.length === 4 },
  above: { fn: () => nurbsSurface(grid, [[1, 1], [1, 1]], knots, knots, 5), expect: (r) => r.outcome === "HOLD" }
});

const box = boxBrep(10).solid;
bibo("brepBoolean", {
  below: { fn: () => brepBoolean({ vertices: [], faces: [] }, box, "UNION"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => brepBoolean(box, boxBrep(1).solid, "SUBTRACT"), expect: (r) => r.outcome === "OK" },
  within: { fn: () => brepBoolean(box, boxBrep(4).solid, "UNION"), expect: (r) => r.outcome === "OK" },
  above: { fn: () => brepBoolean(box, box, "INTERSECT"), expect: (r) => r.outcome === "HOLD" }
});

const asm = new Assembly();
asm.add("a"); asm.add("b", { x: 5, y: 0, z: 0 });
bibo("assembly", {
  below: { fn: () => asm.mate("a", "missing", "coincident"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => asm.mate("a", "b", "coincident"), expect: (r) => r.outcome === "OK" },
  within: { fn: () => asm.solve(), expect: (r) => r.poses.b.x === 0 },
  above: { fn: () => asm.mate("a", "b", "revolute"), expect: (r) => r.outcome === "HOLD" }
});

const hist = new History();
bibo("history", {
  below: { fn: () => hist.rebuild({}), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => hist.add("grow", s => ({ ...s, n: (s.n || 0) + 1 })), expect: (r) => r.outcome === "OK" },
  within: { fn: () => hist.rebuild({ n: 0 }), expect: (r) => r.solid.n === 1 },
  above: { fn: () => hist.edit(9, s => s), expect: (r) => r.outcome === "HOLD" }
});

bibo("viewport", {
  below: { fn: () => project({ vertices: [] }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => project(m, 8, 8), expect: (r) => r.outcome === "OK" },
  within: { fn: () => pick(project(m, 32, 32).projected, 0, 0), expect: (r) => r.outcome === "OK" },
  above: { fn: () => pick([], 0, 0), expect: (r) => r.outcome === "HOLD" }
});

bibo("nodes", {
  below: { fn: () => evaluate(m, []), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => evaluate(m, [{ op: "translate", param: { x: 1, y: 0, z: 0 } }]), expect: (r) => r.outcome === "OK" },
  within: { fn: () => evaluate(m, [{ op: "scale", param: 2 }]), expect: (r) => r.mesh.vertices[1].x === 2 },
  above: { fn: () => evaluate(m, [{ op: "twist" }]), expect: (r) => r.outcome === "HOLD" }
});

assert(readFileSync("docs/iterations/OTHER-AI-PROCESS.md", "utf8").includes("ChatGPT"), "Other-AI process is recorded");

console.log("\n=== ALL ITERATION 38 TESTS PASSED ===");
