/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-language.js
 * FILE PURPOSE: SIR as a language you can program in. Parse, type-check, and run. The result is entities and relations in the canonical graph. The text is replaceable. The graph is the semantics.
 * MRD 4: SIR IR and Robot ABI. MRD 2: semantics independent of implementation.
 */
import { CANONICAL_ENTITY_TYPES, RELATION_DEFINITIONS } from "../core/canonical-kernel.js";
const TYPES = new Set(CANONICAL_ENTITY_TYPES);

export function tokenize(src) {
  if (typeof src !== "string" || !src.trim()) return { outcome: "HOLD", reason: "Source is empty" };
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if ("(){};:,=".includes(c)) { tokens.push({ type: c, value: c }); i++; continue; }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"') s += src[j++];
      if (j >= src.length) return { outcome: "HOLD", reason: "Unclosed string" };
      tokens.push({ type: "string", value: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "ident", value: src.slice(i, j) });
      i = j;
      continue;
    }
    return { outcome: "HOLD", reason: "Unexpected character " + c };
  }
  tokens.push({ type: "eof", value: "eof" });
  return { outcome: "OK", tokens };
}

export function parse(tokens) {
  if (!tokens?.length) return { outcome: "HOLD", reason: "No tokens" };
  let p = 0;
  const peek = () => tokens[p];
  const eat = (value) => {
    const t = tokens[p];
    if (!t || t.value !== value) return null;
    p++;
    return t;
  };
  if (!eat("sir")) return { outcome: "HOLD", reason: "Program must start with sir" };
  const version = peek();
  if (version?.type !== "number") return { outcome: "HOLD", reason: "Version is missing" };
  p++;
  if (peek()?.type !== "string") return { outcome: "HOLD", reason: "Name is missing" };
  const name = tokens[p++].value;
  if (!eat(";")) return { outcome: "HOLD", reason: "Expected ; after header" };
  const body = [];
  while (peek()?.type !== "eof") {
    const stmt = parseStmt();
    if (stmt.outcome === "HOLD") return stmt;
    body.push(stmt);
  }
  return { outcome: "OK", version: version.value, name, body };

  function parseStmt() {
    const v = peek()?.value;
    if (v === "entity") return parseEntity();
    if (v === "relation") return parseRel();
    if (v === "let") return parseLet();
    if (v === "require") return parseRequire();
    return { outcome: "HOLD", reason: "Unknown statement " + v };
  }
  function parseEntity() {
    eat("entity");
    const type = peek();
    if (type?.type !== "ident") return { outcome: "HOLD", reason: "Entity type missing" };
    p++;
    const id = peek();
    if (id?.type !== "ident") return { outcome: "HOLD", reason: "Entity id missing" };
    p++;
    if (!eat("{")) return { outcome: "HOLD", reason: "Expected {" };
    const fields = {};
    while (peek()?.value !== "}" && peek()?.type !== "eof") {
      const key = peek();
      if (key?.type !== "ident") return { outcome: "HOLD", reason: "Field name missing" };
      p++;
      if (!eat(":")) return { outcome: "HOLD", reason: "Expected :" };
      const val = peek();
      if (val?.type !== "string" && val?.type !== "number") return { outcome: "HOLD", reason: "Field value missing" };
      p++;
      if (!eat(";")) return { outcome: "HOLD", reason: "Expected ; after field" };
      fields[key.value] = val.type === "number" ? Number(val.value) : val.value;
    }
    if (!eat("}")) return { outcome: "HOLD", reason: "Unclosed entity" };
    if (peek()?.value === ";") eat(";");
    return { kind: "entity", type: type.value, id: id.value, fields };
  }
  function parseRel() {
    eat("relation");
    const source = peek();
    if (source?.type !== "ident") return { outcome: "HOLD", reason: "Relation source missing" };
    p++;
    const relation = peek();
    if (relation?.type !== "ident") return { outcome: "HOLD", reason: "Relation name missing" };
    p++;
    const target = peek();
    if (target?.type !== "ident") return { outcome: "HOLD", reason: "Relation target missing" };
    p++;
    if (!eat(";")) return { outcome: "HOLD", reason: "Expected ; after relation" };
    return { kind: "relation", source: source.value, relation: relation.value, target: target.value };
  }
  function parseLet() {
    eat("let");
    const id = peek();
    if (id?.type !== "ident") return { outcome: "HOLD", reason: "let name missing" };
    p++;
    if (!eat("=")) return { outcome: "HOLD", reason: "Expected =" };
    const val = peek();
    if (val?.type !== "number" && val?.type !== "string") return { outcome: "HOLD", reason: "let value missing" };
    p++;
    if (!eat(";")) return { outcome: "HOLD", reason: "Expected ; after let" };
    return { kind: "let", id: id.value, value: val.type === "number" ? Number(val.value) : val.value };
  }
  function parseRequire() {
    eat("require");
    if (!eat("evidence")) return { outcome: "HOLD", reason: "require needs evidence" };
    const id = peek();
    if (id?.type !== "ident") return { outcome: "HOLD", reason: "evidence id missing" };
    p++;
    if (!eat(";")) return { outcome: "HOLD", reason: "Expected ; after require" };
    return { kind: "require", id: id.value };
  }
}

export function check(ast) {
  if (ast.outcome === "HOLD") return ast;
  const ids = new Set();
  for (const stmt of ast.body) {
    if (stmt.kind === "entity") {
      if (!TYPES.has(stmt.type)) return { outcome: "HOLD", reason: "Type " + stmt.type + " is not canonical" };
      if (ids.has(stmt.id)) return { outcome: "HOLD", reason: "Duplicate id " + stmt.id };
      ids.add(stmt.id);
    }
    if (stmt.kind === "relation") {
      const def = RELATION_DEFINITIONS[stmt.relation];
      if (!def) return { outcome: "HOLD", reason: "Relation " + stmt.relation + " is not typed" };
      if (!ids.has(stmt.source) || !ids.has(stmt.target)) return { outcome: "HOLD", reason: "Relation endpoint is not declared" };
    }
    if (stmt.kind === "require" && !ids.has(stmt.id)) return { outcome: "HOLD", reason: "Required evidence is not declared" };
  }
  return { outcome: "OK", ids: [...ids] };
}

export function run(kernel, projectId, src) {
  const tokens = tokenize(src);
  if (tokens.outcome === "HOLD") return tokens;
  const ast = parse(tokens.tokens);
  if (ast.outcome === "HOLD") return ast;
  const checked = check(ast);
  if (checked.outcome === "HOLD") return checked;
  const env = {};
  const created = [];
  for (const stmt of ast.body) {
    if (stmt.kind === "let") env[stmt.id] = stmt.value;
    if (stmt.kind === "entity") {
      const entity = kernel.upsert({
        id: stmt.id, type: stmt.type, name: stmt.fields.name || stmt.id, ...stmt.fields,
        provenance: { origin: "sir-language", derivedFrom: projectId }
      });
      kernel.link(projectId, "CONTAINS", entity.id);
      created.push(entity.id);
    }
    if (stmt.kind === "relation") {
      try { kernel.link(stmt.source, stmt.relation, stmt.target); }
      catch (e) { return { outcome: "HOLD", reason: e.message }; }
    }
    if (stmt.kind === "require") {
      const ev = kernel.store.get(stmt.id);
      if (!ev || ev.type !== "Evidence") return { outcome: "HOLD", reason: "Required evidence is not Evidence" };
    }
  }
  return { outcome: "OK", version: ast.version, name: ast.name, env, created };
}
