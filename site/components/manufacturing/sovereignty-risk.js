/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/manufacturing/sovereignty-risk.js
 * FILE PURPOSE: Risk = Criticality x Irreplaceability x External Control. Each factor is 0, 1, or 2. The five-year question is answered from the product.
 * MRD 1 and 9: sovereignty risk.
 */
export function factor(value) {
  if (value !== 0 && value !== 1 && value !== 2) return { outcome: "HOLD", reason: "Factor must be 0, 1, or 2" };
  return { outcome: "OK", value };
}

export function risk(criticality, irreplaceability, externalControl) {
  const factors = [criticality, irreplaceability, externalControl].map(factor);
  if (factors.some(f => f.outcome !== "OK")) return { outcome: "HOLD", reason: "A factor is UNSPECIFIED" };
  const product = factors.reduce((a, f) => a * f.value, 1);
  return {
    outcome: "OK",
    risk: product,
    fiveYear: product === 0 ? "SURVIVES" : product >= 4 ? "FAILS" : "DEGRADED"
  };
}
