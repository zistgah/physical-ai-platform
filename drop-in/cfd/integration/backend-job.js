/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * Maps a CFD request into the generic scientific-backend orchestration envelope.
 * It does not create canonical entities or execute a solver.
 * SPDX-License-Identifier: GPL-3.0-only
 */
const hold = (code, reason) => ({ outcome: "HOLD", code, reason });
export function buildCfdBackendJob({ id, physicsDomain, dimensions, subjectRefs, configurationRef, inputs, requestedExecutionMode }) {
  if (typeof id !== "string" || !id.trim()) return hold("JOB_ID_MISSING", "A stable job id is required.");
  if (!Number.isInteger(dimensions) || dimensions < 2 || dimensions > 3) return hold("EXTERNAL_DIMENSION_UNSUPPORTED", "External CFD jobs through this adapter require 2D or 3D dimensions.");
  if (typeof physicsDomain !== "string" || !physicsDomain.trim()) return hold("PHYSICS_DOMAIN_MISSING", "A declared physics domain is required.");
  if (!Array.isArray(subjectRefs) || !subjectRefs.length || subjectRefs.some((x) => typeof x !== "string" || !x.trim())) return hold("SUBJECT_BINDING_MISSING", "Bind the job to canonical subject references.");
  if (typeof configurationRef !== "string" || !configurationRef.trim()) return hold("CONFIGURATION_BINDING_MISSING", "Bind the job to a canonical configuration revision.");
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return hold("SOLVER_INPUTS_MISSING", "Solver inputs must be a structured object.");
  if (!new Set(["COLAB", "REMOTE_SERVICE", "LOCAL_AGENT"]).has(requestedExecutionMode)) return hold("EXECUTION_MODE_INVALID", "External CFD backends require COLAB, REMOTE_SERVICE or LOCAL_AGENT mode.");
  return {
    outcome: "OK",
    job: {
      id, domain: physicsDomain, dimensions, subjectRefs: [...subjectRefs], configurationRef,
      inputs: structuredClone(inputs), requestedExecutionMode,
      requestedTrustState: "UNVERIFIED",
      validationBoundary: "SIMULATION_ONLY_NOT_PHYSICAL_VALIDATION"
    }
  };
}
