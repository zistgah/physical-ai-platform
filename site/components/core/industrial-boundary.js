/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/industrial-boundary.js
 * FILE PURPOSE: Industrial boundary. Marks where an adapter ends and a real industrial subsystem would begin.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Capability index – Iteration 14
 * Nothing here is a in-scope domain. Domains are in scope.
 * Geometry CAD is implemented in site/components/cad/geometry-kernel.js.
 */

export const CAPABILITIES = {
  GEOMETRY_CAD: { status: "IMPLEMENTED", module: "site/components/cad/geometry-kernel.js" },
  REALTIME_HIL: { status: "IN_SCOPE", module: "site/components/simulation/cad-hil-adapter.js" },
  MES: { status: "IN_SCOPE", module: "site/components/manufacturing/factory-execution.js" },
  ERP: { status: "IN_SCOPE", module: "site/components/core/business-engine.js" },
  LMS: { status: "IN_SCOPE", module: "site/components/education/curriculum-engine.js" },
  LEGAL_STANDARDS: { status: "IN_SCOPE", module: "site/components/compliance/standards-corpus.js" },
  SIR_LANGUAGE: { status: "IN_SCOPE", module: "site/components/sir/sir-lang.js" },
  FORMAL_PROOF: { status: "IN_SCOPE", module: "site/components/core/formal-adapter.js" },
  MULTI_PHYSICS: { status: "IN_SCOPE", module: null },
  DISTRIBUTED_EXECUTION: { status: "IN_SCOPE", module: null },
  FLEET_OPS_CENTER: { status: "IN_SCOPE", module: "site/components/core/fleet-engine.js" },
  TELEOP_REMOTE_STACK: { status: "IN_SCOPE", module: "site/components/teleoperation/teleoperation-engine.js" }
};

/** boundary: Industrial boundary. Marks where an adapter ends and a real industrial subsystem would begin. */
export function boundary(name) {
  return CAPABILITIES[name] || { status: "IN_SCOPE", name };
}

/** allBoundaries: Industrial boundary. Marks where an adapter ends and a real industrial subsystem would begin. */
export function allBoundaries() {
  return Object.entries(CAPABILITIES).map(([name, item]) => ({ name, ...item, subsystem: true }));
}
