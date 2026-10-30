/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/configuration-engine.js
 * FILE PURPOSE: Configuration engine. Creates, freezes, and fingerprints a configuration. An unfrozen configuration cannot authorize.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Configuration Management – Iteration 03
 * Configurations capture exact canonical object versions.
 * Fingerprints are deterministic. Baselines are immutable once frozen.
 */

export class ConfigurationEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** createConfiguration: Performs create configuration for this module. */
  createConfiguration(projectId, meta = {}) {
    const graph = this.kernel.getProjectGraph(projectId);
    const items = graph.entities
      .filter(e => ["Component", "System", "Port", "Connection", "Requirement", "Configuration"].includes(e.type))
      .map(e => ({ id: e.id, type: e.type, version: e.version || "1.0.0", name: e.name }));

    const id = meta.id || `cfg_${Date.now().toString(36)}`;
    const cfg = this.kernel.upsert({
      id,
      type: "Configuration",
      name: meta.name || "Configuration",
      projectId,
      items,
      status: "DRAFT",
      kind: meta.kind || "Design",
      provenance: { origin: "configuration", derivedFrom: projectId, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return cfg;
  }

  /** freezeConfiguration: Performs freeze configuration for this module. */
  freezeConfiguration(configId) {
    const cfg = this.kernel.store.get(configId);
    if (!cfg || cfg.type !== "Configuration") throw new Error("Not a configuration");
    if (cfg.status === "FROZEN") throw new Error("Already frozen");
    const fp = this.fingerprintConfiguration(configId);
    return this.kernel.upsert({
      ...cfg,
      status: "FROZEN",
      fingerprint: fp,
      frozenAt: this.kernel._now()
    });
  }

  /** fingerprintConfiguration: Performs fingerprint configuration for this module. */
  fingerprintConfiguration(configId) {
    const cfg = this.kernel.store.get(configId);
    if (!cfg) throw new Error("Configuration not found");
    // Deterministic: sort items by id, include id+type+version
    const sorted = [...(cfg.items || [])].sort((a, b) => a.id.localeCompare(b.id));
    const payload = sorted.map(i => `${i.id}|${i.type}|${i.version}`).join("\n");
    // Simple deterministic hash (not cryptographic; sufficient for semantic identity)
    let h = 0;
    for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
    return `cfgfp_${Math.abs(h).toString(16)}`;
  }

  /** compareConfigurations: Performs compare configurations for this module. */
  compareConfigurations(aId, bId) {
    const a = this.kernel.store.get(aId);
    const b = this.kernel.store.get(bId);
    if (!a || !b) throw new Error("Configurations missing");
    const mapA = new Map((a.items || []).map(i => [i.id, i]));
    const mapB = new Map((b.items || []).map(i => [i.id, i]));
    const changed = [];
    const added = [];
    const removed = [];
    for (const [id, item] of mapA) {
      const other = mapB.get(id);
      if (!other) removed.push(item);
      else if (other.version !== item.version) changed.push({ id, from: item.version, to: other.version, type: item.type });
    }
    for (const [id, item] of mapB) {
      if (!mapA.has(id)) added.push(item);
    }
    return {
      identical: changed.length === 0 && added.length === 0 && removed.length === 0,
      fingerprintA: this.fingerprintConfiguration(aId),
      fingerprintB: this.fingerprintConfiguration(bId),
      changed, added, removed
    };
  }

  /** isConfigurationCompatible: Performs is configuration compatible for this module. */
  isConfigurationCompatible(aId, bId) {
    const cmp = this.compareConfigurations(aId, bId);
    // Compatible if no interface/port/connection version changes (simplified)
    const breaking = cmp.changed.filter(c => ["Port", "Connection", "Interface"].includes(c.type));
    return { compatible: breaking.length === 0, breaking, comparison: cmp };
  }

  /** createBaseline: Performs create baseline for this module. */
  createBaseline(projectId, kind = "Design", fromConfigId) {
    const id = `bl_${kind.toLowerCase()}_${Date.now().toString(36)}`;
    const bl = this.kernel.upsert({
      id,
      type: "Baseline",
      name: `${kind} Baseline`,
      kind,
      projectId,
      configurationId: fromConfigId,
      status: "FROZEN",
      frozenAt: this.kernel._now(),
      provenance: { origin: "baseline", derivedFrom: fromConfigId, timestamp: this.kernel._now() }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    if (fromConfigId) this.kernel.link(id, "DERIVED_FROM", fromConfigId);
    return bl;
  }
}
