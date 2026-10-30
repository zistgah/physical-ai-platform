# Test architecture

Iteration 31.

## Layers

1. Contract. A function states its accepted range and what it returns outside that range.
2. BIBO. Every function under characterization is tested at four points:
   - below the lower boundary
   - on the boundary
   - within the range
   - above the upper boundary
3. Sweep. A non-linear function is swept across its range. The risk product is swept over every corner of {0, 1, 2}^3.
4. Regression. The checklist runs every prior suite. A change that breaks one is not accepted.
5. Acceptance. tests/acceptance.mjs is the mechanical release gate. It is not edited except to re-anchor a mutant after its target moves.

## Why the boundary

Failures hide on the boundary. A check that only samples the interior misses the discontinuity. The BIBO harness refuses a function that has no on-boundary case.

## Extractability

Each new function is a module with no hidden store. contentAddress, risk, OperatingMode, SiteProtocol, Logistics, and EducationViews can be imported by another project. They take their inputs and return a result. They do not reach for a global.
