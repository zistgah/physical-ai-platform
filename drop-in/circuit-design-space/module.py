# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# SPDX-License-Identifier: GPL-3.0-only
"""Circuit design-space exploration and parameter-identification companion.

This module is deliberately separate from drop-in/circuit. It consumes canonical,
normalized measurements and RC/RLC design parameters; it does not own circuit topology,
netlists, solver execution, platform identity, or evidence promotion.

NumPy/SciPy are CPU dependencies. JAX is an optional acceleration backend. GPU
availability is detected at runtime; the module never claims GPU execution when
JAX selected a CPU device. An explicit GPU request without a GPU returns HOLD.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from itertools import product
from typing import Any, Iterable
import math

COPYRIGHT = "Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary."
VERSION = "1.0.0"
DEFAULT_MAX_CANDIDATES = 100_000
DEFAULT_MAX_OUTPUT_VALUES = 2_000_000


def _hold(reason: str, **details: Any) -> dict[str, Any]:
    return {"outcome": "HOLD", "reason": reason, **details}


def _ok(**details: Any) -> dict[str, Any]:
    return {"outcome": "OK", **details}


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _positive_vector(values: Any, name: str) -> tuple[list[float] | None, str | None]:
    if not isinstance(values, (list, tuple)) or not values:
        return None, f"{name} must be a non-empty list or tuple"
    out: list[float] = []
    for i, value in enumerate(values):
        if not _finite_number(value) or float(value) <= 0:
            return None, f"{name}[{i}] must be finite and > 0"
        out.append(float(value))
    return out, None


def _time_vector(values: Any) -> tuple[list[float] | None, str | None]:
    if not isinstance(values, (list, tuple)) or len(values) < 2:
        return None, "times_s must contain at least two samples"
    out: list[float] = []
    for i, value in enumerate(values):
        if not _finite_number(value) or float(value) < 0:
            return None, f"times_s[{i}] must be finite and >= 0"
        out.append(float(value))
    if any(b <= a for a, b in zip(out, out[1:])):
        return None, "times_s must be strictly increasing"
    return out, None


def _load_numpy():
    try:
        import numpy as np  # type: ignore
        return np, None
    except Exception as exc:  # optional dependency is reported, never hidden
        return None, f"NumPy unavailable: {type(exc).__name__}: {exc}"


def _load_scipy():
    try:
        from scipy.optimize import least_squares  # type: ignore
        return least_squares, None
    except Exception as exc:
        return None, f"SciPy unavailable: {type(exc).__name__}: {exc}"


def _select_jax(require_gpu: bool = False):
    try:
        import jax  # type: ignore
        import jax.numpy as jnp  # type: ignore
        devices = jax.devices()
        gpu_devices = [d for d in devices if getattr(d, "platform", "") == "gpu"]
        if require_gpu and not gpu_devices:
            return None, None, None, "GPU requested but no JAX GPU device is available"
        device = gpu_devices[0] if gpu_devices else devices[0]
        return jax, jnp, device, None
    except Exception as exc:
        return None, None, None, f"JAX unavailable: {type(exc).__name__}: {exc}"


def rc_step_response(times_s: Iterable[float], resistance_ohm: float,
                     capacitance_f: float, step_v: float = 1.0,
                     initial_v: float = 0.0) -> dict[str, Any]:
    """Analytical first-order RC step response; no numerical solver is invoked."""
    times, err = _time_vector(list(times_s))
    if err:
        return _hold(err)
    if not _finite_number(resistance_ohm) or resistance_ohm <= 0:
        return _hold("resistance_ohm must be finite and > 0")
    if not _finite_number(capacitance_f) or capacitance_f <= 0:
        return _hold("capacitance_f must be finite and > 0")
    if not _finite_number(step_v) or not _finite_number(initial_v):
        return _hold("step_v and initial_v must be finite")
    np, err = _load_numpy()
    if err:
        return _hold(err)
    tau = float(resistance_ohm) * float(capacitance_f)
    values = float(initial_v) + (float(step_v) - float(initial_v)) * (1.0 - np.exp(-np.asarray(times) / tau))
    return _ok(model="linear-RC-step", tau_s=tau, times_s=times,
               voltage_v=values.tolist(), analytic=True, fidelity="ANALYTICAL_REFERENCE")


def explore_rc_design_space(resistances_ohm: Any, capacitances_f: Any,
                            times_s: Any, *, step_v: float = 1.0,
                            initial_v: float = 0.0, backend: str = "numpy",
                            require_gpu: bool = False,
                            max_candidates: int = DEFAULT_MAX_CANDIDATES,
                            max_output_values: int = DEFAULT_MAX_OUTPUT_VALUES,
                            constraints: dict[str, float] | None = None) -> dict[str, Any]:
    """Evaluate an R×C grid, returning electrical and timing metrics per candidate.

    Optional constraints: max_tau_s, max_initial_current_a, max_energy_j.
    The output contains every candidate and an explicit feasibility decision.
    """
    rs, err = _positive_vector(resistances_ohm, "resistances_ohm")
    if err: return _hold(err)
    cs, err = _positive_vector(capacitances_f, "capacitances_f")
    if err: return _hold(err)
    ts, err = _time_vector(times_s)
    if err: return _hold(err)
    if backend not in {"numpy", "jax", "auto"}:
        return _hold("backend must be numpy, jax or auto")
    if require_gpu and backend != "jax":
        return _hold("require_gpu=True requires backend='jax'")
    if not _finite_number(step_v) or not _finite_number(initial_v):
        return _hold("step_v and initial_v must be finite")
    if not isinstance(max_candidates, int) or isinstance(max_candidates, bool) or max_candidates <= 0:
        return _hold("max_candidates must be a positive integer")
    if not isinstance(max_output_values, int) or isinstance(max_output_values, bool) or max_output_values <= 0:
        return _hold("max_output_values must be a positive integer")
    candidate_count = len(rs) * len(cs)
    output_count = candidate_count * len(ts)
    if candidate_count > max_candidates:
        return _hold("candidate count exceeds configured limit", candidate_count=candidate_count)
    if output_count > max_output_values:
        return _hold("output value count exceeds configured limit", output_count=output_count)
    constraints = constraints or {}
    if not isinstance(constraints, dict): return _hold("constraints must be an object")
    allowed = {"max_tau_s", "max_initial_current_a", "max_energy_j"}
    if set(constraints) - allowed: return _hold("unsupported design constraint", unknown=sorted(set(constraints)-allowed))
    zero_allowed = {"max_initial_current_a", "max_energy_j"}
    for key, value in constraints.items():
        if not _finite_number(value) or value < 0 or (value == 0 and key not in zero_allowed):
            return _hold(f"{key} must be finite and non-negative only where zero is physically meaningful")

    engine = "numpy"
    if backend in {"jax", "auto"}:
        jax, jnp, device, jax_error = _select_jax(require_gpu=require_gpu)
        if jax_error:
            if backend == "jax" or require_gpu: return _hold(jax_error)
        else:
            engine = f"jax:{device.platform}"
    if engine.startswith("jax:"):
        # JAX vectorization maps every R/C pair over the full time vector.
        rgrid = jnp.repeat(jnp.asarray(rs), len(cs))
        cgrid = jnp.tile(jnp.asarray(cs), len(rs))
        tarr = jnp.asarray(ts)
        tau = rgrid * cgrid
        v = float(initial_v) + (float(step_v) - float(initial_v)) * (1.0 - jnp.exp(-tau[:, None] * 0 + -tarr[None, :] / tau[:, None]))
        voltage = jax.device_get(v).tolist()
        tau_values = jax.device_get(tau).tolist()
    else:
        np, err = _load_numpy()
        if err: return _hold(err)
        rgrid = np.repeat(np.asarray(rs), len(cs))
        cgrid = np.tile(np.asarray(cs), len(rs))
        tau_arr = rgrid * cgrid
        voltage = (float(initial_v) + (float(step_v) - float(initial_v)) *
                   (1.0 - np.exp(-np.asarray(ts)[None, :] / tau_arr[:, None]))).tolist()
        tau_values = tau_arr.tolist()

    result = []
    for i, (r, c, tau, wave) in enumerate(zip(rgrid.tolist(), cgrid.tolist(), tau_values, voltage)):
        i0 = abs((float(step_v) - float(initial_v)) / float(r))
        energy = 0.5 * float(c) * (float(step_v) ** 2)
        feasible = True
        reasons = []
        checks = (("max_tau_s", tau), ("max_initial_current_a", i0), ("max_energy_j", energy))
        for key, actual in checks:
            if key in constraints and actual > constraints[key]:
                feasible = False; reasons.append(f"{key} exceeded")
        result.append({"candidate_id": f"RC-{i+1:06d}", "R_ohm": float(r), "C_F": float(c),
                       "tau_s": float(tau), "rise_10_90_s": 2.1972245773362196*float(tau),
                       "initial_current_a": i0, "stored_energy_j": energy,
                       "feasible": feasible, "hold_reasons": reasons,
                       "voltage_v": [float(x) for x in wave]})
    return _ok(version=VERSION, engine=engine, candidate_count=candidate_count,
               time_samples=len(ts), candidates=result,
               feasible_count=sum(1 for x in result if x["feasible"]),
               provenance={"method": "analytical-first-order-RC", "seed": None,
                           "solver_execution": False, "physical_verification": False})


def fit_rc_time_constant(times_s: Any, measured_voltage_v: Any, *,
                         initial_v: float = 0.0, final_v: float = 1.0,
                         tau_bounds_s: tuple[float, float] = (1e-9, 1e3),
                         weights: Any = None) -> dict[str, Any]:
    """Estimate one identifiable parameter (tau=R*C) from an RC step trace.

    R and C are not separately identifiable from a single ideal step response.
    This function therefore estimates tau only. Recover R only when C is known,
    or add independent experiments/priors in a separately reviewed model.
    """
    ts, err = _time_vector(times_s)
    if err: return _hold(err)
    if not isinstance(measured_voltage_v, (list, tuple)) or len(measured_voltage_v) != len(ts):
        return _hold("measured_voltage_v must match times_s length")
    if any(not _finite_number(v) for v in measured_voltage_v):
        return _hold("measured_voltage_v values must be finite")
    if not _finite_number(initial_v) or not _finite_number(final_v) or initial_v == final_v:
        return _hold("initial_v and final_v must be finite and distinct")
    if not isinstance(tau_bounds_s, (tuple, list)) or len(tau_bounds_s) != 2:
        return _hold("tau_bounds_s must contain lower and upper bounds")
    lo, hi = tau_bounds_s
    if not _finite_number(lo) or not _finite_number(hi) or lo <= 0 or hi <= lo:
        return _hold("tau_bounds_s must be finite, positive and increasing")
    if weights is not None:
        if not isinstance(weights, (list, tuple)) or len(weights) != len(ts) or any(not _finite_number(w) or w <= 0 for w in weights):
            return _hold("weights must be positive finite values matching observations")
    least_squares, err = _load_scipy()
    if err: return _hold(err)
    np, err = _load_numpy()
    if err: return _hold(err)
    t = np.asarray(ts, dtype=float)
    y = np.asarray(measured_voltage_v, dtype=float)
    w = np.ones_like(y) if weights is None else np.asarray(weights, dtype=float)
    span = float(final_v) - float(initial_v)
    def model(tau): return float(initial_v) + span * (1.0 - np.exp(-t / float(tau)))
    def residual(log_tau): return (model(math.exp(float(log_tau[0]))) - y) * w
    start = min(max((ts[-1]-ts[0])/3.0, float(lo)), float(hi))
    fit = least_squares(residual, x0=[math.log(start)], bounds=([math.log(float(lo))], [math.log(float(hi))]),
                        method="trf", loss="linear", max_nfev=5000, xtol=1e-12, ftol=1e-12, gtol=1e-12)
    tau = math.exp(float(fit.x[0]))
    pred = model(tau)
    raw_residual = pred - y
    rmse = float(np.sqrt(np.mean(raw_residual**2)))
    denom = float(np.sum((y - np.mean(y))**2))
    r2 = None if denom <= np.finfo(float).eps else float(1.0 - np.sum(raw_residual**2)/denom)
    jac = np.asarray(fit.jac, dtype=float)
    rank = int(np.linalg.matrix_rank(jac))
    dof = max(0, len(y) - rank)
    variance = float(np.sum((raw_residual*w)**2)/dof) if dof else None
    cov_log_tau = None
    if dof and rank == 1:
        cov_log_tau = variance / float((jac.T @ jac).item())
    stderr_tau = tau * math.sqrt(max(0.0, cov_log_tau)) if cov_log_tau is not None else None
    bound_active = bool(np.any(np.asarray(fit.active_mask) != 0))
    jac_norm = float(np.linalg.norm(jac))
    status = "CONVERGED" if fit.success and rank == 1 and jac_norm > 1e-14 and not bound_active else "HOLD"
    if status != "CONVERGED":
        return _hold("parameter fit did not produce an identifiable interior converged solution",
                     rank=rank, jacobian_norm=jac_norm, bound_active=bound_active, message=str(fit.message))
    return _ok(version=VERSION, parameter="tau_s", tau_s=tau,
               resistance_ohm_if_capacitance_known=None,
               rmse_v=rmse, r_squared=r2, standard_error_tau_s=stderr_tau,
               residuals_v=raw_residual.tolist(), predicted_voltage_v=pred.tolist(),
               iterations=int(fit.nfev), optimality=float(fit.optimality),
               fit_status=status, identifiable_parameters=["tau_s"],
               caveat="A single ideal RC step identifies tau=R*C, not R and C independently.",
               provenance={"optimizer": "scipy.optimize.least_squares", "loss": "linear",
                           "physical_verification": False, "measurement_calibration": "caller-supplied"})


def resistance_from_tau(tau_s: float, known_capacitance_f: float) -> dict[str, Any]:
    """Recover R only when an independently known C is supplied."""
    if not _finite_number(tau_s) or tau_s <= 0: return _hold("tau_s must be finite and > 0")
    if not _finite_number(known_capacitance_f) or known_capacitance_f <= 0:
        return _hold("known_capacitance_f must be finite and > 0")
    return _ok(resistance_ohm=float(tau_s)/float(known_capacitance_f),
               capacitance_f=float(known_capacitance_f), tau_s=float(tau_s),
               identification_basis="independent-known-capacitance")


def local_sensitivity_tau(times_s: Any, tau_s: float, *, step_v: float = 1.0,
                          initial_v: float = 0.0) -> dict[str, Any]:
    """Analytical dV/dtau for an ideal RC step; useful for identifiability review."""
    ts, err = _time_vector(times_s)
    if err: return _hold(err)
    if not _finite_number(tau_s) or tau_s <= 0: return _hold("tau_s must be finite and > 0")
    if not _finite_number(step_v) or not _finite_number(initial_v): return _hold("voltage levels must be finite")
    np, err = _load_numpy()
    if err: return _hold(err)
    t = np.asarray(ts, dtype=float)
    dv_dtau = (float(step_v)-float(initial_v)) * (-np.exp(-t/float(tau_s)) * t / (float(tau_s)**2))
    return _ok(tau_s=float(tau_s), dV_dtau_v_per_s=dv_dtau.tolist(),
               interpretation="local analytical sensitivity; not uncertainty or a confidence interval")


def _rlc_response_numpy(times, r_values, l_values, c_values, step_v, initial_v):
    """Vectorized series-RLC capacitor step response for a Cartesian R/L/C grid."""
    np, err = _load_numpy()
    if err:
        raise RuntimeError(err)
    r = np.asarray(r_values, dtype=float)[:, None]
    l = np.asarray(l_values, dtype=float)[:, None]
    c = np.asarray(c_values, dtype=float)[:, None]
    t = np.asarray(times, dtype=float)[None, :]
    alpha = r / (2.0 * l)
    omega0 = 1.0 / np.sqrt(l * c)
    delta = alpha * alpha - omega0 * omega0
    zeta = alpha / omega0
    under = zeta < 1.0 - 1e-6
    critical = np.abs(zeta - 1.0) <= 1e-6
    root_under = np.sqrt(np.maximum(-delta, 0.0))
    root_over = np.sqrt(np.maximum(delta, 0.0))
    safe_under = np.where(root_under > 0, root_under, 1.0)
    safe_over = np.where(root_over > 0, root_over, 1.0)
    under_response = 1.0 - np.exp(-alpha * t) * (np.cos(root_under * t) + (alpha / safe_under) * np.sin(root_under * t))
    critical_response = 1.0 - np.exp(-alpha * t) * (1.0 + alpha * t)
    root_over_safe = np.where((root_over > 0) & (~critical), root_over, 1.0)
    s1 = -alpha + root_over_safe
    s2 = -alpha - root_over_safe
    safe_denominator = s1 - s2
    over_response = 1.0 + (s2 * np.exp(s1 * t) - s1 * np.exp(s2 * t)) / safe_denominator
    response = np.where(under, under_response, np.where(critical, critical_response, over_response))
    return float(initial_v) + (float(step_v) - float(initial_v)) * response, alpha[:, 0], omega0[:, 0], delta[:, 0]


def rlc_step_response(times_s: Any, resistance_ohm: float, inductance_h: float,
                      capacitance_f: float, *, step_v: float = 1.0,
                      initial_v: float = 0.0) -> dict[str, Any]:
    """Analytical series-RLC step response measured across the capacitor.

    Assumes zero initial inductor current and capacitor voltage `initial_v`.
    The response is classified as underdamped, critically damped or overdamped.
    """
    ts, err = _time_vector(times_s)
    if err: return _hold(err)
    for value, name in ((resistance_ohm, 'resistance_ohm'), (inductance_h, 'inductance_h'), (capacitance_f, 'capacitance_f')):
        if not _finite_number(value) or value <= 0: return _hold(f'{name} must be finite and > 0')
    if not _finite_number(step_v) or not _finite_number(initial_v): return _hold('step_v and initial_v must be finite')
    values, alpha, omega0, delta = _rlc_response_numpy(ts, [resistance_ohm], [inductance_h], [capacitance_f], step_v, initial_v)
    zeta = float(alpha[0] / omega0[0])
    regime = 'underdamped' if zeta < 1.0 - 1e-6 else 'overdamped' if zeta > 1.0 + 1e-6 else 'critically_damped'
    peak = float(max(values[0]))
    span = abs(float(step_v) - float(initial_v))
    overshoot = max(0.0, (peak - float(step_v)) / span) if span > 0 and step_v >= initial_v else max(0.0, (float(step_v) - min(values[0])) / span) if span > 0 else 0.0
    return _ok(model='series-RLC-capacitor-step', times_s=ts, voltage_v=[float(x) for x in values[0]],
               damping_ratio=zeta, damping_regime=regime, natural_frequency_rad_s=float(omega0[0]),
               natural_frequency_hz=float(omega0[0] / (2.0 * math.pi)), peak_voltage_v=peak,
               overshoot_fraction=float(overshoot), analytic=True, fidelity='ANALYTICAL_REFERENCE',
               assumptions={'initial_inductor_current_a': 0.0, 'initial_capacitor_voltage_v': float(initial_v)})


def explore_rlc_design_space(resistances_ohm: Any, inductances_h: Any,
                             capacitances_f: Any, times_s: Any, *,
                             step_v: float = 1.0, initial_v: float = 0.0,
                             backend: str = 'numpy', require_gpu: bool = False,
                             max_candidates: int = DEFAULT_MAX_CANDIDATES,
                             max_output_values: int = DEFAULT_MAX_OUTPUT_VALUES,
                             constraints: dict[str, float] | None = None) -> dict[str, Any]:
    """Evaluate a Cartesian series-RLC design grid, optionally vectorized by JAX.

    Constraints: max_natural_frequency_hz, max_overshoot_fraction,
    max_capacitor_energy_j. All limits are finite; zero is accepted only for physically meaningful zero-current, zero-energy or zero-overshoot constraints.
    """
    rs, err = _positive_vector(resistances_ohm, 'resistances_ohm')
    if err: return _hold(err)
    ls, err = _positive_vector(inductances_h, 'inductances_h')
    if err: return _hold(err)
    cs, err = _positive_vector(capacitances_f, 'capacitances_f')
    if err: return _hold(err)
    ts, err = _time_vector(times_s)
    if err: return _hold(err)
    if backend not in {'numpy', 'jax', 'auto'}: return _hold('backend must be numpy, jax or auto')
    if require_gpu and backend != 'jax': return _hold("require_gpu=True requires backend='jax'")
    if not _finite_number(step_v) or not _finite_number(initial_v): return _hold('step_v and initial_v must be finite')
    if not isinstance(max_candidates, int) or isinstance(max_candidates, bool) or max_candidates <= 0: return _hold('max_candidates must be a positive integer')
    if not isinstance(max_output_values, int) or isinstance(max_output_values, bool) or max_output_values <= 0: return _hold('max_output_values must be a positive integer')
    count = len(rs) * len(ls) * len(cs)
    output_count = count * len(ts)
    if count > max_candidates: return _hold('candidate count exceeds configured limit', candidate_count=count)
    if output_count > max_output_values: return _hold('output value count exceeds configured limit', output_count=output_count)
    constraints = constraints or {}
    if not isinstance(constraints, dict): return _hold('constraints must be an object')
    allowed = {'max_natural_frequency_hz', 'max_overshoot_fraction', 'max_capacitor_energy_j'}
    if set(constraints) - allowed: return _hold('unsupported RLC design constraint', unknown=sorted(set(constraints)-allowed))
    zero_allowed = {'max_overshoot_fraction', 'max_capacitor_energy_j'}
    for key, value in constraints.items():
        if not _finite_number(value) or value < 0 or (value == 0 and key not in zero_allowed):
            return _hold(f'{key} must be finite and non-negative only where zero is physically meaningful')

    rgrid = [r for r in rs for _l in ls for _c in cs]
    lgrid = [_l for _r in rs for _l in ls for _c in cs]
    cgrid = [_c for _r in rs for _l in ls for _c in cs]
    engine = 'numpy'
    if backend in {'jax', 'auto'}:
        jax, jnp, device, jax_error = _select_jax(require_gpu=require_gpu)
        if jax_error:
            if backend == 'jax' or require_gpu: return _hold(jax_error)
        else:
            engine = f'jax:{device.platform}'
    if engine.startswith('jax:'):
        r = jnp.asarray(rgrid)[:, None]
        l = jnp.asarray(lgrid)[:, None]
        c = jnp.asarray(cgrid)[:, None]
        t = jnp.asarray(ts)[None, :]
        alpha = r / (2*l)
        omega0 = 1 / jnp.sqrt(l*c)
        delta = alpha*alpha - omega0*omega0
        zeta = alpha / omega0
        under = zeta < 1.0 - 1e-6
        critical = jnp.abs(zeta - 1.0) <= 1e-6
        ru = jnp.sqrt(jnp.maximum(-delta,0.0)); ro = jnp.sqrt(jnp.maximum(delta,0.0))
        su = jnp.where(ru>0,ru,1.0); so = jnp.where(ro>0,ro,1.0)
        under_y = 1-jnp.exp(-alpha*t)*(jnp.cos(ru*t)+(alpha/su)*jnp.sin(ru*t))
        critical_y = 1-jnp.exp(-alpha*t)*(1+alpha*t)
        ro_safe=jnp.where((ro>0) & (~critical),ro,1.0)
        s1=-alpha+ro_safe; s2=-alpha-ro_safe
        over_y=1+(s2*jnp.exp(s1*t)-s1*jnp.exp(s2*t))/(s1-s2)
        y=jnp.where(under,under_y,jnp.where(critical,critical_y,over_y))
        values = float(initial_v)+(float(step_v)-float(initial_v))*y
        waves=jax.device_get(values).tolist()
        alpha_values=jax.device_get(alpha[:,0]).tolist()
        omega_values=jax.device_get(omega0[:,0]).tolist()
        delta_values=jax.device_get(delta[:,0]).tolist()
    else:
        values, alpha_values, omega_values, delta_values = _rlc_response_numpy(ts,rgrid,lgrid,cgrid,step_v,initial_v)
        waves=values.tolist()
    candidates=[]
    for i,(r,l,c,alpha,omega,delta,wave) in enumerate(zip(rgrid,lgrid,cgrid,alpha_values,omega_values,delta_values,waves)):
        zeta=float(alpha/omega)
        regime='underdamped' if zeta<1.0-1e-6 else 'overdamped' if zeta>1.0+1e-6 else 'critically_damped'
        peak=float(max(wave)); span=abs(float(step_v)-float(initial_v))
        overshoot=max(0.0,(peak-float(step_v))/span) if span>0 and step_v>=initial_v else max(0.0,(float(step_v)-min(wave))/span) if span>0 else 0.0
        energy=0.5*float(c)*float(step_v)**2
        checks=(('max_natural_frequency_hz',float(omega)/(2*math.pi)),('max_overshoot_fraction',overshoot),('max_capacitor_energy_j',energy))
        reasons=[f'{key} exceeded' for key,value in checks if key in constraints and value>constraints[key]]
        candidates.append({'candidate_id':f'RLC-{i+1:06d}','R_ohm':float(r),'L_H':float(l),'C_F':float(c),
                           'damping_ratio':zeta,'damping_regime':regime,'natural_frequency_hz':float(omega)/(2*math.pi),
                           'peak_voltage_v':peak,'overshoot_fraction':overshoot,'capacitor_energy_j':energy,
                           'feasible':not reasons,'hold_reasons':reasons,'voltage_v':[float(x) for x in wave]})
    return _ok(version=VERSION,engine=engine,candidate_count=count,time_samples=len(ts),candidates=candidates,
               feasible_count=sum(1 for x in candidates if x['feasible']),
               provenance={'method':'analytical-series-RLC-step','solver_execution':False,'physical_verification':False})
