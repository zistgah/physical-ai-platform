/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Cross-iteration traceability emitter.
 * Every iteration contributes a row. Regenerates docs/iterations/TRACEABILITY.md.
 */
import { writeFileSync } from "node:fs";
import { STANDARDS_CORPUS } from "../site/components/compliance/standards-corpus.js";

const ROWS = [
  { iter: "01", claim: "Canonical kernel vertical slice", code: "canonical-kernel.js, canonical-mobile-robot.js", test: "conformance-test.mjs", status: "IMPLEMENTED" },
  { iter: "02", claim: "Project isolation, identity round-trip, relation constraints, SIR interchange", code: "canonical-kernel.js", test: "conformance-test.mjs", status: "IMPLEMENTED" },
  { iter: "03", claim: "Lifecycle, configuration, digital thread, assurance slice, BOM projections", code: "lifecycle-engine.js, configuration-engine.js, safety-engine.js, manufacturing-engine.js", test: "conformance-test-iter03.mjs", status: "SLICE" },
  { iter: "04", claim: "Standards corpus, factory, CAD/HIL, education, research, teleop, fleet, business", code: "standards-corpus.js, factory-execution.js, fleet-engine.js, business-engine.js", test: "conformance-test-iter04.mjs", status: "SLICE" },
  { iter: "05", claim: "Contracts, import trust, queries, sharing, cross-vertical integration", code: "contracts-vertical.js, import-trust.js, graph-queries.js, sharing-boundary.js", test: "conformance-test-iter05.mjs", status: "IMPLEMENTED/SLICE" },
  { iter: "06", claim: "Evidence promotion, fidelity ladder, SIR compiler, standards workflow", code: "evidence-promotion.js, sir-compiler.js, standards-workflow.js", test: "conformance-test-iter06.mjs", status: "IMPLEMENTED" },
  { iter: "07", claim: "Project-scoped standards acceptance", code: "standards-acceptance.js", test: "conformance-test-iter07.mjs", status: "IMPLEMENTED" },
  { iter: "08", claim: "Relation honesty, gate HOLD, evidence binding, assurance path, doc truth", code: "relation-registry.js, evidence-binding.js, assurance-path.js", test: "conformance-test-iter08.mjs", status: "IMPLEMENTED" },
  { iter: "09", claim: "Full standards corpus from MRD/predecessor; cross-iteration traceability", code: "standards-corpus.js, data/standards/corpus.json, emit-traceability.mjs", test: "conformance-test-iter09.mjs", status: "IMPLEMENTED" },
  { iter: "10", claim: "164-record standards corpus with publisher provenance; SIR language first draft", code: "standards-corpus.js, data/standards/provenance/*, sir-lang.js", test: "conformance-test-iter10.mjs", status: "IMPLEMENTED / DRAFT" },
  { iter: "11", claim: "19 work packages stitched as overlays; cockpit not supplied", code: "relation-overlay.js, gate-schemas.js, assurance-case.js, product-structure.js, standards-graph.js, sir-check.js, and 13 slice modules", test: "conformance-test-WP-*.mjs", status: "STITCHED / OVERLAY" },
  { iter: "12", claim: "Cockpit S0-S10 state records stitched; all 20 packages present", code: "site/components/safety/cockpit-machine.js", test: "conformance-test-WP-COCKPIT-STATES.mjs", status: "STITCHED / STATE RECORDS" },
  { iter: "13", claim: "Overlays consumed by registry; cockpit operational records", code: "relation-registry.js, lifecycle-engine.js, safety-engine.js, factory-resolution.js", test: "conformance-test-iter13.mjs", status: "INTEGRATED" },
  { iter: "14", claim: "False exclusion markers removed; geometry CAD kernel", code: "site/components/cad/geometry-kernel.js, canonical-kernel.js", test: "conformance-test-iter14.mjs", status: "SUPERSEDED BY 15" },
  { iter: "15", claim: "CAD contract rejects formula-only solids; mesh-integral kernel", code: "site/components/cad/cad-contracts.js, geometry-kernel.js", test: "conformance-test-iter15.mjs", status: "EXTENDED BY 16" },
  { iter: "16", claim: "CAD features: partial revolve, general pocket, notch, chamfer, fillet, shell, draft, arc, spline, STEP, assembly", code: "site/components/cad/cad-features.js, geometry-kernel.js", test: "conformance-test-iter16.mjs", status: "IMPLEMENTED" },
  { iter: "17", claim: "SIR runtime, MES, ERP, LMS, prover, multi-physics, distributed runtime, HIL loop, fleet ops, teleop stack, cockpit execution, standards binding", code: "sir-runtime.js, mes.js, erp.js, lms.js, prover.js, multiphysics.js, distributed.js, hil-loop.js, fleet-ops.js, remote-stack.js, cockpit-exec.js, standards-binding.js", test: "conformance-test-iter17.mjs", status: "IMPLEMENTED" },
  { iter: "18", claim: "No drops. LMS on the graph. Regression checklist. Both MANUFACTURED_BY directions", code: "education/lms.js, tools/regression-checklist.mjs, factory-resolution.js, lifecycle-engine.js", test: "conformance-test-iter18.mjs", status: "IMPLEMENTED" },
  { iter: "19", claim: "General polygon subtract and interactive CAD workbench", code: "cad/geometry-kernel.js, cad/cad-workbench.js, assets/js/app.js", test: "conformance-test-iter19.mjs", status: "IMPLEMENTED" },
  { iter: "20", claim: "SIR ABI, graph editor views, fidelity L0-L7, coupled physics, HIL binding, board correlation, consistent export, component model, NURBS", code: "sir-abi.js, graph-editor.js, fidelity-levels.js, hil-realtime.js, board-correlation.js, package-export.js, component-model.js, nurbs.js", test: "conformance-test-iter20.mjs", status: "IMPLEMENTED" },
  { iter: "21", claim: "Standards never display null. Compliance is automated on adopted standards", code: "standards-display.js, compliance-automation.js, lifecycle-engine.js", test: "conformance-test-iter21.mjs", status: "SUPERSEDED BY 22" },
  { iter: "22", claim: "Evidence integrity: adoption copies requirements, only bound valid evidence clears", code: "standards-corpus.js, compliance-automation.js, standards-display.js", test: "conformance-test-iter22.mjs", status: "IMPLEMENTED" },
  { iter: "23", claim: "Workbench views, quarantine, consistent export, modes, fault injection, extended physics", code: "graph-editor.js, import-quarantine.js, consistent-export.js, workbench-modes.js, fault-injection.js, multiphysics-extended.js", test: "conformance-test-iter23.mjs", status: "IMPLEMENTED" },
  { iter: "24", claim: "Role pages, import trust, persistence adapters, cockpit shutdown, license alignment", code: "app.js, persistence-privacy.js, cockpit-machine.js, LICENSE, CITATION.cff", test: "conformance-test-iter24.mjs", status: "SUPERSEDED BY 25" },
  { iter: "25", claim: "Site parses, CSP, import payloads, honest adapters, CAD volumes, safety HOLD", code: "app.js, cad-features.js, safety-engine.js, compliance-automation.js, LICENSE", test: "conformance-test-iter25.mjs", status: "SUPERSEDED BY 26" },
  { iter: "26", claim: "Routes in Chromium, pocket and union volumes, bound HIL, export control, acceptance checks", code: "ci-routes.mjs, geometry-kernel.js, hil-loop.js, export-control.js, acceptance.js", test: "conformance-test-iter26.mjs", status: "PASS" },
  { iter: "27", claim: "Acceptance script verdict ACCEPTED", code: "tests/acceptance.mjs", test: "tests/acceptance.mjs", status: "PASS" },
  { iter: "28", claim: "Configuration, isolation authority, and HIL transport gates", code: "safety-engine.js, cockpit-machine.js, hil-loop.js", test: "conformance-test-iter28.mjs", status: "PASS" },
  { iter: "29", claim: "MRD traceability and file and function explanations", code: "docs/iterations/MRD-TRACEABILITY.md", test: "conformance-test-iter29.mjs", status: "PASS" },
  { iter: "30", claim: "All modules reachable, disclaimer, PWA, industrial workbench", code: "module-registry.js, disclaimer.js, app.js", test: "conformance-test-iter30.mjs", status: "PASS" },
  { iter: "31", claim: "Closed open MRD rows with BIBO characterization", code: "content-address.js, sovereignty-risk.js, site-protocol.js", test: "conformance-test-iter31.mjs", status: "PASS" },
  { iter: "32", claim: "B-rep kernel, factory, board import", code: "brep.js, factory.js, board-import.js", test: "conformance-test-iter32.mjs", status: "PASS" },
  { iter: "33", claim: "SIR language, syllabus gaps, semantic independence cycle rule", code: "sir-language.js", test: "conformance-test-iter33.mjs", status: "PASS" },
  { iter: "34", claim: "Executable correlation, standards classification, human SIR", code: "board-correlation-exec.js, standards-classify.js, sir-human.js", test: "conformance-test-iter34.mjs", status: "PASS" },
  { iter: "35", claim: "Object SIR with loops and conditionals", code: "sir-objects.js", test: "conformance-test-iter35.mjs", status: "PASS" },
  { iter: "36", claim: "Function-level matrix, STL exchange, boilerplate named", code: "stl-exchange.js", test: "conformance-test-iter36.mjs", status: "PASS" },
  { iter: "37", claim: "Billing, AI round trip, self-assurance, projections", code: "billing.js, ai-roundtrip.js, self-assurance.js, projections.js", test: "conformance-test-iter37.mjs", status: "PASS" },
  { iter: "38", claim: "Mesh, NURBS surface, B-rep boolean, mates, history, viewport, nodes", code: "mesh-edit.js, nurbs-surface.js, brep-boolean.js, assembly.js, history.js, viewport.js, geometry-nodes.js", test: "conformance-test-iter38.mjs", status: "PASS" },
  { iter: "39", claim: "Packaging, multi-physics, HIL transport, prover, gap analysis", code: "improve.js, multiphysics.js, hil-transport.js, prover.js", test: "conformance-test-iter39.mjs", status: "PASS" },
  { iter: "40", claim: "Browser graph free of Node imports, A5 passes", code: "content-address.js, geometry-kernel.js, browser-check.js", test: "acceptance.mjs A5", status: "PASS" },
  { iter: "41", claim: "Contract, workflow gate, fault domain, scanner, cross-link, role workbench", code: "CONTRACT.md, workflow-gate.js, fault-domain.js, secret-scan.js, cross-link.js, role-workbench.js", test: "conformance-test-iter41.mjs", status: "PASS" },
  { iter: "42", claim: "Real status, sample projects", code: "wheeled-robot.js, static-sensor.js, MRD-TRACEABILITY.md", test: "conformance-test-iter42.mjs", status: "PASS" },
  { iter: "43", claim: "Eleven platforms, copyright, no other organization", code: "platforms.js, CONTRACT.md, stl-exchange.js", test: "conformance-test-iter43.mjs", status: "PASS" },
  { iter: "44", claim: "Handoff packager, honest suite gaps", code: "handoff.js, SUITE-GAPS.md", test: "conformance-test-iter44.mjs", status: "PASS" },
  { iter: "45", claim: "Contract rewritten, boolean by clip, trajectory with contact", code: "CONTRACT.md, boolean-clip.js, trajectory.js", test: "conformance-test-iter45.mjs", status: "PASS" },
  { iter: "46", claim: "Document system stitched into the spine", code: "documents/, data/document-templates/", test: "conformance-test-iter46.mjs", status: "PASS" },
  { iter: "47", claim: "Ten drop-in packages, each tested", code: "drop-in/", test: "conformance-test-iter47.mjs", status: "PASS" },
  { iter: "48", claim: "Fourteen packages stitched, notebooks linked", code: "drop-in/, site/notebooks/", test: "conformance-test-iter48.mjs", status: "PASS" },
  { iter: "49", claim: "MRD correlation rebuilt, twenty attachments listed", code: "MRD-TRACEABILITY.md", test: "acceptance.mjs", status: "PASS" },
  { iter: "50", claim: "Provenance, standards exercise, optional HIL, assurance", code: "PROVENANCE.md, hil-selector.js, standards-exercise.js", test: "conformance-test-iter50.mjs", status: "PASS" }
];

const lines = [];
lines.push("# Cross-iteration traceability");
lines.push("");
lines.push("Generated by `node tools/emit-traceability.mjs`. Each iteration produces a row.");
lines.push("");
lines.push("| Iteration | Claim | Code | Test | Status |");
lines.push("|---|---|---|---|---|");
for (const r of ROWS) {
  lines.push(`| ${r.iter} | ${r.claim} | ${r.code} | ${r.test} | ${r.status} |`);
}
lines.push("");
lines.push("## Standards corpus");
lines.push("");
lines.push(`Count: ${STANDARDS_CORPUS.length}. All INFORMATIONAL until project adoption.`);
lines.push("");
lines.push("| Id | Name | Layer | Tier | Source |");
lines.push("|---|---|---|---|---|");
for (const s of STANDARDS_CORPUS) {
  lines.push(`| ${s.id} | ${s.name} | ${s.layer} | ${s.tier} | ${s.provenance?.source || ""} |`);
}
lines.push("");
lines.push("Corpus entries are profiles extracted from the architecture sources. They are not the text of the standards and not legal determinations.");
lines.push("");

const MRD = [
  ["1", "Canonical model", "canonical-kernel.js", "PARTIAL"],
  ["2", "UNKNOWN to HOLD", "compliance-engine.js", "PASS"],
  ["3", "Typed graph", "relation-registry.js", "PASS"],
  ["4", "SIR ABI and EXECUTE gate", "sir-abi.js", "PARTIAL"],
  ["5", "Workbench and fidelity", "graph-editor.js", "PARTIAL"],
  ["6", "Lifecycle and education", "lms.js", "PARTIAL"],
  ["7", "Standards and export control", "export-control.js", "PASS"],
  ["8", "Manufacturing and commerce", "manufacturing-engine.js", "PARTIAL"],
  ["9", "Sovereignty and substitution", "substitution.js", "PARTIAL"],
  ["10", "Safety and cockpit", "cockpit-machine.js", "PASS"],
  ["11", "Disclaimers and governance", "disclaimer.js", "PASS"],
  ["12", "UI, persistence, AI Guide", "persistence-privacy.js", "PASS"],
  ["13", "Acceptance, reachability, licence", "module-registry.js", "PASS"]
];
lines.push("## MRD traceability");
lines.push("");
lines.push("| MRD | Requirement | Code | Status |");
lines.push("|---|---|---|---|");
for (const [s, req, code, status] of MRD) lines.push(`| ${s} | ${req} | ${code} | ${status} |`);
lines.push("");
lines.push("Full matrix: docs/iterations/MRD-TRACEABILITY.md");
lines.push("");

writeFileSync("docs/iterations/TRACEABILITY.md", lines.join("\n"));
writeFileSync("TRACEABILITY.md", lines.join("\n"));
console.log(`Wrote TRACEABILITY.md (${ROWS.length} iterations, ${STANDARDS_CORPUS.length} standards)`);
