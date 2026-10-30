/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/disclaimer.js
 * FILE PURPOSE: Master and contextual disclaimers and the indemnity for use.
 * MRD 11: governance, disclaimers, dual-use, user responsibility.
 */

export const MASTER_DISCLAIMER = [
  "This platform is a systems-engineering aid. It is not a certified product, not legal advice, and not a safety authority.",
  "Simulation is not physical verification. A green gate in software is not authorization to energize hardware.",
  "AI output is a proposal until a human with authority accepts it. The platform never confers authority.",
  "Standards records are informational until a project adopts them. Adoption is not certification.",
  "Export-control status defaults to UNKNOWN, which is HOLD. Open source, academic use, and humanitarian use are not unrestricted.",
  "You are responsible for applicable law, authorization, safety, validation, and the consequences of use."
].join(" ");

export const INDEMNITY = [
  "To the extent permitted by applicable law, you use this software at your own risk.",
  "The authors and AyeAI provide it without warranty of any kind, as stated in the GNU General Public License v3.0.",
  "You agree to indemnify and hold harmless the authors and AyeAI from claims arising out of your use, your hardware, your data, your jurisdiction, or your failure to obtain required authorization.",
  "Nothing here limits liability that cannot be limited by law."
].join(" ");

export const CONTEXTS = {
  simulation: "A simulation result is method SIMULATION until promoted by evidence of a higher method. It does not authorize physical operation.",
  hil: "Hardware-in-the-loop requires a bound transport. A software adapter is not a hardware loop.",
  compliance: "A compliance PASS is a model state. It is not a certificate and not a legal determination.",
  manufacturing: "A work order and a BOM projection are not a factory release. Production needs its own authorization.",
  education: "Learning content is not a substitute for supervision. Physical work needs a responsible adult or a qualified instructor.",
  teleoperation: "Remote access is a transfer. Unknown jurisdiction is NO-GO. Local safety authority can always stop.",
  cad: "A mesh volume is a geometric check. It is not a manufactured part and not a structural approval."
};

export function disclaimerFor(context) {
  return { master: MASTER_DISCLAIMER, indemnity: INDEMNITY, context: CONTEXTS[context] || null };
}
