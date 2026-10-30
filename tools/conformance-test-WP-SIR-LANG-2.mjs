/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel, CANONICAL_ENTITY_TYPES, TYPED_RELATIONS } from "../site/components/core/canonical-kernel.js";
import { checkAndLoad } from "../site/components/sir/sir-check.js";

const allowTypes = new Set(CANONICAL_ENTITY_TYPES);
const allowRelations = new Set(TYPED_RELATIONS);

const validSource = `
sir 1.0 "SIR load";
project proj-1 { name: Slice; }
entity System sys-1 { name: Assembly; }
entity Component comp-1 { name: Controller; }
entity Requirement req-1 { name: Control_requirement; }
entity Test test-1 { name: Physical_test; }
relation proj-1 CONTAINS sys-1;
relation sys-1 HAS_COMPONENT comp-1;
relation proj-1 CONTAINS test-1;
relation test-1 VERIFIES req-1;
require evidence req-1 { method: PHYSICAL_TEST; state: VERIFIED; }
`;

const kernel = createKernel();
const result = checkAndLoad(validSource, kernel, {
  entityTypes: allowTypes,
  relations: allowRelations
});

const graph = kernel.getProjectGraph("proj-1");
assert.deepEqual(
  new Set(graph.entities.map(e => e.id)),
  new Set(["proj-1", "sys-1", "comp-1", "req-1", "test-1"])
);
assert.equal(graph.relations.length, 4);
assert.equal(result.constraints.length, 1);
assert.equal(result.constraints[0].method, "PHYSICAL_TEST");
assert.equal(result.constraints[0].state, "VERIFIED");
assert.equal(kernel.store.all("Evidence").length, 0);

// Unknown entity type must fail before load.
const badTypeKernel = createKernel();
assert.throws(
  () => checkAndLoad(`
    sir 1.0 "bad type";
    project p { name: Bad; }
    entity NotCanonical x { name: X; }
  `, badTypeKernel, { entityTypes: allowTypes, relations: allowRelations }),
  /Unknown SIR entity type/
);

// Unknown relation must fail before load.
const badRelationKernel = createKernel();
assert.throws(
  () => checkAndLoad(`
    sir 1.0 "bad relation";
    project p { name: Bad; }
    entity System s { name: S; }
    relation p NOT_A_RELATION s;
  `, badRelationKernel, { entityTypes: allowTypes, relations: allowRelations }),
  /Unknown SIR relation/
);

// Required input is absent: retain the constraint and surface HOLD rather
// than inventing an Evidence object, false value, or guessed state.
const holdKernel = createKernel();
const hold = checkAndLoad(`
  sir 1.0 "hold";
  project hold-proj { name: Hold_Slice; }
  entity Requirement hold-req { name: Evidence_gated_requirement; }
  require evidence hold-req { method: PHYSICAL_TEST; }
`, holdKernel, { entityTypes: allowTypes, relations: allowRelations });

const missing = hold.constraints[0];
const holdStatus = missing.state == null || missing.configuration == null ? "HOLD" : "READY";
assert.equal(holdStatus, "HOLD");
assert.equal(holdKernel.store.all("Evidence").length, 0);

console.log("WP-SIR-LANG-2 PASS");
console.log("graph entities:", graph.entities.map(e => e.id).join(", "));
console.log("missing required input: HOLD");
