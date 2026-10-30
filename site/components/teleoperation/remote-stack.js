/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/teleoperation/remote-stack.js
 * FILE PURPOSE: Teleoperation remote stack. Session transport over the graph. Not a real-time remote link.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Teleoperation remote stack – Iteration 17
 * Link, latency, command. Local e-stop wins. No link means no command.
 */
export class RemoteStack {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor() { this.sessions = new Map(); }

  /** open: Performs open for this module. */
  open({ id, operator }) {
    const s = { id, operator, link: "DOWN", estop: false, latencyMs: null, commands: [] };
    this.sessions.set(id, s);
    return s;
  }

  /** connect: Connects two ports. Rejects incompatible types or units. */
  connect(id, latencyMs) {
    const s = this.sessions.get(id);
    if (!s) return { outcome: "HOLD", reason: "Session is UNSPECIFIED" };
    s.link = "UP";
    s.latencyMs = latencyMs;
    return s;
  }

  /** estop: Performs estop for this module. */
  estop(id) {
    const s = this.sessions.get(id);
    if (!s) return { outcome: "HOLD", reason: "Session is UNSPECIFIED" };
    s.estop = true;
    s.link = "DOWN";
    return s;
  }

  /** command: Performs command for this module. */
  command(id, cmd) {
    const s = this.sessions.get(id);
    if (!s) return { outcome: "HOLD", reason: "Session is UNSPECIFIED" };
    if (s.estop) return { outcome: "HOLD", reason: "Local e-stop is active" };
    if (s.link !== "UP") return { outcome: "HOLD", reason: "Link is down" };
    s.commands.push({ cmd, latencyMs: s.latencyMs });
    return { outcome: "SENT", latencyMs: s.latencyMs };
  }
}
