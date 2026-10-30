/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: drop-in/fabrication/module.js
 * PURPOSE: Bounded, deterministic 2.5D rounded-rectangle pocket fabrication
 * planner, toolpath validator/interpreter, execution assurance gate and
 * dimensional inspection evaluator.
 * LICENSE: GPL-3.0-only.
 *
 * This module deliberately does not claim to be a general CAM kernel, B-rep
 * offsetter, NC postprocessor, machine kinematic simulator, collision detector,
 * physical stock-removal solver, CNC controller, or certified metrology system.
 * Those capabilities require machine/controller/geometry-specific engines and
 * externally supplied evidence. Unknown or missing evidence => HOLD.
 *
 * Public API retained for the Iteration 47 spine:
 *   fabricate({ solid, machine, ...job }) -> Promise<Result>
 * Additional exports: planFabrication, validateToolpath, simulateToolpath,
 * evaluateMeasurement, integrityId.
 */

export const FABRICATION_API_VERSION = "2.2.0";
const AXES = Object.freeze(["x", "y", "z"]);
const finite = Number.isFinite;
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const positive = n => finite(n) && n > 0;
const nonNegative = n => finite(n) && n >= 0;
const round = n => Number(n.toFixed(6));
const hold = (reason, details = {}) => ({ outcome: "HOLD", reason, ...details });
const fail = (reason, details = {}) => ({ outcome: "FAIL", reason, ...details });
const dimensions = d => object(d) && AXES.every(k => positive(d[k]));
const nonNegativeAxes = d => object(d) && AXES.every(k => nonNegative(d[k]));
const nonBlank = v => typeof v === "string" && v.trim().length > 0;

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

// Deterministic corruption-detection checksum, not a cryptographic signature.
// Execution adapters must authenticate/authorize jobs independently.
export function integrityId(value) {
  const input = stableStringify(value);
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return `pai-fab-checksum-v1-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function checkRequired(input, fields) {
  for (const field of fields) if (input[field] === undefined || input[field] === null) return `${field} is UNSPECIFIED`;
  return null;
}

function validateJob(input, { execution = false } = {}) {
  if (!object(input)) return fail("Fabrication input must be an object");
  const missing = checkRequired(input, ["solid", "stock", "machine", "tool", "process", "material", "fixture", "surfaceFinish", "inspectionPlan", "tolerance"]);
  if (missing) return hold(missing);
  const { solid, stock, machine, tool, process, material, fixture, surfaceFinish, inspectionPlan, tolerance } = input;
  if (![solid, stock, machine, tool, process, material, fixture, surfaceFinish, inspectionPlan, tolerance].every(object)) return fail("Job sections must be objects");
  const absent = (obj, keys) => keys.some(k => obj[k] === undefined || obj[k] === null);
  if (absent(solid, ["kind", "units", "dimensions", "cornerRadiusMm"]) || absent(solid.dimensions || {}, AXES)) return hold("Solid feature definition is incomplete");
  if (absent(stock, ["units", "dimensions"]) || absent(stock.dimensions || {}, AXES)) return hold("Stock definition is incomplete");
  if (absent(tool, ["diameterMm", "maxStepdownMm", "fluteLengthMm"])) return hold("Tool definition is incomplete");
  if (absent(process, ["stepdownMm", "stepoverMm", "feedMmMin", "spindleRpm"])) return hold("Process definition is incomplete");
  if (absent(machine, ["maxFeedMmMin", "maxSpindleRpm", "travelMm"]) || absent(machine.travelMm || {}, AXES)) return hold("Machine capability definition is incomplete");
  if (absent(material, ["id", "lotId", "maxCuttingSpeedMMin"])) return hold("Material identity, lot or cutting-speed limit is UNSPECIFIED");
  if (absent(fixture, ["id", "setupId", "verified", "clearanceOutcome", "clearanceEvidenceId"])) return hold("Fixture setup or clearance evidence is incomplete");
  if (absent(surfaceFinish, ["maxRaUm"])) return hold("Maximum surface roughness requirement Ra (µm) is UNSPECIFIED");
  if (absent(inspectionPlan, ["id", "method"])) return hold("Inspection plan identity or method is UNSPECIFIED");
  if (absent(tolerance, [...AXES, "cornerRadiusMm"])) return hold("One or more dimensional tolerances are UNSPECIFIED");

  if (solid.kind !== "rectangular-pocket") return fail("Unsupported feature kind; supported kind is rectangular-pocket");
  if (solid.units !== "mm" || stock.units !== "mm") return fail("Solid and stock units must be mm");
  if (!dimensions(solid.dimensions) || !dimensions(stock.dimensions)) return fail("Solid and stock dimensions must be finite positive millimetres");
  if (!positive(solid.cornerRadiusMm)) return fail("solid.cornerRadiusMm must be finite and positive");
  const origin = solid.originMm ?? { x: 0, y: 0 };
  if (!object(origin) || absent(origin, ["x", "y"])) return hold("solid.originMm is incomplete");
  if (!nonNegative(origin.x) || !nonNegative(origin.y)) return fail("solid.originMm x/y must be finite non-negative stock coordinates");
  if (origin.x + solid.dimensions.x > stock.dimensions.x || origin.y + solid.dimensions.y > stock.dimensions.y || solid.dimensions.z >= stock.dimensions.z) return fail("Pocket does not fit stock or leaves no positive floor");
  if (!positive(tool.diameterMm) || !positive(tool.maxStepdownMm) || !positive(tool.fluteLengthMm)) return fail("Tool diameter, maxStepdownMm and fluteLengthMm must be finite and positive");
  const radius = tool.diameterMm / 2;
  if (solid.cornerRadiusMm + 1e-9 < radius) return fail("Tool cannot produce the specified internal corner radius");
  if (Math.abs(solid.cornerRadiusMm - radius) > 1e-6) return fail("This strategy supports a corner radius equal to the endmill radius; use a finishing strategy for other radii");
  if (tool.diameterMm > Math.min(solid.dimensions.x, solid.dimensions.y)) return fail("Tool diameter exceeds pocket minimum lateral dimension");
  if (solid.dimensions.z > tool.fluteLengthMm) return fail("Pocket depth exceeds tool flute length");
  if (![process.stepdownMm, process.stepoverMm, process.feedMmMin, process.spindleRpm].every(positive)) return fail("Stepdown, stepover, feed and spindle speed must be finite and positive");
  if (process.stepdownMm > tool.maxStepdownMm) return fail("Requested stepdown exceeds tool-rated maximum");
  if (process.stepoverMm > tool.diameterMm) return fail("Stepover exceeds tool diameter; coverage is not guaranteed");
  const maxSegment = process.maxSegmentLengthMm ?? 20;
  if (!positive(maxSegment)) return fail("maxSegmentLengthMm must be finite and positive");
  if (![machine.maxFeedMmMin, machine.maxSpindleRpm].every(positive) || !dimensions(machine.travelMm)) return fail("Machine feed, spindle and XYZ travel limits must be finite and positive");
  if (process.feedMmMin > machine.maxFeedMmMin || process.spindleRpm > machine.maxSpindleRpm) return fail("Process parameters exceed machine limits");
  if (!nonBlank(material.id) || !nonBlank(material.lotId)) return hold("Material identity and lot ID are required");
  if (!positive(material.maxCuttingSpeedMMin)) return fail("Material maximum cutting speed must be finite and positive");
  const cuttingSpeedMMin = Math.PI * tool.diameterMm * process.spindleRpm / 1000;
  if (cuttingSpeedMMin > material.maxCuttingSpeedMMin) return fail("Calculated cutting speed exceeds material process limit", { cuttingSpeedMMin: round(cuttingSpeedMMin), maxCuttingSpeedMMin: material.maxCuttingSpeedMMin });
  if (!nonBlank(fixture.id) || !nonBlank(fixture.setupId) || !nonBlank(fixture.clearanceEvidenceId)) return hold("Fixture identity, setup and clearance evidence ID are required");
  if (fixture.verified !== true) return hold("Fixture verification is not confirmed");
  if (fixture.clearanceOutcome === "FAIL") return fail("Fixture/tool clearance evidence reports FAIL");
  if (fixture.clearanceOutcome !== "PASS") return hold("Fixture/tool clearance evidence is not PASS");
  if (!positive(surfaceFinish.maxRaUm)) return fail("Maximum surface roughness requirement Ra (µm) must be finite and positive");
  if (!nonBlank(inspectionPlan.id) || !nonBlank(inspectionPlan.method)) return hold("Inspection plan identity and method are required");
  if (stock.dimensions.x > machine.travelMm.x || stock.dimensions.y > machine.travelMm.y || stock.dimensions.z > machine.travelMm.z) return fail("Stock envelope exceeds machine travel");
  if (!nonNegativeAxes(tolerance) || !positive(tolerance.cornerRadiusMm)) return fail("Tolerance XYZ and cornerRadiusMm must be finite and non-negative (corner radius tolerance positive)");
  if (input.maxMoves !== undefined && (!Number.isSafeInteger(input.maxMoves) || input.maxMoves < 1)) return fail("maxMoves must be a positive safe integer");
  if (machine.maxMoves !== undefined && (!Number.isSafeInteger(machine.maxMoves) || machine.maxMoves < 1)) return fail("machine.maxMoves must be a positive safe integer");
  if (input.executionTimeoutMs !== undefined && (!Number.isSafeInteger(input.executionTimeoutMs) || input.executionTimeoutMs < 1)) return fail("executionTimeoutMs must be a positive safe integer");
  if (execution) {
    if (typeof machine.executeToolpath !== "function") return hold("Machine execution adapter is UNSPECIFIED");
    for (const key of ["ready", "emergencyStopClear", "doorClosed", "workholdingVerified"]) {
      if (machine[key] === undefined || machine[key] === null) return hold(`Machine safety state ${key} is UNSPECIFIED`);
      if (machine[key] !== true) return hold(`Machine safety interlock ${key} is not confirmed`);
    }
    if (!nonBlank(machine.id)) return hold("Machine identity is UNSPECIFIED");
  }
  return null;
}

/**
 * Verify structured toolpath shape, checksum, bounds and state transitions.
 * This is a path-integrity/interpreter check, not collision or stock simulation.
 */
export function validateToolpath(toolpath, { maxMoves = 100000 } = {}) {
  const reasons = [];
  if (!object(toolpath)) return { outcome: "FAIL", reasons: ["Toolpath is not an object"] };
  if (toolpath.schema !== "PAI-FAB-TOOLPATH/2.1") reasons.push("Unsupported toolpath schema");
  if (toolpath.units !== "mm" || toolpath.coordinateFrame !== "STOCK_TOP_DATUM_Z_DOWN") reasons.push("Unsupported units or coordinate frame");
  if (!object(toolpath.nominal) || !dimensions(toolpath.nominal.dimensions) || !positive(toolpath.nominal.cornerRadiusMm) || !positive(toolpath.nominal.surfaceFinishMaxRaUm)) reasons.push("Missing or invalid nominal feature geometry/surface-finish requirement");
  if (!object(toolpath.bounds) || ![toolpath.bounds.xMin, toolpath.bounds.yMin, toolpath.bounds.xMax, toolpath.bounds.yMax].every(finite) || toolpath.bounds.xMax <= toolpath.bounds.xMin || toolpath.bounds.yMax <= toolpath.bounds.yMin) reasons.push("Missing or invalid feature bounds");
  if (!object(toolpath.process) || !positive(toolpath.process.safeClearanceMm) || !positive(toolpath.process.stepoverMm)) reasons.push("Missing or invalid process/clearance data");
  if (!object(toolpath.tool) || !positive(toolpath.tool.diameterMm)) reasons.push("Missing or invalid cutting tool geometry");
  if (!object(toolpath.material) || !nonBlank(toolpath.material.id) || !nonBlank(toolpath.material.lotId) || !positive(toolpath.material.maxCuttingSpeedMMin) || !positive(toolpath.material.calculatedCuttingSpeedMMin) || toolpath.material.calculatedCuttingSpeedMMin > toolpath.material.maxCuttingSpeedMMin) reasons.push("Missing or invalid material/process envelope");
  if (!object(toolpath.fixture) || !nonBlank(toolpath.fixture.id) || !nonBlank(toolpath.fixture.setupId) || !nonBlank(toolpath.fixture.clearanceEvidenceId)) reasons.push("Missing fixture/clearance evidence reference");
  if (!object(toolpath.inspectionPlan) || !nonBlank(toolpath.inspectionPlan.id) || !nonBlank(toolpath.inspectionPlan.method)) reasons.push("Missing inspection plan reference");
  if (!object(toolpath.surfaceFinish) || !positive(toolpath.surfaceFinish.maxRaUm)) reasons.push("Missing surface-finish requirement");
  if (!Array.isArray(toolpath.moves) || toolpath.moves.length === 0) reasons.push("Toolpath has no moves");
  else {
    if (toolpath.moves.length > maxMoves) reasons.push("Toolpath exceeds move limit");
    toolpath.moves.forEach((m, i) => {
      if (!object(m) || m.sequence !== i) { reasons.push(`Invalid move sequence at index ${i}`); return; }
      if (![m.x, m.y, m.z].every(finite)) reasons.push(`Non-finite coordinate at move ${i}`);
      if (!["RAPID", "PLUNGE", "LINEAR_CUT", "RETRACT"].includes(m.type)) reasons.push(`Unknown move type at move ${i}`);
      if (["PLUNGE", "LINEAR_CUT"].includes(m.type) && (!positive(m.feedMmMin) || !positive(m.spindleRpm))) reasons.push(`Invalid cutting parameters at move ${i}`);
      const b = toolpath.bounds;
      if (object(b) && finite(m.x) && (m.x < b.xMin - 1e-6 || m.x > b.xMax + 1e-6)) reasons.push(`X coordinate outside feature envelope at move ${i}`);
      if (object(b) && finite(m.y) && (m.y < b.yMin - 1e-6 || m.y > b.yMax + 1e-6)) reasons.push(`Y coordinate outside feature envelope at move ${i}`);
      const clearance = toolpath.process?.safeClearanceMm;
      if (finite(m.z) && finite(clearance) && m.z < -clearance - 1e-6) reasons.push(`Z coordinate exceeds safe clearance envelope at move ${i}`);
      if (finite(m.z) && object(toolpath.nominal) && m.z > toolpath.nominal.dimensions.z + 1e-6) reasons.push(`Z coordinate exceeds pocket depth at move ${i}`);
    });
  }
  if (!nonBlank(toolpath.integrityId) || toolpath.integrityId !== integrityId({ ...toolpath, integrityId: undefined })) reasons.push("Toolpath integrity identifier mismatch");
  if (!reasons.length) {
    const simulation = simulateToolpath(toolpath, { skipIntegrity: true });
    if (simulation.outcome !== "SIMULATED") reasons.push(...simulation.reasons);
  }
  return reasons.length ? { outcome: "FAIL", reasons } : { outcome: "PASS", moveCount: toolpath.moves.length };
}

/** Deterministic motion interpreter. It does not model material removal/collisions. */
export function simulateToolpath(toolpath, { skipIntegrity = false } = {}) {
  if (!object(toolpath) || !Array.isArray(toolpath.moves) || !toolpath.moves.length) return { outcome: "FAIL", reasons: ["No executable moves"] };
  if (!skipIntegrity && toolpath.integrityId !== integrityId({ ...toolpath, integrityId: undefined })) return { outcome: "FAIL", reasons: ["Toolpath integrity identifier mismatch"] };
  let safe = false, cutting = false, previous = null, cutLengthMm = 0, estimatedCutMinutes = 0;
  const reasons = [];
  for (let i = 0; i < toolpath.moves.length; i++) {
    const m = toolpath.moves[i];
    if (!object(m) || m.sequence !== i || ![m.x, m.y, m.z].every(finite)) { reasons.push(`Malformed move ${i}`); break; }
    if (m.type === "RAPID") {
      if (cutting || m.z >= 0 || (previous && previous.type !== "RETRACT")) reasons.push(`Unsafe rapid transition at move ${i}`);
      safe = m.z < 0; cutting = false;
    } else if (m.type === "PLUNGE") {
      if (!safe || cutting || m.z <= 0 || !previous || Math.hypot(m.x - previous.x, m.y - previous.y) > 1e-6) reasons.push(`Plunge without safe vertical approach at move ${i}`);
      cutting = true; safe = false;
    } else if (m.type === "LINEAR_CUT") {
      if (!cutting || !previous || !positive(m.feedMmMin) || Math.abs(m.z - previous.z) > 1e-6) reasons.push(`Cut without active level engagement at move ${i}`);
      else {
        const length = Math.hypot(m.x - previous.x, m.y - previous.y, m.z - previous.z);
        cutLengthMm += length; estimatedCutMinutes += length / m.feedMmMin;
      }
    } else if (m.type === "RETRACT") {
      if (!cutting || m.z >= 0 || !previous || Math.hypot(m.x - previous.x, m.y - previous.y) > 1e-6) reasons.push(`Retract without vertical exit at move ${i}`);
      cutting = false; safe = true;
    } else reasons.push(`Unknown motion type at move ${i}`);
    previous = m;
    if (reasons.length) break;
  }
  if (cutting || !safe) reasons.push("Toolpath does not terminate in a safe retracted state");
  return reasons.length ? { outcome: "FAIL", reasons } : {
    outcome: "SIMULATED", moveCount: toolpath.moves.length,
    cutLengthMm: round(cutLengthMm), estimatedCutMinutes: round(estimatedCutMinutes),
    finalState: "SAFE_RETRACTED", physicalSimulation: false,
    checks: ["sequence", "finite_coordinates", "safe_rapid", "vertical_plunge", "level_cut", "vertical_retract", "safe_terminal_state"]
  };
}


function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Discrete 2D swept-cutter stock-removal simulation for this pocket strategy.
 * Each XY cutter footprint is a disk of tool radius; the deepest intersecting
 * pass determines removed depth per cell. This verifies coverage/residuals for
 * the declared rounded pocket, but is not a high-fidelity voxel/B-rep, force,
 * chip-load, thermal, deflection, kinematic or collision simulation.
 */
export function simulateStockRemoval(toolpath, { resolutionMm = 0.5, maxCells = 1000000, maxWork = 50000000 } = {}) {
  const valid = validateToolpath(toolpath);
  if (valid.outcome !== "PASS") return { outcome: "FAIL", reasons: ["Stock simulation requires a valid toolpath", ...(valid.reasons || [])] };
  if (!positive(resolutionMm) || !Number.isSafeInteger(maxCells) || maxCells < 1 || !Number.isSafeInteger(maxWork) || maxWork < 1) return { outcome: "FAIL", reasons: ["Invalid stock simulation resolution or work limit"] };
  const { x, y, z } = toolpath.nominal.dimensions;
  const r = toolpath.tool.diameterMm / 2;
  const width = toolpath.bounds.xMax - toolpath.bounds.xMin;
  const height = toolpath.bounds.yMax - toolpath.bounds.yMin;
  const step = Math.min(resolutionMm, r / 4, toolpath.process.stepoverMm / 2);
  const nx = Math.max(1, Math.ceil(width / step));
  const ny = Math.max(1, Math.ceil(height / step));
  const cellCount = nx * ny;
  if (!Number.isSafeInteger(cellCount) || cellCount > maxCells) return { outcome: "FAIL", reasons: [`Stock simulation grid ${cellCount} exceeds cell limit ${maxCells}`] };
  const workEstimate = cellCount * toolpath.moves.length;
  if (!Number.isSafeInteger(workEstimate) || workEstimate > maxWork) return { outcome: "FAIL", reasons: [`Stock simulation work estimate ${workEstimate} exceeds work limit ${maxWork}`] };
  const dx = width / nx, dy = height / ny, cellArea = dx * dy;
  const moves = toolpath.moves;
  let targetCells = 0, fullyCutCells = 0, removedVolumeEstimateMm3 = 0, residualVolumeEstimateMm3 = 0;
  const residualSamples = [];
  for (let iy = 0; iy < ny; iy++) {
    const py = toolpath.bounds.yMin + (iy + 0.5) * dy;
    for (let ix = 0; ix < nx; ix++) {
      const px = toolpath.bounds.xMin + (ix + 0.5) * dx;
      const cx = Math.max(toolpath.bounds.xMin + r, Math.min(toolpath.bounds.xMax - r, px));
      const cy = Math.max(toolpath.bounds.yMin + r, Math.min(toolpath.bounds.yMax - r, py));
      if (Math.hypot(px - cx, py - cy) > r + 1e-9) continue;
      targetCells++;
      let cutDepth = 0;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (m.type === "PLUNGE") {
          if (Math.hypot(px - m.x, py - m.y) <= r + 1e-9) cutDepth = Math.max(cutDepth, m.z);
        } else if (m.type === "LINEAR_CUT") {
          const prev = moves[i - 1];
          if (prev && ["PLUNGE", "LINEAR_CUT"].includes(prev.type) && pointSegmentDistance(px, py, prev.x, prev.y, m.x, m.y) <= r + 1e-9) cutDepth = Math.max(cutDepth, m.z);
        }
      }
      cutDepth = Math.min(z, cutDepth);
      removedVolumeEstimateMm3 += cutDepth * cellArea;
      const residual = Math.max(0, z - cutDepth);
      residualVolumeEstimateMm3 += residual * cellArea;
      if (residual <= 1e-6) fullyCutCells++;
      else if (residualSamples.length < 12) residualSamples.push({ x: round(px), y: round(py), cutDepthMm: round(cutDepth), residualDepthMm: round(residual) });
    }
  }
  if (!targetCells) return { outcome: "FAIL", reasons: ["Stock simulation produced no target cells"] };
  const coverageFraction = fullyCutCells / targetCells;
  const nominalAreaMm2 = x * y - (4 - Math.PI) * r * r;
  const nominalVolumeMm3 = nominalAreaMm2 * z;
  const pass = fullyCutCells === targetCells;
  return {
    outcome: pass ? "SIMULATED" : "FAIL", model: "DISCRETE_2D_SWEPT_ENDMILL_FOOTPRINT",
    resolutionMm: round(Math.max(dx, dy)), workEstimate, grid: { nx, ny, targetCells, totalCells: cellCount },
    fullyCutCells, residualCells: targetCells - fullyCutCells, coverageFraction: round(coverageFraction), residualSamples,
    nominalVolumeMm3: round(nominalVolumeMm3), removedVolumeEstimateMm3: round(removedVolumeEstimateMm3),
    residualVolumeEstimateMm3: round(residualVolumeEstimateMm3), physicalSimulation: false,
    reasons: pass ? [] : [`${targetCells - fullyCutCells} target cells retain material at the requested depth`]
  };
}

function planPocket(input) {
  const { solid, stock, machine, tool, process } = input;
  const { x, y, z } = solid.dimensions;
  const origin = solid.originMm ?? { x: 0, y: 0 };
  const r = tool.diameterMm / 2;
  const clearance = process.safeClearanceMm === undefined ? 5 : process.safeClearanceMm;
  if (!positive(clearance) || z + clearance > machine.travelMm.z) return fail("Safe clearance plus cut depth exceeds machine Z travel");
  const maxSegment = process.maxSegmentLengthMm ?? 20;
  const nx = Math.max(1, Math.ceil((x - tool.diameterMm) / maxSegment) + 1);
  const ny = Math.max(1, Math.ceil((y - tool.diameterMm) / process.stepoverMm) + 1);
  const layers = Math.ceil(z / process.stepdownMm);
  const limit = Math.min(input.maxMoves ?? 100000, machine.maxMoves ?? 100000);
  const contourXSegments = Math.ceil((x - tool.diameterMm) / maxSegment);
  const contourYSegments = Math.ceil((y - tool.diameterMm) / maxSegment);
  const contourMovesPerLayer = 3 + 2 * contourXSegments + 2 * contourYSegments; // rapid + plunge + split contour segments + retract
  const estimatedMoves = ((nx + 2) * ny + contourMovesPerLayer) * layers;
  if (![nx, ny, layers, estimatedMoves].every(Number.isSafeInteger)) return fail("Toolpath complexity exceeds safe integer limits");
  if (estimatedMoves > limit) return fail(`Estimated toolpath has ${estimatedMoves} moves; configured limit is ${limit}`, { estimatedMoveCount: estimatedMoves, maxMoves: limit });
  const xs = Array.from({ length: nx }, (_, i) => round(origin.x + r + (nx === 1 ? 0 : i * (x - tool.diameterMm) / (nx - 1))));
  const ys = Array.from({ length: ny }, (_, i) => round(origin.y + r + (ny === 1 ? 0 : i * (y - tool.diameterMm) / (ny - 1))));
  const moves = [];
  const push = (type, px, py, pz, cutting = false) => moves.push({ sequence: moves.length, type, x: px, y: py, z: pz,
    ...(cutting ? { feedMmMin: process.feedMmMin, spindleRpm: process.spindleRpm } : {}) });
  const safeZ = -clearance;
  for (let layer = 1; layer <= layers; layer++) {
    const depth = round(Math.min(layer * process.stepdownMm, z));
    for (let row = 0; row < ys.length; row++) {
      const rowXs = row % 2 === 0 ? xs : [...xs].reverse();
      const rowY = ys[row];
      push("RAPID", rowXs[0], rowY, safeZ);
      push("PLUNGE", rowXs[0], rowY, depth, true);
      for (let col = 1; col < rowXs.length; col++) push("LINEAR_CUT", rowXs[col], rowY, depth, true);
      push("RETRACT", rowXs[rowXs.length - 1], rowY, safeZ);
    }
    // Boundary contour clears residual material left near the rounded corners
    // by raster row ends. The tool-center rectangle is offset by cutter radius.
    const x0 = round(origin.x + r), x1 = round(origin.x + x - r);
    const y0 = round(origin.y + r), y1 = round(origin.y + y - r);
    push("RAPID", x0, y0, safeZ);
    push("PLUNGE", x0, y0, depth, true);
    const contourLine = (ax, ay, bx, by) => {
      const length = Math.hypot(bx - ax, by - ay);
      const segments = Math.ceil(length / maxSegment);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        push("LINEAR_CUT", round(ax + (bx - ax) * t), round(ay + (by - ay) * t), depth, true);
      }
    };
    contourLine(x0, y0, x1, y0);
    contourLine(x1, y0, x1, y1);
    contourLine(x1, y1, x0, y1);
    contourLine(x0, y1, x0, y0);
    push("RETRACT", x0, y0, safeZ);
  }
  if (moves.length > limit) return fail(`Generated toolpath has ${moves.length} moves; configured limit is ${limit}`);
  const toolpath = {
    schema: "PAI-FAB-TOOLPATH/2.1", units: "mm", coordinateFrame: "STOCK_TOP_DATUM_Z_DOWN",
    strategy: "ROUNDED_RECTANGLE_POCKET_RASTER_2P5D", solidId: solid.id || null, stockId: stock.id || null,
    nominal: { dimensions: { x, y, z }, cornerRadiusMm: solid.cornerRadiusMm, surfaceFinishMaxRaUm: input.surfaceFinish.maxRaUm },
    bounds: { xMin: origin.x, yMin: origin.y, xMax: origin.x + x, yMax: origin.y + y },
    stock: { ...stock.dimensions },
    material: { id: input.material.id, lotId: input.material.lotId, maxCuttingSpeedMMin: input.material.maxCuttingSpeedMMin,
      calculatedCuttingSpeedMMin: round(Math.PI * tool.diameterMm * process.spindleRpm / 1000) },
    fixture: { id: input.fixture.id, setupId: input.fixture.setupId, clearanceEvidenceId: input.fixture.clearanceEvidenceId },
    inspectionPlan: { id: input.inspectionPlan.id, method: input.inspectionPlan.method },
    surfaceFinish: { maxRaUm: input.surfaceFinish.maxRaUm },
    tool: { id: tool.id || null, diameterMm: tool.diameterMm, fluteLengthMm: tool.fluteLengthMm, maxStepdownMm: tool.maxStepdownMm },
    process: { stepdownMm: process.stepdownMm, stepoverMm: process.stepoverMm, feedMmMin: process.feedMmMin,
      spindleRpm: process.spindleRpm, safeClearanceMm: clearance, maxSegmentLengthMm: maxSegment },
    layers, rowsPerLayer: ys.length, pointsPerRow: xs.length, contourMovesPerLayer, moveCount: moves.length, moves
  };
  toolpath.integrityId = integrityId({ ...toolpath, integrityId: undefined });
  const validation = validateToolpath(toolpath, { maxMoves: limit });
  if (validation.outcome !== "PASS") return fail("Generated toolpath failed internal validation", { validation });
  const simulation = simulateToolpath(toolpath);
  if (simulation.outcome !== "SIMULATED") return fail("Generated trajectory failed internal simulation", { simulation });
  const stockSimulation = simulateStockRemoval(toolpath);
  if (stockSimulation.outcome !== "SIMULATED") return fail("Generated path failed discrete stock-removal coverage simulation", { stockSimulation });
  return { outcome: "PLANNED", toolpath, validation, simulation, stockSimulation,
    planning: { layers, rowsPerLayer: ys.length, contourPasses: layers, moveCount: moves.length, estimatedCutSegments: layers * (ys.length * (xs.length - 1) + 2 * contourXSegments + 2 * contourYSegments),
      coverageModel: "parallel flat-endmill swaths plus offset perimeter contour; stepover <= cutter diameter", stockRemovalVerified: true } };
}

/**
 * Validate a normalized toolpath produced by an optional external CAM backend.
 * This preserves the platform-owned toolpath ABI: a backend is not trusted merely
 * because it returned a path. Only the currently supported rounded-pocket envelope
 * is accepted by this module's stock-removal validator.
 */
export function validateExternalToolpath(input = {}, toolpath) {
  const invalid = validateJob(input);
  if (invalid) return invalid;
  const validation = validateToolpath(toolpath);
  if (validation.outcome !== "PASS") return fail("External backend toolpath failed canonical validation", { validation });
  const eq = (a,b) => finite(a) && finite(b) && Math.abs(a-b) <= 1e-6;
  const origin = input.solid.originMm ?? {x:0,y:0};
  const mismatches = [];
  for (const axis of AXES) if (!eq(toolpath.nominal.dimensions[axis], input.solid.dimensions[axis])) mismatches.push(`nominal.${axis}`);
  if (!eq(toolpath.nominal.cornerRadiusMm, input.solid.cornerRadiusMm)) mismatches.push("nominal.cornerRadiusMm");
  for (const axis of AXES) if (!eq(toolpath.stock?.[axis], input.stock.dimensions[axis])) mismatches.push(`stock.${axis}`);
  if (!eq(toolpath.bounds.xMin, origin.x) || !eq(toolpath.bounds.yMin, origin.y) || !eq(toolpath.bounds.xMax, origin.x+input.solid.dimensions.x) || !eq(toolpath.bounds.yMax, origin.y+input.solid.dimensions.y)) mismatches.push("feature.bounds");
  if (!eq(toolpath.tool.diameterMm, input.tool.diameterMm)) mismatches.push("tool.diameterMm");
  if (toolpath.material.id !== input.material.id || toolpath.material.lotId !== input.material.lotId) mismatches.push("material.identity");
  if (toolpath.fixture.id !== input.fixture.id || toolpath.fixture.setupId !== input.fixture.setupId || toolpath.fixture.clearanceEvidenceId !== input.fixture.clearanceEvidenceId) mismatches.push("fixture.identity");
  if (toolpath.inspectionPlan.id !== input.inspectionPlan.id || toolpath.inspectionPlan.method !== input.inspectionPlan.method) mismatches.push("inspectionPlan.identity");
  if (!eq(toolpath.process.stepdownMm, input.process.stepdownMm) || !eq(toolpath.process.stepoverMm, input.process.stepoverMm) || !eq(toolpath.process.feedMmMin, input.process.feedMmMin) || !eq(toolpath.process.spindleRpm, input.process.spindleRpm)) mismatches.push("process.parameters");
  if (mismatches.length) return fail("External backend toolpath does not match the canonical fabrication job", { mismatches });
  if (input.solid.kind !== "rectangular-pocket") return hold("This module's independent stock-removal validator currently supports rectangular-pocket geometry only");
  const simulation = simulateToolpath(toolpath);
  if (simulation.outcome !== "SIMULATED") return fail("External backend trajectory failed independent interpretation", { simulation });
  const stockSimulation = simulateStockRemoval(toolpath);
  if (stockSimulation.outcome !== "SIMULATED") return fail("External backend path failed independent stock coverage validation", { stockSimulation });
  return { outcome:"PLANNED", toolpath, validation, simulation, stockSimulation,
    planning:{ strategy:"EXTERNAL_CAM_BACKEND", backendToolpathValidated:true, independentTrajectoryInterpretation:true, independentStockCoverageCheck:true } };
}

/** Plan-only API; no machine adapter is called and no physical execution is implied. */
export function planFabrication(input = {}) {
  const invalid = validateJob(input);
  if (invalid) return invalid;
  return planPocket(input);
}

function evaluateMeasurement(input = {}) {
  if (!object(input)) return hold("Measurement evaluation input is UNSPECIFIED");
  const { nominal, measured, tolerance } = input;
  if (!measured) return hold("Physical measurement evidence is UNSPECIFIED");
  if (!object(nominal) || !dimensions(nominal.dimensions) || !positive(nominal.cornerRadiusMm) || !positive(nominal.surfaceFinishMaxRaUm) || !object(tolerance) || !nonNegativeAxes(tolerance) || !positive(tolerance.cornerRadiusMm)) return hold("Nominal geometry, surface-finish limit or dimensional tolerance is UNSPECIFIED/invalid");
  if (!object(measured)) return fail("Measured-part evidence must be an object");
  if (measured.units === undefined || measured.dimensions === undefined || measured.cornerRadiusMm === undefined || measured.surfaceFinishRaUm === undefined) return hold("Measured units, XYZ, corner radius or surface-finish result is UNSPECIFIED");
  if (measured.units !== "mm" || !dimensions(measured.dimensions) || !positive(measured.cornerRadiusMm) || !positive(measured.surfaceFinishRaUm)) return fail("Measured dimensions, corner radius and surface finish must be finite positive values");
  const provenanceFields = ["instrument", "calibrationId", "calibrationEvidenceId", "calibrationStatus", "calibrationValidFrom", "calibrationValidUntil", "evidenceId", "method", "measuredAt", "operatorId", "rawEvidenceRef"];
  if (!provenanceFields.every(k => nonBlank(measured[k]))) return hold("Measurement instrument, calibration record/window, evidence, method, operator and raw evidence reference are required");
  if (measured.calibrationStatus === "EXPIRED" || measured.calibrationStatus === "INVALID") return fail("Measurement instrument calibration is expired or invalid");
  if (measured.calibrationStatus !== "VALID") return hold("Measurement instrument calibration status is not confirmed VALID");
  const measuredAtMs = Date.parse(measured.measuredAt), validFromMs = Date.parse(measured.calibrationValidFrom), validUntilMs = Date.parse(measured.calibrationValidUntil);
  if (![measuredAtMs, validFromMs, validUntilMs].every(Number.isFinite) || validUntilMs < validFromMs) return fail("Measurement timestamp or calibration validity window is malformed");
  if (measuredAtMs < validFromMs || measuredAtMs > validUntilMs) return fail("Measurement timestamp falls outside the instrument calibration validity window");
  if (!measured.uncertaintyMm || !measured.uncertaintyUm) return hold("Measurement uncertainty is required for XYZ, corner radius and surface finish");
  if (!object(measured.uncertaintyMm) || ["x", "y", "z", "cornerRadiusMm"].some(k => measured.uncertaintyMm[k] === undefined || measured.uncertaintyMm[k] === null)) return hold("Measurement uncertainty is incomplete for XYZ or corner radius");
  if (!object(measured.uncertaintyMm) || !nonNegativeAxes(measured.uncertaintyMm) || !nonNegative(measured.uncertaintyMm.cornerRadiusMm)) return fail("Measurement uncertainty must be finite, non-negative mm for XYZ and cornerRadiusMm");
  if (!object(measured.uncertaintyUm) || measured.uncertaintyUm.surfaceFinishRaUm === undefined || measured.uncertaintyUm.surfaceFinishRaUm === null) return hold("Surface-finish measurement uncertainty is incomplete");
  if (!nonNegative(measured.uncertaintyUm.surfaceFinishRaUm)) return fail("Surface-finish uncertainty must be finite and non-negative µm");
  const deviations = {}, axes = {}, guardedAxes = {};
  for (const axis of AXES) {
    deviations[axis] = round(measured.dimensions[axis] - nominal.dimensions[axis]);
    axes[axis] = Math.abs(deviations[axis]) <= tolerance[axis];
    guardedAxes[axis] = Math.abs(deviations[axis]) + (measured.uncertaintyMm?.[axis] ?? 0) <= tolerance[axis];
  }
  const radiusDeviation = round(measured.cornerRadiusMm - nominal.cornerRadiusMm);
  const radiusWithin = Math.abs(radiusDeviation) <= tolerance.cornerRadiusMm;
  const radiusGuarded = Math.abs(radiusDeviation) + (measured.uncertaintyMm?.cornerRadiusMm ?? 0) <= tolerance.cornerRadiusMm;
  const surfaceFinishGuarded = measured.surfaceFinishRaUm + (measured.uncertaintyUm?.surfaceFinishRaUm ?? 0) <= nominal.surfaceFinishMaxRaUm;
  const pass = [...Object.values(guardedAxes), radiusGuarded, surfaceFinishGuarded].every(Boolean);
  return {
    outcome: pass ? "OK" : "FAIL", conformance: pass ? "WITHIN_TOLERANCE" : "OUT_OF_TOLERANCE",
    nominal: { ...nominal.dimensions, cornerRadiusMm: nominal.cornerRadiusMm },
    measured: { ...measured.dimensions, cornerRadiusMm: measured.cornerRadiusMm, surfaceFinishRaUm: measured.surfaceFinishRaUm },
    deviations: { ...deviations, cornerRadiusMm: radiusDeviation },
    tolerance: { ...tolerance },
    uncertaintyMm: { x: measured.uncertaintyMm.x, y: measured.uncertaintyMm.y, z: measured.uncertaintyMm.z, cornerRadiusMm: measured.uncertaintyMm.cornerRadiusMm },
    uncertaintyUm: { surfaceFinishRaUm: measured.uncertaintyUm.surfaceFinishRaUm },
    axes, guardedAxes, cornerRadiusWithinTolerance: radiusWithin, cornerRadiusGuardedWithinTolerance: radiusGuarded,
    surfaceFinishMaxRaUm: nominal.surfaceFinishMaxRaUm, surfaceFinishGuardedWithinLimit: surfaceFinishGuarded,
    measurementEvidence: { instrument: measured.instrument, calibrationId: measured.calibrationId,
      calibrationEvidenceId: measured.calibrationEvidenceId, calibrationStatus: measured.calibrationStatus,
      calibrationValidFrom: measured.calibrationValidFrom, calibrationValidUntil: measured.calibrationValidUntil,
      evidenceId: measured.evidenceId, method: measured.method, measuredAt: measured.measuredAt,
      operatorId: measured.operatorId, rawEvidenceRef: measured.rawEvidenceRef }
  };
}
export { evaluateMeasurement };

function withTimeout(promise, timeoutMs, controller) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Error("Fabrication execution timeout"));
      reject(new Error(`Machine execution timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Full lifecycle API. Adapter contract:
 * executeToolpath(frozenToolpath, {signal,idempotencyKey}) returns
 * {completed:true, executionId, machineId, toolpathIntegrityId}.
 * Adapter must independently enforce hardware safety, honor AbortSignal, and
 * provide a durable execution record. Adapter claims are not independent proof.
 */
export async function fabricate(input = {}) {
  const invalid = validateJob(input, { execution: true });
  if (invalid) return invalid;
  const planned = input.preplannedToolpath ? validateExternalToolpath(input, input.preplannedToolpath) : planPocket(input);
  if (planned.outcome !== "PLANNED") return planned;
  const toolpath = deepFreeze(planned.toolpath);
  const controller = new AbortController();
  const timeoutMs = input.executionTimeoutMs ?? 30000;
  const idempotencyKey = input.idempotencyKey ?? `${toolpath.integrityId}:${input.solid.id || "solid"}`;
  if (!nonBlank(idempotencyKey)) return fail("idempotencyKey must be a non-empty string");
  let execution;
  try {
    const call = Promise.resolve().then(() => input.machine.executeToolpath(toolpath, { signal: controller.signal, idempotencyKey }));
    execution = await withTimeout(call, timeoutMs, controller);
  } catch (error) {
    return hold(`Machine execution is unconfirmed: ${error?.message || "adapter error"}`, {
      toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation,
      execution: { state: controller.signal.aborted ? "ABORTED_OR_TIMED_OUT" : "ADAPTER_ERROR",
        stopConfirmation: "NOT_CONFIRMED_BY_ADAPTER", idempotencyKey }
    });
  }
  if (!object(execution) || execution.completed !== true || !nonBlank(execution.executionId)) {
    return hold("Machine execution completion and executionId are not confirmed", { toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation, execution: { state: "UNCONFIRMED", idempotencyKey } });
  }
  if (execution.toolpathIntegrityId !== toolpath.integrityId) return fail("Execution record does not bind to the exact planned toolpath", {
    toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation,
    execution: { state: "INTEGRITY_MISMATCH", executionId: execution.executionId, idempotencyKey }
  });
  if (execution.machineId !== input.machine.id) return fail("Execution record machine identity does not match requested machine", {
    toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation,
    execution: { state: "MACHINE_ID_MISMATCH", executionId: execution.executionId, machineId: execution.machineId || null, idempotencyKey }
  });
  const executionEvidence = { state: "COMPLETED", executionId: execution.executionId, machineId: execution.machineId,
    toolpathIntegrityId: toolpath.integrityId, idempotencyKey, startedAt: execution.startedAt || null, completedAt: execution.completedAt || null };
  if (!input.measuredPart) return hold("Physical measurement evidence is UNSPECIFIED", { toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation, execution: executionEvidence });
  if (!nonBlank(input.measuredPart.method) || input.measuredPart.method !== input.inspectionPlan.method) return hold("Measured method does not match the approved inspection plan", { toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation, execution: executionEvidence });
  const metrology = evaluateMeasurement({ nominal: planned.toolpath.nominal, measured: input.measuredPart, tolerance: input.tolerance });
  if (metrology.outcome !== "OK" && metrology.outcome !== "FAIL") return { ...metrology, toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation, execution: executionEvidence };
  return { ...metrology, toolpath, simulation: planned.simulation, stockSimulation: planned.stockSimulation, execution: executionEvidence,
    fabricationEvidence: { status: metrology.outcome === "OK" ? "MEASURED_CONFORMING" : "MEASURED_NONCONFORMING",
      toolpathSchema: toolpath.schema, toolpathIntegrityId: toolpath.integrityId,
      executionRecordId: execution.executionId, executionConfirmedByAdapter: true,
      inspectionPlanId: input.inspectionPlan.id, physicalMeasurementProvidedExternally: true, fixtureClearanceEvidenceId: input.fixture.clearanceEvidenceId,
      stockRemovalSimulationPerformed: true, stockRemovalSimulationModel: planned.stockSimulation.model,
      collisionSimulationPerformed: false, backendProvenance: input.backendEvidence || null } };
}
