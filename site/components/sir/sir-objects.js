/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-objects.js
 * FILE PURPOSE: Object-oriented SIR execution. A program is an object. A statement is an object. Reduction is the execution. Loops and conditionals are statements. The human surface is unchanged.
 * MRD 4: SIR.
 *
 *   this is a program named "demo"
 *   let n be 3
 *   if n is greater than 0
 *   repeat 3 times
 *   a Component called part named "Part"
 */
import { run } from "./sir-language.js";

class Statement {
  constructor(kind) { this.kind = kind; }
  reduce(env) { return env; }
}

class Let extends Statement {
  constructor(id, value) { super("let"); this.id = id; this.value = value; }
  reduce(env) { env[this.id] = this.value; return env; }
}

class If extends Statement {
  constructor(test, body) { super("if"); this.test = test; this.body = body; }
  reduce(env) {
    if (env[this.test] ) for (const s of this.body) s.reduce(env);
    return env;
  }
}

class Repeat extends Statement {
  constructor(times, body) { super("repeat"); this.times = times; this.body = body; }
  reduce(env) {
    const n = Number(this.times);
    if (!Number.isFinite(n) || n < 0) { env.__hold = "Repeat count is not a number"; return env; }
    if (n > 1000) { env.__hold = "Repeat is above the bound"; return env; }
    const prev = env.__i;
    for (let i = 0; i < n; i++) { env.__i = i; for (const s of this.body) s.reduce(env); }
    env.__i = prev;
    return env;
  }
}

class Entity extends Statement {
  constructor(type, id, name) { super("entity"); this.type = type; this.id = id; this.name = name; }
  reduce(env) {
    const id = env.__i == null ? this.id : this.id + "_" + env.__i;
    env.__created.push({ type: this.type, id, name: this.name });
    return env;
  }
}

export class Program {
  constructor(name) { this.name = name; this.statements = []; }
  add(stmt) { this.statements.push(stmt); return this; }
  reduce() {
    const env = { __created: [] };
    for (const s of this.statements) {
      s.reduce(env);
      if (env.__hold) return { outcome: "HOLD", reason: env.__hold };
    }
    return { outcome: "OK", name: this.name, env, created: env.__created };
  }
}

export function parseObjects(text) {
  if (typeof text !== "string" || !text.trim()) return { outcome: "HOLD", reason: "Source is empty" };
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (!lines.length) return { outcome: "HOLD", reason: "No lines" };
  const head = lines[0].match(/^this is a program named "([^"]+)"$/);
  if (!head) return { outcome: "HOLD", reason: "Program is not named" };
  const program = new Program(head[1]);
  const stack = [program.statements];
  for (const line of lines.slice(1)) {
    let m = line.match(/^let ([A-Za-z_][A-Za-z0-9_]*) be (-?\d+(?:\.\d+)?)$/);
    if (m) { stack[stack.length - 1].push(new Let(m[1], Number(m[2]))); continue; }
    m = line.match(/^if ([A-Za-z_][A-Za-z0-9_]*) is greater than (-?\d+(?:\.\d+)?)$/);
    if (m) {
      const body = [];
      stack[stack.length - 1].push(new If(m[1], body));
      stack.push(body);
      continue;
    }
    if (line === "end") { if (stack.length === 1) return { outcome: "HOLD", reason: "end without a block" }; stack.pop(); continue; }
    m = line.match(/^repeat (\d+) times$/);
    if (m) {
      const body = [];
      stack[stack.length - 1].push(new Repeat(Number(m[1]), body));
      stack.push(body);
      continue;
    }
    m = line.match(/^a ([A-Za-z]+) called ([A-Za-z0-9_]+) named "([^"]+)"$/);
    if (m) { stack[stack.length - 1].push(new Entity(m[1], m[2], m[3])); continue; }
    return { outcome: "HOLD", reason: "Not a sentence: " + line };
  }
  if (stack.length !== 1) return { outcome: "HOLD", reason: "Block is not closed" };
  return { outcome: "OK", program };
}

export function runObjects(kernel, projectId, text) {
  const parsed = parseObjects(text);
  if (parsed.outcome === "HOLD") return parsed;
  const reduced = parsed.program.reduce();
  if (reduced.outcome === "HOLD") return reduced;
  // reduce to the existing language so the kernel stays the semantics
  const lines = [`sir 1 "${reduced.name}";`];
  for (const e of reduced.created) lines.push(`entity ${e.type} ${e.id} { name: "${e.name}"; };`);
  return run(kernel, projectId, lines.join("\n"));
}
