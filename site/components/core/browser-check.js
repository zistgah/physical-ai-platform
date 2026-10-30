/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/browser-check.js
 * FILE PURPOSE: Browser check behind a driver. No static node import, so the browser can load it. The caller does not name the tool.
 * MRD 13.
 */
export function available() {
  const drivers = [];
  if (typeof process !== "undefined" && process.versions?.node) drivers.push("node");
  if (typeof document !== "undefined") drivers.push("browser");
  return drivers;
}

export function checkRoute(url) {
  if (!url) return { outcome: "HOLD", reason: "URL is UNSPECIFIED" };
  return { outcome: "OK", url, drivers: available(), note: "Driver is chosen by the host. This module does not name one." };
}
