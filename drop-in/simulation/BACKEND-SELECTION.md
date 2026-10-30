# Backend selection policy

1. A request names a backend explicitly, or the platform's future capability resolver selects one using declared physical requirements. Never silently substitute a different engine.
2. Reject a backend if it cannot represent a requested shape, joint, contact law, material, field or sensor. Do not drop unsupported features.
3. Persist exact engine/build/adapter versions, input configuration, solver settings, units, frames and validation profile.
4. Compare backends using problem-specific observables and tolerances, not assumed bitwise identity.
5. Keep the native-disc solver as a transparent reference and deterministic baseline. It is not the default fallback for a failed external engine.
6. Treat every solver result as SIMULATED. Physical verification requires independent, subject/configuration-bound measurement evidence.
7. A backend profile advances through `CATALOGUED -> ADAPTER_IMPLEMENTED -> RUNTIME_INSTALLED -> CONFORMANCE_TESTED -> PLATFORM_INTEGRATED -> QUALIFIED`. Never skip a gate.
