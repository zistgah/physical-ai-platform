/**
 * Iteration 31 – close partials and BIBO characterization.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { bibo } from "../tests/bibo.mjs";
import { contentAddress, sameIdentity } from "../site/components/core/content-address.js";
import { risk, factor } from "../site/components/manufacturing/sovereignty-risk.js";
import { OperatingMode } from "../site/components/core/operating-mode.js";
import { SiteProtocol } from "../site/components/teleoperation/site-protocol.js";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { Logistics } from "../site/components/manufacturing/logistics.js";
import { EducationViews } from "../site/components/education/role-views.js";
import { domainProfile } from "../site/components/core/acceptance.js";
import { SafetyEngine } from "../site/components/safety/safety-engine.js";
import { runLoop } from "../site/components/simulation/hil-loop.js";

function assert(c, m) { if (!c) throw new Error("FAIL: " + m); }

// Content address: identity changes on one byte, holds on undefined
bibo("contentAddress", {
  below: { fn: () => contentAddress(undefined), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => contentAddress(null), expect: (r) => r.outcome === "OK" && r.id.startsWith("sha256:") },
  within: { fn: () => sameIdentity({ a: 1 }, { a: 1 }), expect: (r) => r.outcome === "SAME" },
  above: { fn: () => sameIdentity({ a: 1 }, { a: 2 }), expect: (r) => r.outcome === "DIFFERENT" }
});

// Risk is non-linear (product). Sweep the corners and the boundary values 0, 1, 2.
bibo("risk", {
  below: { fn: () => risk(-1, 1, 1), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => risk(0, 2, 2), expect: (r) => r.outcome === "OK" && r.risk === 0 && r.fiveYear === "SURVIVES" },
  within: { fn: () => risk(1, 1, 1), expect: (r) => r.outcome === "OK" && r.risk === 1 && r.fiveYear === "DEGRADED" },
  above: { fn: () => risk(3, 1, 1), expect: (r) => r.outcome === "HOLD" },
  sweep: [0, 1, 2].flatMap(c => [0, 1, 2].flatMap(i => [0, 1, 2].map(e => ({
    fn: () => risk(c, i, e),
    expect: (r) => r.outcome === "OK" && r.risk === c * i * e
  }))))
});

// Operating mode boundary
bibo("operatingMode", {
  below: { fn: () => new OperatingMode().set("normal"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => new OperatingMode().set("RESILIENCE"), expect: (r) => r.outcome === "OK" },
  within: { fn: () => { const m = new OperatingMode(); m.set("RESILIENCE"); return m.select({ id: "a" }, [{ id: "b", local: true }]); }, expect: (r) => r.outcome === "OK" && r.choice.id === "b" },
  above: { fn: () => { const m = new OperatingMode(); m.set("RESILIENCE"); return m.select({ id: "a" }, [{ id: "b", local: false }]); }, expect: (r) => r.outcome === "HOLD" }
});

// Site protocol boundaries
bibo("siteProtocol", {
  below: { fn: () => new SiteProtocol().locale("hi-IN"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => new SiteProtocol().locale("hi"), expect: (r) => r.outcome === "OK" && r.distinct === true },
  within: { fn: () => { const s = new SiteProtocol(); s.zone("cam", { private: true }); return s.record("cam", true); }, expect: (r) => r.outcome === "OK" },
  above: { fn: () => { const s = new SiteProtocol(); s.zone("cam", { private: true }); return s.record("cam", false); }, expect: (r) => r.outcome === "HOLD" }
});
assert(new SiteProtocol().jurisdiction(false).outcome === "NO-GO", "Unknown jurisdiction is NO-GO");
assert(new SiteProtocol().sterile("POWER_UP", true).outcome === "HOLD", "Sterile cockpit holds chatter");

// Logistics boundaries
const kernel = createKernel();
const project = kernel.upsert({ id: "p31", type: "Project", name: "P", provenance: { origin: "iter31" } });
const logistics = new Logistics(kernel);
bibo("logistics", {
  below: { fn: () => logistics.classify(project.id, { id: "x", name: "x", klass: "UNKNOWN" }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => logistics.classify(project.id, { id: "bat", name: "pack", klass: "BATTERY" }), expect: (r) => r.outcome === "OK" },
  within: { fn: () => logistics.classify(project.id, { id: "hz", name: "solvent", klass: "HAZMAT", unNumber: "UN1263" }), expect: (r) => r.outcome === "OK" },
  above: { fn: () => logistics.classify(project.id, { id: "bad", name: "bad", klass: "HAZMAT" }), expect: (r) => r.outcome === "HOLD" }
});

// Education views
kernel.upsert({ id: "les", type: "Lesson", name: "L", status: "DONE", provenance: { origin: "iter31" } });
kernel.link(project.id, "CONTAINS", "les");
const views = new EducationViews(kernel);
bibo("educationViews", {
  below: { fn: () => views.view(project.id, "stranger"), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => views.view(project.id, "parent"), expect: (r) => r.outcome === "OK" && r.role === "parent" },
  within: { fn: () => views.view(project.id, "teacher"), expect: (r) => r.outcome === "OK" && Array.isArray(r.gaps) },
  above: { fn: () => views.view(project.id, "admin"), expect: (r) => r.outcome === "OK" && r.role === "admin" }
});

// Domain profile boundary
bibo("domainProfile", {
  below: { fn: () => domainProfile({ domain: "SPACE", embodiment: "WHEELED" }), expect: (r) => r.outcome === "HOLD" },
  on: { fn: () => domainProfile({ domain: "TERRESTRIAL", embodiment: "WHEELED" }), expect: (r) => r.outcome === "OK" },
  within: { fn: () => domainProfile({ domain: "AERIAL", embodiment: "FIXED" }), expect: (r) => r.outcome === "OK" },
  above: { fn: () => domainProfile({ domain: "TERRESTRIAL", embodiment: "HOVER" }), expect: (r) => r.outcome === "HOLD" }
});

// Safety readiness boundaries
kernel.upsert({ id: "hz1", type: "Hazard", name: "pinch", status: "CONTROLLED", provenance: { origin: "iter31" } });
kernel.link(project.id, "CONTAINS", "hz1");
const safety = new SafetyEngine(kernel);
bibo("safetyReadiness", {
  below: { fn: () => safety.evaluateReadiness(project.id), expect: (r) => r.decision === "HOLD" },
  on: { fn: () => { kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", fingerprint: "fp", provenance: { origin: "iter31" } }); kernel.link(project.id, "CONTAINS", "cfg"); return safety.evaluateReadiness(project.id); }, expect: (r) => r.decision === "GO" },
  within: { fn: () => safety.evaluateReadiness(project.id), expect: (r) => r.decision === "GO" },
  above: { fn: () => { kernel.upsert({ id: "hz2", type: "Hazard", name: "open", status: "OPEN", provenance: { origin: "iter31" } }); kernel.link(project.id, "CONTAINS", "hz2"); return safety.evaluateReadiness(project.id); }, expect: (r) => r.decision === "NO-GO" }
});

// HIL method boundary
bibo("hilMethod", {
  below: { fn: () => runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 1, dt: 0.1, device: { bound: false } }), expect: (r) => r.method === "UNAVAILABLE" },
  on: { fn: () => runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 1, dt: 0.1, device: { bound: true } }), expect: (r) => r.method === "SIMULATION" },
  within: { fn: () => runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 1, dt: 0.1, device: { bound: true, transport: "bench" } }), expect: (r) => r.outcome === "HOLD" },
  above: { fn: () => runLoop({ plant: { x0: 0, step: (x) => x }, controller: () => 0, steps: 1, dt: 0.1, device: { bound: true, transport: "" } }), expect: (r) => r.method === "SIMULATION" }
});

console.log("\n=== ALL ITERATION 31 TESTS PASSED ===");
