/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** CFD contract, analytical, numerical, adversarial-input, deterministic, and sample tests. GPL-3.0-only. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cfdStep, solvePoiseuille, poiseuilleSample, CFD_CONTRACT } from "./module.js";

const base = {
  mesh: { cells: 32, height: 0.01 },
  fluid: { density: 998.2, dynamicViscosity: 0.001002 },
  pressureGradient: -0.1, tolerance: 1e-10, maxIterations: 20000
};
const close = (a, b, rel = 1e-10, abs = 1e-14) =>
  Number.isFinite(a) && Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
const run = (input) => solvePoiseuille(input);
const result = run(base);

// 1. Core solve and equation-level verification.
assert.equal(result.outcome, "OK");
assert.equal(result.converged, true);
assert.equal(result.validationState, "SIMULATED_NOT_PHYSICALLY_VALIDATED");
assert.equal(result.solverExecution, "DIRECT_TRIDIAGONAL_THOMAS");
assert.equal(result.mesh.cells, 32, "reported mesh cell count is the physical interval count");
assert.equal(result.mesh.interiorUnknowns, 31, "interior unknown count is distinct from mesh cells");
assert.equal(result.fields.velocity.length, 33);
assert.equal(result.fields.y.length, 33);
assert.ok(result.fields.velocity.every(Number.isFinite));
assert.ok(result.fields.velocity[0] === 0 && result.fields.velocity.at(-1) === 0);
assert.ok(result.fields.velocity.slice(1, -1).every((u) => u > 0));
assert.ok(result.residual <= base.tolerance);
assert.ok(result.diagnostics.relativeProfileError < 1e-10);
assert.equal(result.iterations, 1, "direct solve is not misreported as iterative history");

// Analytical Poiseuille integral and centreline maximum.
const H = base.mesh.height, mu = base.fluid.dynamicViscosity, dpdx = base.pressureGradient;
const expectedQ = -(H ** 3) * dpdx / (12 * mu);
const expectedUmax = -dpdx * H ** 2 / (8 * mu);
assert.ok(close(result.diagnostics.flowRatePerSpan, expectedQ, 1e-10));
assert.ok(close(Math.max(...result.fields.velocity), expectedUmax, 1e-10));

// 2. Grid and geometry coverage.
for (const cells of [3, 4, 5, 8, 16, 32, 64, 127, 257, 512, 1000]) {
  const r = run({ ...base, mesh: { cells, height: H } });
  assert.equal(r.outcome, "OK", `uniform mesh ${cells}`);
  assert.equal(r.mesh.cells, cells);
  assert.equal(r.fields.velocity.length, cells + 1);
  assert.ok(r.diagnostics.relativeProfileError < 1e-9, `profile error mesh ${cells}`);
  assert.ok(r.residual <= base.tolerance, `residual mesh ${cells}`);
}
const nonuniformFaces = [0, 0.0002, 0.0007, 0.0018, 0.004, 0.007, H];
const nonuniform = run({ ...base, mesh: { height: H, yFaces: nonuniformFaces } });
assert.equal(nonuniform.outcome, "OK");
assert.equal(nonuniform.mesh.cells, nonuniformFaces.length - 1);
assert.ok(nonuniform.diagnostics.relativeProfileError < 1e-9);
assert.ok(nonuniform.residual <= base.tolerance);

// Explicit closed-boundary checks: minimum and maximum supported cell counts.
const minimumGridBoundary = run({ ...base, mesh: { cells: 3, height: H } });
assert.equal(minimumGridBoundary.outcome, "OK", "minimum cell-count boundary is accepted");
assert.equal(minimumGridBoundary.mesh.cells, 3);
// At the 10,000-cell resource ceiling, round-off in the assembled operator is
// visible against a 1e-10 normalized residual target. A defensible 1e-8 target
// is accepted; the default 1e-10 target must HOLD rather than hide the residual.
const maximumGridStrict = run({ ...base, mesh: { cells: 10000, height: H } });
assert.equal(maximumGridStrict.outcome, "HOLD");
assert.equal(maximumGridStrict.code, "RESIDUAL_NOT_CONVERGED");
const maximumGridBoundary = run({ ...base, mesh: { cells: 10000, height: H }, tolerance: 1e-8 });
assert.equal(maximumGridBoundary.outcome, "OK", "maximum cell-count boundary passes at explicit round-off-aware tolerance");
assert.equal(maximumGridBoundary.mesh.cells, 10000);
const nearUpperTolerance = run({ ...base, tolerance: 0.999999 });
assert.equal(nearUpperTolerance.outcome, "OK", "tolerance strictly below one is accepted");

// 3. Boundary-condition physics and superposition.
const couette = run({ ...base, pressureGradient: 0, wall: { bottomVelocity: 0, topVelocity: 2 } });
assert.equal(couette.outcome, "OK");
assert.ok(close(couette.diagnostics.meanVelocity, 1));
assert.ok(close(couette.diagnostics.flowRatePerSpan, 0.01));
const movingBothWalls = run({ ...base, pressureGradient: 0, wall: { bottomVelocity: -0.5, topVelocity: 1.5 } });
assert.equal(movingBothWalls.outcome, "OK");
for (let i = 0; i < movingBothWalls.fields.velocity.length; i++) {
  const y = movingBothWalls.fields.y[i];
  assert.ok(close(movingBothWalls.fields.velocity[i], -0.5 + 2 * y / H));
}
const combined = run({ ...base, wall: { bottomVelocity: 0.3, topVelocity: -0.2 } });
assert.equal(combined.outcome, "OK");
const reverse = run({ ...base, pressureGradient: 0.1 });
assert.equal(reverse.outcome, "OK");
assert.ok(reverse.diagnostics.meanVelocity < 0);
const zeroFlow = run({ ...base, pressureGradient: 0 });
assert.equal(zeroFlow.outcome, "OK");
assert.equal(zeroFlow.diagnostics.flowRatePerSpan, 0);
assert.ok(zeroFlow.fields.velocity.every((v) => v === 0));

// 4. Determinism and no mutation of caller-owned inputs.
const frozen = Object.freeze({ ...base, mesh: Object.freeze({ ...base.mesh }), fluid: Object.freeze({ ...base.fluid }) });
const before = JSON.stringify(frozen);
assert.equal(JSON.stringify(run(frozen)), JSON.stringify(run(frozen)));
assert.equal(JSON.stringify(frozen), before, "input is not mutated");

// 5. All shipped samples load and execute through the public solver.
assert.equal(poiseuilleSample().id, "cfd-poiseuille-water-channel-32");
assert.equal(run(poiseuilleSample().input).outcome, "OK");
const sampleNames = ["poiseuille-water-channel", "couette-channel", "reverse-pressure-flow", "zero-pressure-gradient"];
for (const name of sampleNames) {
  const fixture = JSON.parse(readFileSync(new URL(`./samples/${name}.json`, import.meta.url), "utf8"));
  const sampleResult = run(fixture.input);
  assert.equal(sampleResult.outcome, "OK", `sample ${fixture.id} executes`);
  if (fixture.id.includes("reverse")) assert.ok(sampleResult.diagnostics.meanVelocity < 0);
  if (fixture.id.includes("zero-pressure")) assert.equal(sampleResult.diagnostics.flowRatePerSpan, 0);
  if (fixture.id.includes("couette")) assert.ok(sampleResult.diagnostics.meanVelocity > 0);
}

// 6. Reason-coded HOLD matrix. No invalid or unsupported input is accepted.
const holds = [
  [null, "INPUT_INVALID"],
  [[], "INPUT_INVALID"],
  [{}, "MESH_MISSING"],
  [{ mesh: { cells: 8, height: 1 } }, "FLUID_DENSITY_INVALID"],
  [{ ...base, fluid: { density: 1 } }, "FLUID_VISCOSITY_INVALID"],
  [{ ...base, fluid: { density: 0, viscosity: 1 } }, "FLUID_DENSITY_INVALID"],
  [{ ...base, fluid: { density: 1, viscosity: -1 } }, "FLUID_VISCOSITY_INVALID"],
  [{ ...base, mesh: { cells: 2, height: 1 } }, "MESH_CELLS_INVALID"],
  [{ ...base, mesh: { cells: 10001, height: 1 } }, "MESH_CELLS_INVALID"],
  [{ ...base, mesh: { height: 1, yFaces: [0, 1e-8, 0.5, 1] } }, "MESH_ASPECT_RATIO"],
  [{ ...base, mesh: { cells: 8, height: 0 } }, "MESH_HEIGHT_INVALID"],
  [{ ...base, mesh: { height: 1, yFaces: [0, 0.5, 0.4, 1] } }, "MESH_NOT_MONOTONE"],
  [{ ...base, mesh: { height: 1, yFaces: [0, 0.5, NaN, 1] } }, "MESH_FACE_NONFINITE"],
  [{ ...base, mesh: { height: 1, yFaces: [0.1, 0.5, 0.8, 1] } }, "MESH_DOMAIN_MISMATCH"],
  [{ ...base, pressureGradient: NaN }, "PRESSURE_GRADIENT_INVALID"],
  [{ ...base, wall: { bottomVelocity: Infinity } }, "WALL_VELOCITY_INVALID"],
  [{ ...base, tolerance: 0 }, "TOLERANCE_INVALID"],
  [{ ...base, tolerance: 1 }, "TOLERANCE_INVALID"],
  [{ ...base, steps: 0 }, "STEPS_INVALID"],
  [{ ...base, steps: 1, maxIterations: 0 }, "ITERATION_LIMIT_INVALID"],
  [{ ...base, steps: 1, maxIterations: 1.5 }, "ITERATION_LIMIT_INVALID"],
  [{ mesh: { cells: 8, height: 1e-320 }, fluid: { rho: 1, mu: 1 }, pressureGradient: -1 }, "ASSEMBLY_NONFINITE"],
  [{ mesh: { cells: 8, height: 1 }, fluid: { rho: 1, mu: 1e-308 }, pressureGradient: -1 }, "DIAGNOSTIC_NONFINITE"]
];
for (const [input, code] of holds) {
  const r = cfdStep(input);
  assert.equal(r.outcome, "HOLD", `expected HOLD ${code}`);
  assert.equal(r.code, code, `expected reason ${code}`);
}
assert.equal(solvePoiseuille(null).code, "INPUT_INVALID", "direct API rejects null safely");

// 7. Mutation-sensitive assertions: a fake zero field, fake residual, or missing flow
// integral causes the suite to fail, not merely report module presence.
assert.ok(result.fields.velocity.some((u) => u !== 0), "pressure gradient creates nonzero velocity");
assert.ok(result.residual < 1e-10, "residual is calculated from the assembled discrete operator");
assert.notEqual(result.diagnostics.flowRatePerSpan, 0, "flow integral is calculated");
assert.equal(CFD_CONTRACT.id, "cfdStep");
assert.equal(CFD_CONTRACT.version, "1.2.0");

console.log(`CFD PASS: ${holds.length} HOLD cases; 11 uniform grids; nonuniform grid; analytical profile/flow; Couette and superposition; reversal; determinism; immutable input; 4 executable samples`);
