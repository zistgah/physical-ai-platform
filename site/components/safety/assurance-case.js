/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/safety/assurance-case.js
 * FILE PURPOSE: Assurance case. Claim, argument, evidence. Missing evidence is not a closed case.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Assurance Case - Iteration 10 drop-in.
 *
 * Walks an assurance case on the canonical graph. It does not replace
 * assurance-path.js and does not create a second graph, ontology, or store.
 * Missing hops are reported explicitly. Evidence is configuration-bound and
 * stale evidence cannot complete a case.
 */

const REQUIRED_HOPS = [
  "hazard-CAUSED_BY-cause",
  "hazard-CONTROLLED_BY-requirement",
  "claim-SUPPORTED_BY-argument",
  "argument-EVIDENCED_BY-evidence"
];

function outgoing(kernel, sourceId, relation) {
  return kernel.store.relations
    .filter(r => r.source === sourceId && r.relation === relation)
    .map(r => kernel.store.get(r.target))
    .filter(Boolean);
}

function hasEdge(kernel, sourceId, relation, targetId) {
  return kernel.store.relations.some(
    r => r.source === sourceId && r.relation === relation && r.target === targetId
  );
}

function isStale(evidence, configurationId, kernel) {
  if (evidence.stale === true) return true;
  if (evidence.configurationId !== configurationId) return true;

  // If the evidence records the configuration fingerprint, a changed current
  // fingerprint invalidates the evidence even when no explicit stale flag was
  // written. This is a freshness check, not an automatic promotion.
  const cfg = kernel.store.get(configurationId);
  if (
    cfg &&
    evidence.configurationFingerprint != null &&
    cfg.fingerprint != null &&
    evidence.configurationFingerprint !== cfg.fingerprint
  ) return true;

  return false;
}

export class AssuranceCaseBuilder {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    this.kernel = kernel;
  }

  /**
   * Walk an assurance case beginning at a hazard and claim.
   *
   * Options:
   *   - claimId: claim to walk; optional, but required for a complete case
   *   - configurationId: named configuration against which evidence is checked
   *
   * The method never creates missing edges or substitutes another object.
   */
  walk(hazardId, { claimId = null, configurationId = null } = {}) {
    const hazard = this.kernel.store.get(hazardId);
    if (!hazard || hazard.type !== "Hazard") {
      return {
        complete: false,
        missing: ["hazard"],
        missingHops: REQUIRED_HOPS,
        hazard: null,
        cause: null,
        causes: [],
        requirement: null,
        requirements: [],
        claim: null,
        argument: null,
        evidence: [],
        configurationId,
        staleEvidence: []
      };
    }

    const causes = outgoing(this.kernel, hazardId, "CAUSED_BY");
    const requirements = outgoing(this.kernel, hazardId, "CONTROLLED_BY")
      .filter(e => e.type === "Requirement");

    const claim = claimId ? this.kernel.store.get(claimId) : null;
    const argumentsForClaim = claim
      ? outgoing(this.kernel, claim.id, "SUPPORTED_BY").filter(e => e.type === "Argument")
      : [];

    const argument = argumentsForClaim[0] || null;
    const evidence = argument
      ? outgoing(this.kernel, argument.id, "EVIDENCED_BY").filter(e => e.type === "Evidence")
      : [];

    const missing = [];
    const missingHops = [];

    if (!causes.length) {
      missing.push("cause");
      missingHops.push("hazard-CAUSED_BY-cause");
    }
    if (!requirements.length) {
      missing.push("requirement");
      missingHops.push("hazard-CONTROLLED_BY-requirement");
    }
    if (!claim) {
      missing.push("claim");
    } else if (!argumentsForClaim.length) {
      missing.push("argument");
      missingHops.push("claim-SUPPORTED_BY-argument");
    }
    if (claim && argument && !evidence.length) {
      missing.push("evidence");
      missingHops.push("argument-EVIDENCED_BY-evidence");
    }

    if (!configurationId) missing.push("configuration");

    const staleEvidence = evidence.filter(e =>
      configurationId ? isStale(e, configurationId, this.kernel) : true
    );
    if (staleEvidence.length) {
      missing.push("fresh evidence");
      for (const e of staleEvidence) {
        if (!missingHops.includes("argument-EVIDENCED_BY-evidence")) {
          missingHops.push("argument-EVIDENCED_BY-evidence");
        }
      }
    }

    const usableEvidence = evidence.filter(e => {
      if (!configurationId) return false;
      if (e.configurationId !== configurationId) return false;
      if (!e.method) return false;
      return !isStale(e, configurationId, this.kernel);
    });

    if (evidence.length && !usableEvidence.length) {
      missing.push("configuration-bound evidence");
    }

    const complete = Boolean(
      causes.length &&
      requirements.length &&
      claim &&
      argument &&
      usableEvidence.length &&
      configurationId &&
      missing.length === 0
    );

    return {
      complete,
      missing: [...new Set(missing)],
      missingHops,
      hazard,
      causes,
      cause: causes[0] || null,
      requirements,
      requirement: requirements[0] || null,
      claim,
      argument,
      evidence,
      usableEvidence,
      staleEvidence,
      configurationId,
      paths: {
        hazardCause: causes.map(cause => ({ source: hazard.id, relation: "CAUSED_BY", target: cause.id })),
        hazardControl: requirements.map(requirement => ({ source: hazard.id, relation: "CONTROLLED_BY", target: requirement.id })),
        claimSupport: argument ? [{ source: claim.id, relation: "SUPPORTED_BY", target: argument.id }] : [],
        argumentEvidence: evidence.map(ev => ({ source: argument?.id || null, relation: "EVIDENCED_BY", target: ev.id }))
      }
    };
  }

  /**
   * Convenience builder that accepts explicit object IDs and returns the same
   * walk result. It deliberately performs no mutation.
   */
  build({ hazardId, claimId, configurationId }) {
    return this.walk(hazardId, { claimId, configurationId });
  }

  /**
   * Validate that a supplied evidence object is explicitly bound to the named
   * configuration and has a method. No evidence is inferred.
   */
  validateEvidence(evidenceId, configurationId) {
    const evidence = this.kernel.store.get(evidenceId);
    const configuration = configurationId ? this.kernel.store.get(configurationId) : null;
    const missing = [];

    if (!evidence || evidence.type !== "Evidence") missing.push("evidence");
    if (!configuration || configuration.type !== "Configuration") missing.push("configuration");
    if (evidence && !evidence.method) missing.push("evidence.method");
    if (evidence && evidence.configurationId !== configurationId) missing.push("evidence.configurationId");
    if (evidence && configuration && isStale(evidence, configurationId, this.kernel)) missing.push("fresh evidence");

    return {
      valid: missing.length === 0,
      missing,
      evidence: evidence || null,
      configurationId: configurationId || null
    };
  }
}
