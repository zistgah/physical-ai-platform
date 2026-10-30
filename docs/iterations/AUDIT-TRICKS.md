# Audit: excluded requirements, boilerplate, tricks

Iteration 31.

## Excluded requirements

No live source marks a requirement as an excluded requirement. The word was stripped in earlier iterations and has not returned.

## Tricks that were present

1. Architectural tests printed PASS ARCH-T1 through ARCH-V1V2 after thin exercises. They now call the functions, but several of those functions were still shallow:
   - domainProfile accepted any non-empty domain and embodiment. It now accepts only the registered profiles and holds otherwise. The BIBO suite catches SPACE and HOVER.
   - migrateSchema copied the version and returned OK. It now keeps identity and records the source version.
2. The fidelity ladder comment still says "Adapter/slice. Not a real-time HIL runtime". That is an honest limit, not an excluded requirement marker. The HIL path is tested: no transport is SIMULATION.
3. CostModel rolls up declared numbers and does not estimate. That is the contract, not a trick. Missing numbers stay UNSPECIFIED.
4. FormalAdapter returns UNAVAILABLE without a bound prover. That is the contract. It does not pretend to prove.

## What is still breadth, not a trick

The workbench is a three-pane view, not a B-rep kernel. Manufacturing is work orders and a BOM projection, not a factory. Education is a course with role views, not an imported board curriculum. These are stated as PARTIAL. They are not marked PASS.
