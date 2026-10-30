/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/cfd/module.js
 * PURPOSE: Deterministic, dependency-free finite-volume CFD reference module.
 * MODEL: Fully developed, steady, incompressible, Newtonian, laminar channel flow.
 * DISCRETIZATION: Cell-centred finite volume in the wall-normal direction.
 * LICENSE: GPL-3.0-only.
 *
 * This is an executable bounded CFD solver, not a general-purpose 2D/3D CFD package.
 * The returned numerical state is SIMULATED, never physically validated by this module.
 */

const finite = Number.isFinite;
const positive = (x) => finite(x) && x > 0;
const nonNegative = (x) => finite(x) && x >= 0;
const hold = (code, reason, details = {}) => ({ outcome: "HOLD", code, reason, ...details });

function normalizeFluid(fluid) {
  const density = fluid?.density ?? fluid?.rho;
  const viscosity = fluid?.dynamicViscosity ?? fluid?.viscosity ?? fluid?.mu;
  if (!positive(density)) return { error: "FLUID_DENSITY_INVALID", reason: "Fluid density must be finite and greater than zero (kg/m^3)." };
  if (!positive(viscosity)) return { error: "FLUID_VISCOSITY_INVALID", reason: "Dynamic viscosity must be finite and greater than zero (Pa·s)." };
  return { density, viscosity };
}

function normalizeMesh(mesh) {
  if (!mesh || typeof mesh !== "object") return { error: "MESH_MISSING", reason: "A mesh definition is required." };
  const height = mesh.height ?? mesh.channelHeight;
  if (!positive(height)) return { error: "MESH_HEIGHT_INVALID", reason: "Mesh height must be finite and greater than zero (m)." };
  let faces;
  if (Array.isArray(mesh.yFaces)) faces = [...mesh.yFaces];
  else {
    const cells = mesh.cells;
    if (!Number.isInteger(cells) || cells < 3 || cells > 10000) return { error: "MESH_CELLS_INVALID", reason: "Mesh cells must be an integer in [3, 10000]." };
    faces = Array.from({ length: cells + 1 }, (_, i) => height * i / cells);
  }
  if (faces.length < 4 || faces.length > 10001) return { error: "MESH_FACES_INVALID", reason: "A wall-normal mesh requires 3 to 10000 cells." };
  if (faces.some((v) => !finite(v))) return { error: "MESH_FACE_NONFINITE", reason: "Every mesh face must be finite." };
  const scale = Math.max(Number.MIN_VALUE, Math.abs(height));
  if (Math.abs(faces[0]) > 1e-12 * scale || Math.abs(faces.at(-1) - height) > 1e-10 * scale)
    return { error: "MESH_DOMAIN_MISMATCH", reason: "yFaces must start at 0 and end at mesh.height." };
  const widths = [];
  for (let i = 0; i < faces.length - 1; i++) {
    const dy = faces[i + 1] - faces[i];
    if (!positive(dy)) return { error: "MESH_NOT_MONOTONE", reason: "Mesh faces must be strictly increasing." };
    widths.push(dy);
  }
  const min = Math.min(...widths), max = Math.max(...widths);
  if (max / min > 1e6) return { error: "MESH_ASPECT_RATIO", reason: "Wall-normal cell-width ratio exceeds the supported limit of 1e6." };
  return { faces, widths, centers: widths.map((w, i) => (faces[i] + faces[i + 1]) / 2), height, cells: widths.length };
}

function solveLinearTridiagonal(lower, diagonal, upper, rhs) {
  const n = diagonal.length;
  const a = [...lower], b = [...diagonal], c = [...upper], d = [...rhs];
  for (let i = 1; i < n; i++) {
    if (!positive(Math.abs(b[i - 1]))) throw new Error("SINGULAR_TRIDIAGONAL_SYSTEM");
    const m = a[i] / b[i - 1];
    b[i] -= m * c[i - 1];
    d[i] -= m * d[i - 1];
  }
  if (!positive(Math.abs(b[n - 1]))) throw new Error("SINGULAR_TRIDIAGONAL_SYSTEM");
  const x = Array(n);
  x[n - 1] = d[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = (d[i] - c[i] * x[i + 1]) / b[i];
  return x;
}

function normalizedResidual(lower, diagonal, upper, rhs, x) {
  let norm = 0, scale = 0;
  for (let i = 0; i < x.length; i++) {
    const ax = diagonal[i] * x[i] + (i ? lower[i] * x[i - 1] : 0) + (i + 1 < x.length ? upper[i] * x[i + 1] : 0);
    norm = Math.max(norm, Math.abs(ax - rhs[i]));
    scale = Math.max(scale, Math.abs(rhs[i]), Math.abs(ax));
  }
  return norm / Math.max(scale, Number.MIN_VALUE);
}

/**
 * Solve a channel with constant streamwise pressure gradient.
 * pressureGradient is dp/dx in Pa/m; negative values drive positive-x flow.
 * Wall velocities are optional and permit Couette-Poiseuille superposition.
 */
export function solvePoiseuille(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return hold("INPUT_INVALID", "solvePoiseuille expects an input object.");
  const { mesh, fluid, pressureGradient, dpdx, wall = {}, tolerance = 1e-10, maxIterations = 20000 } = input;
  const m = normalizeMesh(mesh);
  if (m.error) return hold(m.error, m.reason);
  const f = normalizeFluid(fluid);
  if (f.error) return hold(f.error, f.reason);
  const grad = pressureGradient ?? dpdx;
  if (!finite(grad)) return hold("PRESSURE_GRADIENT_INVALID", "pressureGradient (dp/dx, Pa/m) must be finite.");
  const bottom = wall.bottomVelocity ?? 0, top = wall.topVelocity ?? 0;
  if (!finite(bottom) || !finite(top)) return hold("WALL_VELOCITY_INVALID", "Wall velocities must be finite (m/s).");
  if (!positive(tolerance) || tolerance >= 1) return hold("TOLERANCE_INVALID", "Tolerance must be finite and in (0, 1). ");
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 1e7)
    return hold("ITERATION_LIMIT_INVALID", "maxIterations must be an integer in [1, 10000000].");

  // Vertex-centred conservative finite-volume form. Unknowns are interior mesh
  // vertices; the two end vertices are prescribed Dirichlet wall velocities.
  const n = m.cells - 1, mu = f.viscosity;
  const y = m.faces.slice(1, -1);
  const controlWidths = y.map((_, i) => (m.widths[i] + m.widths[i + 1]) / 2);
  const lower = Array(n).fill(0), diagonal = Array(n).fill(0), upper = Array(n).fill(0), rhs = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const hSouth = m.widths[i], hNorth = m.widths[i + 1];
    const aS = mu / hSouth, aN = mu / hNorth;
    diagonal[i] = aS + aN;
    if (i > 0) lower[i] = -aS;
    else rhs[i] += aS * bottom;
    if (i < n - 1) upper[i] = -aN;
    else rhs[i] += aN * top;
    rhs[i] += -grad * controlWidths[i];
  }
  if ([...lower, ...diagonal, ...upper, ...rhs].some((v) => !finite(v)) || diagonal.some((v) => !positive(v)))
    return hold("ASSEMBLY_NONFINITE", "The discretized momentum operator overflowed or became singular for the supplied scales.");
  let interior;
  try { interior = solveLinearTridiagonal(lower, diagonal, upper, rhs); }
  catch (e) { return hold("LINEAR_SOLVE_FAILED", "The discretized momentum system is singular.", { diagnostic: e.message }); }
  if (interior.some((v) => !finite(v))) return hold("NONFINITE_SOLUTION", "The solver produced a non-finite velocity.");
  const residual = normalizedResidual(lower, diagonal, upper, rhs, interior);
  if (!finite(residual) || residual > tolerance)
    return hold("RESIDUAL_NOT_CONVERGED", "The discrete momentum residual did not meet tolerance.", { residual, tolerance });

  const velocity = [bottom, ...interior, top];
  const exact = m.faces.map((yy) => bottom + (top - bottom) * yy / m.height + (-grad) * yy * (m.height - yy) / (2 * mu));
  let flowRatePerSpan = 0;
  const uniform = m.widths.every((w) => Math.abs(w - m.widths[0]) <= 1e-12 * Math.max(Number.MIN_VALUE, Math.abs(m.widths[0])));
  if (uniform && m.cells % 2 === 0) {
    const h = m.widths[0];
    let weighted = velocity[0] + velocity.at(-1);
    for (let i = 1; i < velocity.length - 1; i++) weighted += (i % 2 ? 4 : 2) * velocity[i];
    flowRatePerSpan = h * weighted / 3;
  } else {
    for (let i = 0; i < m.cells; i++) flowRatePerSpan += (velocity[i] + velocity[i + 1]) * 0.5 * m.widths[i];
  }
  const meanVelocity = flowRatePerSpan / m.height;
  const hydraulicDiameter = 2 * m.height;
  const reynolds = f.density * Math.abs(meanVelocity) * hydraulicDiameter / mu;
  const maxAbs = Math.max(...velocity.map(Math.abs));
  if (![flowRatePerSpan, meanVelocity, reynolds, maxAbs].every(finite))
    return hold("DIAGNOSTIC_NONFINITE", "A derived flow diagnostic overflowed; no result is promoted.");
  const l2Error = Math.sqrt(interior.reduce((s, u, i) => s + (u - exact[i + 1]) ** 2 * controlWidths[i], 0) / m.height);
  const l2Reference = Math.sqrt(exact.slice(1, -1).reduce((s, u, i) => s + u ** 2 * controlWidths[i], 0) / m.height);
  const relativeProfileError = l2Error / Math.max(l2Reference, 1e-30);
  return {
    outcome: "OK", model: "STEADY_INCOMPRESSIBLE_LAMINAR_CHANNEL", fidelity: "L4_PHYSICS_REFERENCE",
    validationState: "SIMULATED_NOT_PHYSICALLY_VALIDATED", discretization: "VERTEX_CENTERED_CONSERVATIVE_FINITE_VOLUME_1D", solverExecution: "DIRECT_TRIDIAGONAL_THOMAS",
    mesh: { cells: m.cells, interiorUnknowns: n, height: m.height, minCellWidth: Math.min(...m.widths), maxCellWidth: Math.max(...m.widths) },
    fluid: { density: f.density, dynamicViscosity: mu }, pressureGradient: grad,
    iterations: 1, residual, tolerance, converged: true,
    fields: { y: m.faces, velocity },
    diagnostics: { flowRatePerSpan, meanVelocity, maxAbsVelocity: maxAbs, reynoldsNumber: reynolds, relativeProfileError },
    reference: { kind: "ANALYTICAL_COETTE_POISEUILLE_PROFILE", velocity: exact },
    evidence: { method: "discrete-equation-residual-and-analytical-profile-comparison", physicalTestEvidence: false }
  };
}

/** Stable public entry point expected by Iteration 47. */
export function cfdStep(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return hold("INPUT_INVALID", "cfdStep expects an input object.");
  const steps = input.steps ?? input.maxIterations ?? 1;
  if (!Number.isInteger(steps) || steps < 1) return hold("STEPS_INVALID", "steps must be a positive integer.");
  const result = solvePoiseuille({ ...input, maxIterations: input.maxIterations ?? Math.max(1, steps) });
  if (result.outcome !== "OK") return result;
  return result;
}

/** A deterministic validation case suitable for sample loading and CI. */
export function poiseuilleSample() {
  return {
    id: "cfd-poiseuille-water-channel-32",
    description: "Steady laminar water flow in a plane channel; analytical Poiseuille reference.",
    input: { mesh: { cells: 32, height: 0.01 }, fluid: { density: 998.2, dynamicViscosity: 0.001002 }, pressureGradient: -0.1, tolerance: 1e-10, maxIterations: 20000 }
  };
}

export const CFD_CONTRACT = Object.freeze({
  id: "cfdStep", version: "1.2.0", model: "STEADY_INCOMPRESSIBLE_LAMINAR_CHANNEL",
  input: ["mesh.cells|mesh.yFaces", "mesh.height", "fluid.density|rho", "fluid.dynamicViscosity|viscosity|mu", "pressureGradient|dpdx"],
  output: ["outcome", "residual", "converged", "fields", "diagnostics", "reference", "validationState"],
  holdCodes: ["MESH_MISSING", "MESH_HEIGHT_INVALID", "MESH_CELLS_INVALID", "MESH_FACES_INVALID", "MESH_FACE_NONFINITE", "MESH_DOMAIN_MISMATCH", "MESH_NOT_MONOTONE", "MESH_ASPECT_RATIO", "FLUID_DENSITY_INVALID", "FLUID_VISCOSITY_INVALID", "PRESSURE_GRADIENT_INVALID", "WALL_VELOCITY_INVALID", "TOLERANCE_INVALID", "ITERATION_LIMIT_INVALID", "STEPS_INVALID", "RESIDUAL_NOT_CONVERGED"]
});
