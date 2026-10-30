# Distributed Compute Orchestration Drop-in

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.

## Purpose

A replaceable execution boundary for browser Worker, Colab notebook and HTTPS JSON compute providers. It fills the distributed execution / remote worker protocol gap identified by the platform MRD without changing the canonical kernel.

## What is implemented

- Versioned compute job/result protocol and JSON schemas.
- Provider registry, explicit enablement, health discovery and capability matching.
- CPU/GPU/TPU resource policy with explicit fallback.
- SHA-256 input/output digest helpers using browser Web Crypto.
- Browser Worker transport and executable CPU reliability worker.
- Hardened HTTPS JSON worker transport.
- Colab launch descriptor and an executable PyTorch CUDA / JAX GPU-TPU / NumPy Monte Carlo notebook.
- Monotonic job-state transitions.
- Proposal-only canonical artifact mapping.
- 345 assertions, including 250 generated resource-policy cases.

## What is not claimed

- No unattended Colab API or guaranteed GPU availability.
- No signed remote attestation or cryptographic provider identity.
- No kernel or graph mutation.
- No physical actuation or evidence promotion.
- No automatic route/UI registration in the host spine.
- No JAX or CuPy runtime adapter.
- No production SLA, multi-tenant isolation or confidential compute.

Read `BUILD-ANALYSIS.md`, `API-REFERENCE.md`, `TEST-MATRIX.md`, `COLAB-GUIDE.md` and `STITCH-INSTRUCTIONS.md` before integration.

Provider maturity and license metadata are in `provider-catalog.json`. CuPy is listed as a future adapter only; it is not implemented or advertised as runnable.
