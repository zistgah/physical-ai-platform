/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/teleoperation/teleoperation-engine.js
 * FILE PURPOSE: Teleoperation engine. Authority hierarchy. Local safety authority can always stop.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Teleoperation Engine – Iteration 04
 * Reuses cockpit / safety authority. Local safety authority always retains stop.
 */

export const AUTHORITY = ["OBSERVE","SUGGEST","REQUEST","APPROVE","COMMAND","AUTHORIZE","OVERRIDE","EMERGENCY_STOP","MAINTAIN","CONFIGURE","PROGRAM","CERTIFY","DEPLOY","RETIRE"];

export class TeleoperationEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; this.sessions = new Map(); }

  /** open: Performs open for this module. */
  open(session) {
    if (!session.localSafetyAuthority) throw new Error("Local safety authority required");
    const id = session.id || `teleop_${Date.now().toString(36)}`;
    const s = {
      id,
      type: "TeleoperationSession",
      state: "OPEN",
      localSafetyAuthority: session.localSafetyAuthority,
      operator: session.operator || "unknown",
      authority: session.authority || "OBSERVE",
      projectId: session.projectId
    };
    this.sessions.set(id, s);
    if (this.kernel && session.projectId) {
      this.kernel.upsert({ ...s, type: "ServiceEvent", name: `Teleop ${id}` });
      this.kernel.link(session.projectId, "CONTAINS", id);
    }
    return s;
  }

  /** authorize: Performs authorize for this module. */
  authorize(id, authority) {
    const s = this.sessions.get(id);
    if (!s) throw new Error("Session not found");
    if (authority === "EMERGENCY_STOP" || authority === "OVERRIDE") {
      // local safety authority always retains stop
      s.authority = authority;
      s.stopAuthority = "LOCAL_SAFETY";
    } else {
      s.authority = authority;
    }
    return s;
  }

  /** emergencyStop: Performs emergency stop for this module. */
  emergencyStop(id, reason) {
    const s = this.sessions.get(id);
    if (!s) throw new Error("Session not found");
    s.state = "SAFE";
    s.lastStop = { reason, by: "LOCAL_SAFETY", timestamp: new Date().toISOString() };
    return s;
  }

  /** politicalTopicAllowed: Performs political topic allowed for this module. */
  politicalTopicAllowed() { return false; }
}
