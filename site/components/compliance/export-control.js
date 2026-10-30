/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/export-control.js
 * FILE PURPOSE: Export-control layer. Wassenaar, EAR, EU 2021/821, and SCOMET. Unspecified classification is HOLD. No circumvention path.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Regional and export-control layer – Iteration 26
 * Unknown regime or economy HOLDs. This is not a licence determination.
 */
export const REGIMES = ["Wassenaar", "EAR", "EU-2021/821", "SCOMET"];
export const ECONOMIES = ["US", "EU", "IN", "JP", "LOW_RESOURCE"];

export class ExportControl {
  /** evaluate: Evaluates the export-control or compliance decision. Unspecified is HOLD. */
  evaluate({ regime, economy, classification } = {}) {
    if (!REGIMES.includes(regime)) return { outcome: "HOLD", reason: "Regime is UNSPECIFIED" };
    if (!ECONOMIES.includes(economy)) return { outcome: "HOLD", reason: "Economy is UNSPECIFIED" };
    if (!classification || classification === "UNSPECIFIED") return { outcome: "HOLD", reason: "Classification is UNSPECIFIED" };
    return { outcome: "REVIEW", regime, economy, classification, licenceDetermination: false };
  }
}
