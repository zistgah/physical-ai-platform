# Backend workers

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

`scipy_reference_worker.py` is the one executable reference worker shipped in this package. It accepts a single JSON worker envelope on stdin and writes one JSON response on stdout. It supports only `backendId=scipy`, `operation=numerics.ode`, and `solverOptions.problem=rc-step`. It uses `scipy.integrate.solve_ivp` with an allowlisted integrator method and validates finite positive physical/numerical parameters.

The worker is intentionally narrow. It proves the worker protocol against a real numerical library without pretending to provide a full CFD, FEA, circuit, CAD or multibody worker farm. The other engine profiles in `../backend-driver-profiles.json` are dispatched by the same host transport protocol; their dedicated worker plugins must be installed, pinned and benchmark-tested in the deployment environment.

Run the reference worker through the automated adapter integration test:

```bash
node drop-in/prototyping/backend-test.mjs
node drop-in/prototyping/integration-test.mjs
```

The test checks whether Python 3 and SciPy are available. If they are unavailable, the protocol tests still run and the real SciPy worker test is explicitly SKIP, never PASS.

Production worker services must stage immutable artifacts, run in isolated containers/VMs/HPC jobs, enforce wall-clock/CPU/memory/disk quotas, capture logs, and return content-addressed output artifacts. They must not interpolate user-provided shell strings.
