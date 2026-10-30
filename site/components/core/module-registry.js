/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/module-registry.js
 * FILE PURPOSE: Makes every site component reachable from the entry point.
 * MRD 13: site modules reachable from the entry point.
 */
import { CAD_CONTRACT as m_cad_cad_contracts } from "../cad/cad-contracts.js";
import { v3 as m_cad_cad_features } from "../cad/cad-features.js";
import { nurbsCurve as m_cad_nurbs } from "../cad/nurbs.js";
import { REGIMES as m_compliance_export_control } from "../compliance/export-control.js";
import { PROJECT_STANDARD_STATES as m_compliance_standards_acceptance } from "../compliance/standards-acceptance.js";
import { StandardsBinding as m_compliance_standards_binding } from "../compliance/standards-binding.js";
import { inferAuthority as m_compliance_standards_display } from "../compliance/standards-display.js";
import { StandardsGraph as m_compliance_standards_graph } from "../compliance/standards-graph.js";
import { StandardsWorkflow as m_compliance_standards_workflow } from "../compliance/standards-workflow.js";
import { replaceSimulator as m_core_acceptance } from "../core/acceptance.js";
import { buildContext as m_core_ai_guide } from "../core/ai-guide.js";
import { BusinessClosure as m_core_business_closure } from "../core/business-closure.js";
import { applyStale as m_core_change_stale } from "../core/change-stale.js";
import { CockpitExec as m_core_cockpit_exec } from "../core/cockpit-exec.js";
import { MODEL_FIELDS as m_core_component_model } from "../core/component-model.js";
import { VERTICAL_CONTRACTS as m_core_contracts_vertical } from "../core/contracts-vertical.js";
import { port as m_core_contracts } from "../core/contracts.js";
import { CostModel as m_core_cost_model } from "../core/cost-model.js";
import { DistributedRuntime as m_core_distributed } from "../core/distributed.js";
import { ERP as m_core_erp } from "../core/erp.js";
import { EventBus as m_core_event_bus } from "../core/event-bus.js";
import { EvidenceBinding as m_core_evidence_binding } from "../core/evidence-binding.js";
import { EVIDENCE_METHODS as m_core_evidence_promotion } from "../core/evidence-promotion.js";
import { FleetOps as m_core_fleet_ops } from "../core/fleet-ops.js";
import { FleetTwin as m_core_fleet_twin } from "../core/fleet-twin.js";
import { FormalAdapter as m_core_formal_adapter } from "../core/formal-adapter.js";
import { GATE_SCHEMAS as m_core_gate_schemas } from "../core/gate-schemas.js";
import { GraphQueries as m_core_graph_queries } from "../core/graph-queries.js";
import { id as m_core_id } from "../core/id.js";
import { ImportTrustBoundary as m_core_import_trust } from "../core/import-trust.js";
import { GATES as m_core_lifecycle_gates } from "../core/lifecycle-gates.js";
import { MigrationRegistry as m_core_migrations } from "../core/migrations.js";
import { PluginRegistry as m_core_plugin_system } from "../core/plugin-system.js";
import { prove as m_core_prover } from "../core/prover.js";
import { PACKAGE_RELATIONS as m_core_relation_overlay } from "../core/relation-overlay.js";
import { RESOLVED_RELATIONS as m_core_relation_registry } from "../core/relation-registry.js";
import { ROLES as m_core_roles } from "../core/roles.js";
import { exportPackage as m_core_sharing_adapter } from "../core/sharing-adapter.js";
import { SharingBoundary as m_core_sharing_boundary } from "../core/sharing-boundary.js";
import { SIRCompiler as m_core_sir_compiler } from "../core/sir-compiler.js";
import { validateUnit as m_core_units } from "../core/units.js";
import { PLATFORM_MAGIC as m_core_versioning } from "../core/versioning.js";
import { BANDS as m_education_board_correlation } from "../education/board-correlation.js";
import { EducationClosure as m_education_education_closure } from "../education/education-closure.js";
import { EducationPath as m_education_education_path } from "../education/education-path.js";
import { LMS as m_education_lms } from "../education/lms.js";
import { KnowledgeGraph as m_graph_knowledge_graph } from "../graph/knowledge-graph.js";
import { FactoryClosure as m_manufacturing_factory_closure } from "../manufacturing/factory-closure.js";
import { MES as m_manufacturing_mes } from "../manufacturing/mes.js";
import { PackageExport as m_manufacturing_package_export } from "../manufacturing/package-export.js";
import { ProductStructure as m_manufacturing_product_structure } from "../manufacturing/product-structure.js";
import { SubstitutionAnalysis as m_manufacturing_substitution } from "../manufacturing/substitution.js";
import { ResearchProtocol as m_research_research_protocol } from "../research/research-protocol.js";
import { AssuranceCaseBuilder as m_safety_assurance_case } from "../safety/assurance-case.js";
import { AssurancePath as m_safety_assurance_path } from "../safety/assurance-path.js";
import { FidelityLadder as m_simulation_fidelity_ladder } from "../simulation/fidelity-ladder.js";
import { LEVELS as m_simulation_fidelity_levels } from "../simulation/fidelity-levels.js";
import { runLoop as m_simulation_hil_loop } from "../simulation/hil-loop.js";
import { HilRealtime as m_simulation_hil_realtime } from "../simulation/hil-realtime.js";
import { ImportQuarantine as m_simulation_import_quarantine } from "../simulation/import-quarantine.js";
import { Battery as m_simulation_mobile_robot } from "../simulation/mobile-robot.js";
import { solveCoupled as m_simulation_multiphysics_coupled } from "../simulation/multiphysics-coupled.js";
import { solveExtended as m_simulation_multiphysics_extended } from "../simulation/multiphysics-extended.js";
import { solve as m_simulation_multiphysics } from "../simulation/multiphysics.js";
import { ReplayRecorder as m_simulation_replay } from "../simulation/replay.js";
import { createMobileRobotScenario as m_simulation_scenario } from "../simulation/scenario.js";
import { DeterministicScheduler as m_simulation_scheduler } from "../simulation/scheduler.js";
import { SimComponent as m_simulation_simulator } from "../simulation/simulator.js";
import { TelemetryRecorder as m_simulation_telemetry } from "../simulation/telemetry.js";
import { IR_VERSION as m_sir_sir_abi } from "../sir/sir-abi.js";
import { checkAndLoad as m_sir_sir_check } from "../sir/sir-check.js";
import { tokenize as m_sir_sir_lang } from "../sir/sir-lang.js";
import { tokenize as m_sir_sir_runtime } from "../sir/sir-runtime.js";
import { RemoteStack as m_teleoperation_remote_stack } from "../teleoperation/remote-stack.js";
import { TeleopSession as m_teleoperation_session } from "../teleoperation/session.js";
import { ArchitectureUpgradeManager as m_workbench_architecture_upgrade } from "../workbench/architecture-upgrade.js";
import { PortRegistry as m_workbench_ports } from "../workbench/ports.js";
import { SystemModel as m_workbench_system_model } from "../workbench/system-model.js";

import { contentAddress as m_core_content_address } from "./content-address.js";
import { Logistics as m_manufacturing_logistics } from "../manufacturing/logistics.js";
import { OperatingMode as m_core_operating_mode } from "./operating-mode.js";
import { SiteProtocol as m_teleoperation_site_protocol } from "../teleoperation/site-protocol.js";
import { EducationViews as m_education_role_views } from "../education/role-views.js";
import { risk as m_manufacturing_sovereignty_risk } from "../manufacturing/sovereignty-risk.js";
import { boxBrep as m_cad_brep } from "../cad/brep.js";
import { Factory as m_manufacturing_factory } from "../manufacturing/factory.js";
import { BoardImport as m_education_board_import } from "../education/board-import.js";
import { run as m_sir_language } from "../sir/sir-language.js";
import { correlate as m_edu_corr } from "../education/board-correlation-exec.js";
import { classify as m_std_cls } from "../compliance/standards-classify.js";
import { runHuman as m_sir_human } from "../sir/sir-human.js";
import { runObjects as m_sir_objects } from "../sir/sir-objects.js";
import { CLOSURES as m_open_closures } from "../core/open-closures.js";
import { exportSTL as m_stl } from "../cad/stl-exchange.js";
import { Billing as m_billing } from "../core/billing.js";
import { toProvider as m_ai_rt } from "../core/ai-roundtrip.js";
import { SelfAssurance as m_self } from "../safety/self-assurance.js";
import { project as m_proj } from "../graph/projections.js";
import { mesh as m_mesh } from "../cad/mesh-edit.js";
import { nurbsSurface as m_nsurf } from "../cad/nurbs-surface.js";
import { brepBoolean as m_bbool } from "../cad/brep-boolean.js";
import { Assembly as m_asm } from "../cad/assembly.js";
import { History as m_hist } from "../cad/history.js";
import { project as m_vp } from "../cad/viewport.js";
import { evaluate as m_gn } from "../cad/geometry-nodes.js";
import { packageImprovement as m_imp } from "../core/improve.js";
import { solve as m_mp } from "../simulation/multiphysics.js";
import { HilTransport as m_hil } from "../simulation/hil-transport.js";
import { prove as m_prv } from "../core/prover.js";
export const REACHABLE = {
  "core/prover.js": m_prv,
  "simulation/hil-transport.js": m_hil,
  "simulation/multiphysics.js": m_mp,
  "core/improve.js": m_imp,
  "cad/geometry-nodes.js": m_gn,
  "cad/viewport.js": m_vp,
  "cad/history.js": m_hist,
  "cad/assembly.js": m_asm,
  "cad/brep-boolean.js": m_bbool,
  "cad/nurbs-surface.js": m_nsurf,
  "cad/mesh-edit.js": m_mesh,
  "graph/projections.js": m_proj,
  "safety/self-assurance.js": m_self,
  "core/ai-roundtrip.js": m_ai_rt,
  "core/billing.js": m_billing,
  "cad/stl-exchange.js": m_stl,
  "core/open-closures.js": m_open_closures,
  "sir/sir-objects.js": m_sir_objects,
  "sir/sir-human.js": m_sir_human,
  "compliance/standards-classify.js": m_std_cls,
  "education/board-correlation-exec.js": m_edu_corr,
  "sir/sir-language.js": m_sir_language,
  "education/board-import.js": m_education_board_import,
  "manufacturing/factory.js": m_manufacturing_factory,
  "cad/brep.js": m_cad_brep,
  "manufacturing/sovereignty-risk.js": m_manufacturing_sovereignty_risk,
  "education/role-views.js": m_education_role_views,
  "teleoperation/site-protocol.js": m_teleoperation_site_protocol,
  "core/operating-mode.js": m_core_operating_mode,
  "manufacturing/logistics.js": m_manufacturing_logistics,
  "core/content-address.js": m_core_content_address,
  "cad/cad-contracts.js": m_cad_cad_contracts,
  "cad/cad-features.js": m_cad_cad_features,
  "cad/nurbs.js": m_cad_nurbs,
  "compliance/export-control.js": m_compliance_export_control,
  "compliance/standards-acceptance.js": m_compliance_standards_acceptance,
  "compliance/standards-binding.js": m_compliance_standards_binding,
  "compliance/standards-display.js": m_compliance_standards_display,
  "compliance/standards-graph.js": m_compliance_standards_graph,
  "compliance/standards-workflow.js": m_compliance_standards_workflow,
  "core/acceptance.js": m_core_acceptance,
  "core/ai-guide.js": m_core_ai_guide,
  "core/business-closure.js": m_core_business_closure,
  "core/change-stale.js": m_core_change_stale,
  "core/cockpit-exec.js": m_core_cockpit_exec,
  "core/component-model.js": m_core_component_model,
  "core/contracts-vertical.js": m_core_contracts_vertical,
  "core/contracts.js": m_core_contracts,
  "core/cost-model.js": m_core_cost_model,
  "core/distributed.js": m_core_distributed,
  "core/erp.js": m_core_erp,
  "core/event-bus.js": m_core_event_bus,
  "core/evidence-binding.js": m_core_evidence_binding,
  "core/evidence-promotion.js": m_core_evidence_promotion,
  "core/fleet-ops.js": m_core_fleet_ops,
  "core/fleet-twin.js": m_core_fleet_twin,
  "core/formal-adapter.js": m_core_formal_adapter,
  "core/gate-schemas.js": m_core_gate_schemas,
  "core/graph-queries.js": m_core_graph_queries,
  "core/id.js": m_core_id,
  "core/import-trust.js": m_core_import_trust,
  "core/lifecycle-gates.js": m_core_lifecycle_gates,
  "core/migrations.js": m_core_migrations,
  "core/plugin-system.js": m_core_plugin_system,
  "core/prover.js": m_core_prover,
  "core/relation-overlay.js": m_core_relation_overlay,
  "core/relation-registry.js": m_core_relation_registry,
  "core/roles.js": m_core_roles,
  "core/sharing-adapter.js": m_core_sharing_adapter,
  "core/sharing-boundary.js": m_core_sharing_boundary,
  "core/sir-compiler.js": m_core_sir_compiler,
  "core/units.js": m_core_units,
  "core/versioning.js": m_core_versioning,
  "education/board-correlation.js": m_education_board_correlation,
  "education/education-closure.js": m_education_education_closure,
  "education/education-path.js": m_education_education_path,
  "education/lms.js": m_education_lms,
  "graph/knowledge-graph.js": m_graph_knowledge_graph,
  "manufacturing/factory-closure.js": m_manufacturing_factory_closure,
  "manufacturing/mes.js": m_manufacturing_mes,
  "manufacturing/package-export.js": m_manufacturing_package_export,
  "manufacturing/product-structure.js": m_manufacturing_product_structure,
  "manufacturing/substitution.js": m_manufacturing_substitution,
  "research/research-protocol.js": m_research_research_protocol,
  "safety/assurance-case.js": m_safety_assurance_case,
  "safety/assurance-path.js": m_safety_assurance_path,
  "simulation/fidelity-ladder.js": m_simulation_fidelity_ladder,
  "simulation/fidelity-levels.js": m_simulation_fidelity_levels,
  "simulation/hil-loop.js": m_simulation_hil_loop,
  "simulation/hil-realtime.js": m_simulation_hil_realtime,
  "simulation/import-quarantine.js": m_simulation_import_quarantine,
  "simulation/mobile-robot.js": m_simulation_mobile_robot,
  "simulation/multiphysics-coupled.js": m_simulation_multiphysics_coupled,
  "simulation/multiphysics-extended.js": m_simulation_multiphysics_extended,
  "simulation/multiphysics.js": m_simulation_multiphysics,
  "simulation/replay.js": m_simulation_replay,
  "simulation/scenario.js": m_simulation_scenario,
  "simulation/scheduler.js": m_simulation_scheduler,
  "simulation/simulator.js": m_simulation_simulator,
  "simulation/telemetry.js": m_simulation_telemetry,
  "sir/sir-abi.js": m_sir_sir_abi,
  "sir/sir-check.js": m_sir_sir_check,
  "sir/sir-lang.js": m_sir_sir_lang,
  "sir/sir-runtime.js": m_sir_sir_runtime,
  "teleoperation/remote-stack.js": m_teleoperation_remote_stack,
  "teleoperation/session.js": m_teleoperation_session,
  "workbench/architecture-upgrade.js": m_workbench_architecture_upgrade,
  "workbench/ports.js": m_workbench_ports,
  "workbench/system-model.js": m_workbench_system_model
};

export function reachableCount() { return Object.keys(REACHABLE).length; }

