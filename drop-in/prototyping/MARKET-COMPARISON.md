# Market benchmark and positioning - prototyping subsystem

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Scope of comparison

This is a comparison of the **prototyping evidence and revision-control slice**, not a claim that this single drop-in replaces an enterprise PLM suite. The platform MRD defines a broader universal physical-AI engineering and lifecycle environment. A fair competitive assessment must compare complete workflows and deployments, not isolated feature names.

## Comparable platforms

| Platform | Relevant capabilities documented by vendor | Implication for this module |
|---|---|---|
| Siemens Teamcenter | Requirements linked into lifecycle configuration, change, test, manufacturing, and supply chain; continuous verification | Stronger mature enterprise workflow, scale, and integration surface |
| PTC Windchill | Product data/configuration, change management, digital thread, requirements and validation, multi-CAD and ERP/MES integrations | Stronger enterprise configuration and change-control ecosystem |
| Dassault ENOVIA | Configuration identification/control, revision/effectivity, 150% BOM, verification and audit | More complete product-family and configuration management |
| PTC digital product traceability stack | Requirements, models, tests, changes, and lifecycle traceability across engineering tools | Stronger established requirements/test management and integrations |

## Where this module stands

### Demonstrated strengths

- Pure, dependency-free evaluator suitable for a static-first/local-first architecture.
- Exact configuration fingerprint binding in addition to configuration identity.
- Revision lineage resolution and change-record requirement.
- Requirement-to-test-to-evidence traceability through typed canonical relations.
- Fail-closed HOLD behavior and explicit FAIL semantics.
- Explicit L0-L7 fidelity constraints that prevent simulation evidence from masquerading as HIL or real hardware evidence.
- Separate evaluator result from lifecycle authority.
- Executable unit, sample, and canonical-kernel integration tests.

### Gaps versus mature enterprise PLM

This module does not implement a full change request/change order workflow, effectivity and variant management, EBOM/MBOM transformation, CAD vaulting, multi-site access control, supplier collaboration, long-term audit/event storage, electronic signatures, cryptographic evidence attestations, full standards tailoring, or enterprise identity/authorization. Those belong to the platform and other modules, not this drop-in.

### Verdict

The module is **strong and architecturally disciplined for its bounded purpose**, but it is not independently an industry-leading PLM/prototyping product and should not be marketed as a "holy grail". Its differentiator is the platform-level combination of vendor-independent canonical semantics, physical-AI fidelity awareness, typed digital-thread relationships, and local-first sovereignty. That proposition must be validated across the complete platform, real engineering workflows, external integrations, and operational deployments.

## Sources consulted

- Siemens Teamcenter requirements engineering: https://www.siemens.com/en-us/products/teamcenter/solutions/requirements-engineering/
- Siemens PLM overview: https://www.siemens.com/en-us/solutions/product-lifecycle-management-plm/
- PTC Windchill: https://www.ptc.com/en/products/windchill
- PTC requirements management and validation: https://www.ptc.com/en/technologies/plm/requirements-management
- Dassault Systèmes ENOVIA configuration management: https://www.3ds.com/products/enovia/configuration-management

Vendor pages describe their own products; the comparison is a capability-level assessment, not an independently audited feature or performance benchmark.

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Open numerical backend strategy

The package's differentiation is not a new monolithic solver. It is a canonical, evidence-bearing orchestration layer that can select replaceable numerical engines by operation and preserve their version, configuration, inputs, outputs, validation and provenance.

| Engineering domain | Open engine candidates | Established capability available for reuse |
|---|---|---|
| Geometry | Open CASCADE Technology | B-rep/NURBS geometry, Boolean operations and tessellation |
| Meshing | Gmsh | 2D/3D meshing and mesh conversion |
| CFD | OpenFOAM; Elmer | Finite-volume CFD and multiphysics finite-element analysis |
| Structural FEA | Code_Aster; CalculiX; Elmer | Linear/nonlinear structural, thermal, contact and multiphysics analyses |
| Circuit | ngspice; Xyce | SPICE transient, AC/DC, noise and parallel circuit analyses |
| Multibody/contact | Project Chrono; MBDyn; MuJoCo | Rigid/flexible dynamics, contact, vehicle/robot dynamics and aeroelastic workflows |
| General numerical methods | SciPy | ODE integration, optimization, sparse/dense linear algebra and interpolation |

This avoids rebuilding mature numerical algorithms in the platform layer. The platform retains canonical SIR/graph semantics and treats engine-specific input decks, models and result files as worker-side adapters/artifacts. The current package implements the common RPC contract and an actual SciPy reference worker. Other engine profiles still require their own worker implementation and benchmark qualification.

The relevant comparison with enterprise engineering suites remains about breadth and integration, not a claim that the package itself replaces those suites. A production platform needs both: proven solver backends and an independent canonical digital thread with requirements, configuration control, evidence fidelity and lifecycle governance.

## License and deployment posture

The listed engines do not share one license. The catalogue records an initial license note and upstream source for each. OpenFOAM, Code_Aster, Elmer, Gmsh, CalculiX and MBDyn have copyleft obligations; Open CASCADE has LGPL terms plus an exception; ngspice has a modified BSD base with file-level exceptions; Chrono and MuJoCo use permissive licenses; SciPy uses BSD-3-Clause with bundled component notices. A release manager must inspect the exact version, binary package, transitive dependencies and redistribution model. No third-party engine source or binary is included in this drop-in.
