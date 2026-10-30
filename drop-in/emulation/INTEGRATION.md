Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Integration contract - Emulation 1.2.0

## 1. Canonical mapping

| SIR concept | Emulation / Colab field | Rule |
|---|---|---|
| Canonical component ID | `device.id` / SIR in job | Stable canonical ID |
| Embodiment/component class | `device.type` | Preserve canonical token |
| Model artifact identity/version | `device.modelId`, `device.modelVersion` | Pin artifact and model version |
| Input/output ports | `ports`, `input`, `observed` | Explicit name/type/unit/frame mapping |
| State owner | `initialState`, `stateful` | Component/model owns state; no implicit global writable state |
| Event packets | `steps[].events` | Preserve source, destination, type, priority, sequence and time where SIR provides them |
| Clock domains | `time`, `logicalTime`, `physicalTime`, `dt` | Never substitute wall clock for simulation time |
| Fault campaign | `faults` | Explicit domain/path/window; model-level only |
| Solver selection | `job.target.backendId`, `operation` | Capability-check and pin version |
| Solver inputs | `job.inputs`, `configuration` | Domain schema and validation; do not treat as untyped arbitrary code |
| Observations | `observations` / `steps[].observed` | Retain measurement source, calibration and configuration provenance |
| Backend output | `result.outputs[]` | Preserve time/sequence; map to SIR ports explicitly |
| Backend diagnostics | `result.diagnostics` | Attach to platform evidence record |
| Backend version | `result.backend.version` | Record exact runtime version |
| Model/config digest | job/result digest and SIR artifact refs | Bind run to exact model/configuration |
| Evidence state | `SIMULATED`, `UNVERIFIED` | No automatic physical/HIL/verified promotion |

## 2. Browser-local execution flow

```js
import { emulate } from './drop-in/emulation/module.js';
const result = emulate({ device, input, observed, model, ports, tolerance, metadata });
```

The browser callback must be synchronous, deterministic and side-effect-free except for the provided seeded random source. It is not an arbitrary external process adapter.

## 3. Colab external execution flow

```js
import {
  createJobBundle,
  verifyJobBundle,
  validateResultBundle,
  buildColabUrl,
  bundleToBlob
} from './integrations/colab-bridge/module.js';

const job = await createJobBundle({ sir, target, inputs, observations, configuration, provenance });
const verifiedJob = await verifyJobBundle(job);
if (!verifiedJob.valid) throw new Error(verifiedJob.reason);
const downloadBlob = bundleToBlob(job);
// User downloads job JSON and opens the selected notebook in Colab.
// User later uploads the result JSON through the browser UI.
const check = await validateResultBundle(job, uploadedResult);
if (!check.valid) throw new Error(check.reason);
// Only now map normalized outputs into SIR and create platform-owned evidence.
```

The bridge does not perform remote execution. It does not trust a result merely because it has a digest. It checks the payload/body relationship, exact job binding, backend identity, execution metadata, output shape, finite values, sample order/time and non-promotion claims.

## 4. Result semantics

A valid Colab result is accepted as an imported simulation artifact, not verified physical evidence. Backend outputs may still require domain-specific unit/frame mapping and comparison against observations. A backend result without corresponding observations can be stored as a simulation run but cannot be called a device match.

## 5. Failure behavior

Invalid or unsupported job/result, digest mismatch, wrong backend, missing backend version, non-Colab runtime declaration, missing outputs, malformed time/sequence, nonfinite values or attempted HIL/physical promotion => `HOLD` at the integration boundary. Preserve detailed reason codes in the platform evidence record.

## 6. Native FMU boundary

FMPy can execute native FMU binaries. The notebook warns users to upload trusted FMUs. Colab is not represented as a hardened sandbox for hostile native binaries. If untrusted FMUs must be tested, use a separate disposable OS/container/VM with strict resource/network/filesystem controls. The static browser never executes FMUs.

## 7. UI integration

The optional UI should:

- Show backend capability, model format and runtime requirements.
- Show whether a notebook is implemented, runtime-tested or only specified.
- Provide an Open-in-Colab link only after repository URL is verified.
- Provide job JSON download and result JSON upload.
- Display backend version, solver diagnostics and actual device.
- Distinguish `simulation completed`, `conformance match`, `physical verification` and `HIL` as separate states.
- Preserve UNKNOWN/HOLD behavior.

Do not claim a package is integrated merely because a link or folder exists.
