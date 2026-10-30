Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Emulation sample fixtures

All fixtures are synthetic deterministic regression data. None is measured hardware telemetry or evidence of physical validation.

| Fixture | Model | Steps | Intended verification |
|---|---|---:|---|
| `dc-motor-step-response.json` | First-order discrete DC motor speed response | 7 | Stateful acceleration, command change and coast-down |
| `thermal-rc-transient.json` | First-order lumped thermal network | 7 | Stateful thermal rise/cooldown under power changes |
| `sensor-quantization.json` | Deterministic sensor quantizer | 5 | Signed input, quantization boundary and exact output |

`sample-test.mjs` runs all three fixtures and deliberately corrupts one motor observation. The three valid fixtures must return `OK`; the corrupted fixture must return `MISMATCH`.
