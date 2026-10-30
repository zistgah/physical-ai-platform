Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
© 1993–2026 Abhishek Choudhary. All rights reserved.
# Physical AI Platform

**Sovereign Physical AI and Robotics Guidance Platform**

Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.

Licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).

A static-first, componentised knowledge graph, engineering workbench, simulator, education system, research system, manufacturing system, teleoperation layer, safety system and compliance framework for physical AI and robotics.

## Architecture rule

The platform is a collection of replaceable components connected through canonical contracts. The knowledge graph and canonical identifiers are the semantic backbone.

Architectural upgrades are a first-class capability. Platform, schema, component, interface and plugin versions are independent. Explicit schema migrations, interface adapters, plugin manifests and feature flags permit implementation replacement without silently changing the semantic model. Historical artifacts retain their provenance and configuration identity.

No mandatory backend, database, cloud AI provider or proprietary runtime is required for the static GitHub Pages deployment.

## Runtime

- GitHub Pages
- Native ES modules
- Browser APIs
- JSON data
- No framework dependency
- No build dependency required for the baseline
- LocalStorage / IndexedDB for optional local state

## Repository layers

- `site/` browser application (role-first, responsive, AI Guide)
- `data/` canonical knowledge content
- `schemas/` machine-readable contracts
- `docs/` architectural documentation and **Master Requirements Document** (`docs/MRD.md`)
- `sources/mrd-predecessor/` verbatim predecessor architecture documents
- `templates/` generated/reusable artifacts
- `sources/` provenance/reference material
- `tests/` component and integration tests
- `tools/` static validation utilities

## Quick start

1. Clone or download the repository.
2. Serve `site/` (or open via GitHub Pages).
3. Navigate the role-first home page.
4. Run tests locally: `node tools/test-components.mjs`

## AI Guide

The AI Guide page provides deep links to many external AI providers (Grok, ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Mistral, Llama, Qwen, HuggingChat, and others). The platform owns the knowledge structure; external AI is replaceable. No proprietary AI is an architectural dependency.

## Key invariants

- Intent ≠ Policy ≠ Execution ≠ Authority
- Capability ≠ Authority
- UNKNOWN compliance / export status → HOLD
- Simulation ≠ physical verification
- AI output is a proposal until validated
- Documents are views of the canonical model
- Local-first; GitHub is an optional persistence adapter

See `docs/MRD.md` for the full consolidated requirements and `sources/mrd-predecessor/` for the original source documents.
