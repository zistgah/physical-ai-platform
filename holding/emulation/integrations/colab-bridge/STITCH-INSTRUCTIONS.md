Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

# Grok stitch instructions - Colab Bridge

1. Copy this folder as a sibling to `drop-in/emulation/`, at `integrations/colab-bridge/`.
2. Keep `module.js`, `manifest.json`, `package.json`, `test.mjs` and this documentation together.
3. Import `module.js` from the browser UI only after confirming the secure-context Web Crypto requirement.
4. Build a SIR-backed job using the canonical kernel's existing SIR access/mapping. Do not duplicate SIR parsing or create another ontology in this package.
5. Offer a download action for the job Blob. Open the selected notebook in Colab through a verified repository URL.
6. Accept a user-uploaded result JSON, call `validateResultBundle(originalJob, result)` and HOLD any failure.
7. Map result values back to canonical SIR ports with explicit units/frames; preserve solver diagnostics and artifact digests.
8. Create a platform-owned simulation evidence record with `SIMULATED`/`UNVERIFIED`. Do not let the bridge create VERIFIED/HIL/REAL evidence.
9. Run `npm test` and the platform acceptance/regression suite.

Do not add Node, Python, Google auth, Drive or a mandatory server to the static browser deployment. Do not treat a digest as an identity signature. The Colab Bridge is a transport/validation component, not an execution service or evidence authority.
