/**
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Hosted Compute Interoperability Contract (HCIC)
 *
 * This module does not execute solvers. It plans and validates work delegated
 * to replaceable hosted notebook / external compute environments, then emits
 * a simulation evidence draft bound to the canonical project/configuration.
 * External numerical packages remain optional and are never imported here.
 */

export const HOSTED_COMPUTE_VERSION = "1.0.0";
export const HOSTED_COMPUTE_METHOD = "SIMULATION";
const HASH_RE = /^[a-f0-9]{64}$/i;
const finite = (v) => typeof v === "number" && Number.isFinite(v);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const unique = (xs) => [...new Set(xs)];

/**
 * Catalog entries describe integration maturity, not guaranteed availability.
 * `hostedFit` is a deployment hint; actual runtime capability is probed at run.
 */
export const COMPUTE_BACKEND_CATALOG = Object.freeze([
  { id:"numpy-scipy", name:"NumPy + SciPy", domain:["linear-algebra","ode","sparse","optimization","signal"], accelerators:["cpu"], hostedFit:"native-or-pip", execution:"python", license:"BSD-3-Clause", url:"https://numpy.org/;https://scipy.org/", maturity:"established", notes:"Reference CPU path; broad numerical primitives." },
  { id:"pytorch", name:"PyTorch", domain:["tensor","autodiff","deep-learning","pde-prototype"], accelerators:["cpu","nvidia-gpu"], hostedFit:"usually-preinstalled-check-version", execution:"python", license:"BSD-3-Clause", url:"https://pytorch.org/", maturity:"established", notes:"Tensor/autograd and GPU kernels; not a general-purpose validated CFD/FEM solver by itself." },
  { id:"jax", name:"JAX", domain:["tensor","autodiff","optimization","pde-prototype"], accelerators:["cpu","nvidia-gpu","tpu"], hostedFit:"pip-wheel-check-driver", execution:"python", license:"Apache-2.0", url:"https://docs.jax.dev/en/latest/installation.html", maturity:"established", notes:"XLA compilation; accelerator wheel and driver compatibility must be checked." },
  { id:"cupy", name:"CuPy", domain:["array","linear-algebra","fft","sparse"], accelerators:["nvidia-gpu"], hostedFit:"cuda-wheel-check-driver", execution:"python", license:"MIT", url:"https://docs.cupy.dev/en/stable/install.html", maturity:"established", notes:"NumPy/SciPy-like GPU arrays; CUDA-specific installation and feature gaps apply." },
  { id:"taichi", name:"Taichi", domain:["gpu-kernels","physics","particles","pde-prototype"], accelerators:["cpu","nvidia-gpu","vulkan"], hostedFit:"pip-wheel-check-device", execution:"python", license:"Apache-2.0", url:"https://www.taichi-lang.org/", maturity:"established", notes:"Data-oriented GPU programming; solver verification remains application-owned." },
  { id:"warp", name:"NVIDIA Warp", domain:["gpu-kernels","physics","robotics","differentiable-simulation"], accelerators:["cpu","nvidia-gpu"], hostedFit:"pip-wheel-check-driver", execution:"python", license:"Apache-2.0", url:"https://github.com/NVIDIA/warp", maturity:"established", notes:"GPU-accelerated simulation kernels; verify device and precision behavior." },
  { id:"petsc", name:"PETSc / petsc4py", domain:["sparse","linear-algebra","fem","pde","mpi"], accelerators:["cpu","nvidia-gpu"], hostedFit:"native-build-or-container", execution:"python-c-api", license:"BSD-2-Clause", url:"https://petsc.org/;https://petsc.org/release/petsc4py/", maturity:"established", notes:"Scalable Krylov, multigrid and distributed solvers; hosted setup is nontrivial." },
  { id:"fenicsx", name:"FEniCSx", domain:["fem","pde","multiphysics"], accelerators:["cpu"], hostedFit:"container-or-conda-forge-check", execution:"python-cpp", license:"LGPL-3.0-or-later", url:"https://fenicsproject.org/", maturity:"established", notes:"Finite-element framework; installation and MPI stack require validation." },
  { id:"mfem", name:"MFEM", domain:["fem","pde","high-order-fem"], accelerators:["cpu","nvidia-gpu"], hostedFit:"native-build-or-container", execution:"cpp-python-bindings", license:"BSD-3-Clause", url:"https://mfem.org/", maturity:"established", notes:"High-order finite elements and GPU-capable builds; not a simple pip-only Colab dependency." },
  { id:"su2", name:"SU2", domain:["cfd","fem","adjoint","optimization","multiphysics"], accelerators:["cpu"], hostedFit:"binary-or-native-build", execution:"native-cli", license:"LGPL-2.1-or-later", url:"https://su2code.github.io/", maturity:"established", notes:"Production-oriented PDE/CFD suite; use validated tutorial cases and pinned binaries." },
  { id:"openfoam", name:"OpenFOAM", domain:["cfd","finite-volume","multiphase","combustion"], accelerators:["cpu"], hostedFit:"container-or-native-build", execution:"native-cli", license:"GPL-3.0-or-later", url:"https://openfoam.org/", maturity:"established", notes:"Mature CFD toolbox; full install in ephemeral notebook runtimes can be costly." },
  { id:"pybullet", name:"PyBullet", domain:["rigid-body","robotics","contact","kinematics"], accelerators:["cpu"], hostedFit:"pip-wheel", execution:"python", license:"zlib", url:"https://pybullet.org/;https://github.com/bulletphysics/bullet3", maturity:"established", notes:"Rigid-body simulation; solver settings and validation remain explicit." },
  { id:"mujoco", name:"MuJoCo", domain:["rigid-body","robotics","contact","control"], accelerators:["cpu","nvidia-gpu-rendering-optional"], hostedFit:"pip-wheel", execution:"python-c-api", license:"Apache-2.0", url:"https://mujoco.org/", maturity:"established", notes:"Physics engine; GPU acceleration is not a blanket guarantee for physics stepping." },
  { id:"project-chrono", name:"Project Chrono", domain:["multibody","contact","vehicle","fea"], accelerators:["cpu","nvidia-gpu-optional"], hostedFit:"native-build-or-container", execution:"cpp-python-bindings", license:"BSD-3-Clause", url:"https://projectchrono.org/", maturity:"established", notes:"Multibody and multiphysics ecosystem; build configuration determines available modules." },
  { id:"elmer", name:"Elmer FEM", domain:["fem","pde","multiphysics"], accelerators:["cpu"], hostedFit:"binary-or-native-build", execution:"native-cli", license:"GPL-2.0-or-later", url:"https://www.elmerfem.org/", maturity:"established", notes:"Multiphysics FEM suite; external binary integration." },
  { id:"numba", name:"Numba", domain:["jit","array","cpu-kernels","cuda-kernels"], accelerators:["cpu","nvidia-gpu"], hostedFit:"pip-wheel", execution:"python", license:"BSD-2-Clause", url:"https://numba.readthedocs.io/", maturity:"established", notes:"JIT compilation for numerical Python; CUDA target availability is version-sensitive." },
  { id:"pyamg", name:"PyAMG", domain:["sparse","multigrid","linear-algebra"], accelerators:["cpu"], hostedFit:"pip-wheel", execution:"python", license:"MIT", url:"https://pyamg.readthedocs.io/", maturity:"established", notes:"Algebraic multigrid preconditioners for sparse systems." },
  { id:"scikit-fem", name:"scikit-fem", domain:["fem","pde","sparse"], accelerators:["cpu"], hostedFit:"pip-wheel", execution:"python", license:"MIT", url:"https://github.com/kinnala/scikit-fem", maturity:"established", notes:"Lightweight finite-element assembly using NumPy/SciPy ecosystem." },
  { id:"torchdiffeq", name:"torchdiffeq", domain:["ode","differentiable-simulation","autodiff"], accelerators:["cpu","nvidia-gpu"], hostedFit:"pip-wheel", execution:"python", license:"MIT", url:"https://github.com/rtqichen/torchdiffeq", maturity:"established", notes:"Differentiable ODE solvers built on PyTorch; verify solver tolerance and stiffness handling." },
  { id:"diffrax", name:"Diffrax", domain:["ode","sde","differentiable-simulation","autodiff"], accelerators:["cpu","nvidia-gpu"], hostedFit:"pip-wheel-check-jax", execution:"python", license:"Apache-2.0", url:"https://github.com/patrick-kidger/diffrax", maturity:"established", notes:"JAX-based ODE/SDE solvers; backend availability follows JAX device support." },
  { id:"meshio", name:"meshio", domain:["mesh-io","fem","cfd"], accelerators:["cpu"], hostedFit:"pip-wheel", execution:"python", license:"MIT", url:"https://github.com/nschloe/meshio", maturity:"established", notes:"Mesh interchange; preserves format-specific metadata only where supported." },
  { id:"pyvista", name:"PyVista", domain:["visualization","mesh","postprocessing"], accelerators:["cpu"], hostedFit:"pip-wheel", execution:"python", license:"MIT", url:"https://pyvista.org/", maturity:"established", notes:"VTK-backed scientific visualization and mesh inspection." }
].map((entry) => Object.freeze({ ...entry, domain:Object.freeze([...entry.domain]), accelerators:Object.freeze([...entry.accelerators]) })));

const BACKENDS = new Map(COMPUTE_BACKEND_CATALOG.map((x) => [x.id, x]));

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function listComputeBackends(filters = {}) {
  const { domain, accelerator, hostedFit } = filters;
  return COMPUTE_BACKEND_CATALOG.filter((b) =>
    (!domain || b.domain.includes(domain)) &&
    (!accelerator || b.accelerators.includes(accelerator)) &&
    (!hostedFit || b.hostedFit === hostedFit)
  ).map((b) => ({ ...b, domain:[...b.domain], accelerators:[...b.accelerators] }));
}

function diagnostics(errors) {
  return { status: errors.length ? "HOLD" : "READY", diagnostics: errors.map((code) => ({ code, severity:"BLOCKING" })) };
}

/** Build a plan only. It does not allocate compute or execute user code. */
export function createComputePlan(input = {}) {
  const errors = [];
  if (!nonEmpty(input.projectId)) errors.push("PROJECT_ID_REQUIRED");
  if (!nonEmpty(input.configurationId)) errors.push("CONFIGURATION_ID_REQUIRED");
  if (!nonEmpty(input.solverId)) errors.push("SOLVER_ID_REQUIRED");
  if (!nonEmpty(input.backendId) || !BACKENDS.has(input.backendId)) errors.push("BACKEND_UNKNOWN");
  if (!nonEmpty(input.runId)) errors.push("RUN_ID_REQUIRED");
  if (input.createdAt !== undefined && (!nonEmpty(input.createdAt) || !Number.isFinite(Date.parse(input.createdAt)))) errors.push("CREATED_AT_INVALID");
  if (!nonEmpty(input.inputHash) || !HASH_RE.test(input.inputHash)) errors.push("INPUT_HASH_INVALID");
  if (!Array.isArray(input.requirements) || input.requirements.length === 0 || input.requirements.some((x) => !nonEmpty(x))) errors.push("REQUIREMENTS_REQUIRED");
  const req = input.resources || {};
  if (req.maxWallSeconds !== undefined && (!finite(req.maxWallSeconds) || req.maxWallSeconds <= 0)) errors.push("WALL_LIMIT_INVALID");
  if (req.maxMemoryGiB !== undefined && (!finite(req.maxMemoryGiB) || req.maxMemoryGiB <= 0)) errors.push("MEMORY_LIMIT_INVALID");
  if (req.maxGpuCount !== undefined && (!Number.isInteger(req.maxGpuCount) || req.maxGpuCount < 0)) errors.push("GPU_COUNT_INVALID");
  if (req.maxGpuMemoryGiB !== undefined && (!finite(req.maxGpuMemoryGiB) || req.maxGpuMemoryGiB <= 0)) errors.push("GPU_MEMORY_LIMIT_INVALID");
  if (input.tolerance !== undefined && (!finite(input.tolerance) || input.tolerance <= 0)) errors.push("TOLERANCE_INVALID");
  if (input.executionMode && !["COLAB_HOSTED","EXTERNAL_HOSTED"].includes(input.executionMode)) errors.push("EXECUTION_MODE_UNSUPPORTED");
  const backend = BACKENDS.get(input.backendId);
  if (backend && input.domain && !backend.domain.includes(input.domain)) errors.push("BACKEND_DOMAIN_MISMATCH");
  if (backend && input.accelerator && !backend.accelerators.includes(input.accelerator)) errors.push("BACKEND_ACCELERATOR_MISMATCH");
  if (errors.length) return { ...diagnostics(unique(errors)), plan:null };

  const plan = {
    schema:"pap.hosted-compute-plan/1.0",
    planId:`${input.projectId}:${input.configurationId}:${input.runId}`,
    projectId:input.projectId,
    configurationId:input.configurationId,
    runId:input.runId,
    solverId:input.solverId,
    backendId:input.backendId,
    domain:input.domain || null,
    accelerator:input.accelerator || "cpu",
    executionMode:input.executionMode || "COLAB_HOSTED",
    requirements:unique([...input.requirements]),
    resources:{ maxWallSeconds:req.maxWallSeconds ?? 3600, maxMemoryGiB:req.maxMemoryGiB ?? 12, maxGpuCount:req.maxGpuCount ?? (input.accelerator && input.accelerator !== "cpu" ? 1 : 0), maxGpuMemoryGiB:req.maxGpuMemoryGiB ?? null },
    tolerance:input.tolerance ?? 1e-8,
    inputHash:input.inputHash.toLowerCase(),
    createdAt:input.createdAt || new Date().toISOString(),
    backendContractVersion:HOSTED_COMPUTE_VERSION,
    executionPolicy:{ noImplicitHardwareClaims:true, simulationOnly:true, requireResultDigest:true, requireValidationChecks:true }
  };
  return { status:"READY", diagnostics:[], plan:deepFreeze(plan) };
}

/**
 * Validate a notebook/external runner result. Any missing or inconsistent
 * provenance, failed check, non-finite metric, budget violation or digest
 * mismatch is HOLD. Digest verification is delegated to caller because
 * browser/Node crypto APIs differ; caller must pass `digestVerified: true`
 * only after recomputing SHA-256 over the documented canonical payload.
 */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Verify the notebook's detached digest in a browser secure context or Node. */
export async function verifyComputeResultDigest(result = {}) {
  if (!nonEmpty(result.digestPayload) || !HASH_RE.test(result.resultDigest || "")) return false;
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle || typeof TextEncoder === "undefined") return false;
  let payload;
  try { payload = JSON.parse(result.digestPayload); } catch { return false; }
  const outer = { ...result };
  delete outer.digestPayload;
  delete outer.resultDigest;
  if (canonicalJson(payload) !== canonicalJson(outer)) return false;
  const bytes = new TextEncoder().encode(result.digestPayload);
  const digest = await subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === result.resultDigest.toLowerCase();
}

/** Verify the detached digest, then apply the same fail-closed result checks. */
export async function validateComputeResultAsync(result = {}, planResult = {}) {
  const digestVerified = await verifyComputeResultDigest(result);
  return validateComputeResult(result, planResult, { digestVerified });
}

export function validateComputeResult(result = {}, planResult = {}, options = {}) {
  const plan = planResult.plan || planResult;
  const errors = [];
  if (!plan || plan.schema !== "pap.hosted-compute-plan/1.0") errors.push("PLAN_INVALID");
  if (result.schema !== "pap.hosted-compute-result/1.0") errors.push("RESULT_SCHEMA_INVALID");
  if (plan && result.planId !== plan.planId) errors.push("PLAN_ID_MISMATCH");
  if (plan && result.projectId !== plan.projectId) errors.push("PROJECT_ID_MISMATCH");
  if (plan && result.configurationId !== plan.configurationId) errors.push("CONFIGURATION_ID_MISMATCH");
  if (plan && result.runId !== plan.runId) errors.push("RUN_ID_MISMATCH");
  if (!nonEmpty(result.solverId)) errors.push("SOLVER_ID_REQUIRED");
  if (plan && result.solverId !== plan.solverId) errors.push("SOLVER_ID_MISMATCH");
  if (plan && result.backendId !== plan.backendId) errors.push("BACKEND_ID_MISMATCH");
  if (result.status !== "COMPLETED") errors.push("EXECUTION_NOT_COMPLETED");
  if (!nonEmpty(result.backendVersion)) errors.push("BACKEND_VERSION_REQUIRED");
  if (!result.metadata || result.metadata.platform !== "Physical AI Platform" || result.metadata.license !== "GPL-3.0-only" || !nonEmpty(result.metadata.copyright) || !nonEmpty(result.metadata.notebook)) errors.push("PROJECT_METADATA_REQUIRED");
  if (!nonEmpty(result.runtime)) errors.push("RUNTIME_REQUIRED");
  if (!nonEmpty(result.device)) errors.push("DEVICE_REQUIRED");
  if (!nonEmpty(result.precision)) errors.push("PRECISION_REQUIRED");
  if (!HASH_RE.test(result.inputHash || "")) errors.push("RESULT_INPUT_HASH_INVALID");
  if (plan && result.inputHash !== plan.inputHash) errors.push("INPUT_HASH_MISMATCH");
  if (!HASH_RE.test(result.outputHash || "")) errors.push("OUTPUT_HASH_INVALID");
  if (!finite(Date.parse(result.startedAt)) || !finite(Date.parse(result.finishedAt)) || Date.parse(result.finishedAt) < Date.parse(result.startedAt)) errors.push("TIMESTAMP_RANGE_INVALID");
  if (!Array.isArray(result.checks) || result.checks.length === 0) errors.push("VALIDATION_CHECKS_REQUIRED");
  else if (result.checks.some((c) => !c || c.passed !== true || !nonEmpty(c.id)) || new Set(result.checks.map((c) => c && c.id)).size !== result.checks.length) errors.push("VALIDATION_CHECK_FAILED");
  if (!result.metrics || typeof result.metrics !== "object" || Array.isArray(result.metrics)) errors.push("METRICS_REQUIRED");
  else if (Object.keys(result.metrics).length === 0) errors.push("METRICS_EMPTY");
  else if (Object.values(result.metrics).some((v) => !finite(v))) errors.push("METRIC_NONFINITE");
  if (!result.validation || result.validation.passed !== true) errors.push("VALIDATION_NOT_PASSED");
  if (result.validation && (!finite(result.validation.error) || result.validation.error < 0 || !nonEmpty(result.validation.method))) errors.push("VALIDATION_METRIC_INVALID");
  if (result.validation && finite(result.validation.error) && plan && result.validation.error > plan.tolerance) errors.push("VALIDATION_TOLERANCE_EXCEEDED");
  if (!result.resourceUsage || !finite(result.resourceUsage.wallSeconds) || !finite(result.resourceUsage.peakMemoryGiB) || !Number.isInteger(result.resourceUsage.gpuCount) || result.resourceUsage.wallSeconds < 0 || result.resourceUsage.peakMemoryGiB < 0 || result.resourceUsage.gpuCount < 0) errors.push("RESOURCE_USAGE_INVALID");
  if (plan && plan.resources && finite(plan.resources.maxGpuMemoryGiB) && (!result.resourceUsage || !finite(result.resourceUsage.peakDeviceMemoryGiB))) errors.push("GPU_MEMORY_USAGE_REQUIRED");
  if (result.resourceUsage && result.resourceUsage.peakDeviceMemoryGiB !== undefined && (!finite(result.resourceUsage.peakDeviceMemoryGiB) || result.resourceUsage.peakDeviceMemoryGiB < 0)) errors.push("GPU_MEMORY_USAGE_INVALID");
  if (result.resourceUsage && plan && plan.resources) {
    if (finite(result.resourceUsage.wallSeconds) && result.resourceUsage.wallSeconds > plan.resources.maxWallSeconds) errors.push("WALL_BUDGET_EXCEEDED");
    if (finite(result.resourceUsage.peakMemoryGiB) && result.resourceUsage.peakMemoryGiB > plan.resources.maxMemoryGiB) errors.push("MEMORY_BUDGET_EXCEEDED");
    if (finite(result.resourceUsage.gpuCount) && result.resourceUsage.gpuCount > plan.resources.maxGpuCount) errors.push("GPU_BUDGET_EXCEEDED");
    if (finite(result.resourceUsage.peakDeviceMemoryGiB) && finite(plan.resources.maxGpuMemoryGiB) && result.resourceUsage.peakDeviceMemoryGiB > plan.resources.maxGpuMemoryGiB) errors.push("GPU_MEMORY_BUDGET_EXCEEDED");
  }
  if (options.digestVerified !== true) errors.push("RESULT_DIGEST_NOT_VERIFIED");
  if (!nonEmpty(result.executionMode)) errors.push("EXECUTION_MODE_REQUIRED");
  if (result.executionMode && plan && result.executionMode !== plan.executionMode) errors.push("EXECUTION_MODE_MISMATCH");
  if (errors.length) return { ...diagnostics(unique(errors)), accepted:false, evidenceDraft:null };

  return {
    status:"ACCEPTED",
    accepted:true,
    diagnostics:[],
    evidenceDraft:{
      schema:"pap.hosted-compute-evidence-draft/1.0",
      projectId:plan.projectId,
      configurationId:plan.configurationId,
      runId:plan.runId,
      solverId:plan.solverId,
      backendId:plan.backendId,
      backendVersion:result.backendVersion,
      metadata:{...result.metadata},
      executionMode:plan.executionMode,
      method:HOSTED_COMPUTE_METHOD,
      state:"EXECUTED",
      fidelity:"UNVERIFIED",
      device:result.device,
      precision:result.precision,
      runtime:result.runtime,
      inputHash:result.inputHash,
      outputHash:result.outputHash,
      metrics:{...result.metrics},
      checks:result.checks.map((c) => ({...c})),
      validation:{...result.validation},
      startedAt:result.startedAt,
      finishedAt:result.finishedAt,
      claims:{ physicalVerification:false, hil:false, l5:false, industrialQualification:false }
    }
  };
}

/** Convert an untrusted external result into a canonical-safe evidence draft. */
export function toCanonicalEvidenceDraft(result, plan, options) {
  return validateComputeResult(result, plan, options);
}
