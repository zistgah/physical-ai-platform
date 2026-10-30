<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Grok stitch instructions - separate sibling package

Copy this directory to `extensions/scientific-backend-orchestration/`. This is an additive module not listed among the original ten Iteration 47 packages. Do not place it inside `drop-in/cfd/` and do not merge it into the canonical kernel.

1. Run `node extensions/scientific-backend-orchestration/tests/test.mjs`.
2. Review the package manifest and exported contract.
3. Instantiate the registry inside the platform's existing execution/workflow service by importing from the extensions path.
4. Inject concrete adapters from separately maintained backend integrations. Never dynamically import a user-supplied path.
5. Resolve canonical subject/configuration references in the host before execution. The registry re-probes availability immediately before execution; a stale discovery result is not sufficient.
6. Keep the registry result `EXECUTED_UNVERIFIED`. Independent validation remains a separate gate.
7. Add platform tests proving the workflow can discover and select a backend without bypassing canonical policies.
8. Register a UI route only after at least one real adapter is installed and tested. An empty registry must show unavailable, not success.
