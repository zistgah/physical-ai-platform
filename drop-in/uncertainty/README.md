# Uncertainty Study drop-in v1.0.0

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

A separate Iteration 47-compatible package for deterministic Monte Carlo input uncertainty studies. It does not alter the simulation package, canonical kernel, MRD, schemas, or acceptance script.

## Contract

`uncertaintyStudy(spec, { runner, timeoutMs })` samples bounded uniform or truncated-normal input parameters, calls an injected simulation runner serially, and summarizes explicitly named scalar metrics. Results contain min, max, mean, population standard deviation, p05, median, and p95.

- Deterministic xorshift32 seed; sample order is stable.
- Bounds and resource limits are validated before execution.
- Any sample HOLD, malformed result, missing/non-finite metric, timeout, or numerical overflow returns HOLD for the entire study. Partial statistics are not presented as a successful study.
- The module never mutates a canonical model and never upgrades simulation to physical verification.
- Maximums: 32 parameters, 10,000 samples, 32 metrics, 300,000 ms per-sample timeout.

## Quick start

```js
import { uncertaintyStudy } from './module.js';
import { simStep } from '../simulation/module.js';
const result = await uncertaintyStudy(spec, {
  runner: p => {
    const sim = simStep({ bodies: [{ id:'body', x:0, y:2, vx:0, vy:0, mass:p.mass, radius:0.1 }], dt:1/120, steps:120, recordHistory:false });
    if (sim.outcome !== 'OK') return sim;
    const b = sim.bodies[0];
    return { outcome:'OK', metrics:{ finalY:b.y, finalSpeed:Math.hypot(b.vx,b.vy) } };
  }
});
```

## Test

```bash
npm run check
npm test
npm run integration
```

## Qualification boundary

This is statistical input propagation and descriptive summary, not calibration, Bayesian inference, global sensitivity analysis, reliability certification, probabilistic safety assessment, or proof of model validity. Do not treat percentiles as confidence intervals unless the sampling design and statistical assumptions justify that interpretation. Use independent physical evidence to validate the underlying simulator.

## License

GNU General Public License v3.0. See `LICENSE`. Third-party simulation engines retain their own licenses; this package bundles none.
