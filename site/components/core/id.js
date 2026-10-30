/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/id.js
 * FILE PURPOSE: Identity helpers. Stable id generation.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
let seq=0;
export function id(prefix="id"){seq++;return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`}
