/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Iteration 20 – the open requirements, built and gated.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { compileIR, commandPacket, executeGate, IR_VERSION, ABI_VERSION } from "../site/components/sir/sir-abi.js";
import { GraphEditor } from "../site/components/graph/graph-editor.js";
import { FidelityLevels } from "../site/components/simulation/fidelity-levels.js";
import { solveCoupled } from "../site/components/simulation/multiphysics-coupled.js";
import { HilRealtime } from "../site/components/simulation/hil-realtime.js";
import { BoardCorrelation } from "../site/components/education/board-correlation.js";
import { PackageExport } from "../site/components/manufacturing/package-export.js";
import { completeComponent } from "../site/components/core/component-model.js";
import { nurbsCurve, nurbsExtrude } from "../site/components/cad/nurbs.js";
import { meshVolume } from "../site/components/cad/cad-contracts.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

function run() {
  console.log("=== Iteration 20 ===");
  const kernel = createKernel();
  const project = kernel.upsert({ id: "p20", type: "Project", name: "Close", provenance: { origin: "iter20" } });

  const ir = compileIR({
    header: { irVersion: IR_VERSION, abiVersion: ABI_VERSION },
    identity: { name: "arm" }, mission: { text: "pick" },
    components: [], ports: [], commands: [], safety: {}, execution: {}, standards: [], provenance: {}
  });
  assert(ir.outcome === "OK" && ir.ir.magic === "PAI-SIR", "SIR IR compiles with separate ABI version");
  assert(compileIR({ header: { irVersion: IR_VERSION, abiVersion: ABI_VERSION } }).outcome === "HOLD", "Incomplete IR HOLDs");
  const pkt = commandPacket({ version: ABI_VERSION, source: "op", destination: "arm", type: "JOG", authority: "lead", intentRef: "i1", policyRef: "p1", deadline: 10, payload: { v: 1 } });
  assert(pkt.outcome === "OK", "Command packet accepted");
  assert(commandPacket({ version: ABI_VERSION, type: "JOG" }).outcome === "HOLD", "Incomplete command HOLDs");
  assert(executeGate({ intent: true, policy: true, authority: true, capability: true, state: true, safety: true, timing: true, resource: true }).outcome === "EXECUTE", "EXECUTE only when every gate is valid");
  assert(executeGate({ intent: true, policy: false, authority: true, capability: true, state: true, safety: true, timing: true, resource: true }).outcome === "REJECT", "Missing policy REJECTs");

  const editor = new GraphEditor(kernel);
  const motor = kernel.upsert({ id: "motor", type: "Component", name: "Motor", domain: "electrical", provenance: { origin: "iter20" } });
  kernel.link(project.id, "CONTAINS", motor.id);
  const pa = kernel.upsert({ id: "pa", type: "Port", name: "A", domain: "electrical", unit: "V", provenance: { origin: "iter20" } });
  const pb = kernel.upsert({ id: "pb", type: "Port", name: "B", domain: "mechanical", unit: "N", provenance: { origin: "iter20" } });
  kernel.link(project.id, "CONTAINS", pa.id);
  kernel.link(project.id, "CONTAINS", pb.id);
  assert(editor.connect(project.id, pa.id, pb.id).outcome === "HOLD", "Graph editor rejects incompatible ports");
  const pc = kernel.upsert({ id: "pc", type: "Port", name: "C", domain: "electrical", unit: "V", provenance: { origin: "iter20" } });
  kernel.link(project.id, "CONTAINS", pc.id);
  assert(editor.connect(project.id, pa.id, pc.id).outcome === "OK", "Compatible ports connect");
  assert(editor.view(project.id, "manufacturing").outcome === "OK", "Manufacturing view exists");
  assert(editor.view(project.id, "nope").outcome === "HOLD", "Unknown view HOLDs");

  const fid = new FidelityLevels(kernel);
  assert(fid.claim(project.id, "arm", "L0", "cfg-20").outcome === "HOLD", "Fidelity claim without subject-bound accepted evidence HOLDs");
  const fidelityMethods = { L0: "CONCEPTUAL_REVIEW", L1: "SIMULATION", L2: "KINEMATIC_TEST", L3: "DYNAMIC_TEST", L4: "PHYSICS_TEST", L5: "HIL", L6: "PHYSICAL_TEST", L7: "FIELD_TEST" };
  for (const level of ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"]) {
    const ev = kernel.upsert({ id: `evidence-${level}`, type: "Evidence", name: `${level} verified`, state: "VERIFIED", method: fidelityMethods[level], subject: "arm", configurationId: "cfg-20", level, hardwareAttested: level === "L5", provenance: { origin: "iter20-verified-fixture" } });
    kernel.link(project.id, "CONTAINS", ev.id);
    assert(fid.claim(project.id, "arm", level, "cfg-20").outcome === "OK", `Claim ${level} references pre-existing verified evidence`);
  }

  const phys = solveCoupled({ steps: 20, dt: 0.05, mass: 1, kSpring: 2, resistance: 4, current: 0.5, kThermal: 0.1, temp0: 20, tempAmb: 20 });
  assert(phys.outcome === "OK" && phys.history.length === 20 && phys.voltage === 2, "Coupled solver integrates and computes voltage");

  const hil = new HilRealtime();
  assert(hil.run({ steps: 2, dt: 0.1, deadlineMs: 50, controller: () => 0 }).outcome === "HOLD", "HIL without a bound device HOLDs");
  assert(hil.bind({ id: "software-mock", x0: 0, step: (x, u, dt) => x + dt * u }).outcome === "HOLD", "A JavaScript step function is not a hardware adapter");
  let deviceState = 0;
  const binding = hil.bind({ id: "adapter-1", bound: true, hardwareBacked: true,
    transport: { kind: "hardware", bus: "CAN", readState: () => deviceState, writeCommand: ({ command, dt }) => { deviceState += dt * command; return true; } },
    safety: { interlockClosed: true, emergencyStopClear: true },
    authority: { verified: true, authorized: true, subject: "operator-1", policyRef: "policy-1" } },
    ({ bus, deviceId }) => ({ verified: true, bus, deviceId }));
  assert(binding.outcome === "BOUND", "Bound hardware I/O adapter accepted with explicit safety and authority");
  const ran = hil.run({ steps: 5, dt: 0.1, deadlineMs: 50, controller: (x) => 1 - x });
  assert(ran.outcome === "OK" && ran.bound === "adapter-1" && ran.trace.length === 5 && ran.method === "HIL", "Bound HIL adapter performs read/write/read exchanges");

  const edu = new BoardCorrelation(kernel);
  const pre = edu.path(project.id, "preschool");
  const post = edu.path(project.id, "postdoc");
  assert(pre.depth === "observe" && post.depth === "define", "Education depth follows the band");
  assert(edu.lookup("CBSE", "kinematics").outcome === "HOLD", "Unmapped board topic HOLDs");
  edu.correlate("CBSE", "kinematics", "concept-kin");
  assert(edu.lookup("CBSE", "kinematics").conceptId === "concept-kin", "Board topic resolves to a concept");

  kernel.upsert({ id: "mat", type: "Material", name: "Al", sku: "Al", qty: 2, cost: 15, provenance: { origin: "iter20" } });
  kernel.link(project.id, "CONTAINS", "mat");
  kernel.upsert({ id: "wo", type: "WorkOrder", name: "WO", provenance: { origin: "iter20" } });
  kernel.link(project.id, "CONTAINS", "wo");
  const exported = new PackageExport(kernel).exportAll(project.id);
  assert(exported.outcome === "OK" && exported.pack.spec.cost === 30 && exported.pack.funding.ask === 30 && exported.pack.manufacturing.cost === 30, "Spec, funding, and manufacturing share one cost");

  assert(completeComponent(kernel, project.id, { id: "bare", name: "Bare" }).outcome === "HOLD", "Component without model fields HOLDs");
  const full = completeComponent(kernel, project.id, {
    id: "full", name: "Drive", version: "1.0.0", interfaceVersion: "1", units: "N", safetyClass: "B",
    ports: [{ name: "out", domain: "mechanical" }], substitution: ["drive-b"]
  });
  assert(full.outcome === "OK", "Complete component is accepted");

  const curve = nurbsCurve(
    [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 20 }, { x: 40, y: 0 }],
    [1, 1, 1, 1],
    [0, 0, 0, 0, 1, 1, 1, 1],
    3, 8
  );
  assert(curve.outcome === "OK" && curve.points.length === 8, "NURBS curve evaluates");
  assert(nurbsCurve([{ x: 0, y: 0 }], [1], [0, 1], 3).outcome === "HOLD", "Degenerate NURBS HOLDs");
  const extruded = nurbsExtrude(
    [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 20, y: 0 }],
    [1, 1, 1], [0, 0, 0, 1, 1, 1], 2, 5, 6
  );
  assert(extruded.outcome === "OK" && extruded.mesh.faces.length > 0, "NURBS extrude produces a mesh");
  assert(typeof meshVolume(extruded.mesh) === "number", "NURBS mesh has an integral volume");

  console.log("\n=== ALL ITERATION 20 TESTS PASSED ===");
}
run();
