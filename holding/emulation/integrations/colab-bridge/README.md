Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# PAP Colab Bridge 1.0.0

A separate browser-native package for exporting a canonical SIR-backed emulation job to Google Colab and importing a digest-bound result. This is an additional sibling module not listed in the Iteration 47 handoff. It is deliberately not nested inside `drop-in/emulation/`.

## Responsibilities

- Validate inert JSON structures and reject unsafe keys/accessors/cycles/nonfinite values.
- Create a `pap.emulation.job/1.0` envelope containing SIR, target backend, inputs, observations, configuration and provenance.
- Compute SHA-256 over an explicit canonical payload and derive a deterministic job ID.
- Verify job payload integrity before execution/import.
- Validate `pap.emulation.result/1.0` against the exact job ID and digest.
- Require backend identity/version and a completed Colab execution declaration.
- Validate nonempty finite outputs, strictly increasing sequence and nondecreasing time.
- Reject attempts to claim HIL, physical verification or VERIFIED state.
- Build a Colab GitHub URL only when actual repository owner/name/branch/path are supplied.
- Create a browser Blob for downloading the job JSON.

## Browser usage

```js
import { createJobBundle, verifyJobBundle, validateResultBundle, bundleToBlob } from './module.js';

const job = await createJobBundle({
  sir: canonicalSir,
  target: { backendId: 'scipy.solve_ivp', operation: 'scipy.linear_ode', requestedDevice: 'cpu' },
  inputs: { A: [[-1]], B: [[1]], u: [1], x0: [0], times: [0, 1] },
  observations: null,
  configuration: { solver: 'DOP853' },
  provenance: { source: 'PAP_BROWSER' }
});
const verified = await verifyJobBundle(job);
if (!verified.valid) throw new Error(verified.reason);
const blob = bundleToBlob(job); // create an <a download> in the existing UI
// User opens the selected Colab notebook, uploads the job, executes, downloads result.
const imported = await validateResultBundle(job, resultJson);
if (!imported.valid) throw new Error(imported.reason);
```

`crypto.subtle` requires a secure context (HTTPS or localhost). The bridge does not call Google APIs, store credentials, run Python, execute a notebook or provide a server. It uses a user-mediated file handoff.

## Important security/evidence limits

SHA-256 verifies content integrity relative to the digest; it does not authenticate the backend or signer. Native FMUs may execute arbitrary code and must be trusted/sandboxed separately. A valid result is only `SIMULATED`/`UNVERIFIED`. The canonical platform creates its own evidence record and controls all lifecycle/promotion gates.

## Tests

```bash
npm test
node --check module.js
```
