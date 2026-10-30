/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/cad/cad-workbench.js
 * FILE PURPOSE: CAD workbench session. Creates a sketch, applies features, and returns the resulting solid and mesh for the CAD page.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * CAD workbench – Iteration 19
 * Interactive sketch, extrude, subtract, feature tree, viewport model.
 * Not a canned plate.
 */
export function createCadSession(kernel, projectId) {
  const state = {
    points: [],
    height: 10,
    cutter: [{ x: 10, y: 5 }, { x: 22, y: 5 }, { x: 16, y: 14 }],
    selectedId: null,
    message: ""
  };

  function features() {
    const graph = kernel.getProjectGraph(projectId);
    return graph.entities
      .filter(e => e.type === "Sketch" || e.type === "Solid")
      .map(e => ({ id: e.id, type: e.type, name: e.name, feature: e.feature || "SKETCH", volume: e.volume || null }));
  }

  function addPoint(x, y) {
    const n = Number(x), m = Number(y);
    if (!Number.isFinite(n) || !Number.isFinite(m)) return { outcome: "HOLD", reason: "Point is UNSPECIFIED" };
    state.points.push({ x: n, y: m });
    return { outcome: "OK", points: state.points.length };
  }

  function extrude(cad) {
    if (state.points.length < 3) return { outcome: "HOLD", reason: "Sketch needs at least 3 points" };
    const sketch = cad.sketch(projectId, { name: "Workbench sketch", points: state.points });
    if (sketch.outcome === "HOLD") return sketch;
    const solid = cad.extrude(projectId, sketch.id, Number(state.height) || 10, { name: "Workbench solid" });
    if (solid.outcome !== "HOLD") state.selectedId = solid.id;
    state.message = solid.outcome === "HOLD" ? solid.reason : `Extruded ${solid.volume} mm3`;
    return solid;
  }

  function subtract(cad) {
    const baseId = state.selectedId;
    const base = kernel.store.get(baseId);
    if (!base || base.type !== "Solid") return { outcome: "HOLD", reason: "Select a solid first" };
    const cutterSketch = cad.sketch(projectId, { name: "Cutter", points: state.cutter });
    if (cutterSketch.outcome === "HOLD") return cutterSketch;
    const cutter = cad.extrude(projectId, cutterSketch.id, Number(state.height) || 10, { name: "Cutter solid" });
    if (cutter.outcome === "HOLD") return cutter;
    const result = cad.boolean(projectId, base.id, cutter.id, "SUBTRACT", { name: "Subtracted" });
    if (result.outcome !== "HOLD") state.selectedId = result.id;
    state.message = result.outcome === "HOLD" ? result.reason : `Subtract volume ${result.volume} mm3`;
    return result;
  }

  function viewport(cad) {
    const solid = kernel.store.get(state.selectedId);
    return {
      points: state.points,
      cutter: state.cutter,
      mesh: solid?.mesh || null,
      volume: solid?.volume || null,
      triangleCount: solid?.triangleCount || 0,
      message: state.message
    };
  }

  return { state, features, addPoint, extrude, subtract, viewport };
}
