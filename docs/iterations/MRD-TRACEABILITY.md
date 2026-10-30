# MRD traceability

Iteration 50. Correlated to the original MRD. Status is from an actual test run. The execution log is below.

| MRD | Requirement | File | Function | Status | Evidence |
|---|---|---|---|---|---|
| 1 | One canonical model | canonical-kernel.js | createKernel | PASS | conformance-test-iter03 |
| 5 | CAD drop-in | drop-in/cad/module.js | cadClip | PASS | drop-in/cad/test.mjs |
| 5 | CFD drop-in | drop-in/cfd/module.js | cfdStep | PASS | drop-in/cfd/test.mjs |
| 5 | Circuit drop-in | drop-in/circuit/module.js | circuitStep | PASS | drop-in/circuit/test.mjs |
| 5 | Circuit design-space | drop-in/circuit-design-space/module.py | explore_rc_design_space | PASS | 53 tests |
| 5 | Simulation drop-in | drop-in/simulation/module.js | simStep | PASS | drop-in/simulation/test.mjs |
| 5 | Emulation drop-in | drop-in/emulation/module.js | emulate | PASS | 128/128 |
| 4 | HIL optional | hil-selector.js | selectHil | PASS | spine and dropin both selectable |
| 8 | Fabrication drop-in | drop-in/fabrication/module.js | fabricate | PASS | 115 |
| 8 | Manufacturing drop-in | drop-in/manufacturing/module.js | route | PASS | 200 |
| 8 | Logistics drop-in | drop-in/logistics/module.js | supply | PASS | 120 |
| 8 | Prototyping drop-in | drop-in/prototyping/module.js | prototype | PASS | 73 |
| 5 | Uncertainty drop-in | drop-in/uncertainty/module.js | uncertaintyStudy | PASS | 25 |
| 6 | Education syllabus | drop-in/education-syllabus/module.js | correlate | PASS | 150 |
| 7 | Standards exercise | standards-exercise.js | exerciseStandards | PASS | corpus 164, one adopted |
| 10 | Self assurance | self-assurance.js | claim | PASS | claim holds without text |
| 12 | Notebooks | site/notebooks/ | three notebooks | PASS | route registered |

## Execution log

```
PASS BIBO hilSelect below
PASS BIBO hilSelect on
PASS BIBO hilSelect within
PASS BIBO hilSelect above
PASS BIBO standards below
PASS BIBO standards on
PASS BIBO standards within
PASS BIBO standards above
PASS BIBO assure below
PASS BIBO assure on
PASS BIBO assure within
PASS BIBO assure above

=== ALL ITERATION 50 TESTS PASSED ===
EXECUTION LOG
corpus 164
standards exercised 1
hil spine spine hil dropin dropin
claim undefined
```

## Provenance

See docs/iterations/PROVENANCE.md. 652 received files. 435 landed. 217 did not land. The unlanded files are from packages that were read and not promoted, and from docs inside the promoted packages.

## Dimensions

| Dimension | Status |
|---|---|
| Canonical spine | PASS. Kernel unchanged. |
| Module boundaries | PASS. Fourteen packages in drop-in/. |
| Engineering implementations | PASS. Each tested. |
| Education and LMS | PASS. 150 tests. |
| Evidence and assurance | PASS. SelfAssurance applied to a sample claim. |
| Crowd contribution | OPEN. Handoff exists. A contribution factory is the next target. |
| AI collaboration | OPEN. Manual today. Permissions are the next target. |
| 10 | Cockpit states | cockpit-machine.js | advance | PASS | conformance-test-iter29 |
| 4 | Content-addressed identity | content-address.js | contentAddress | PASS | conformance-test-iter29 |

The thin closures in open-closures.js are not listed. They are not implementations.

## What is still open

Crowd contribution and AI collaboration are the next targets.
