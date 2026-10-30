/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/units.js
 * FILE PURPOSE: Unit helpers. Dimension and conversion checks.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
const dimensions={
  m:"length",cm:"length",mm:"length",s:"time",ms:"time",kg:"mass",g:"mass",
  A:"current",V:"voltage",W:"power",N:"force",Nm:"torque",rad:"angle",
  rpm:"angular_rate",C:"temperature"
};
/** validateUnit: Unit helpers. Dimension and conversion checks. */
export function validateUnit(unit){return !unit||unit in dimensions}
/** assertUnit: Unit helpers. Dimension and conversion checks. */
export function assertUnit(unit){if(!validateUnit(unit))throw new Error(`Unknown unit: ${unit}`)}
