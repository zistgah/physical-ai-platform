/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import assert from "node:assert/strict";
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { ProductStructure } from "../site/components/manufacturing/product-structure.js";

function provenance(kernel, origin, derivedFrom = null) {
  return { origin, derivedFrom, timestamp: kernel._now() };
}

function runConformance() {
  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-mfg-structure",
    type: "Project",
    name: "Manufacturing Product Structure Conformance",
    provenance: provenance(kernel, "package")
  });

  const component = kernel.upsert({
    id: "cmp-drive-bracket",
    type: "Component",
    name: "Drive Bracket",
    materialId: "mat-al-6061",
    processId: "proc-cnc-mill",
    workInstructionIds: ["wi-bracket-machining"],
    provenance: provenance(kernel, "package", project.id)
  });
  const material = kernel.upsert({
    id: "mat-al-6061",
    type: "Material",
    name: "Aluminium 6061-T6",
    provenance: provenance(kernel, "package", component.id)
  });
  const process = kernel.upsert({
    id: "proc-cnc-mill",
    type: "Process",
    name: "CNC milling",
    provenance: provenance(kernel, "package", component.id)
  });
  const instruction = kernel.upsert({
    id: "wi-bracket-machining",
    type: "WorkInstruction",
    name: "Machine drive bracket",
    provenance: provenance(kernel, "package", process.id)
  });

  // Project containment plus resolved PART_OF. No manufacturer relation is created.
  kernel.link(project.id, "CONTAINS", component.id);
  kernel.link(component.id, "PART_OF", project.id);
  // Material has no resolved Component/Material relation in Iteration 10; the
  // component.materialId reference is therefore the canonical graph reference.
  // Process uses the already-resolved broad PRODUCES relation as a documented
  // process-to-output association. This is not MANUFACTURED_BY.
  kernel.link(process.id, "PRODUCES", component.id);

  const graph = kernel.getProjectGraph(project.id);
  assert.equal(graph.entities.length, 3, "project graph returns project and component product-structure membership");
  assert(graph.relations.some(r => r.relation === "PART_OF" && r.source === component.id && r.target === project.id), "PART_OF is present in canonical graph");
  assert(graph.relations.some(r => r.relation === "PRODUCES" && r.source === process.id && r.target === component.id), "process is linked by the resolved PRODUCES relation");
  assert(!graph.relations.some(r => r.relation === "MANUFACTURED_BY"), "no invented MANUFACTURED_BY edge exists");

  const structure = new ProductStructure(kernel).query(project.id);
  assert.equal(structure.ebom.length, 1, "EBOM contains the component");
  assert.equal(structure.mbom.length, 1, "MBOM contains a non-empty line when material and process are present");
  assert.equal(structure.mbom[0].material.id, material.id, "MBOM resolves material from canonical component reference");
  assert.equal(structure.mbom[0].process.id, process.id, "MBOM resolves process from canonical component reference");
  assert.equal(structure.mbom[0].status, "READY", "complete material/process structure is ready");
  assert.equal(structure.mbom[0].provenance.derivedFrom, component.id, "MBOM provenance derives from component id");

  // Missing required inputs: no guessed defaults and no false/zero substitution.
  const incomplete = kernel.upsert({
    id: "cmp-unstructured",
    type: "Component",
    name: "Unstructured Component",
    provenance: provenance(kernel, "package", project.id)
  });
  kernel.link(project.id, "CONTAINS", incomplete.id);
  kernel.link(incomplete.id, "PART_OF", project.id);

  const afterMissing = new ProductStructure(kernel).query(project.id);
  const gap = afterMissing.mbom.find(x => x.componentId === incomplete.id);
  assert(gap, "missing-input component is represented in MBOM");
  assert.equal(gap.material, "UNSPECIFIED", "missing material is UNSPECIFIED");
  assert.equal(gap.process, "UNSPECIFIED", "missing process is UNSPECIFIED");
  assert.equal(gap.supplier, "UNSPECIFIED", "missing supplier is UNSPECIFIED");
  assert.equal(gap.status, "HOLD", "missing required product-structure inputs produce HOLD");
  assert.match(gap.gap, /material/);
  assert.match(gap.gap, /process/);

  // SUPPLIED_BY remains unresolved: this package must not invent its direction.
  assert(!kernel.store.relations.some(r => r.relation === "SUPPLIED_BY"), "package does not invent SUPPLIED_BY direction");

  console.log("PASS: WP-MFG-STRUCTURE conformance");
}

runConformance();
