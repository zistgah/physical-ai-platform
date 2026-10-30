/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/sir/sir-lang.js
 * FILE PURPOSE: SIR language draft. Tokenizer, parser, and compiler to the interchange document. Not a general-purpose language.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * SIR language – first draft (Iteration 10)
 * A small domain language that compiles to the PAI-SIR interchange document.
 * Not a general-purpose language. Not a full compiler.
 *
 * Grammar:
 *   program     := 'sir' version string ';' statement*
 *   statement   := project | entity | relation | require
 *   project     := 'project' id '{' field* '}'
 *   entity      := 'entity' type id '{' field* '}'
 *   relation    := 'relation' id RELATION id ';'
 *   require     := 'require' 'evidence' id '{' field* '}'
 *   field       := id ':' value ';'
 *   value       := string | ident | '[' ident (',' ident)* ']'
 */

const KEYWORDS = new Set(["sir", "project", "entity", "relation", "require", "evidence"]);

/** tokenize: SIR language draft. Tokenizer, parser, and compiler to the interchange document. Not a general-purpose language. */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  const push = (type, value) => tokens.push({ type, value });
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if ("{};:,".includes(c)) { push(c, c); i++; continue; }
    if (c === "[") { push("[", "["); i++; continue; }
    if (c === "]") { push("]", "]"); i++; continue; }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"') { s += src[j]; j++; }
      if (src[j] !== '"') throw new Error("Unterminated string");
      push("string", s); i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_\-]/.test(src[j])) j++;
      const word = src.slice(i, j);
      push(KEYWORDS.has(word) ? "kw" : "ident", word);
      i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      push("number", src.slice(i, j));
      i = j; continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i}`);
  }
  push("eof", null);
  return tokens;
}

/** parse: SIR language draft. Tokenizer, parser, and compiler to the interchange document. Not a general-purpose language. */
export function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const eat = (type, value) => {
    const t = tokens[p];
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Expected ${value || type}, got ${t.type}:${t.value}`);
    }
    p++;
    return t;
  };
  const fields = () => {
    const out = {};
    eat("{");
    while (peek().value !== "}") {
      const key = eat("ident").value;
      eat(":");
      let val;
      if (peek().type === "string") val = eat("string").value;
      else if (peek().type === "[") {
        eat("[");
        val = [];
        if (peek().type !== "]") {
          val.push(eat("ident").value);
          while (peek().value === ",") { eat(","); val.push(eat("ident").value); }
        }
        eat("]");
      } else val = eat("ident").value;
      eat(";");
      out[key] = val;
    }
    eat("}");
    return out;
  };

  eat("kw", "sir");
  const version = eat("number").value;
  const title = eat("string").value;
  eat(";");
  const ast = { kind: "Program", version, title, projects: [], entities: [], relations: [], requirements: [] };
  while (peek().type !== "eof") {
    const kw = eat("kw").value;
    if (kw === "project") {
      const id = eat("ident").value;
      ast.projects.push({ id, fields: fields() });
    } else if (kw === "entity") {
      const type = eat("ident").value;
      const id = eat("ident").value;
      ast.entities.push({ type, id, fields: fields() });
    } else if (kw === "relation") {
      const source = eat("ident").value;
      const relation = eat("ident").value;
      const target = eat("ident").value;
      eat(";");
      ast.relations.push({ source, relation, target });
    } else if (kw === "require") {
      eat("kw", "evidence");
      const id = eat("ident").value;
      ast.requirements.push({ id, fields: fields() });
    } else throw new Error(`Unknown statement ${kw}`);
  }
  return ast;
}

/** compile: SIR language draft. Tokenizer, parser, and compiler to the interchange document. Not a general-purpose language. */
export function compile(ast) {
  if (!ast.projects.length) throw new Error("SIR program requires a project");
  const project = ast.projects[0];
  const entities = [
    { id: project.id, type: "Project", name: project.fields.name || project.id, provenance: { origin: "sir-lang" } },
    ...ast.entities.map(e => ({
      id: e.id,
      type: e.type,
      name: e.fields.name || e.id,
      status: e.fields.status || null,
      method: e.fields.method || null,
      capabilities: e.fields.capabilities || null,
      provenance: { origin: "sir-lang", derivedFrom: project.id }
    }))
  ];
  const ids = new Set(entities.map(e => e.id));
  const relations = ast.relations.map(r => {
    if (!ids.has(r.source)) throw new Error(`Dangling source ${r.source}`);
    if (!ids.has(r.target)) throw new Error(`Dangling target ${r.target}`);
    return r;
  });
  // Evidence requirements become constraints, not invented evidence
  const constraints = ast.requirements.map(req => {
    if (!ids.has(req.id)) throw new Error(`Evidence requirement on unknown entity ${req.id}`);
    return { subject: req.id, method: req.fields.method || null, state: req.fields.state || null, configuration: req.fields.configuration || null };
  });
  return {
    magic: "PAI-SIR",
    version: ast.version,
    header: { projectId: project.id, name: project.fields.name || ast.title, kind: "sir", source: "sir-lang/0.1" },
    identity: { id: project.id, name: project.fields.name || ast.title },
    graph: { entities, relations },
    constraints,
    compiler: "sir-lang/0.1.0-iter10"
  };
}

/** compileSource: SIR language draft. Tokenizer, parser, and compiler to the interchange document. Not a general-purpose language. */
export function compileSource(src) {
  return compile(parse(tokenize(src)));
}
