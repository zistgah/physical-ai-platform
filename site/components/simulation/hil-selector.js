/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/simulation/hil-selector.js
 * FILE PURPOSE: Selects a HIL implementation. spine is the current loop. dropin is the hardware-adapter version. A missing choice holds.
 * License: GPL-3.0-only.
 */
import { runLoop } from "./hil-loop.js";
import { hilStep } from "../../../drop-in/hil/module.js";

export function selectHil(choice) {
  if (choice === "spine") return { outcome: "OK", impl: "spine", run: runLoop };
  if (choice === "dropin") return { outcome: "OK", impl: "dropin", run: hilStep };
  return { outcome: "HOLD", reason: "Choice is UNSPECIFIED. Use spine or dropin." };
}
