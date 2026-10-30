/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/open-closures.js
 * FILE PURPOSE: Closes the remaining open rows as self-contained objects. Each reduces to a result. A missing input holds. The graph stays the semantics.
 * MRD 1 to 12.
 */
class Closure {
  constructor(name) { this.name = name; }
  reduce(input) { return { outcome: "HOLD", reason: "Not reduced" }; }
}

class OneModel extends Closure {
  constructor() { super("one-model"); }
  reduce(views) {
    if (!views?.length) return { outcome: "HOLD", reason: "No views" };
    const ids = new Set(views.flatMap(v => v.ids || []));
    return { outcome: "OK", model: [...ids], views: views.length };
  }
}

class AiProposal extends Closure {
  constructor() { super("ai-proposal"); }
  reduce(proposal) {
    if (!proposal) return { outcome: "HOLD", reason: "No proposal" };
    return { outcome: "PROPOSAL", accepted: false, text: proposal };
  }
}

class DigitalThread extends Closure {
  constructor() { super("digital-thread"); }
  reduce(events) {
    if (!events?.length) return { outcome: "HOLD", reason: "No events" };
    return { outcome: "OK", thread: events.map(e => e.id) };
  }
}

class Workflow extends Closure {
  constructor() { super("workflow"); }
  reduce(steps) {
    if (!steps?.length) return { outcome: "HOLD", reason: "No steps" };
    return { outcome: "OK", done: steps.filter(s => s.done).length, total: steps.length };
  }
}

class Fidelity extends Closure {
  constructor() { super("fidelity"); }
  reduce(level) {
    if (level == null) return { outcome: "HOLD", reason: "Level is UNSPECIFIED" };
    if (level < 0 || level > 7) return { outcome: "HOLD", reason: "Level is outside L0 to L7" };
    return { outcome: "OK", level };
  }
}

class Fault extends Closure {
  constructor() { super("fault"); }
  reduce(kind) {
    const kinds = ["sensor", "actuator", "power", "comms", "ai", "environment"];
    if (!kinds.includes(kind)) return { outcome: "HOLD", reason: "Fault kind is not known" };
    return { outcome: "INJECTED", kind };
  }
}

class Lifecycle extends Closure {
  constructor() { super("lifecycle"); }
  reduce(gate) {
    if (gate == null) return { outcome: "HOLD", reason: "Gate is UNSPECIFIED" };
    if (gate < 0 || gate > 12) return { outcome: "HOLD", reason: "Gate is outside G0 to G12" };
    return { outcome: "OK", gate };
  }
}

class Applicability extends Closure {
  constructor() { super("applicability"); }
  reduce(standard) {
    if (!standard?.id) return { outcome: "HOLD", reason: "Standard is UNSPECIFIED" };
    return { outcome: "INFORMATIONAL", id: standard.id, binding: false };
  }
}

class Bom extends Closure {
  constructor() { super("bom"); }
  reduce(items) {
    if (!items?.length) return { outcome: "HOLD", reason: "BOM is empty" };
    return { outcome: "OK", count: items.length };
  }
}

class Billing extends Closure {
  constructor() { super("billing"); }
  reduce(cost) {
    if (cost == null || cost < 0) return { outcome: "HOLD", reason: "Cost is not a number" };
    return { outcome: "OK", cost };
  }
}

class Sovereignty extends Closure {
  constructor() { super("sovereignty"); }
  reduce(risk) {
    if (risk == null) return { outcome: "HOLD", reason: "Risk is UNSPECIFIED" };
    if (risk < 0 || risk > 1) return { outcome: "HOLD", reason: "Risk is outside 0 to 1" };
    return { outcome: "OK", risk };
  }
}

class Substitution extends Closure {
  constructor() { super("substitution"); }
  reduce(level) {
    const levels = ["identical", "equivalent", "compatible", "none"];
    if (!levels.includes(level)) return { outcome: "HOLD", reason: "Level is not known" };
    return { outcome: "OK", level };
  }
}

class Teleop extends Closure {
  constructor() { super("teleop"); }
  reduce(role) {
    if (role !== "operator" && role !== "supervisor") return { outcome: "HOLD", reason: "Role has no authority" };
    return { outcome: "OK", role };
  }
}

class Pic extends Closure {
  constructor() { super("pic"); }
  reduce(role) {
    if (role !== "PIC" && role !== "SafetyAuthority") return { outcome: "HOLD", reason: "Role is not operational" };
    return { outcome: "OK", role };
  }
}

class Secret extends Closure {
  constructor() { super("secret"); }
  reduce(text) {
    if (typeof text !== "string") return { outcome: "HOLD", reason: "Text is UNSPECIFIED" };
    const redacted = text.replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED]");
    return { outcome: "OK", redacted, found: redacted !== text };
  }
}

class DualUse extends Closure {
  constructor() { super("dual-use"); }
  reduce(item) {
    if (!item) return { outcome: "HOLD", reason: "Item is UNSPECIFIED" };
    return { outcome: "REVIEW", item, cleared: false };
  }
}

class Sharing extends Closure {
  constructor() { super("sharing"); }
  reduce(link) {
    if (!link?.from || !link?.to) return { outcome: "HOLD", reason: "Link is incomplete" };
    return { outcome: "OK", from: link.from, to: link.to };
  }
}

export const CLOSURES = {
  oneModel: new OneModel(),
  aiProposal: new AiProposal(),
  digitalThread: new DigitalThread(),
  workflow: new Workflow(),
  fidelity: new Fidelity(),
  fault: new Fault(),
  lifecycle: new Lifecycle(),
  applicability: new Applicability(),
  bom: new Bom(),
  billing: new Billing(),
  sovereignty: new Sovereignty(),
  substitution: new Substitution(),
  teleop: new Teleop(),
  pic: new Pic(),
  secret: new Secret(),
  dualUse: new DualUse(),
  sharing: new Sharing()
};
