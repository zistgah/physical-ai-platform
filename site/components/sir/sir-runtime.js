/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-runtime.js
 * FILE PURPOSE: SIR runtime. Runs a small program with let, fn, if, for, entity, and relation.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * SIR language runtime – Iteration 17
 * Programmable: let, fn, if, for, entity, relation.
 */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("(){};:,=".includes(c)) { tokens.push({ type: c, value: c }); i++; continue; }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"') s += src[j++];
      tokens.push({ type: "string", value: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const kw = ["sir", "entity", "relation"].includes(word);
      tokens.push({ type: kw ? "kw" : "ident", value: word });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i}`);
  }
  tokens.push({ type: "eof", value: null });
  return tokens;
}

/** prepare: SIR runtime. Runs a small program with let, fn, if, for, entity, and relation. */
export function prepare(src) {
  return src
    .replace(/==/g, " EQ ")
    .replace(/>=/g, " GE ")
    .replace(/>/g, " GT ")
    .replace(/</g, " LT ")
    .replace(/\+/g, " PLUS ")
    .replace(/-/g, " MINUS ")
    .replace(/\*/g, " TIMES ")
    .replace(/\//g, " DIV ")
    .replace(/\.\./g, " DOTDOT ");
}

/** runProgram: SIR runtime. Runs a small program with let, fn, if, for, entity, and relation. */
export function runProgram(kernel, projectId, src) {
  const tokens = tokenize(prepare(src));
  let p = 0;
  const peek = () => tokens[p];
  const eat = (value) => {
    const t = tokens[p];
    if (!t || t.value !== value) throw new Error(`Expected ${value}, got ${t?.value}`);
    p++;
    return t;
  };
  const eatType = (type) => {
    const t = tokens[p];
    if (!t || t.type !== type) throw new Error(`Expected ${type}, got ${t?.type}:${t?.value}`);
    p++;
    return t;
  };

  eat("sir");
  const version = eatType("number").value;
  eatType("string");
  eat(";");
  const body = [];
  while (peek()?.type !== "eof") body.push(parseStmt());

  const env = {};
  const fns = {};
  const created = [];
  execBlock(body, env);
  return { outcome: "OK", version, env, created };

  function parseStmt() {
    const v = peek().value;
    if (v === "let") return parseLet();
    if (v === "fn") return parseFn();
    if (v === "if") return parseIf();
    if (v === "for") return parseFor();
    if (v === "entity") return parseEntity();
    if (v === "relation") return parseRel();
    if (v === "return") { eat("return"); const expr = parseExpr(); eat(";"); return { kind: "return", expr }; }
    throw new Error(`Unknown statement ${v}`);
  }
  function parseLet() {
    eat("let");
    const id = eatType("ident").value;
    eat("=");
    const expr = parseExpr();
    eat(";");
    return { kind: "let", id, expr };
  }
  function parseFn() {
    eat("fn");
    const id = eatType("ident").value;
    eat("(");
    const params = [];
    if (peek().value !== ")") {
      params.push(eatType("ident").value);
      while (peek().value === ",") { eat(","); params.push(eatType("ident").value); }
    }
    eat(")");
    eat("{");
    const stmts = [];
    while (peek().value !== "}") stmts.push(parseStmt());
    eat("}");
    return { kind: "fn", id, params, body: stmts };
  }
  function parseIf() {
    eat("if"); eat("("); const test = parseExpr(); eat(")"); eat("{");
    const body = [];
    while (peek().value !== "}") body.push(parseStmt());
    eat("}");
    let elseBody = [];
    if (peek().value === "else") {
      eat("else"); eat("{");
      while (peek().value !== "}") elseBody.push(parseStmt());
      eat("}");
    }
    return { kind: "if", test, body, elseBody };
  }
  function parseFor() {
    eat("for"); eat("("); const id = eatType("ident").value; eat("in");
    const from = parseExpr(); eat("DOTDOT"); const to = parseExpr(); eat(")"); eat("{");
    const body = [];
    while (peek().value !== "}") body.push(parseStmt());
    eat("}");
    return { kind: "for", id, from, to, body };
  }
  function parseEntity() {
    eat("entity");
    const type = eatType("ident").value;
    const id = eatType("ident").value;
    eat("{");
    const fields = {};
    while (peek().value !== "}") {
      const key = eatType("ident").value;
      eat(":");
      fields[key] = eatType("string").value;
      eat(";");
    }
    eat("}");
    return { kind: "entity", type, id, fields };
  }
  function parseRel() {
    eat("relation");
    const source = eatType("ident").value;
    const relation = eatType("ident").value;
    const target = eatType("ident").value;
    eat(";");
    return { kind: "relation", source, relation, target };
  }
  function parseExpr() { return parseCmp(); }
  function parseCmp() {
    let left = parseAdd();
    while (["GT", "LT", "GE", "EQ"].includes(peek().value)) {
      const op = eatType("ident").value;
      left = { kind: "bin", op, left, right: parseAdd() };
    }
    return left;
  }
  function parseAdd() {
    let left = parseMul();
    while (peek().value === "PLUS" || peek().value === "MINUS") {
      const op = eatType("ident").value;
      left = { kind: "bin", op, left, right: parseMul() };
    }
    return left;
  }
  function parseMul() {
    let left = parsePrimary();
    while (peek().value === "TIMES" || peek().value === "DIV") {
      const op = eatType("ident").value;
      left = { kind: "bin", op, left, right: parsePrimary() };
    }
    return left;
  }
  function parsePrimary() {
    const t = peek();
    if (t.type === "number") { p++; return { kind: "num", value: Number(t.value) }; }
    if (t.type === "string") { p++; return { kind: "str", value: t.value }; }
    if (t.type === "ident") {
      const name = t.value;
      p++;
      if (peek().value === "(") {
        eat("(");
        const args = [];
        if (peek().value !== ")") {
          args.push(parseExpr());
          while (peek().value === ",") { eat(","); args.push(parseExpr()); }
        }
        eat(")");
        return { kind: "call", name, args };
      }
      return { kind: "var", name };
    }
    if (t.value === "(") { eat("("); const e = parseExpr(); eat(")"); return e; }
    throw new Error(`Bad expression ${t.value}`);
  }
  function execBlock(stmts, scope) {
    for (const s of stmts) {
      exec(s, scope);
      if (Object.prototype.hasOwnProperty.call(scope, "__ret")) return;
    }
  }
  function exec(s, scope) {
    if (s.kind === "let") scope[s.id] = evalExpr(s.expr, scope);
    else if (s.kind === "fn") fns[s.id] = s;
    else if (s.kind === "if") execBlock(evalExpr(s.test, scope) ? s.body : s.elseBody, Object.create(scope));
    else if (s.kind === "for") {
      for (let i = evalExpr(s.from, scope); i <= evalExpr(s.to, scope); i++) {
        const local = Object.create(scope);
        local[s.id] = i;
        execBlock(s.body, local);
      }
    } else if (s.kind === "return") scope.__ret = evalExpr(s.expr, scope);
    else if (s.kind === "entity") {
      const id = `${s.id}_${created.length}`;
      kernel.upsert({ id, type: s.type, name: s.fields.name || s.id, provenance: { origin: "sir-runtime", derivedFrom: projectId } });
      kernel.link(projectId, "CONTAINS", id);
      scope[s.id] = id;
      created.push(id);
    } else if (s.kind === "relation") {
      kernel.link(scope[s.source] || s.source, s.relation, scope[s.target] || s.target);
    }
  }
  function evalExpr(e, scope) {
    if (e.kind === "num" || e.kind === "str") return e.value;
    if (e.kind === "var") {
      if (!(e.name in scope)) throw new Error(`Unbound ${e.name}`);
      return scope[e.name];
    }
    if (e.kind === "bin") {
      const l = evalExpr(e.left, scope), r = evalExpr(e.right, scope);
      return { PLUS: l + r, MINUS: l - r, TIMES: l * r, DIV: l / r, GT: l > r, LT: l < r, GE: l >= r, EQ: l === r }[e.op];
    }
    if (e.kind === "call") {
      const fn = fns[e.name];
      if (!fn) throw new Error(`Unknown function ${e.name}`);
      const local = Object.create(scope);
      fn.params.forEach((name, i) => { local[name] = evalExpr(e.args[i], scope); });
      execBlock(fn.body, local);
      return local.__ret;
    }
    throw new Error(`Bad expr ${e.kind}`);
  }
}
