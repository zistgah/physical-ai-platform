Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# System Intent Representation (SIR)

## Distinction from Project Package

- `.pap.json` – persisted project representation (project package). Produced by `serializeProject`. Contains the project identity, metadata (kind: "pap"), and the project graph.
- `.sir.json` – semantic interchange representation. Produced by `serializeToSIR`. Contains magic "PAI-SIR", structured views (intent, policy, requirements, architecture, components, ports, connections, etc.), and the embedded graph for lossless round-trip.

They overlap in content but serve different contracts. Do not conflate them.

## Round-trip

Project → serializeToSIR → .sir.json → deserializeFromSIR → Project

Semantic content (identities, types, relations, contracts, ports, connections, requirements, tests, evidence, provenance, configuration) is preserved.

Ordering differences are normalized by `canonicalizeGraph`.

## Schema

`schemas/sir.schema.json` describes the actual structure used by the serializer, including the embedded graph.

Validation: `kernel.validateSIR(data)` rejects malformed documents (missing magic, version, header, or graph).

## Scope of this iteration

Deterministic interchange contract established.

Full future SIR compiler pipeline is FUTURE_ADAPTER.
