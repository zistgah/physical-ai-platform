/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/safety/cockpit-machine.js
 * FILE PURPOSE: Cockpit state machine. Isolation, power-up, and shutdown are gated. Rejected, simulated, or cross-project evidence cannot authorize power-up. Shutdown needs a registered role.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-COCKPIT-STATES
 * Graph-backed operational cockpit state records.
 *
 * This adapter implements the explicit S0-S10 slice described by the
 * Iteration 10 architecture. It does not replace the broader safety engine
 * or assert that the slice is a complete vehicle-control state machine.
 */

export const COCKPIT_STATES = Object.freeze([
  "S0_STORED_SAFE",
  "S1_CONFIGURATION_VERIFIED",
  "S2_POWER_ISOLATED_CHECK",
  "S3_SYSTEM_POWER_UP",
  "S4_SELF_TEST",
  "S5_CONTROL_AUTHORITY_VERIFIED",
  "S6_LOW_ENERGY_COMMISSIONING",
  "S7_CONTROLLED_OPERATION",
  "S8_FULL_OPERATION",
  "S9_SHUTDOWN",
  "S10_SAFE_ISOLATED",
  "ABORT",
  "DIAGNOSIS"
]);

export const COCKPIT_TRANSITIONS = Object.freeze([
  ["S0_STORED_SAFE", "S1_CONFIGURATION_VERIFIED"],
  ["S1_CONFIGURATION_VERIFIED", "S2_POWER_ISOLATED_CHECK"],
  ["S2_POWER_ISOLATED_CHECK", "S3_SYSTEM_POWER_UP"],
  ["S3_SYSTEM_POWER_UP", "S4_SELF_TEST"],
  ["S4_SELF_TEST", "S5_CONTROL_AUTHORITY_VERIFIED"],
  ["S5_CONTROL_AUTHORITY_VERIFIED", "S6_LOW_ENERGY_COMMISSIONING"],
  ["S6_LOW_ENERGY_COMMISSIONING", "S7_CONTROLLED_OPERATION"],
  ["S7_CONTROLLED_OPERATION", "S8_FULL_OPERATION"],
  ["S7_CONTROLLED_OPERATION", "S9_SHUTDOWN"],
  ["S8_FULL_OPERATION", "S9_SHUTDOWN"],
  ["S9_SHUTDOWN", "S10_SAFE_ISOLATED"],
  ["S10_SAFE_ISOLATED", "DIAGNOSIS"]
]);

const TRANSITION_SET = new Set(
  COCKPIT_TRANSITIONS.map(([from, to]) => `${from}->${to}`)
);

function hold(reason, details = {}) {
  return {
    status: "HOLD",
    reason,
    ...details
  };
}

export class CockpitMachine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel, projectId, options = {}) {
    if (!kernel) throw new Error("Kernel is required");
    if (!projectId) throw new Error("Project ID is required");

    const project = kernel.store.get(projectId);
    if (!project || project.type !== "Project") {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.kernel = kernel;
    this.projectId = projectId;
    this.configurationId = options.configurationId || null;
    this.currentState = options.initialState || "S0_STORED_SAFE";

    if (!COCKPIT_STATES.includes(this.currentState)) {
      throw new Error(`Invalid initial cockpit state: ${this.currentState}`);
    }
  }

  /** _configurationCheck: Performs _configuration check for this module. */
  _configurationCheck() {
    if (!this.configurationId) {
      return hold("Configuration is UNSPECIFIED", {
        missing: "Configuration ID"
      });
    }

    const configuration = this.kernel.store.get(this.configurationId);
    if (!configuration || configuration.type !== "Configuration") {
      return hold("Configuration is UNSPECIFIED", {
        missing: "Configuration entity",
        configurationId: this.configurationId
      });
    }

    if (configuration.status !== "FROZEN") {
      return hold("Configuration is not frozen", {
        configurationId: this.configurationId,
        configurationStatus: configuration.status || "UNSPECIFIED"
      });
    }

    return {
      status: "READY",
      configurationId: configuration.id,
      fingerprint: configuration.fingerprint || "UNSPECIFIED"
    };
  }

  /** _record: Performs _record for this module. */
  _record(state, fields = {}) {
    const id = `cockpit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const record = this.kernel.upsert({
      id,
      type: "CockpitState",
      name: state,
      state,
      projectId: this.projectId,
      ...fields,
      provenance: {
        origin: "cockpit-machine",
        derivedFrom: this.projectId,
        timestamp: this.kernel._now()
      }
    });

    this.kernel.link(this.projectId, "CONTAINS", record.id);
    return record;
  }

  /** current: Performs current for this module. */
  current() {
    return this.currentState;
  }

  /** start: Enters the initial cockpit state. */
  start() {
    if (this.currentState !== "S0_STORED_SAFE") {
      throw new Error(`Machine already started from ${this.currentState}`);
    }

    const existing = this.kernel.store.all("CockpitState")
      .find(s => s.projectId === this.projectId && s.state === "S0_STORED_SAFE");

    if (existing) return existing;

    return this._record("S0_STORED_SAFE", {
      previous: null,
      transition: null
    });
  }

  /** advance: Attempts the next cockpit state. Holds unless the transition is legal and its evidence and role are valid. */
  advance(nextState) {
    if (!COCKPIT_STATES.includes(nextState)) {
      throw new Error(`Unknown cockpit state: ${nextState}`);
    }

    if (this.currentState === "ABORT" || this.currentState === "DIAGNOSIS") {
      throw new Error(`Cannot advance from terminal state ${this.currentState}`);
    }

    const key = `${this.currentState}->${nextState}`;
    if (!TRANSITION_SET.has(key)) {
      throw new Error(`Illegal cockpit transition: ${this.currentState} -> ${nextState}`);
    }

    if (this.currentState === "S0_STORED_SAFE") {
      const configuration = this._configurationCheck();
      if (configuration.status !== "READY") return configuration;
    }
    if (nextState === "S3_SYSTEM_POWER_UP") {
      const ROLES = new Set(["operator", "safety-authority", "pic"]);
      if (!ROLES.has(this.isolationRole)) return hold("Isolation role is not in the registry");
      const ev = this.kernel.store.get(this.isolationEvidenceId);
      if (!ev || ev.type !== "Evidence") return hold("Isolation evidence is not Evidence");
      const VALID = new Set(["EXECUTED", "TESTED", "VERIFIED", "VALIDATED", "RELEASED"]);
      if (!VALID.has(ev.state) || ev.state === "REJECTED") return hold("Isolation evidence state is not valid");
      if (ev.method === "SIMULATION") return hold("Simulation evidence cannot authorize power-up");
      const inProject = this.kernel.store.relations.some(r => r.source === this.projectId && r.relation === "CONTAINS" && r.target === ev.id);
      if (!inProject) return hold("Isolation evidence is not in this project");
      if (this.configurationId && ev.configurationId && ev.configurationId !== this.configurationId) return hold("Isolation evidence is for another configuration");
    }
    if (nextState === "S9_SHUTDOWN") {
      const ROLES = new Set(["operator", "safety-authority", "pic"]);
      if (!ROLES.has(this.shutdownRole)) return hold("Shutdown role is not in the registry");
    }

    const previous = this.currentState;
    const record = this._record(nextState, {
      previous,
      transition: { from: previous, to: nextState },
      configurationId: this.configurationId || "UNSPECIFIED"
    });

    this.currentState = nextState;
    return record;
  }

  /** abort: Moves to a safe state from any operating state. No role is required. */
  abort(reason) {
    if (!reason) {
      return hold("Abort reason is UNSPECIFIED", {
        missing: "reason"
      });
    }

    const previous = this.currentState;

    const record = this._record("ABORT", {
      previous,
      nextState: "SAFE",
      safeState: "S10_SAFE_ISOLATED",
      reason,
      transition: { from: previous, to: "ABORT" }
    });

    this.currentState = "S10_SAFE_ISOLATED";
    return record;
  }

  /** diagnose: Performs diagnose for this module. */
  diagnose() {
    if (this.currentState !== "S10_SAFE_ISOLATED") {
      throw new Error(`Diagnosis requires S10_SAFE_ISOLATED, got ${this.currentState}`);
    }

    const record = this._record("DIAGNOSIS", {
      previous: "S10_SAFE_ISOLATED",
      transition: { from: "S10_SAFE_ISOLATED", to: "DIAGNOSIS" }
    });

    this.currentState = "DIAGNOSIS";
    return record;
  }
}

export default CockpitMachine;
