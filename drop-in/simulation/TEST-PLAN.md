# Simulation test plan

## Test layers

| Layer | Entry point | Purpose |
|---|---|---|
| Unit/invariant | `node test.mjs` | Input contracts, physics invariants, numerical bounds, determinism, diagnostics |
| Scenario | `node run-samples.mjs` | End-to-end execution of supplied JSON scenarios and explicit acceptance assertions |
| Platform integration | `node platform-integration.test.mjs` | Actual Iteration 47 `Simulator`/`SimComponent`, scheduler, state, telemetry, replay, event, HOLD paths |
| Platform regression | `node tests/run.mjs` from platform root | Protects existing platform regression suites |
| Platform acceptance | `node tests/acceptance.mjs` from platform root | Existing platform acceptance gates; this is broader than the simulation module |

## Unit test inventory (36 groups)

1. Missing and empty body models HOLD.
2. Invalid timestep, step count, and gravity HOLD.
3. Invalid body schema and duplicate identifiers HOLD.
4. Bounded resource limits.
5. Equal-mass elastic collision and momentum conservation.
6. Unequal-mass elastic collision, momentum and kinetic-energy conservation.
7. Inelastic collision does not create kinetic energy.
8. Floor contact arrests downward motion and resolves penetration.
9. Floor restitution produces upward rebound.
10. Static bodies remain immovable and collide.
11. Static flag and zero mass override supplied velocity.
12. Tangential friction impulse generates angular velocity.
13. Gravity integration matches semi-implicit Euler kinematics.
14. High-speed motion is adaptively substepped or explicitly held.
15. Coincident centres remain finite and deterministic.
16. Caller input is not mutated.
17. Input permutation invariance.
18. Replay-equivalent inputs produce identical output.
19. Disabling history does not change final state.
20. Diagnostics expose finite contact state and simulation-only verification.
21. Accumulated friction remains dissipative within the test case.
22. Constant external force matches expected acceleration.
23. Constant torque produces expected angular acceleration.
24. Static-static pairs do not generate contacts or move.
25. Three-body stack remains finite and resolves contacts within tolerance.
26. History timestamps and frame counts are consistent.
27. Numerically unrepresentable inverse mass HOLDs.
28. Body-count hard limit is enforced.
29. Maximum supported body count executes.
30. Malformed gravity and iteration settings fail closed.
31. Free flight without a floor preserves constant horizontal velocity.
32. Zero-restitution collision does not add kinetic energy.
33. Seed is retained as replay metadata without changing deterministic mechanics.
34. Momentum and energy diagnostics are finite.

## Invariants and acceptance tolerances

- Elastic isolated disc collisions: linear momentum and kinetic energy conserved within declared test tolerances.
- Inelastic collisions: no kinetic-energy creation in the tested isolated cases.
- Static bodies: position and velocity unchanged.
- Friction: tested contact does not increase total kinetic energy; accumulated tangential impulse is Coulomb-clamped.
- Numerical state: all returned positions, velocities, angles, and angular velocities finite.
- Invalid/over-limit inputs: `HOLD`, never a fabricated `OK` result.
- Determinism: same input and reversed input order yield identical canonical output.
- Scenario results: assertions are stored alongside JSON inputs.


## Known test limitations

- Tests are not a formal proof of numerical stability or correctness for every initial condition.
- No independent laboratory/physical reference data is included; tests validate analytic cases and internal invariants.
- No cross-platform bitwise reproducibility test has been run across different CPU architectures or JS engines.
- No benchmark comparison against MuJoCo, Chrono, Drake, PhysX, or other engines has been run.
- No continuous-collision guarantee, 3D, articulated constraints, polygon meshes, deformables, FEM, CFD, sensor rendering, or sim-to-real validation is claimed.
- The platform's seven unrelated mutation gates were not completed within the execution window; see validation report.
35. Extreme finite magnitudes are rejected before unsafe arithmetic.
36. Static bodies remain valid with idealized infinite inertia.


## v3.0.0 backend federation tests

`backend-tests.mjs` exercises explicit backend dispatch, no-fallback HOLD behavior, Rapier adapter mapping using a deterministic API test double, optional dependency failure, remote JSON-RPC handshake and response correlation, non-finite output rejection, capability resolution, named Chrono/Drake/DART profiles, full external profile catalog, timeout enforcement and duplicate registration. `platform-backend-integration.test.mjs` exercises a persistent Rapier session adapter against the actual Iteration 47 Simulator using a test double for the Rapier API.

These tests prove adapter/protocol contract behavior only. The live Rapier WASM smoke requires installing a pinned `@dimforge/rapier2d-compat` version. External engine profiles require real host drivers and engine-specific validation suites.
