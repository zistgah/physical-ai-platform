/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/teleoperation/site-protocol.js
 * FILE PURPOSE: Site preferences, privacy zones, recording consent, and sterile cockpit. Unknown jurisdiction is NO-GO. Locales stay distinct.
 * MRD 10: cultural profiles, privacy zones, sterile cockpit, distinct locales.
 */
export const LOCALES = ["hi", "ur", "awa", "en"];

export class SiteProtocol {
  constructor() { this.zones = new Map(); this.consent = new Map(); }

  locale(code) {
    if (!LOCALES.includes(code)) return { outcome: "HOLD", reason: "Locale is not a registered script" };
    return { outcome: "OK", locale: code, distinct: true };
  }

  zone(id, { private: isPrivate = false } = {}) {
    if (!id) return { outcome: "HOLD", reason: "Zone is UNSPECIFIED" };
    this.zones.set(id, { id, private: isPrivate });
    return { outcome: "OK", zone: this.zones.get(id) };
  }

  record(zoneId, consentGiven) {
    const zone = this.zones.get(zoneId);
    if (!zone) return { outcome: "HOLD", reason: "Zone is UNSPECIFIED" };
    if (zone.private && consentGiven !== true) return { outcome: "HOLD", reason: "Private zone needs consent" };
    this.consent.set(zoneId, consentGiven === true);
    return { outcome: "OK", recording: consentGiven === true };
  }

  sterile(phase, chatter) {
    const critical = ["POWER_UP", "ABORT", "LANDING"];
    if (critical.includes(phase) && chatter) return { outcome: "HOLD", reason: "Sterile cockpit: no chatter" };
    return { outcome: "OK", phase };
  }

  jurisdiction(known) {
    if (known !== true) return { outcome: "NO-GO", reason: "Jurisdiction is UNKNOWN" };
    return { outcome: "GO", reason: "Jurisdiction is known" };
  }
}
