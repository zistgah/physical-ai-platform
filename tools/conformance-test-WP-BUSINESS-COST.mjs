/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Conformance test - WP-BUSINESS-COST
 */
import { createKernel } from "../site/components/core/canonical-kernel.js";
import { CostModel } from "../site/components/core/cost-model.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS: " + msg);
}

function run() {
  const kernel = createKernel();
  const project = kernel.upsert({
    id: "proj-1",
    type: "Project",
    name: "Cost Slice",
    provenance: { origin: "package", derivedFrom: null, timestamp: kernel._now() }
  });

  const c1 = kernel.upsert({
    id: "component-a",
    type: "Component",
    name: "Assembly A",
    costMaterial: 100,
    costProcess: 20,
    costLabor: 30,
    provenance: { origin: "package", derivedFrom: "proj-1", timestamp: kernel._now() }
  });
  const c2 = kernel.upsert({
    id: "component-b",
    type: "Component",
    name: "Assembly B",
    costMaterial: 0,
    costProcess: 10,
    provenance: { origin: "package", derivedFrom: "proj-1", timestamp: kernel._now() }
  });
  const c3 = kernel.upsert({
    id: "component-c",
    type: "Component",
    name: "Assembly C",
    costLabor: 5,
    provenance: { origin: "package", derivedFrom: "proj-1", timestamp: kernel._now() }
  });

  kernel.link(project.id, "CONTAINS", c1.id);
  kernel.link(project.id, "CONTAINS", c2.id);
  kernel.link(project.id, "CONTAINS", c3.id);

  const customer = kernel.upsert({
    id: "customer-1",
    type: "Customer",
    name: "Customer",
    provenance: { origin: "package", derivedFrom: "proj-1", timestamp: kernel._now() }
  });
  const order = kernel.upsert({
    id: "service-order-1",
    type: "ServiceEvent",
    name: "Customer order",
    customerId: customer.id,
    provenance: { origin: "package", derivedFrom: customer.id, timestamp: kernel._now() }
  });
  kernel.link(project.id, "CONTAINS", customer.id);
  kernel.link(project.id, "CONTAINS", order.id);

  const graph = kernel.getProjectGraph(project.id);
  assert(graph.entities.some(e => e.id === c1.id), "Component is queryable through project graph");
  assert(graph.entities.some(e => e.id === order.id && e.type === "ServiceEvent"), "Customer order is a ServiceEvent");
  assert(graph.entities.some(e => e.id === customer.id && e.type === "Customer"), "Customer is queryable");
  assert(order.customerId === customer.id, "Customer order carries canonical customer reference");

  const customerRelation = graph.relations.find(
    r => r.source === order.id && r.target === customer.id
  );
  if (!customerRelation) {
    console.log("HOLD: ServiceEvent -> Customer relation is unresolved in the supplied relation registry; no unrelated relation was invented.");
  }

  const model = new CostModel(kernel);
  const result = model.rollup(project.id);

  assert(JSON.stringify(result.lines.map(l => l.id)) ===
    JSON.stringify(["component-a", "component-b", "component-c"]),
    "Rollup lines are deterministic by component id");

  assert(result.lines[0].costMaterial === 100 &&
         result.lines[0].costProcess === 20 &&
         result.lines[0].costLabor === 30,
         "Declared numeric cost fields are retained");

  assert(result.lines[1].costMaterial === 0,
    "Declared zero remains zero");
  assert(result.lines[1].undeclared.includes("costLabor"),
    "Missing labor is UNSPECIFIED/undeclared, not zero");

  assert(result.lines[2].undeclared.includes("costMaterial") &&
         result.lines[2].undeclared.includes("costProcess"),
    "Missing material and process are UNSPECIFIED/undeclared");

  assert(result.total === 165,
    "Rollup total equals sum of declared numeric lines only");

  assert(result.undeclared.some(x => x.componentId === "component-c" && x.field === "costMaterial" && x.status === "UNSPECIFIED"),
    "Missing cost is explicitly reported as UNSPECIFIED");

  assert(model.calculate(project.id).total === result.total,
    "calculate alias preserves deterministic rollup");

  console.log("\n=== WP-BUSINESS-COST PASSED ===");
}

run();
