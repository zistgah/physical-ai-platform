Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Model and adapter authoring guide

## Model quality requirements

A model supplied to `emulate()` should:

1. Be deterministic for a fixed input, state, seed and model version.
2. Use only `context.random()` for stochastic behavior.
3. Avoid wall-clock time, ambient random state, network, file access and hidden mutable globals.
4. Declare model ID/version, units, parameter values and fidelity in metadata.
5. Return plain JSON-compatible finite values.
6. Return `{output,state}` when stateful; do not mutate `context.state`.
7. Use explicit event handling and preserve event sequence.
8. Document numerical method, discretization, assumptions, parameter source and validity range.
9. Carry a validation case and expected tolerance with every model release.
10. Never describe a model as calibrated or physically validated without independent measured data and documented calibration/validation procedure.

## Example: stateful first-order motor

```js
const motorModel = (input, context) => {
  const tau = 0.25;       // seconds, pinned parameter
  const gain = 120;       // rpm/volt, pinned parameter
  const target = gain * input.voltage;
  const rpm = context.state.rpm +
    (target - context.state.rpm) * (1 - Math.exp(-context.dt / tau));
  return { output: { rpm }, state: { rpm } };
};
```

Invoke with `stateful: true`, `initialState: { rpm: 0 }`, an explicit `dt`, and a model version. The discrete update is exact for a first-order constant-input system over the selected step, but the model remains a simplified functional representation.

## Example: generic co-simulation adapter

```js
const adapterModel = createCoSimulationAdapter({
  initialize({ device, metadata }) {
    // Validate the adapter's already-created runtime instance.
  },
  step({ time, dt, input, state, events }) {
    // Advance an already-loaded model one deterministic communication step.
    return { output: { position: state.position }, state };
  }
});
```

The adapter receives simulation, logical and optional physical time plus events and applied faults. The adapter must not perform uncontrolled I/O. For native FMUs or hardware, the external runtime owns loading, lifecycle, transport, deadline handling and provenance. This adapter is only the stable handoff point.

## Validation dataset requirements

A useful physical validation dataset should include:

- immutable device identity and hardware revision;
- sensor identity, calibration status and acquisition configuration;
- synchronized timestamp, clock source, units and sampling rate;
- excitation/input profile and environmental conditions;
- raw observation plus any filtering/transformation metadata;
- uncertainty, resolution, saturation and missing-sample markers;
- model binary/source hash, parameter set, solver and step-size settings;
- train/calibration and holdout/validation separation;
- residual plots/statistics and acceptance rationale;
- operator, test procedure and evidence provenance.

Synthetic samples are not substitutes for this dataset.
