/**
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 * Node-only optional worker launcher. Never imported by the browser bundle.
 */
import { spawn } from "node:child_process";

export function createNodeWorkerTransport({ commands = {}, timeoutMs = 60_000, maxStdoutBytes = 10_000_000, maxStderrBytes = 1_000_000, env = {} } = {}) {
  const run = (manifest, request) => new Promise((resolve, reject) => {
    const spec = commands[manifest.id];
    if (!spec || typeof spec.command !== "string" || !spec.command || !Array.isArray(spec.args || []))
      return reject(Object.assign(new Error(`No allowlisted process command configured for ${manifest.id}`), { code: "WORKER_NOT_CONFIGURED" }));
    const child = spawn(spec.command, spec.args || [], {
      shell: false,
      cwd: spec.cwd || undefined,
      env: { PATH: process.env.PATH || "", LANG: "C.UTF-8", ...env, ...(spec.env || {}) },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (err) reject(err); else resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(Object.assign(new Error(`Worker ${manifest.id} timed out after ${timeoutMs} ms`), { code: "WORKER_TIMEOUT" }));
    }, timeoutMs);
    child.stdout.on("data", chunk => {
      stdout = Buffer.concat([stdout, chunk]);
      if (stdout.length > maxStdoutBytes) {
        child.kill("SIGKILL");
        finish(Object.assign(new Error(`Worker ${manifest.id} exceeded stdout limit`), { code: "WORKER_OUTPUT_LIMIT" }));
      }
    });
    child.stderr.on("data", chunk => {
      stderr = Buffer.concat([stderr, chunk]);
      if (stderr.length > maxStderrBytes) {
        child.kill("SIGKILL");
        finish(Object.assign(new Error(`Worker ${manifest.id} exceeded stderr limit`), { code: "WORKER_STDERR_LIMIT" }));
      }
    });
    child.on("error", err => finish(Object.assign(err, { code: "WORKER_SPAWN_FAILED" })));
    child.on("close", code => {
      if (settled) return;
      let parsed;
      try { parsed = JSON.parse(stdout.toString("utf8")); }
      catch {
        return finish(Object.assign(new Error(`Worker ${manifest.id} returned invalid JSON (exit ${code}); stderr: ${stderr.toString("utf8").slice(0,2000)}`), { code: "WORKER_PROTOCOL_ERROR" }));
      }
      if (code !== 0 && parsed.status !== "UNAVAILABLE")
        return finish(Object.assign(new Error(`Worker ${manifest.id} exited ${code}: ${stderr.toString("utf8").slice(0,2000)}`), { code: "WORKER_EXIT_NONZERO" }));
      finish(null, parsed);
    });
    child.stdin.on("error", err => {
      if (err.code !== "EPIPE") finish(Object.assign(err, { code: "WORKER_STDIN_ERROR" }));
    });
    child.stdin.end(JSON.stringify(request));
  });
  return {
    probe: async manifest => commands[manifest.id] ? { available: true } : { available: false, reason: "No allowlisted worker command configured" },
    invoke: run
  };
}
