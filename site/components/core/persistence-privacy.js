/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/persistence-privacy.js
 * FILE PURPOSE: Persistence and privacy. IndexedDB is real in a browser. GitHub is UNAVAILABLE until configured. What leaves my machine lists the real payload. Import is escaped.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Persistence and privacy – Iteration 27
 * Save, sync, and publish are explicit. Nothing leaves without a review.
 */
export function escapeHtml(value) {
  const amp = String.fromCharCode(38) + "amp;";
  const lt = String.fromCharCode(38) + "lt;";
  const gt = String.fromCharCode(38) + "gt;";
  const quot = String.fromCharCode(38) + "quot;";
  const apos = String.fromCharCode(38) + "#39;";
  return String(value ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/\x27/g, apos);
}

export const ALLOWED_IMPORT_TYPES = new Set(["Project","System","Component","Evidence","Standard","Configuration","Hazard","Solid","Sketch"]);

export class ImportTrust {
  /** inspect: Inspects an import. Markup or a disallowed type holds. */
  inspect(data) {
    const text = JSON.stringify(data);
    if (/<\s*script|javascript\s*:|on\w+\s*=|<\s*svg|<\s*animate/i.test(text)) return { outcome: "HOLD", reason: "Import contains active content" };
    if (!data || typeof data !== "object") return { outcome: "HOLD", reason: "Import is not a project object" };
    const entities = data.entities || [];
    const bad = entities.filter(e => e.type && !ALLOWED_IMPORT_TYPES.has(e.type));
    if (bad.length) return { outcome: "HOLD", reason: "Import type is not in the allow-list", types: bad.map(e => e.type) };
    return { outcome: "OK" };
  }
}

const memoryStore = new Map();

export class IndexedDbAdapter {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(name = "pap") { this.name = name; }
  /** save: Performs save for this module. */
  async save(key, value) {
    if (!globalThis.indexedDB) { memoryStore.set(this.name + ":" + key, value); return { outcome: "SAVED", key }; }
    const db = await this._db();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { outcome: "SAVED", key };
  }
  /** load: Performs load for this module. */
  async load(key) {
    if (!globalThis.indexedDB) {
      return memoryStore.has(this.name + ":" + key)
        ? { outcome: "LOADED", value: memoryStore.get(this.name + ":" + key) }
        : { outcome: "HOLD", reason: "Nothing saved" };
    }
    const db = await this._db();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return value === undefined ? { outcome: "HOLD", reason: "Nothing saved" } : { outcome: "LOADED", value };
  }
  /** _db: Performs _db for this module. */
  _db() {
    return new Promise((resolve, reject) => {
      const req = globalThis.indexedDB.open(this.name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export class GitHubAdapter {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor({ token, repo } = {}) { this.token = token; this.repo = repo; }
  /** sync: Performs sync for this module. */
  sync(project) {
    if (!this.token || !this.repo) return { outcome: "HOLD", reason: "GitHub is not configured" };
    if (!project) return { outcome: "HOLD", reason: "Project is UNSPECIFIED" };
    return { outcome: "UNAVAILABLE", reason: "No network call is made from this adapter" };
  }
  /** publish: Publishes an object only as an explicit action. */
  publish(project, { confirmed } = {}) {
    if (!confirmed) return { outcome: "HOLD", reason: "Publish needs an explicit confirmation" };
    return this.sync(project);
  }
}

/** whatLeaves: Persistence and privacy. IndexedDB is real in a browser. GitHub is UNAVAILABLE until configured. What leaves my machine lists the real payload. Import is escaped. */
export function whatLeaves(action, payload) {
  if (action === "save-local") return { leaves: false, fields: [] };
  if (!payload || typeof payload !== "object") return { outcome: "HOLD", reason: "Payload is UNSPECIFIED" };
  const fields = Object.keys(payload);
  if (action === "sync" || action === "publish") return { leaves: true, fields, note: "Computed from the payload" };
  return { outcome: "HOLD", reason: "Unknown action " + action };
}
