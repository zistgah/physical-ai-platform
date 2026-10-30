<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# External CFD backend integration contract

## No implicit backend activation

A catalogue entry is not an adapter. An installed executable is not a compatible backend. A successful process exit is not a verified simulation. An adapter must be implemented and tested for a pinned distribution/version.

## Adapter interface

The sibling `extensions/scientific-backend-orchestration/module.js` expects injected adapters:

```js
{
  async probe({ request, manifest }) {
    return { available: true };
  },
  async execute({ job, executionMode, manifest }) {
    return { outcome: "OK", /* normalized backend result */ };
  }
}
```

The adapter owns actual process invocation and environment checks. The generic registry does not execute shell commands, fetch packages or dynamically import code. Do not pass untrusted shell strings. Prefer argument arrays and controlled working directories in the concrete runner.

## CFD job envelope

`buildCfdBackendJob()` requires:

- stable job ID;
- declared physics domain;
- dimensionality 2 or 3;
- non-empty canonical `subjectRefs`;
- canonical `configurationRef`;
- structured solver inputs;
- explicit execution mode (`COLAB`, `REMOTE_SERVICE`, `LOCAL_AGENT`).

The current 1D reference solver is deliberately excluded from this external 2D/3D bridge.

## Required backend adapter lifecycle

1. Validate and pin the exact backend distribution and licence.
2. Probe executable version, build options and requested model capability.
3. Validate mesh format, mesh quality, boundary labels and unit mapping.
4. Generate native case files from canonical input values; preserve originals and hashes.
5. Execute with resource/time limits and captured stdout/stderr.
6. Parse solver outputs using versioned parsers.
7. Validate field dimensions, units, finite values and residual history.
8. Run a benchmark suite appropriate to the selected solver and physics.
9. Return raw outputs and a normalized result. Do not auto-promote evidence.
10. Register adapter and add platform route/workflow only after conformance and regression pass.

## Colab transport

This package does not assume a persistent Colab API. The first supported flow is notebook launch + user-mediated artifact export/import. Any future automated transport must be separately authorized, authenticated, audited and compatible with Colab terms. A Colab notebook must not be used as a general public web server or remote-control host.

## Current Colab OpenFOAM activation path

The notebook's optional installer pins the OpenCFD v2606 package `openfoam2606-default` using the official Debian/Ubuntu repository helper (`https://dl.openfoam.com/add-debian-repo.sh`). It is disabled by default. The optional smoke cell then copies the installed `pitzDaily` tutorial, caps its `endTime` at 200, runs `blockMesh` and `simpleFoam` with a bounded timeout, and labels the result `EXECUTED_UNVERIFIED`. This proves only that the selected executable ran on the selected case. It is not a benchmark verification or a GPU claim.

The notebook intentionally does not auto-build SU2 or Code_Saturne. SU2 must be built/installed with the exact serial/MPI capabilities required by the workflow. Code_Saturne CUDA requires an explicit CUDA-enabled build and compatible NVIDIA SDK, compiler, MPI and numerical dependencies. Their future adapters need separate version-pinned Colab setup and benchmark notebooks before they can be promoted from catalogued candidates.
