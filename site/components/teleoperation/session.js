/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/teleoperation/session.js
 * FILE PURPOSE: Teleoperation session. Authority and consent are required. Unknown jurisdiction is NO-GO.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Teleoperation session overlay - Physical AI Platform, Iteration 10.
 *
 * A teleoperation session is represented by the canonical Execution entity type.
 * This package adds session semantics without introducing a second store,
 * ontology, or remote-control stack.
 *
 * Local safety authority is an explicit decision input. It is deliberately not
 * represented as AUTHORIZED_BY, and role assignment is never treated as authority.
 */

const SESSION_STATES = Object.freeze([
  "HOLD",
  "READY",
  "ACTIVE",
  "SAFE"
]);

function clone(value) {
  return structuredClone(value);
}

function provenance(kernel, origin, derivedFrom = null) {
  return {
    origin,
    derivedFrom,
    timestamp: kernel._now()
  };
}

function hasAuthority(decision) {
  if (decision === true) return true;
  if (!decision || typeof decision !== "object") return false;
  if (decision.granted === true) return true;
  return decision.decision === "ALLOW" ||
    decision.decision === "AUTHORIZED" ||
    decision.decision === "SAFE_TO_START";
}

export class TeleopSession {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel) throw new Error("TeleopSession requires a canonical kernel");
    this.kernel = kernel;
  }

  /**
   * Materialize a teleoperation session as the canonical Execution entity.
   * No Session entity type is introduced.
   */
  createSession({
    id,
    projectId = null,
    operatorId,
    robotDeploymentId,
    state = "HOLD",
    role = null,
    localSafetyAuthority = null,
    name = "Teleoperation Session"
  }) {
    if (!id) throw new Error("Teleoperation session requires stable id");
    if (!operatorId) throw new Error("Teleoperation session requires operatorId");
    if (!robotDeploymentId) {
      throw new Error("Teleoperation session requires robotDeploymentId");
    }
    if (!SESSION_STATES.includes(state)) {
      throw new Error(`Invalid teleoperation session state: ${state}`);
    }

    const existing = this.kernel.store.get(id);
    const entity = this.kernel.upsert({
      id,
      type: "Execution",
      name,
      executionKind: "TELEOP_SESSION",
      projectId,
      operatorId,
      robotDeploymentId,
      role,
      state,
      localSafetyAuthority: localSafetyAuthority ? clone(localSafetyAuthority) : null,
      emergencyStop: existing?.emergencyStop || null,
      holdReason: existing?.holdReason || null,
      startedAt: existing?.startedAt || null,
      stoppedAt: existing?.stoppedAt || null,
      provenance: existing?.provenance || provenance(
        this.kernel,
        "teleoperation-session",
        projectId
      )
    });

    return entity;
  }

  /** setRole: Performs set role for this module. */
  setRole(sessionId, role) {
    const session = this.requireSession(sessionId);
    return this.kernel.upsert({
      ...session,
      role,
      provenance: {
        ...session.provenance,
        timestamp: this.kernel._now()
      }
    });
  }

  /**
   * Start requires an explicit local safety authority decision.
   * A role, by itself, has no authorization semantics.
   */
  start(sessionId, localSafetyAuthority) {
    const session = this.requireSession(sessionId);

    if (!hasAuthority(localSafetyAuthority)) {
      const held = this.kernel.upsert({
        ...session,
        state: "HOLD",
        localSafetyAuthority: localSafetyAuthority
          ? clone(localSafetyAuthority)
          : null,
        holdReason: "Local safety authority decision is required before start",
        provenance: {
          ...session.provenance,
          timestamp: this.kernel._now()
        }
      });
      return {
        accepted: false,
        status: "HOLD",
        reason: "Local safety authority decision is required before start",
        session: held
      };
    }

    return {
      accepted: true,
      status: "ACTIVE",
      session: this.kernel.upsert({
        ...session,
        state: "ACTIVE",
        localSafetyAuthority: clone(localSafetyAuthority),
        holdReason: null,
        startedAt: session.startedAt || this.kernel._now(),
        provenance: {
          ...session.provenance,
          timestamp: this.kernel._now()
        }
      })
    };
  }

  /**
   * Emergency stop is a local session state transition. It records the reason
   * and never fabricates an authorization or verification relation.
   */
  emergencyStop(sessionId, reason) {
    if (reason === undefined || reason === null || String(reason).trim() === "") {
      throw new Error("Emergency stop requires a reason");
    }

    const session = this.requireSession(sessionId);
    const stoppedAt = this.kernel._now();

    return this.kernel.upsert({
      ...session,
      state: "SAFE",
      emergencyStop: {
        state: "SAFE",
        reason: String(reason),
        timestamp: stoppedAt
      },
      stoppedAt,
      provenance: {
        ...session.provenance,
        timestamp: stoppedAt
      }
    });
  }

  /** getSession: Performs get session for this module. */
  getSession(sessionId) {
    return this.requireSession(sessionId);
  }

  /** isSession: Performs is session for this module. */
  isSession(entity) {
    return Boolean(
      entity &&
      entity.type === "Execution" &&
      entity.executionKind === "TELEOP_SESSION"
    );
  }

  /** requireSession: Performs require session for this module. */
  requireSession(sessionId) {
    const entity = this.kernel.store.get(sessionId);
    if (!entity) throw new Error(`Teleoperation session not found: ${sessionId}`);
    if (!this.isSession(entity)) {
      throw new Error(`${sessionId} is not a teleoperation session`);
    }
    return entity;
  }

  static states() {
    return [...SESSION_STATES];
  }
}
