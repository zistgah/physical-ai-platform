# Carry-forward guardrails from PAP Iteration 47 hardening v0.3.0

These are the only prior hardening code pieces intentionally carried with this syllabus package. They are independent of the education module and are included so that the integrator can preserve the prior engineering invariants while stitching the new education capability.

Included targets:
- Declared cost integrity: unknown remains UNSPECIFIED/null; explicit zero is valid.
- HIL integrity: real bound/attested transport, safety and authority gates; no software-only HIL claim.
- Fidelity integrity: planned execution does not create EXECUTED evidence; promotion requires pre-existing accepted subject/configuration-bound evidence.

**Do not blindly overwrite the current spine.** Check whether Grok has already integrated equivalent or stronger code. If yes, retain the spine implementation and use these tests as behavioral requirements. If absent or weaker, reconcile and apply the files selectively. These are source files from the previously tested Iteration 47 hardening package, not a patch proven against any later Grok iteration.

No CAD, CFD, circuit, simulation, manufacturing, logistics, fabrication, prototyping or emulation packages from the earlier hardening ZIP are copied here. Other conversations may deliver those modules independently.
