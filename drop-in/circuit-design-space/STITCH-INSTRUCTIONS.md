<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Grok stitch instructions - circuit-design-space

## Classification

This is an **additional eleventh drop-in module**, outside the ten folders enumerated in `HANDOFF.md`. It is a separate optional workbench capability, not a subfolder of `drop-in/circuit/` and not a kernel replacement.

## Placement

Extract this archive to:

`drop-in/circuit-design-space/`

Do not merge its Python source into `drop-in/circuit/module.js`. Do not change the canonical kernel, acceptance script or existing circuit solver to accommodate it.

## Canonical interface

The platform remains the source of component identity and electrical semantics. The adapter should accept only normalized, unit-bearing values resolved from canonical graph objects:

- resistance in ohms;
- capacitance in farads;
- inductance in henries for series-RLC exploration;
- time vector in seconds;
- voltage vector in volts;
- measurement provenance and calibration reference;
- optional design constraints with explicit units.

The first release supports analytical RC and series-RLC design-space domains; parameter identification is currently limited to first-order RC time constant tau. The series-RLC response assumes zero initial inductor current and a specified initial capacitor voltage. Do not pass arbitrary graph JSON into the Python module. The adapter maps canonical component references into these typed values and preserves the source IDs in the result envelope.

## Registration proposal

Register a new capability key such as `circuit.design-space.rc-rlc.v1` in the existing module/Workbench registry, using the repository's existing registration conventions. The capability is optional and may be surfaced as “Design Space / Parameter Identification”. Do not invent a new global registry if one already exists.

Suggested result envelope:

```json
{
  "capability": "circuit.design-space.rc.v1",
  "moduleVersion": "1.0.0",
  "inputComponentRefs": ["canonical-component-id"],
  "inputConfigurationHash": "sha256:...",
  "analysisKind": "ANALYTICAL_DESIGN_SPACE",
  "result": {},
  "evidenceState": "UNVERIFIED",
  "physicalVerification": "NOT_PERFORMED"
}
```

The adapter must generate the real canonical IDs and hashes. The example values are schema illustration only.

## Runtime and browser boundary

- Keep Python/SciPy/JAX out of the static site bundle.
- The browser opens the Colab notebook using an external link.
- Colab is a user-started optional cloud runtime.
- The notebook accepts the separate `circuit-design-space.zip` and verifies its manifest.
- A future trusted worker may run the module server-side, but that is a separate execution adapter and must not become mandatory for GitHub Pages.
- Disclose that uploaded design/measurement data is processed by Google Colab. Apply privacy, IP, licensing, export and jurisdiction policy before upload.

## Evidence and fidelity

The result is analytical exploration / parameter identification. It is not a SPICE simulation, HIL run, physical measurement or certification. Keep evidence state UNVERIFIED until the platform binds it to valid requirements, measurement calibration, configuration and review. No automatic fidelity promotion.

## Tests required after stitching

1. Run `python -m unittest -v` in the package environment.
2. Test canonical component reference mapping and SI conversion.
3. Reject missing units, unknown component IDs, stale measurements and mismatched configuration hashes.
4. Verify that GPU-required requests HOLD if no GPU is available.
5. Verify Colab link paths after repository coordinates are known.
6. Run existing circuit and platform regression suites unchanged.
7. Confirm no changes to kernel, acceptance script or other nine packages.
