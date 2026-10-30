Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Code reference - Emulation 1.2.0

## 1. `module.js` architecture

`module.js` is a pure ECMAScript module with no imports and no browser-global side effects. Its exported API is:

- `EMULATION_API_VERSION`: public core API version (`1.2.0`).
- `DEFAULT_TOLERANCE`: default absolute and relative numeric tolerances.
- `fingerprint(value)`: FNV-1a correlation fingerprint. It is explicitly not cryptographic.
- `validatePortContract(ports, values, direction)`: validates port names, paths, direction, type, requiredness and numeric bounds. Unit conversion is never implicit.
- `createCoSimulationAdapter(adapter)`: wraps a synchronous adapter's initialize/step interface for the deterministic model callback.
- `emulate(options)`: validates, executes, compares and emits result/evidence metadata.
- `compareValues`: exported comparison helper for tests and advanced integrations.

## 2. Validation pipeline

1. Validate device identity and model resolution.
2. Validate tolerance object, seed, metadata, stateful flag, initial state and optional ports/faults.
3. Inspect all JSON inputs and observations without invoking accessors. Reject cycles, non-plain objects, symbols, sparse arrays, accessors, undefined values, functions, nonfinite numbers and excessive nesting.
4. Validate every step before execution. A malformed later step prevents partial execution.
5. Validate sequence/time/event order and event payloads.
6. Validate nominal input ports.
7. Clone input and apply only declared deterministic faults.
8. Invoke the synchronous model with a defensive context containing time, sequence, state, seed, metadata and seeded random source.
9. Validate output JSON and output ports.
10. Compare predicted and observed structures recursively.
11. Aggregate mismatch paths, error metrics, step summaries and replay fingerprints.
12. Emit `OK`, `MISMATCH` or `HOLD`; preserve `UNVERIFIED` evidence status.

## 3. Numeric comparison

For predicted value `p` and observed value `o`, the nominal policy is:

`|p-o| <= atol + rtol * max(|p|, |o|)`

The implementation normalizes by the larger magnitude to avoid overflow when subtracting extreme finite values. A small four-ULP boundary slack makes a mathematically exact tolerance boundary inclusive despite floating-point normalization. This slack is machine-rounding accommodation, not an engineering uncertainty allowance. Path-specific tolerance overrides are available.

Metrics include maximum absolute error, maximum relative error, RMSE and mean signed error. Values are bounded to finite diagnostic ranges where necessary. The meaning of tolerance must be established by the discipline/model owner; defaults are software defaults, not universal physical acceptance criteria.

## 4. Time, events and state

- Simulation time is the model's independent variable.
- Logical time represents event/order semantics.
- Physical time is optional external timestamp metadata.
- These clocks are not substituted for one another.
- Sequence numbers are strictly increasing; equal simulation/logical timestamps may represent simultaneous steps where allowed.
- Events retain supplied order and are not silently sorted or dropped.
- Stateful models require an explicit initial state and return `{ output, state }` for each step.
- The final state and initial-state fingerprint are retained for replay.

## 5. Fault semantics

Faults operate on model inputs only. Supported fault kinds are BIAS, SCALE, STUCK, DROP, NOISE and INVERT. Domains include sensor, actuator, power, communication, AI, environment and human authority. Each fault has an ID, target path, optional activation interval and parameters. Missing paths, duplicate IDs, invalid domains and type-incompatible operations return HOLD. Fault traces and seeded noise are reproducible. This is not a physical fault generator or hardware bus manipulation.

## 6. `integrations/colab-bridge/module.js`

This sibling package is a separate browser module. Its functions are:

- `canonicalJson`: deterministic key ordering and inert JSON checks.
- `sha256Hex`: Web Crypto SHA-256 in a secure browser context.
- `createJobBundle`: wraps SIR, target backend, inputs, observations, configuration and provenance into a portable job.
- `validateJobBundle`: structural validation.
- `verifyJobBundle`: verifies canonical payload, digest and deterministic job ID.
- `createResultBundle`: creates a result bound to the job and with non-promotion claims.
- `validateResultBundle`: validates exact job binding, backend identity/version, Colab execution, output shape, sequence/time order, evidence boundary and result digest.
- `buildColabUrl`: constructs a Colab GitHub URL only when actual repository coordinates are supplied.
- `bundleToBlob`: creates a browser JSON Blob for user download.

No Node APIs, Python, remote requests, Colab credentials or arbitrary code execution are present in this module.

## 7. Python notebook protocol

Each `.ipynb` embeds `_pap_colab_protocol.py` helper source so the notebook remains self-contained after opening in Colab. The helper verifies job payload bytes and produces a result envelope. This avoids language-specific JSON float formatting differences: the exact canonical payload string is carried in the envelope and SHA-256 is computed over those bytes. The browser parses the payload and compares its semantic fields with the envelope.

## 8. Trust limitations

SHA-256 protects integrity against accidental/tampered content when the digest is not also maliciously replaced. It does not authenticate the producer. A result digest does not establish that the model is correct, the backend is trustworthy, the observations are physical, or the run is safe. Cryptographic signatures, trusted backend attestations, calibrated uncertainty and physical validation belong to a separate assurance architecture.
