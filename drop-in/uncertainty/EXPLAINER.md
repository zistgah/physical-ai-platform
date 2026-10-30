# Uncertainty Study Module - Explainer

**Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.** AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

## Purpose

The uncertainty module answers a bounded question: if explicitly selected input parameters vary within declared distributions and limits, how do selected scalar outputs from an injected simulator vary across a reproducible set of runs?

## Execution

1. Validate parameter distributions, limits, seed, sample count and metric names.
2. Generate deterministic samples using the supplied uint32 seed.
3. Invoke the caller-supplied simulation runner serially.
4. Require each sample to return `outcome: OK` and finite named metrics.
5. If every sample succeeds, compute descriptive statistics. Otherwise return `HOLD` and do not return a partial successful study.

## What it does not do

It does not modify the canonical model, calibrate the simulator, infer posterior distributions, compute global sensitivity indices, prove safety, or validate a model against physical measurements. Its output is simulation-derived descriptive uncertainty only.
