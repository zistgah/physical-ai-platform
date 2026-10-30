Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Configuration

Status: IMPLEMENTED for fingerprint, freeze, compare. SLICE for compatibility.

## API

- `createConfiguration` – captures component/system identities and versions
- `freezeConfiguration` – immutable; second freeze throws
- `fingerprintConfiguration` – deterministic over sorted id|type|version
- `compareConfigurations` – changed, added, removed
- `isConfigurationCompatible` – breaking if port/connection/interface version differs
- `createBaseline` – frozen baseline derived from a configuration

## Binding

`EvidenceBinding` requires configurationId for SIMULATION, SIL, HIL, PHIL, RIL, INSPECTION, PHYSICAL_TEST. `markStaleForConfiguration` sets stale=true; it does not delete evidence.

## Gaps

Compatibility is a type heuristic, not a full interface contract diff. Manufacturing and deployment baselines are records, not enforced product structures.
