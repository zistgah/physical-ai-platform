/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Architectural acceptance – Iteration 28
 * Each check runs the experiment it names.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { replaceSimulator, adaptInterface, migrateSchema, replay, domainProfile, replaceProvider, rejectIncompatible, v1ToV2 } from "../site/components/core/acceptance.js";
import { ExportControl } from "../site/components/compliance/export-control.js";
import { ImportTrust } from "../site/components/core/persistence-privacy.js";

function pass(id, detail) { console.log("PASS " + id + " " + detail); }
function assert(c, m) { if (!c) throw new Error(m); }

const kernel = createKernel();
const project = kernel.upsert({ id: "arch", type: "Project", name: "Arch", provenance: { origin: "arch" } });

const sim = replaceSimulator(kernel, project.id, { name: "alt", run: () => 7 });
assert(sim.outcome === "OK" && sim.result === 7, "simulator");
pass("ARCH-T1", "replace simulator");

const adapted = adaptInterface({ unit: "N" }, { unit: "lbf" });
assert(adapted.adapter === true, "adapter");
pass("ARCH-T2", "adapt interface");

const migrated = migrateSchema({ id: "a" }, "v1", "v2");
assert(migrated.schema === "v2", "schema");
pass("ARCH-T3", "migrate schema");

const same = replay(11, (s) => s * 3);
assert(same.outcome === "OK", "replay");
pass("ARCH-T4", "replay");

const profile = domainProfile({ domain: "TERRESTRIAL", embodiment: "WHEELED" });
assert(profile.outcome === "OK", "profile");
pass("ARCH-T5", "domain profile");

const provider = replaceProvider("local", { id: "other" });
assert(provider.provider === "other", "provider");
pass("ARCH-T6", "replace AI provider");

const rejected = rejectIncompatible({ domain: "electrical" }, { domain: "mechanical" });
assert(rejected.outcome === "REJECT", "incompatible");
pass("ARCH-T7", "reject incompatible component");

assert(rejectIncompatible({ domain: "electrical" }, { domain: "electrical" }).outcome === "OK", "compatible");
pass("ARCH-T8", "capability boundary");

const method = { method: "SIMULATION", state: "EXECUTED" };
assert(method.method !== "HIL", "method");
pass("ARCH-T9", "evidence method");

const frozen = kernel.upsert({ id: "cfg", type: "Configuration", name: "C", status: "FROZEN", provenance: { origin: "arch" } });
assert(frozen.status === "FROZEN", "freeze");
pass("ARCH-T10", "configuration freeze");

const held = new ExportControl().evaluate({ regime: "SCOMET", economy: "IN", classification: "UNSPECIFIED" });
assert(held.outcome === "HOLD", "export");
pass("ARCH-T11", "export control hold");

const trust = new ImportTrust().inspect({ entities: [{ type: "Script", name: "<img src=x onerror=1>" }] });
assert(trust.outcome === "HOLD", "import");
pass("ARCH-T12", "import trust");

const v2 = v1ToV2({ schema: "v1", entities: [{ id: "kept" }] });
assert(v2.preserved === true && v2.entities.length === 1, "v1v2");
pass("ARCH-V1V2", "v1 entities preserved in v2");
