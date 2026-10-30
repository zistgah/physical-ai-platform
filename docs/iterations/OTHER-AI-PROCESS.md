# Other-AI build process

Iteration 38. The record of builds done by other AI.

## What happened

Work packages were written as self-contained prompts. Each asked for a zip named with a component id. ChatGPT and Meta AI executed them. The results were stitched into iterations 11 and 12.

## The prompts

A cycler, wp-viewer.html, held the prompts. It was fixed for clipboard fallback, sidebar scroll, valid markup, and reset confirmation. Parallel prompting was added.

## The stitch

Each package was verified against the architecture before it was merged. A package that flattened the kernel was rejected. The kernel stayed the spine.

## What is not recorded

The prompts themselves are not in this repository. The cycler file is not in this repository. The package zips are not in this repository. This note is the record that they happened.
