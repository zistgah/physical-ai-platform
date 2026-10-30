# Distributed Compute Orchestration API Reference

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## `module.js`

| Export | Signature / purpose |
|---|---|
| `COMPUTE_PROTOCOL` | `ayeai.compute.job/v1` |
| `COMPUTE_STATES`, `COMPUTE_TRANSITIONS` | Allowed lifecycle states and transition graph |
| `ComputeContractError` | Stable `code` and message |
| `validateComputeJob(job, options)` | JSON-safe, schema-level and size validation |
| `ComputeProviderRegistry(options)` | Register, enable, disable, list, discover and plan |
| `digestJson(value, subtle?)` | Browser Web Crypto SHA-256 over canonical JSON |
| `verifyComputeInputDigest(job, subtle?)` | Bind input digest to payload |
| `validateComputeResult(job,result,providerId)` | Correlation, provider, status, evidence and digest-shape validation |
| `verifyComputeOutputDigest(result, subtle?)` | Bind output digest to result payload |
| `transitionComputeState(current,next)` | Enforce legal state transitions |
| `createColabLaunchDescriptor(options)` | Generate upload URL or GitHub Colab URL from explicit coordinates |
| `createBrowserWorkerTransport(options)` | Invoke same-origin/module browser worker with timeout and termination |
| `createHttpsJsonTransport(options)` | HTTPS JSON worker transport with timeout, size limit, redirect rejection and correlation |
| `toCanonicalComputeArtifact(job,plan,validation,result)` | Create a non-mutating proposal payload for host graph adapter |

## `browser-worker.js`

`runReliabilityMonteCarlo(job, subtle?)` implements a deterministic seeded xorshift Monte Carlo estimate for independent exponential series-system reliability. It validates input, verifies the input digest, compares against the analytic reliability, computes standard error and a 95% normal-approximation interval, and returns a `SIMULATED` result with output digest.

The worker listener is activated only in a Worker global. The pure function is importable in Node tests.

## Job schema

See `schemas/job.schema.json`. Required identity includes protocol, job ID, capability, execution class, SHA-256 input digest, resource requirements, source/configuration provenance and payload.

Accelerator values:
- `none`: no accelerator requirement.
- `preferred`: prefer GPU/TPU; CPU fallback requires explicit `allowFallback`.
- `required`: GPU/TPU required; never fall back to CPU.

## Result schema

See `schemas/result.schema.json`. Only `PLANNED` and `SIMULATED` evidence states are accepted. The host must still validate provider authenticity, configuration binding and domain-specific correctness.

## Important distinction

SHA-256 is an integrity digest, not a digital signature. A correct digest does not prove who ran the job, what hardware was used, or whether the remote runtime was trustworthy.
